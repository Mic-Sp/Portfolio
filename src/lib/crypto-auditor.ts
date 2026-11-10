export type StrengthRating =
  "CRITICAL" | "WEAK" | "MODERATE" | "STRONG" | "ENTROPY_FORTRESS";
export interface EntropyAudit {
  length: number;
  uniqueCharacters: number;
  bitsPerCharacter: number;
  totalBits: number;
  poolCardinality: number;
  poolEstimateBits: number;
  characterSets: { name: string; count: number; cardinality: number }[];
  strength: StrengthRating;
  crackTimeTier:
    "INSTANT" | "SECONDS" | "MINUTES / HOURS" | "YEARS" | "CENTURIES+";
  assumedGuessesPerSecond: number;
}

/** Empirical, code-point frequency entropy; this is not a password-guessability model. */
export function calculateShannonEntropy(input: string): EntropyAudit {
  const characters = Array.from(input);
  const frequencies = new Map<string, number>();
  const sets = [
    {
      name: "LOWERCASE",
      count: 0,
      cardinality: 26,
      test: (c: string) => /^[a-z]$/.test(c),
    },
    {
      name: "UPPERCASE",
      count: 0,
      cardinality: 26,
      test: (c: string) => /^[A-Z]$/.test(c),
    },
    {
      name: "DIGITS",
      count: 0,
      cardinality: 10,
      test: (c: string) => /^[0-9]$/.test(c),
    },
    {
      name: "SYMBOLS",
      count: 0,
      cardinality: 32,
      test: (c: string) => /^[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]$/.test(c),
    },
    {
      name: "WHITESPACE",
      count: 0,
      cardinality: 1,
      test: (c: string) => /^\s$/u.test(c),
    },
    { name: "UNICODE / OTHER", count: 0, cardinality: 0, test: () => true },
  ];
  const other = new Set<string>();
  const whitespace = new Set<string>();
  for (const character of characters) {
    frequencies.set(character, (frequencies.get(character) ?? 0) + 1);
    const set = sets.find((item) => item.test(character))!;
    set.count++;
    if (set.name === "UNICODE / OTHER") other.add(character);
    if (set.name === "WHITESPACE") whitespace.add(character);
  }
  sets[5].cardinality = other.size;
  sets[4].cardinality = whitespace.size;
  let bitsPerCharacter = 0;
  for (const count of frequencies.values()) {
    const probability = count / characters.length;
    bitsPerCharacter -= probability * Math.log2(probability);
  }
  const totalBits = bitsPerCharacter * characters.length;
  const characterSets = sets
    .filter((set) => set.count > 0)
    .map(({ name, count, cardinality }) => ({ name, count, cardinality }));
  const poolCardinality = characterSets.reduce(
    (total, set) => total + set.cardinality,
    0,
  );
  const strength: StrengthRating =
    totalBits < 28
      ? "CRITICAL"
      : totalBits < 40
        ? "WEAK"
        : totalBits < 60
          ? "MODERATE"
          : totalBits < 80
            ? "STRONG"
            : "ENTROPY_FORTRESS";
  // Illustrative uniform-search tiers, using empirical bits and 10^10 guesses/s.
  const logSeconds = totalBits - 1 - Math.log2(1e10);
  const crackTimeTier =
    logSeconds < 0
      ? "INSTANT"
      : logSeconds < Math.log2(60)
        ? "SECONDS"
        : logSeconds < Math.log2(86400)
          ? "MINUTES / HOURS"
          : logSeconds < Math.log2(3155760000)
            ? "YEARS"
            : "CENTURIES+";
  return {
    length: characters.length,
    uniqueCharacters: frequencies.size,
    bitsPerCharacter,
    totalBits,
    poolCardinality,
    poolEstimateBits: poolCardinality
      ? characters.length * Math.log2(poolCardinality)
      : 0,
    characterSets,
    strength,
    crackTimeTier,
    assumedGuessesPerSecond: 1e10,
  };
}

export interface HibpAudit {
  prefix: string;
  suffixMasked: string;
  pwnedCount: number | null;
  isCompromised: boolean | null;
  offlineFallback: boolean;
}
export interface HibpOptions {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** Only a five-character SHA-1 prefix leaves the client. No server/proxy route is involved. */
export async function checkHibpKAnonymity(
  secret: string,
  options: HibpOptions = {},
): Promise<HibpAudit> {
  const fallback: HibpAudit = {
    prefix: "UNAVAILABLE",
    suffixMasked: "*".repeat(35),
    pwnedCount: null,
    isCompromised: null,
    offlineFallback: true,
  };
  let digest: string;
  try {
    const hash = await globalThis.crypto.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(secret),
    );
    digest = Array.from(new Uint8Array(hash), (byte) =>
      byte.toString(16).padStart(2, "0"),
    )
      .join("")
      .toUpperCase();
  } catch {
    return fallback;
  }
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);
  const result = { ...fallback, prefix };
  if (options.signal?.aborted) return result;
  const controller = new AbortController();
  let rejectBoundary: ((reason: Error) => void) | undefined;
  const abort = () => {
    controller.abort();
    rejectBoundary?.(new Error("HIBP cancelled"));
  };
  const timeoutMs = Number.isFinite(options.timeoutMs)
    ? Math.min(15000, Math.max(1, options.timeoutMs!))
    : 5000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Race the whole operation, including response.text(), even if a mock ignores AbortSignal.
    const timeout = new Promise<never>((_, reject) => {
      rejectBoundary = reject;
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("HIBP timeout"));
      }, timeoutMs);
    });
    options.signal?.addEventListener("abort", abort, { once: true });
    const request = async () => {
      const response = await (options.fetcher ?? globalThis.fetch)(
        `https://api.pwnedpasswords.com/range/${prefix}`,
        {
          method: "GET",
          headers: { "Add-Padding": "true" },
          signal: controller.signal,
          cache: "no-store",
          credentials: "omit",
          referrerPolicy: "no-referrer",
        },
      );
      if (!response.ok) throw new Error("HIBP unavailable");
      const body = await response.text();
      let validRows = 0;
      let pwnedCount = 0;
      for (const line of body.split(/\r?\n/)) {
        const match = /^([A-F0-9]{35}):(\d+)$/i.exec(line.trim());
        if (!match) continue;
        const count = Number(match[2]);
        if (!Number.isSafeInteger(count)) continue;
        validRows++;
        if (match[1].toUpperCase() === suffix)
          pwnedCount = Math.max(pwnedCount, count);
      }
      if (!validRows) throw new Error("Invalid range response");
      return {
        prefix,
        suffixMasked: result.suffixMasked,
        pwnedCount,
        isCompromised: pwnedCount > 0,
        offlineFallback: false,
      };
    };
    return await Promise.race([request(), timeout]);
  } catch {
    return result;
  } finally {
    if (timer) clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
