// Requires Playwright and a running app. Override PORTFOLIO_BASE_URL / PLAYWRIGHT_MODULE if needed.
import assert from "node:assert/strict";
import { PROFILE_CONFIG } from "../../src/data/profile.config.ts";
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
  if (reducedMotion)
    assert.ok(metrics.travel < 1, "reduced motion must remove drawer travel");
  else assert.ok(metrics.travel > 200, "drawer must physically slide in");
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
      .getByRole("button", { name: "Close Bio & Credentials", exact: true })
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
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      colorScheme: "dark",
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
    const pill = page.locator(".top-hud").getByRole("button", {
      name: "Get in Touch",
      exact: true,
    });
    assert.equal(
      await page
        .locator(".hero-uplinks .thm-quick-link")
        .evaluate((el) =>
          el.previousElementSibling?.classList.contains("copy-email-button"),
        ),
      true,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Get in Touch", exact: true })
        .count(),
      2,
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
    assert.ok(
      before.cardTop < 500,
      `deck must remain above the fold beneath the section eyebrow (${before.cardTop}px)`,
    );
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
    await page.locator("#terminal-command").fill("whois");
    await page.locator("#terminal-command").press("Enter");
    await page.waitForFunction(() =>
      document
        .querySelector(".terminal-entry:last-child")
        ?.textContent.includes("P.A.I.S.E."),
    );
    const whois = await page.locator(".terminal-entry").last().innerText();
    for (const credential of PROFILE_CONFIG.education) {
      assert.ok(whois.includes(credential.qualification));
      assert.ok(whois.includes(credential.subheader));
      for (const highlight of credential.highlights)
        assert.ok(whois.includes(highlight));
      assert.ok(whois.includes(credential.callout.text));
    }
    await page
      .getByRole("navigation", { name: "Quick commands" })
      .getByRole("button", { name: "msg", exact: true })
      .click();
    await beginTrace(page);
    await page
      .getByRole("button", {
        name: "OPEN BIO & CREDENTIALS MESSAGE FORM",
        exact: true,
      })
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
      .locator(".top-hud")
      .getByRole("button", {
        name: "Bio & Credentials",
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
    const cards = page.locator(".dossier-education-card");
    assert.equal(await cards.count(), PROFILE_CONFIG.education.length);
    for (let i = 0; i < PROFILE_CONFIG.education.length; i++) {
      const credential = PROFILE_CONFIG.education[i];
      const card = cards.nth(i);
      assert.equal(
        await card.locator("h4").innerText(),
        credential.institution,
      );
      assert.equal(
        await card.locator(".dossier-institution-location").innerText(),
        credential.subheader,
      );
      assert.equal(
        await card.locator(".dossier-qualification").innerText(),
        credential.qualification,
      );
      assert.equal(await card.locator("li").count(), 2);
      for (const detail of credential.highlights)
        assert.ok((await card.innerText()).includes(detail));
      assert.equal(
        await card.locator(".dossier-capstone > span").innerText(),
        credential.callout.label,
      );
      assert.equal(
        await card.locator(".dossier-capstone > em").innerText(),
        `“${credential.callout.text}”`,
      );
    }
    const geometry = await cards.evaluateAll((elements) =>
      elements.map((el) => ({
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
        dividerTop: el
          .querySelector(".dossier-capstone")
          .getBoundingClientRect().top,
        labelTop: el
          .querySelector(".dossier-capstone > span")
          .getBoundingClientRect().top,
      })),
    );
    for (const key of ["width", "height", "dividerTop", "labelTop"])
      assert.ok(
        Math.max(...geometry.map((card) => card[key])) -
          Math.min(...geometry.map((card) => card[key])) <
          1,
        `credential ${key} must align`,
      );
    if (process.env.PORTFOLIO_SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/dossier-credentials-desktop.png`,
      });
    results.push({ credentials: geometry });
    const channels = PROFILE_CONFIG.commsAndTelemetry.directChannels;
    const comms = page.locator(".comms-direct-grid");
    await comms.evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    const commsCards = comms.locator(".comms-channel-card");
    assert.equal(await commsCards.count(), 3);
    const expectedComms = [
      { ...channels.github, action: "OPEN GITHUB PROFILE", status: "ONLINE" },
      {
        ...channels.linkedin,
        action: "CONNECT ON LINKEDIN",
        status: "VERIFIED",
      },
      {
        ...channels.email,
        handle: channels.email.address,
        label: "DIRECT EMAIL",
        action: "SEND MAILTO",
        status: "ONLINE",
      },
    ];
    for (let i = 0; i < expectedComms.length; i++) {
      const expected = expectedComms[i],
        card = commsCards.nth(i);
      assert.equal(await card.locator("h4").innerText(), expected.label);
      assert.equal(
        await card.locator(".comms-channel-handle").innerText(),
        expected.handle,
      );
      assert.equal(
        await card.locator(".comms-channel-description").innerText(),
        expected.description,
      );
      assert.equal(
        await card.locator(".comms-channel-status").innerText(),
        expected.status,
      );
      assert.equal(
        await card
          .getByRole("link", { name: expected.action, exact: true })
          .getAttribute("href"),
        expected.href,
      );
      assert.equal(
        await card.locator(".comms-channel-actions").getByRole("link").count(),
        1,
      );
    }
    const commsGeometry = () =>
      commsCards.evaluateAll((elements) =>
        elements.map((el) => ({
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
          readoutTop: el
            .querySelector(".comms-channel-readout")
            .getBoundingClientRect().top,
          footerTop: el
            .querySelector(".comms-channel-actions")
            .getBoundingClientRect().top,
          buttonHeight: el
            .querySelector(".comms-channel-action")
            .getBoundingClientRect().height,
        })),
      );
    const beforeCopy = await commsGeometry();
    for (const key of [
      "width",
      "height",
      "readoutTop",
      "footerTop",
      "buttonHeight",
    ])
      assert.ok(
        Math.max(...beforeCopy.map((card) => card[key])) -
          Math.min(...beforeCopy.map((card) => card[key])) <
          1,
        `comms ${key} must align`,
      );
    assert.ok(beforeCopy.every((card) => card.buttonHeight >= 44));
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"], {
        origin: base,
      });
    const copyEmail = comms.getByRole("button", {
      name: `Copy email address ${channels.email.address}`,
      exact: true,
    });
    await copyEmail.click();
    await page.waitForFunction(
      () =>
        document.querySelector(".comms-email-card .copy-email-button")?.dataset
          .copyStatus === "copied",
    );
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      channels.email.address,
    );
    assert.equal(await copyEmail.innerText(), "COPIED ✓");
    assert.deepEqual(
      await commsGeometry(),
      beforeCopy,
      "copy confirmation must not shift the cards",
    );
    if (process.env.PORTFOLIO_SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/dossier-comms-desktop.png`,
      });
    results.push({ comms: beforeCopy, clipboard: "passed" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .locator(".dossier-education-grid")
      .evaluate((el) =>
        el.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    assert.equal(
      await page
        .locator(".dossier-education-grid")
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        ),
      1,
    );
    assert.equal(
      await page
        .locator(".dossier-scroll")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
      true,
    );
    if (process.env.PORTFOLIO_SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/dossier-credentials-mobile.png`,
      });
    await comms.evaluate((el) =>
      el.scrollIntoView({ block: "start", behavior: "instant" }),
    );
    assert.equal(
      await comms.evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      ),
      1,
    );
    assert.equal(
      await page
        .locator(".dossier-scroll")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
      true,
    );
    await commsCards.last().scrollIntoViewIfNeeded();
    assert.ok(
      (
        await commsCards
          .last()
          .getByRole("link", { name: "SEND MAILTO", exact: true })
          .boundingBox()
      ).width >= 100,
    );
    if (process.env.PORTFOLIO_SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/dossier-comms-mobile.png`,
      });
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
