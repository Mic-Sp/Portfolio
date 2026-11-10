import assert from "node:assert/strict";
import { test } from "node:test";
import { PROFILE_CONFIG } from "../src/data/profile.config.ts";
import {
  createThmBadgeDocument,
  THM_BADGE_MESSAGE,
} from "../src/lib/thm-badge.ts";

test("badge document uses the configured parser-time script and reports responsive dimensions", () => {
  const url = PROFILE_CONFIG.commsAndTelemetry.thmTelemetry.badgeScriptUrl;
  const document = createThmBadgeDocument(url);
  assert.ok(document.includes(`<script src="${url}"`));
  assert.ok(
    document.includes(
      "html,body{margin:0;padding:0;overflow:hidden;background:transparent",
    ),
  );
  assert.ok(document.includes(THM_BADGE_MESSAGE));
  assert.ok(document.includes("ResizeObserver"));
  assert.ok(document.includes("setAttribute('scrolling','no')"));
  assert.ok(document.includes("status:'unavailable'"));
});

test("badge document rejects unrelated origins and escapes script URL attributes", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://tryhackme.com/badge/t/demo",
    "https://example.com/badge/t/demo",
    "https://tryhackme.com/p/mic.drop",
  ])
    assert.throws(() => createThmBadgeDocument(url));
  const document = createThmBadgeDocument(
    'https://tryhackme.com/badge/t/demo?theme=dark&value="<test>',
  );
  assert.ok(document.includes("theme=dark&amp;value=&quot;&lt;test&gt;"));
});
