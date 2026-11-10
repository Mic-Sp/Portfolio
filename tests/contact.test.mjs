import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContactSchema,
  sanitizeContactText,
} from "../src/lib/schemas/contact.schema.ts";
import { createContactHandler } from "../src/lib/contact-handler.ts";
import { createContactRateLimiter } from "../src/lib/contact-rate-limit.ts";
import { transmitContact } from "../src/lib/contact-client.ts";
import {
  runCliCommand,
  getCommandEcho,
  getHistoryCommand,
  getAutocomplete,
  parseCommand,
} from "../src/lib/cli-commands.ts";

const payload = {
  senderName: "Test Operator",
  senderEmail: "operator@example.com",
  message: "A test message for the portfolio.",
  origin: "DOSSIER_GUI",
};
const cli = {
  senderEmail: "operator@example.com",
  message: "Let's talk about a project!",
  origin: "CLI_TERMINAL",
};
function request(body = payload, headers = {}) {
  return new Request("https://portfolio.example/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "203.0.113.42",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
function fixture(options = {}) {
  const calls = [];
  const handler = createContactHandler({
    environment: () => ({ apiKey: "test-only-never-a-real-key" }),
    send: async (email, key) => {
      calls.push({ email, key });
      return { id: "mock-relay-id" };
    },
    ...options,
  });
  return { handler, calls };
}
const context = {
  godMode: false,
  selectProject() {},
  setViewMode() {},
  setGodMode() {},
  closeTerminal() {},
};
const output = (result) => result.lines.map((line) => line.text).join("\n");

test("strict shared schema accepts trimmed GUI/CLI payloads and applies CLI defaults", () => {
  const gui = ContactSchema.parse({
    ...payload,
    senderName: " Test Operator ",
    senderEmail: " operator@example.com ",
    message: " A test message for the portfolio. ",
    website: "",
  });
  assert.equal(gui.senderName, "Test Operator");
  assert.equal(gui.senderEmail, "operator@example.com");
  assert.equal(gui.message, payload.message);
  assert.equal(ContactSchema.parse(cli).senderName, "CLI_OPERATOR");
  assert.equal(ContactSchema.parse(cli).subject, "Portfolio Telemetry Uplink");
});

test("schema rejects injected keys, invalid emails/origins, short or oversized values and nonempty traps", () => {
  for (const invalid of [
    null,
    [],
    { ...payload, to: "attacker@example.com" },
    { ...payload, senderEmail: "not-email" },
    { ...payload, message: "short" },
    { ...payload, message: "x".repeat(2001) },
    { ...payload, senderName: "x" },
    { ...payload, senderName: "x".repeat(81) },
    { ...payload, senderEmail: `${"x".repeat(110)}@example.com` },
    { ...payload, subject: "x" },
    { ...payload, subject: "x".repeat(121) },
    { ...payload, origin: "INJECTED" },
    { ...payload, website: "https://spam.example" },
  ])
    assert.equal(ContactSchema.safeParse(invalid).success, false);
  assert.equal(
    ContactSchema.safeParse({
      ...payload,
      message: "x".repeat(10),
      senderName: "ab",
      subject: "ok",
    }).success,
    true,
  );
  assert.equal(
    ContactSchema.safeParse({
      ...payload,
      message: "x".repeat(2000),
      senderName: "a".repeat(80),
      subject: "x".repeat(120),
    }).success,
    true,
  );
});

test("sanitizer strips script/control sequences but preserves readable message newlines", () => {
  assert.equal(
    sanitizeContactText(
      "<SCRIPT>alert(1)</SCRIPT>Hello\u0000\u001b\u202e\nworld <b>again</b>",
    ),
    "Hello\nworld again",
  );
  assert.equal(sanitizeContactText("Hello\r\nBCC: no", false), "Hello BCC: no");
  assert.equal(sanitizeContactText("Safe text<script>unclosed"), "Safe text");
});

test("handler formats safe HTML/plaintext and fixes recipient/sender server-side for GUI and CLI", async () => {
  const { handler, calls } = fixture({
    environment: () => ({
      apiKey: "test-key",
      from: "Verified <uplink@example.com>",
      to: "owner@example.com",
    }),
    now: () => 0,
  });
  for (const origin of ["DOSSIER_GUI", "CLI_TERMINAL"]) {
    const response = await handler(
      request({
        ...payload,
        origin,
        senderName: "Operator\r\nTeam",
        message:
          "<script>secret-script</script>Hello & welcome <b>world</b>\n<developer@example.com>",
      }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "TRANSMITTED",
      id: "mock-relay-id",
    });
    assert.equal(response.headers.get("cache-control"), "no-store");
    const { email, key } = calls.at(-1);
    assert.equal(key, "test-key");
    assert.equal(email.to, "owner@example.com");
    assert.equal(email.from, "Verified <uplink@example.com>");
    assert.equal(email.replyTo, payload.senderEmail);
    assert.ok(email.subject.includes(`[PORTFOLIO // ${origin}]`));
    assert.doesNotMatch(email.subject, /[\r\n]/);
    assert.match(email.html, /Hello &amp; welcome world/);
    assert.doesNotMatch(email.html, /<script|<b>|secret-script/);
    assert.match(email.text, /1970-01-01T00:00:00.000Z/);
    assert.ok(email.text.includes(origin));
  }
});

test("handler escapes untrusted angle brackets and quotes rather than treating text as markup", async () => {
  const { handler, calls } = fixture();
  await handler(
    request({
      ...payload,
      message: "Math 2 < 3 & \"quoted\" with 'apostrophes'",
    }),
  );
  assert.match(
    calls[0].email.html,
    /2 &lt; 3 &amp; &quot;quoted&quot; with &#39;apostrophes&#39;/,
  );
  assert.equal(calls[0].email.to, "mic.sprague@gmail.com");
  assert.equal(calls[0].email.from, "Portfolio Uplink <onboarding@resend.dev>");
});

test("honeypot succeeds silently without calling the provider, even with no API key", async () => {
  const { handler, calls } = fixture({ environment: () => ({}) });
  const response = await handler(
    request({ ...payload, website: "spam.example" }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "TRANSMITTED",
    id: "honeypot-drop",
  });
  assert.equal(calls.length, 0);
});

test("honeypot does not bypass strict unknown-key and real-field validation", async () => {
  const { handler, calls } = fixture();
  for (const bad of [
    { ...payload, website: "spam", injected: true },
    { ...payload, website: "spam", senderEmail: "invalid" },
    { ...payload, website: 123 },
  ])
    assert.equal((await handler(request(bad))).status, 400);
  assert.equal(calls.length, 0);
});

test("structured validation errors do not echo private data or injected values", async () => {
  const { handler, calls } = fixture();
  const response = await handler(
    request({
      ...payload,
      senderEmail: "private-invalid-email",
      message: "tiny",
    }),
  );
  assert.equal(response.status, 400);
  const json = await response.json();
  assert.ok(json.error.fieldErrors.senderEmail);
  assert.deepEqual(json.error.fieldErrors.message, [
    "Message must be at least 10 characters",
  ]);
  assert.equal(JSON.stringify(json).includes("private-invalid-email"), false);
  const injected = await handler(
    request({ ...payload, to: "attacker@example.com" }),
  );
  assert.equal(injected.status, 400);
  assert.ok((await injected.json()).error.formErrors.length);
  assert.equal(calls.length, 0);
});

test("route bounds Content-Length and actual UTF-8 body bytes including chunked bodies", async () => {
  for (const headers of [
    { "content-length": "16385" },
    { "content-length": "1" },
    {},
  ]) {
    const { handler, calls } = fixture();
    const response = await handler(
      request({ ...payload, message: "é".repeat(9000) }, headers),
    );
    assert.equal(response.status, 413);
    assert.equal(calls.length, 0);
  }
});

test("malformed JSON, empty bodies, unsupported types and foreign browser origins fail cleanly", async () => {
  for (const [req, status] of [
    [request("{"), 400],
    [request(""), 400],
    [request(payload, { "Content-Type": "text/plain" }), 415],
    [request(payload, { origin: "https://foreign.example" }), 403],
  ]) {
    const { handler, calls } = fixture();
    assert.equal((await handler(req)).status, status);
    assert.equal(calls.length, 0);
  }
});

test("messages that sanitize to empty are rejected rather than dispatched", async () => {
  const { handler, calls } = fixture();
  assert.equal(
    (
      await handler(
        request({ ...payload, message: "<script>alert(1)</script>" }),
      )
    ).status,
    400,
  );
  assert.equal(calls.length, 0);
});

test("sliding limiter allows three per IP, emits Retry-After, isolates IPs and recovers", async () => {
  let time = 1000;
  const { handler, calls } = fixture({
    rateLimit: createContactRateLimiter({ now: () => time }),
  });
  for (let i = 0; i < 3; i++) {
    assert.equal((await handler(request())).status, 200);
    time += 1000;
  }
  const limited = await handler(request());
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "597");
  assert.equal((await limited.json()).error.code, "RATE_LIMITED");
  assert.equal(calls.length, 3);
  assert.equal(
    (await handler(request(payload, { "x-forwarded-for": "203.0.113.43" })))
      .status,
    200,
  );
  time = 601000;
  assert.equal((await handler(request())).status, 200);
  assert.equal((await handler(request())).status, 429); // Later requests are still in the sliding window.
});

test("limiter caps memory and sweeps expired IP records", () => {
  let time = 1000;
  const limit = createContactRateLimiter({ maxEntries: 2, now: () => time });
  assert.equal(limit("one").allowed, true);
  assert.equal(limit("two").allowed, true);
  assert.equal(limit("three").allowed, false);
  time += 600000;
  assert.equal(limit("three").allowed, true);
});

test("missing API key is a clean 503; provider failures never leak provider details", async () => {
  const missing = fixture({ environment: () => ({}) });
  assert.equal((await missing.handler(request())).status, 503);
  assert.equal(missing.calls.length, 0);
  for (const send of [
    async () => null,
    async () => {
      throw new Error("provider-key-and-private-payload");
    },
  ]) {
    const { handler } = fixture({ send });
    const response = await handler(request());
    assert.equal(response.status, 502);
    assert.equal(
      (await response.text()).includes("provider-key-and-private-payload"),
      false,
    );
  }
});

test("client validates before fetch, posts the strict trimmed payload and handles structured failures", async () => {
  let calls = 0;
  const fetcher = async (url, options) => {
    calls++;
    assert.equal(url, "/api/contact");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.equal(JSON.parse(options.body).senderEmail, cli.senderEmail);
    return Response.json({ status: "TRANSMITTED", id: "mock-id" });
  };
  assert.equal(
    (await transmitContact({ ...cli, senderEmail: "invalid" }, { fetcher })).ok,
    false,
  );
  assert.equal(calls, 0);
  assert.deepEqual(await transmitContact(cli, { fetcher }), {
    ok: true,
    id: "mock-id",
  });
  assert.equal(calls, 1);
  const failed = await transmitContact(cli, {
    fetcher: async () =>
      Response.json(
        { error: { code: "RATE_LIMITED", message: "Wait before retrying." } },
        { status: 429 },
      ),
  });
  assert.equal(failed.code, "RATE_LIMITED");
  assert.equal(failed.message, "Wait before retrying.");
  assert.equal(
    (
      await transmitContact(cli, {
        fetcher: async () => {
          throw Error("offline");
        },
      })
    ).code,
    "NETWORK_ERROR",
  );
});

test("msg usage exposes actionable GUI and command shortcuts without dispatch", async () => {
  const usage = await runCliCommand("msg", {
    ...context,
    sendContact: async () => assert.fail("must not dispatch"),
  });
  assert.match(output(usage), /Usage: msg/);
  assert.deepEqual(
    usage.lines.at(-1).actions.map((action) => action.kind),
    ["prefill", "contact"],
  );
  assert.equal(getAutocomplete("ms").value, "msg ");
});

test("message aliases validate locally, preserve natural prose and stream live relay telemetry", async () => {
  for (const name of ["msg", "send", "transmit"]) {
    let dispatched = false,
      progress = [];
    const result = await runCliCommand(
      `${name} operator@example.com Loved the 3D deck, let's chat!`,
      {
        ...context,
        onProgress: (lines) => {
          assert.equal(dispatched, false);
          progress = lines;
        },
        sendContact: async (data) => {
          dispatched = true;
          assert.equal(data.senderName, "CLI_OPERATOR");
          assert.equal(data.origin, "CLI_TERMINAL");
          assert.equal(data.message, "Loved the 3D deck, let's chat!");
          return { ok: true, id: "mock-id" };
        },
      },
    );
    assert.equal(progress.length, 2);
    assert.match(
      output(result),
      /\[1\/3\].*PASS[\s\S]*\[2\/3\].*DISPATCHING[\s\S]*\[3\/3\].*200 OK/,
    );
    assert.equal(dispatched, true);
  }
  assert.deepEqual(
    parseCommand('msg operator@example.com "A quoted test message"').args,
    ["operator@example.com", "A quoted test message"],
  );
});

test("invalid CLI messages never dispatch; relay errors are surfaced without claiming delivery", async () => {
  for (const command of [
    "msg invalid-email This message is long enough.",
    "send operator@example.com short",
  ]) {
    const result = await runCliCommand(command, {
      ...context,
      sendContact: async () => assert.fail("must validate first"),
    });
    assert.match(output(result), /VALIDATION: REJECTED/);
  }
  const failed = await runCliCommand(
    "msg operator@example.com This message is long enough.",
    {
      ...context,
      sendContact: async () => ({
        ok: false,
        code: "RATE_LIMITED",
        message: "Please wait.",
      }),
    },
  );
  assert.match(output(failed), /RATE_LIMITED.*Please wait/);
  assert.doesNotMatch(output(failed), /TRANSMISSION CONFIRMED/);
});

test("all message aliases redact private content from command echoes, history and completion", () => {
  for (const name of ["msg", "transmit", "send"]) {
    const input = `${name} private@example.com This message must not persist.`;
    assert.equal(getHistoryCommand(input), null);
    assert.equal(getCommandEcho(input), `${name} [REDACTED]`);
    assert.deepEqual(getAutocomplete(input).suggestions, []);
    assert.equal(getHistoryCommand(name), name);
  }
});
