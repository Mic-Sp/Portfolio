import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateShannonEntropy,
  checkHibpKAnonymity,
} from "../src/lib/crypto-auditor.ts";

test("empirical entropy handles empty, repeated, balanced, and Unicode code points", () => {
  const empty = calculateShannonEntropy("");
  assert.equal(empty.totalBits, 0);
  assert.equal(empty.poolCardinality, 0);
  assert.equal(empty.strength, "CRITICAL");
  assert.equal(calculateShannonEntropy("aaaaaaaa").totalBits, 0);
  assert.equal(calculateShannonEntropy("aabb").bitsPerCharacter, 1);
  assert.equal(calculateShannonEntropy("aabb").totalBits, 4);
  assert.equal(calculateShannonEntropy("abcd").totalBits, 8);
  assert.equal(calculateShannonEntropy(" \t\n").poolCardinality, 3);
  const unicode = calculateShannonEntropy("😀😀🦊🦊");
  assert.equal(unicode.length, 4);
  assert.equal(unicode.totalBits, 4);
  assert.equal(unicode.poolCardinality, 2);
  const mixed = calculateShannonEntropy("aA1! ");
  assert.equal(mixed.poolCardinality, 95);
  assert.equal(mixed.characterSets.length, 5);
  assert.ok(Math.abs(mixed.bitsPerCharacter - Math.log2(5)) < 1e-10);
});

test("in-flight cancellation resolves even if the transport ignores its signal", async () => {
  const controller = new AbortController();
  const started = Date.now();
  const pending = checkHibpKAnonymity("password", {
    signal: controller.signal,
    timeoutMs: 1000,
    fetcher: () => new Promise(() => {}),
  });
  setTimeout(() => controller.abort(), 10);
  const audit = await pending;
  assert.equal(audit.offlineFallback, true);
  assert.ok(Date.now() - started < 700);
});

test("strength thresholds and illustrative tiers are monotonic without overflow", () => {
  const ratings = [
    "CRITICAL",
    "WEAK",
    "MODERATE",
    "STRONG",
    "ENTROPY_FORTRESS",
  ];
  const samples = [
    "aaa",
    "abcdefghij",
    "abcdefghijkl",
    "abcdefghijklmnop",
    "abcdefghijklmnopqrst",
  ];
  assert.deepEqual(
    samples.map((input) => calculateShannonEntropy(input).strength),
    ratings,
  );
  assert.equal(
    calculateShannonEntropy("ab".repeat(10000)).crackTimeTier,
    "CENTURIES+",
  );
});

test("HIBP sends only the uppercase five-character prefix, matches locally, and masks all suffix characters", async () => {
  const suffix = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";
  let request;
  const audit = await checkHibpKAnonymity("password", {
    fetcher: async (url, init) => {
      request = { url, init };
      return new Response(
        `${"A".repeat(35)}:0\r\n${suffix.toLowerCase()}:12345\r\n`,
      );
    },
  });
  assert.equal(request.url, "https://api.pwnedpasswords.com/range/5BAA6");
  assert.equal(request.init.method, "GET");
  assert.equal(request.init.body, undefined);
  assert.equal(request.init.headers["Add-Padding"], "true");
  assert.equal(request.init.referrerPolicy, "no-referrer");
  assert.equal(audit.prefix, "5BAA6");
  assert.equal(audit.suffixMasked, "*".repeat(35));
  assert.equal(audit.pwnedCount, 12345);
  assert.equal(audit.isCompromised, true);
  assert.equal(audit.offlineFallback, false);
  assert.equal(JSON.stringify(audit).includes(suffix), false);
});

test("no match is distinct from offline, malformed, HTTP error, timeout, or cancelled status", async () => {
  const clean = await checkHibpKAnonymity("password", {
    fetcher: async () => new Response(`${"A".repeat(35)}:0`),
  });
  assert.equal(clean.pwnedCount, 0);
  assert.equal(clean.isCompromised, false);
  for (const fetcher of [
    async () => {
      throw new Error("offline");
    },
    async () => new Response("bad"),
    async () => new Response("", { status: 503 }),
    () => new Promise(() => {}),
  ]) {
    const audit = await checkHibpKAnonymity("password", {
      fetcher,
      timeoutMs: 10,
    });
    assert.equal(audit.prefix, "5BAA6");
    assert.equal(audit.offlineFallback, true);
    assert.equal(audit.pwnedCount, null);
    assert.equal(audit.isCompromised, null);
  }
  const controller = new AbortController();
  controller.abort();
  const cancelled = await checkHibpKAnonymity("password", {
    signal: controller.signal,
    fetcher: async () => {
      assert.fail("must not send");
    },
  });
  assert.equal(cancelled.offlineFallback, true);
});
