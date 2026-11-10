// Requires Playwright and a running app. Override PORTFOLIO_BASE_URL / PLAYWRIGHT_MODULE if needed.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.PORTFOLIO_BASE_URL || "http://127.0.0.1:3000";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function beginTrace(page) {
  await page.evaluate(() => {
    window.stopDossierTrace?.();
    window.dossierTrace = {
      frames: [],
      focus: [],
      highlight: false,
      running: true,
    };
    const trace = window.dossierTrace;
    const state = () =>
      document.querySelector(".dossier-slide")?.dataset.motionState;
    const onFocus = (event) => {
      if (event.target.name === "senderName") trace.focus.push(state());
    };
    document.addEventListener("focusin", onFocus);
    window.stopDossierTrace = () => {
      trace.running = false;
      document.removeEventListener("focusin", onFocus);
    };
    function frame() {
      if (!trace.running) return;
      const sheet = document.querySelector(".dossier-sheet");
      if (sheet)
        trace.frames.push({
          x: sheet.getBoundingClientRect().left,
          scroll: document.querySelector(".dossier-scroll").scrollTop,
          state: state(),
          pageY: scrollY,
        });
      trace.highlight ||= !!document.querySelector("[data-dossier-highlight]");
      requestAnimationFrame(frame);
    }
    frame();
  });
}

async function assertTarget(page, reducedMotion = false) {
  await page.waitForFunction(
    () =>
      document.querySelector(".dossier-slide")?.dataset.motionState ===
      "settled",
  );
  await page.waitForFunction(
    () => document.activeElement?.name === "senderName",
  );
  await page.waitForFunction(() => {
    const field = document
      .querySelector('[name="senderName"]')
      ?.getBoundingClientRect();
    const scroll = document
      .querySelector(".dossier-scroll")
      ?.getBoundingClientRect();
    return (
      field &&
      scroll &&
      field.top >= scroll.top &&
      field.bottom <= scroll.bottom
    );
  });
  await wait(reducedMotion ? 80 : 700);
  const metrics = await page.evaluate(() => {
    const scroll = document.querySelector(".dossier-scroll");
    const form = document
      .querySelector(".contact-transmission")
      .getBoundingClientRect();
    const bounds = scroll.getBoundingClientRect();
    return {
      pageY: scrollY,
      overflow:
        document.documentElement.scrollWidth > innerWidth ||
        scroll.scrollWidth > scroll.clientWidth,
      formTop: form.top,
      centered: Math.abs(
        (form.top + form.bottom) / 2 - (bounds.top + bounds.bottom) / 2,
      ),
      fits: form.height <= scroll.clientHeight,
      frameCount: window.dossierTrace.frames.length,
      travel:
        Math.max(...window.dossierTrace.frames.map((f) => f.x)) -
        Math.min(...window.dossierTrace.frames.map((f) => f.x)),
      scrollPositions: new Set(
        window.dossierTrace.frames
          .filter((f) => f.state === "settled")
          .map((f) => Math.round(f.scroll)),
      ).size,
      focusStates: window.dossierTrace.focus,
      sawHighlight: window.dossierTrace.highlight,
      allPageYZero: window.dossierTrace.frames.every((f) => f.pageY === 0),
    };
  });
  assert.equal(metrics.pageY, 0);
  assert.equal(metrics.overflow, false);
  assert.ok(metrics.travel > 200, "drawer must physically slide in");
  assert.ok(metrics.focusStates.length > 0);
  assert.ok(
    metrics.focusStates.every((state) => state === "settled"),
    "Name must not steal focus mid-slide",
  );
  assert.equal(metrics.sawHighlight, !reducedMotion);
  assert.equal(metrics.allPageYZero, true);
  if (metrics.fits)
    assert.ok(metrics.centered < 3, "form should be centered when it fits");
  if (!reducedMotion)
    assert.ok(
      metrics.scrollPositions > 2,
      "drawer scroll should visibly progress smoothly",
    );
  return metrics;
}

