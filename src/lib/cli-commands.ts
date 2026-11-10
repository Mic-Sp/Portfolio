import { PROJECTS_REGISTRY } from "../data/projects.registry.ts";
import { PROFILE_CONFIG } from "../data/profile.config.ts";
import {
  calculateShannonEntropy,
  checkHibpKAnonymity,
  type EntropyAudit,
} from "./crypto-auditor.ts";
import type { ProjectNode } from "../types/portfolio.ts";
import { ContactSchema, contactFieldErrors } from "./schemas/contact.schema.ts";
import { transmitContact } from "./contact-client.ts";

export type CliAction =
  | { label: string; kind: "prefill"; value: string }
  | { label: string; kind: "contact" };

export interface CliLink {
  label: string;
  href?: string;
}
export interface CliLine {
  text: string;
  tone?: "muted" | "success" | "warning" | "error" | "accent";
  links?: CliLink[];
  nowrap?: boolean;
  actions?: CliAction[];
}
export interface CliResult {
  lines: CliLine[];
  action?: "clear" | "close";
}
export interface CliContext {
  projects?: readonly ProjectNode[];
  registry?: readonly ProjectNode[];
  godMode: boolean;
  selectProject: (index: number) => void;
  setViewMode: (mode: "spatial" | "grid") => void;
  setGodMode: (enabled: boolean) => void;
  closeTerminal: () => void;
  openLink?: (href: string) => void;
  signal?: AbortSignal;
  auditPassword?: typeof checkHibpKAnonymity;
  sendContact?: typeof transmitContact;
  onProgress?: (lines: CliLine[]) => void;
}
export interface CliCommand {
  name: string;
  aliases?: readonly string[];
  syntax: string;
  description: string;
  execute: (
    args: string[],
    context: CliContext,
  ) => CliResult | Promise<CliResult>;
}
const text = (value: string, tone?: CliLine["tone"]): CliLine => ({
  text: value,
  tone,
});
const result = (...lines: CliLine[]): CliResult => ({ lines });
const failure = (value: string) => result(text(value, "error"));
const registry = (context: CliContext) => context.registry ?? PROJECTS_REGISTRY;
const active = (context: CliContext) =>
  context.projects ??
  registry(context)
    .filter((node) => node.status !== "ARCHIVED")
    .sort((a, b) => a.order - b.order);
const findProject = (id: string, nodes: readonly ProjectNode[]) =>
  nodes.find((node) => node.id === id || node.cliMeta?.commandAlias === id);

export function parseCommand(input: string): { name: string; args: string[] } {
  // Messages are natural prose, not shell code: apostrophes in "let's" are literal.
  const message = input.match(
    /^\s*(msg|transmit|send)(?:\s+(\S+)(?:\s+([\s\S]*))?)?\s*$/i,
  );
  if (message) {
    const prose = message[3]?.trim().replace(/^(["'])([\s\S]*)\1$/, "$2");
    return {
      name: message[1].toLowerCase(),
      args: message[2] ? [message[2], ...(prose ? [prose] : [])] : [],
    };
  }
  const tokens: string[] = [];
  let token = "",
    quote: string | null = null,
    started = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (
      char === "\\" &&
      index + 1 < input.length &&
      /[\s\\'"]/.test(input[index + 1]) &&
      quote !== "'"
    ) {
      token += input[++index];
      started = true;
    } else if (quote) {
      if (char === quote) quote = null;
      else token += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) {
        tokens.push(token);
        token = "";
        started = false;
      }
    } else {
      token += char;
      started = true;
    }
  }
  if (quote)
    throw new Error(
      "Unclosed quote. Wrap values containing spaces in matching quotes.",
    );
  if (started) tokens.push(token);
  return { name: (tokens.shift() ?? "").toLowerCase(), args: tokens };
}

export function isSensitiveCommand(input: string) {
  try {
    const { name, args } = parseCommand(input);
    return (
      ["entropy", "pwnd"].includes(name) ||
      (["msg", "transmit", "send"].includes(name) && args.length > 0)
    );
  } catch {
    return /^\s*['"]?(entropy|pwnd|msg|transmit|send)(?:['"]?\s|['"]?$)/i.test(
      input,
    );
  }
}
export function getCommandEcho(input: string) {
  if (!isSensitiveCommand(input)) return input.trim();
  let name = "entropy";
  try {
    name = parseCommand(input).name;
  } catch {
    name =
      input
        .match(/^\s*['"]?(entropy|pwnd|msg|transmit|send)/i)?.[1]
        ?.toLowerCase() ?? "private-command";
  }
  return `${name} [REDACTED]`;
}
export function getHistoryCommand(input: string): string | null {
  return isSensitiveCommand(input) ? null : input.trim() || null;
}

export function safeExternalUrl(value: string | undefined): string | undefined {
  if (!value || value === "#") return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
function linksFor(project: ProjectNode): CliLink[] {
  return Object.entries(project.links).map(([label, url]) => ({
    label: label.toUpperCase(),
    href: safeExternalUrl(url),
  }));
}
function secretArgument(args: string[]) {
  const separator = args.indexOf("--");
  const values =
    separator >= 0
      ? [
          ...args.slice(0, separator).filter((arg) => arg !== "--redact"),
          ...args.slice(separator + 1),
        ]
      : args.filter((arg) => arg !== "--redact");
  return values.length ? values.join(" ") : null;
}
function entropyLines(audit: EntropyAudit): CliLine[] {
  const filled = Math.min(24, Math.round((audit.totalBits / 100) * 24));
  return [
    text(
      `ENTROPY // ${audit.strength}`,
      audit.strength === "CRITICAL" || audit.strength === "WEAK"
        ? "warning"
        : "accent",
    ),
    text(
      `[${"#".repeat(filled)}${"-".repeat(24 - filled)}] ${audit.totalBits.toFixed(2)} empirical bits`,
    ),
    text(
      `SHANNON     ${audit.bitsPerCharacter.toFixed(4)} bits/character × ${audit.length} characters`,
    ),
    text(
      `DIVERSITY   ${audit.uniqueCharacters} unique code points // estimated pool ${audit.poolCardinality}`,
    ),
    text(
      `POOL MODEL  ${audit.poolEstimateBits.toFixed(2)} bits (uniform independent selection assumption)`,
      "muted",
    ),
    ...audit.characterSets.map((set) =>
      text(
        `  ${set.name.padEnd(18)} ${set.count.toString().padStart(3)} chars // pool ${set.cardinality}`,
      ),
    ),
    text(
      `CRACK TIER  ${audit.crackTimeTier} // illustrative at 10^10 guesses/sec`,
    ),
    text(
      "Frequency entropy is descriptive, not a guarantee of password security; patterns and known phrases can be guessed much faster.",
      "muted",
    ),
  ];
}

export const CLI_COMMANDS: readonly CliCommand[] = [
  {
    name: "help",
    syntax: "help",
    description: "Command reference",
    execute: () =>
      result(
        text("AVAILABLE COMMANDS", "accent"),
        ...CLI_COMMANDS.map((command) =>
          text(
            `${command.syntax.padEnd(34)} ${command.description}${command.aliases?.length ? ` [${command.aliases.join(", ")}]` : ""}`,
          ),
        ),
        text(
          "Quote strings or pillar names containing spaces. Passwords and message payloads are redacted and excluded from history.",
          "muted",
        ),
      ),
  },
  {
    name: "projects",
    aliases: ["ls"],
    syntax: "projects [--pillar <name>]",
    description: "List active project nodes",
    execute: (args, context) => {
      if (args.length && (args[0] !== "--pillar" || args.length < 2))
        return failure('Usage: ls [--pillar "AI // QUANTUM"]');
      const pillar = args.slice(1).join(" ").toLowerCase();
      const nodes = active(context).filter(
        (node) =>
          !pillar ||
          node.pillar.toLowerCase() === pillar ||
          node.pillarShort.toLowerCase() === pillar,
      );
      if (!nodes.length)
        return result(text("No active nodes match this pillar.", "warning"));
      const headings = ["ID", "PILLAR", "STATUS", "VERSION"];
      const rows = nodes.map((node) => [
        node.id,
        node.pillarShort,
        node.status,
        node.version,
      ]);
      const widths = headings.map((heading, index) =>
        Math.max(heading.length, ...rows.map((row) => row[index].length)),
      );
      const align = (row: string[]) =>
        row.map((cell, index) => cell.padEnd(widths[index])).join(" | ");
      return result(
        text(`${nodes.length} ACTIVE NODES`, "accent"),
        { text: `${align(headings)} | LIVE  REPO`, nowrap: true },
        {
          text:
            widths.map((width) => "-".repeat(width)).join("-+-") +
            "-+-----------",
          tone: "muted",
          nowrap: true,
        },
        ...nodes.map((node, index) => ({
          text: `${align(rows[index])} | `,
          nowrap: true,
          links: [
            { label: "LIVE", href: safeExternalUrl(node.links.live) },
            { label: "REPO", href: safeExternalUrl(node.links.repo) },
          ],
        })),
      );
    },
  },
  {
    name: "inspect",
    aliases: ["cat"],
    syntax: "inspect <id>",
    description: "Full project telemetry dossier",
    execute: (args, context) => {
      if (args.length !== 1) return failure("Usage: inspect <id>");
      const node = findProject(args[0], registry(context));
      if (!node)
        return failure("Unknown project. Use ls to see active node IDs.");
      return result(
        text(`${node.title} // ${node.version} // ${node.status}`, "accent"),
        text(
          `ID: ${node.id} // ORDER: ${node.order} // FEATURED: ${node.featured ? "YES" : "NO"}`,
        ),
        text(`PILLAR: ${node.pillar} (${node.pillarShort})`),
        text(node.tagline),
        text(node.description),
        text("ARCHITECTURE", "accent"),
        ...node.architectureHighlights.map((item) => text(`  + ${item}`)),
        text(`STACK: ${node.techStack.join(" / ")}`),
        ...(node.cliMeta?.quickStat
          ? [text(`TELEMETRY: ${node.cliMeta.quickStat}`, "muted")]
          : []),
        { text: "LINKS: ", links: linksFor(node) },
      );
    },
  },
  {
    name: "select",
    syntax: "select <id | number>",
    description: "Focus a node in the spatial deck",
    execute: (args, context) => {
      if (args.length !== 1)
        return failure("Usage: select <id | number> (numbers start at 1)");
      const nodes = active(context);
      const target = /^\d+$/.test(args[0])
        ? nodes[Number(args[0]) - 1]
        : findProject(args[0], nodes);
      if (!target)
        return failure(
          "Node unavailable. Use ls; archived nodes cannot be selected.",
        );
      context.selectProject(nodes.indexOf(target));
      context.setViewMode("spatial");
      return result(
        text(`LOCK ACQUIRED // ${target.title} [${target.id}]`, "success"),
      );
    },
  },
  {
    name: "open",
    syntax: "open <id> [live | repo | docs]",
    description: "Open a project link",
    execute: (args, context) => {
      if (args.length < 1 || args.length > 2)
        return failure("Usage: open <id> [live | repo | docs]");
      const node = findProject(args[0], registry(context));
      if (!node) return failure("Unknown project. Use ls to see node IDs.");
      const kind = args[1] ?? "live";
      if (kind !== "live" && kind !== "repo" && kind !== "docs")
        return failure("Link type must be live, repo, or docs.");
      const href = safeExternalUrl(node.links[kind]);
      if (!href)
        return result(text("This URL has not been provided.", "warning"));
      context.openLink?.(href);
      return result(
        {
          text: "OPEN LINK // ",
          links: [{ label: `${node.title} (${kind})`, href }],
        },
        text(
          "If your browser blocked the new tab, use the link above.",
          "muted",
        ),
      );
    },
  },
  {
    name: "view",
    syntax: "view <spatial | grid>",
    description: "Switch the main viewport",
    execute: (args, context) => {
      if (args.length !== 1 || (args[0] !== "grid" && args[0] !== "spatial"))
        return failure("Usage: view <spatial | grid>");
      context.setViewMode(args[0]);
      return result(text(`VIEWPORT // ${args[0].toUpperCase()}`, "success"));
    },
  },
  {
    name: "stack",
    syntax: "stack",
    description: "Core engineering matrix",
    execute: () =>
      result(
        text("ENGINEERING MATRIX", "accent"),
        ...Object.entries(PROFILE_CONFIG.engineeringMatrix).flatMap(
          ([category, technologies]) => [
            text(category.toUpperCase(), "accent"),
            text(`  ${technologies.join(" / ")}`),
          ],
        ),
      ),
  },
  {
    name: "contact",
    aliases: ["uplink", "socials"],
    syntax: "contact",
    description: "Direct channels and operator verification",
    execute: () => {
      const { directChannels, thmTelemetry } = PROFILE_CONFIG.commsAndTelemetry;
      return result(
        text("COMMS UPLINK // DIRECT CHANNELS", "accent"),
        ...[directChannels.github, directChannels.linkedin].map((channel) => ({
          text: `${channel.label}  `,
          links: [{ label: channel.handle, href: channel.href }],
        })),
        {
          text: "EMAIL // ",
          links: [
            {
              label: directChannels.email.address,
              href: directChannels.email.href,
            },
          ],
        },
        {
          text: "TRYHACKME // ",
          links: [
            { label: thmTelemetry.handle, href: thmTelemetry.profileUrl },
          ],
        },
      );
    },
  },
  {
    name: "msg",
    aliases: ["transmit", "send"],
    syntax: "msg <return_email> <message...>",
    description: "Send a private message through the guarded email relay",
    execute: async (args, context) => {
      if (!args.length)
        return result(
          text("DIRECT TRANSMISSION // POST /api/contact", "accent"),
          text("Usage: msg <return_email> <message...>"),
          text(
            "Example: msg recruiter@company.com Loved the 3D deck and Q-Split architecture, let's chat!",
          ),
          text(
            "Message: 10–2000 characters. Your email and message are excluded from terminal history.",
            "muted",
          ),
          {
            text: "CHOOSE AN UPLINK // ",
            actions: [
              { label: "TYPE MSG IN CONSOLE", kind: "prefill", value: "msg " },
              { label: "OPEN DOSSIER MESSAGE FORM", kind: "contact" },
            ],
          },
        );
      const parsed = ContactSchema.safeParse({
        senderEmail: args[0],
        message: args.slice(1).join(" "),
        origin: "CLI_TERMINAL",
      });
      if (!parsed.success)
        return result(
          text("[1/3] ZOD SCHEMA VALIDATION: REJECTED", "error"),
          ...Object.entries(contactFieldErrors(parsed.error)).map(
            ([field, errors]) =>
              text(`${field}: ${errors?.join(" ")}`, "error"),
          ),
          text("Usage: msg <return_email> <message...>", "muted"),
        );
      const lines = [
        text("[1/3] ZOD SCHEMA VALIDATION: PASS", "success"),
        text("[2/3] DISPATCHING VIA RESEND RELAY...", "accent"),
      ];
      context.onProgress?.(lines);
      const transmission = await (context.sendContact ?? transmitContact)(
        parsed.data,
        { signal: context.signal },
      );
      if (!transmission.ok)
        return result(
          ...lines,
          text(
            `[3/3] ${transmission.code} // ${transmission.message}`,
            "error",
          ),
          ...Object.entries(transmission.fieldErrors ?? {}).map(
            ([field, errors]) =>
              text(`${field}: ${errors?.join(" ")}`, "error"),
          ),
        );
      return result(
        ...lines,
        text("[3/3] 200 OK // TRANSMISSION CONFIRMED", "success"),
        text(
          `PAYLOAD ACCEPTED FOR DELIVERY TO ${PROFILE_CONFIG.commsAndTelemetry.directChannels.email.address.toUpperCase()}`,
        ),
        text(
          "Resend accepted the message; inbox delivery is not yet verified.",
          "muted",
        ),
      );
    },
  },
  {
    name: "thm",
    syntax: "thm",
    description: "TryHackMe operator profile and live verification",
    execute: () => {
      const telemetry = PROFILE_CONFIG.commsAndTelemetry.thmTelemetry;
      return result(
        text(
          `TRYHACKME // ${telemetry.handle} // ${telemetry.league}`,
          "accent",
        ),
        {
          text: "VERIFY LIVE PROFILE // ",
          links: [{ label: telemetry.profileUrl, href: telemetry.profileUrl }],
        },
        text(
          "Rank, streak and room counts are supplied live by TryHackMe.",
          "muted",
        ),
      );
    },
  },
  {
    name: "whois",
    syntax: "whois",
    description: "Executive bio and education",
    execute: () =>
      result(
        text(PROFILE_CONFIG.legalName.toUpperCase(), "accent"),
        text(PROFILE_CONFIG.executiveBio),
        text(PROFILE_CONFIG.headline.trim()),
        ...PROFILE_CONFIG.education.flatMap((item) => [
          text(`${item.institution} (${item.subheader})`, "accent"),
          text(`  + ${item.qualification}`),
          ...item.highlights.map((highlight) => text(`  + ${highlight}`)),
          text(`  ${item.callout.label}: "${item.callout.text}"`),
          text(""),
        ]),
        text("CERTIFICATIONS & SPECIALIZATIONS", "accent"),
        ...PROFILE_CONFIG.specializations.map((item) => text(`  + ${item}`)),
        text(
          `${PROFILE_CONFIG.location} // ${PROFILE_CONFIG.systemStatus}`,
          "muted",
        ),
      ),
  },
  {
    name: "entropy",
    syntax: "entropy [--redact] <string>",
    description: "Local Shannon entropy audit",
    execute: (args) => {
      const secret = secretArgument(args);
      return secret === null
        ? failure('Usage: entropy [--redact] "your string"')
        : result(...entropyLines(calculateShannonEntropy(secret)));
    },
  },
  {
    name: "pwnd",
    syntax: "pwnd <password>",
    description: "Client-side k-anonymity breach check",
    execute: async (args, context) => {
      const secret = secretArgument(args);
      if (secret === null) return failure('Usage: pwnd "your password"');
      const audit = calculateShannonEntropy(secret);
      const breach = await (context.auditPassword ?? checkHibpKAnonymity)(
        secret,
        { signal: context.signal },
      );
      return result(
        text("K-ANONYMITY // CLIENT-SIDE SHA-1", "accent"),
        text(
          `PREFIX ${breach.prefix === "UNAVAILABLE" ? "UNAVAILABLE" : "ONLY"}  ${breach.prefix}`,
        ),
        text(`SUFFIX MASKED  ${breach.suffixMasked}`, "muted"),
        text(
          breach.offlineFallback
            ? "HIBP OFFLINE / UNAVAILABLE // breach status UNKNOWN; local telemetry remains available."
            : breach.isCompromised
              ? `COMPROMISED // ${breach.pwnedCount?.toLocaleString("en-US")} occurrences in the HIBP corpus`
              : "NO MATCH // 0 occurrences in the returned HIBP range",
          breach.offlineFallback
            ? "warning"
            : breach.isCompromised
              ? "error"
              : "success",
        ),
        text(
          "Only the five-character hash prefix is requested. The secret and full digest stay local.",
          "muted",
        ),
        ...entropyLines(audit),
      );
    },
  },
  {
    name: "iddqd",
    aliases: ["godmode"],
    syntax: "iddqd",
    description: "Toggle tactical overdrive",
    execute: (_args, context) => {
      const enabled = !context.godMode;
      context.setGodMode(enabled);
      return result(
        text(
          enabled
            ? "+======================================+\n|  I D D Q D  //  GODMODE ENGAGED        |\n|  [+++] UNLIMITED TELEMETRY [+++]       |\n+======================================+"
            : "GODMODE DISENGAGED // STANDARD TELEMETRY RESTORED",
          enabled ? "warning" : "muted",
        ),
      );
    },
  },
  {
    name: "clear",
    syntax: "clear",
    description: "Clear terminal scrollback",
    execute: () => ({ lines: [], action: "clear" }),
  },
  {
    name: "exit",
    aliases: ["close"],
    syntax: "exit",
    description: "Close the console",
    execute: (_args, context) => {
      context.closeTerminal();
      return { lines: [], action: "close" };
    },
  },
];

export async function runCliCommand(
  input: string,
  context: CliContext,
): Promise<CliResult> {
  try {
    const { name, args } = parseCommand(input);
    if (!name) return result();
    const command = CLI_COMMANDS.find(
      (item) => item.name === name || item.aliases?.includes(name),
    );
    if (!command)
      return failure("Unknown command. Type help for available commands.");
    return await command.execute(args, context);
  } catch {
    return failure(
      "Command could not complete. Check quotes and syntax with help; no input was logged.",
    );
  }
}

export function getAutocomplete(
  input: string,
  nodes: readonly ProjectNode[] = PROJECTS_REGISTRY,
): { value: string; suggestions: string[] } {
  if (isSensitiveCommand(input)) return { value: input, suggestions: [] };
  const trimmed = input.trimStart();
  const parts = trimmed.split(/\s+/);
  let candidates: string[];
  if (parts.length === 1)
    candidates = CLI_COMMANDS.flatMap((command) => [
      command.name,
      ...(command.aliases ?? []),
    ]);
  else if (
    parts.length === 2 &&
    ["inspect", "cat", "select", "open"].includes(parts[0].toLowerCase())
  )
    candidates = nodes.map((node) => node.id);
  else if (parts.length === 2 && parts[0].toLowerCase() === "view")
    candidates = ["spatial", "grid"];
  else if (parts.length === 3 && parts[0].toLowerCase() === "open")
    candidates = ["live", "repo", "docs"];
  else return { value: input, suggestions: [] };
  const prefix = parts.at(-1)!.toLowerCase();
  const matches = candidates
    .filter((candidate) => candidate.startsWith(prefix))
    .sort();
  let common = matches[0] ?? prefix;
  for (const match of matches)
    while (!match.startsWith(common)) common = common.slice(0, -1);
  const replacement = matches.length === 1 ? `${matches[0]} ` : common;
  const before = parts.slice(0, -1).join(" ");
  return {
    value: matches.length
      ? `${before ? `${before} ` : ""}${replacement}`
      : input,
    suggestions: matches.length > 1 ? matches : [],
  };
}