async function close(page, method = "Escape") {
  if (method === "button")
    await page
      .getByRole("button", { name: "Close operator dossier", exact: true })
      .click();
  else await page.keyboard.press(method);
  await page.locator("#operator-dossier").waitFor({ state: "detached" });
  await page.evaluate(() => {
    window.stopDossierTrace?.();
  });
  assert.equal(await page.evaluate(() => scrollY), 0);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const errors = [],
      results = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (/hydration|did not match/i.test(message.text()))
        errors.push(message.text());
    });
    // These navigation tests must never submit a message or depend on vendor availability.
    await page.route("**/api/contact", () =>
      assert.fail("navigation must not transmit a message"),
    );
    await page.route("https://tryhackme.com/**", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: "window.__micspBadgeUnavailable?.();",
      }),
    );
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const pill = page.getByRole("button", {
      name: "Direct message: open transmission form",
      exact: true,
    });
    assert.equal(
      await pill.evaluate((el) =>
        el.previousElementSibling?.classList.contains("copy-email-button"),
      ),
      true,
    );
    const before = await page.evaluate(() => ({
      heroHeight: document
        .querySelector(".hero-identity")
        .getBoundingClientRect().height,
      uplinkHeight: document
        .querySelector(".hero-uplinks")
        .getBoundingClientRect().height,
      cardTop: document
        .querySelector('[data-offset="0"] .project-card')
        .getBoundingClientRect().top,
    }));
    assert.ok(
      before.uplinkHeight <= 34,
      "uplinks must stay in one compact row",
    );
    assert.ok(before.cardTop < 360, "deck must remain above the fold");
    for (let attempt = 0; attempt < 2; attempt++) {
      await beginTrace(page);
      await pill.click();
      results.push({ width: 1440, attempt, ...(await assertTarget(page)) });
      await page.waitForFunction(
        () => !document.querySelector("[data-dossier-highlight]"),
      );
      await close(page, attempt ? "button" : "Escape");
      assert.equal(
        await pill.evaluate((el) => el === document.activeElement),
        true,
      );
      assert.equal(
        await page
          .locator(".hero-identity")
          .evaluate((el) => el.getBoundingClientRect().height),
        before.heroHeight,
      );
    }
    // Preserve the CLI's original contact target and handoff behavior.
    await page.keyboard.press("`");
    await page.locator("#terminal-command").waitFor({ state: "visible" });
    await page
      .getByRole("navigation", { name: "Quick commands" })
      .getByRole("button", { name: "msg", exact: true })
      .click();
    await beginTrace(page);
    await page
      .getByRole("button", { name: "OPEN DOSSIER MESSAGE FORM", exact: true })
      .click();
    results.push({ origin: "CLI", ...(await assertTarget(page)) });
    await close(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await beginTrace(page);
    await pill.click();
    results.push({ width: 390, ...(await assertTarget(page)) });
    await close(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await wait(100);
    await beginTrace(page);
    await pill.click();
    results.push({ reducedMotion: true, ...(await assertTarget(page, true)) });
    await close(page);
    // Ordinary dossier and credentials triggers must still open their own sections.
    await page
      .getByRole("button", {
        name: "Operator dossier: bio and stack",
        exact: true,
      })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".dossier-slide")?.dataset.motionState ===
        "settled",
    );
    assert.equal(
      await page
        .locator('[name="senderName"]')
        .evaluate((el) => el === document.activeElement),
      false,
    );
    await close(page);
    await page
      .getByRole("button", {
        name: "View credentials: B.A. Business",
        exact: true,
      })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".dossier-slide")?.dataset.motionState ===
        "settled",
    );
    await page.waitForFunction(
      () => document.querySelector(".dossier-scroll")?.scrollTop > 100,
    );
    await close(page);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({ passed: true, before, results, errors }, null, 2),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
