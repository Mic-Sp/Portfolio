import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { labProjects } from "../../src/data/cube-config.ts";
import { WORLDLINE_CONFIRMATION } from "../../src/data/worldline.config.ts";
import { checkRenderedTextContrast } from "./helpers/contrast.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.PORTFOLIO_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  args: ["--no-sandbox"],
});
const results = [],
  errors = [],
  contrast = [];

async function open(page) {
  await page.locator(".cube-inspector-trigger").click();
  await page.locator("#spatial-cube-modal").waitFor();
  await page.waitForFunction(() => {
    const panel = document.querySelector(".cube-modal-panel");
    return panel && new DOMMatrix(getComputedStyle(panel).transform).isIdentity;
  });
  await showFace(page, "Front");
}
async function showFace(page, face) {
  await page
    .getByRole("button", { name: `Inspect ${face} face`, exact: true })
    .click();
  await page.waitForFunction(
    (face) =>
      document
        .querySelector(".cube-face-detail")
        ?.getAttribute("aria-label") === `${face} face details`,
    face,
  );
}
async function external(link, href) {
  assert.equal(await link.getAttribute("href"), href);
  assert.equal(await link.getAttribute("target"), "_blank");
  assert.equal(await link.getAttribute("rel"), "noopener noreferrer");
  await link.evaluate((el) =>
    el.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await link.click({ trial: true });
}
async function tabTo(page, locator) {
  for (let i = 0; i < 50; i++) {
    if (await locator.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  assert.fail("Control is not reachable by Tab");
}
async function scan(page, state) {
  if (!process.env.AXE_PATH) return;
  await page.addScriptTag({ path: process.env.AXE_PATH });
  const violations = await page.evaluate(async () =>
    (
      await window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      })
    ).violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map((node) => node.target),
    })),
  );
  assert.deepEqual(violations, [], state);
}
async function tracePulse(page) {
  await page.locator("#spatial-cube-modal").evaluate((el) => {
    window.labPulse = null;
    const observer = new MutationObserver(() => {
      if (el.dataset.worldlinePulse === "true") {
        window.labPulse = {
          visual: !!el.querySelector(".cube-worldline-pulse"),
        };
        observer.disconnect();
      }
    });
    observer.observe(el, {
      attributes: true,
      attributeFilter: ["data-worldline-pulse"],
    });
  });
}
async function confirm(page, activation, reduced, expectedCount = 1) {
  await showFace(page, "Top");
  const detail = page.locator(".cube-face-detail");
  assert.equal(await detail.locator(".nixie-digits").innerText(), "1.048596");
  assert.equal(
    await page.locator("#developer-console").count(),
    0,
    "quick-snap must not launch the Easter egg",
  );
  await tracePulse(page);
  const control =
    activation === "face-click"
      ? page.getByRole("button", { name: "Activate Top face", exact: true })
      : activation === "face-space"
        ? page.locator(".cube-face-top .cube-divergence-meter")
        : detail.getByRole("button", {
            name: "Confirm Worldline 1.048596",
            exact: true,
          });
  if (activation === "face-click") {
    await control.evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await control.click();
  } else {
    await tabTo(page, control);
    await page.keyboard.press(activation.endsWith("space") ? "Space" : "Enter");
  }
  await page.locator("#spatial-cube-modal").waitFor({ state: "detached" });
  await page.waitForFunction(
    () => document.activeElement?.id === "terminal-command",
  );
  assert.equal(
    await page.locator(".telemetry-frame").getAttribute("inert"),
    null,
  );
  assert.equal(
    await page.locator(".telemetry-frame").getAttribute("aria-hidden"),
    null,
  );
  assert.equal(await page.evaluate(() => document.body.style.overflow), "");
  assert.equal(
    await page
      .locator(".terminal-line > span")
      .filter({ hasText: WORLDLINE_CONFIRMATION })
      .count(),
    expectedCount,
  );
  assert.equal((await page.evaluate(() => window.labPulse)).visual, !reduced);
}
async function closeConsole(page) {
  await page.locator("#terminal-command").press("Escape");
  await page.locator("#developer-console").waitFor({ state: "detached" });
  assert.equal(
    await page
      .locator(".cube-inspector-trigger")
      .evaluate((el) => el === document.activeElement),
    true,
  );
}

async function checkMedia(page, theme, width) {
  const image = page.locator(".cube-face-front .cube-face-artwork img");
  await image.waitFor();
  await page.waitForFunction(() => {
    const image = document.querySelector(
      ".cube-face-front .cube-face-artwork img",
    );
    return image?.complete && image.naturalWidth > 0;
  });
  assert.equal(
    await image.getAttribute("alt"),
    labProjects[0].previewImage.alt,
  );
  const artwork = await image.evaluate((el) => {
    const css = getComputedStyle(el.parentElement);
    return {
      opacity: css.opacity,
      blend: css.mixBlendMode,
      mask: css.maskImage,
      pointer: css.pointerEvents,
      select: css.userSelect,
    };
  });
  assert.equal(artwork.opacity, theme === "light" ? "0.25" : "0.35");
  assert.equal(artwork.blend, theme === "light" ? "multiply" : "screen");
  assert.match(artwork.mask, /radial-gradient/);
  assert.equal(artwork.pointer, "none");
  assert.equal(artwork.select, "none");
  assert.equal(
    await page.locator(".cube-video-frame").count(),
    0,
    "No third-party player before activation",
  );
  const faceWatch = page.locator(".cube-face-front .cube-watch-demo");
  await faceWatch.click();
  const player = page.locator(".cube-video-frame");
  await player.waitFor();
  assert.equal(await player.getAttribute("src"), labProjects[0].videoDemoUrl);
  assert.equal(await player.getAttribute("title"), "Vivi's Dream — Tech Demo");
  assert.equal(await page.locator(".inspector-cube iframe").count(), 0);
  assert.equal(
    await player.evaluate((el) => !!el.closest(".cube-face-detail")),
    true,
  );
  const box = await player.boundingBox();
  assert.ok(Math.abs(box.width / box.height - 16 / 9) < 0.02);
  const close = page.getByRole("button", {
    name: "[ CLOSE VIDEO ]",
    exact: true,
  });
  assert.equal(
    await close.evaluate((el) => el === document.activeElement),
    true,
  );
  // Real cross-origin players own their arrow keys. A local fixture exercises
  // that boundary without relying on YouTube availability or playback policy.
  const frameControl = page
    .frameLocator(".cube-video-frame")
    .getByRole("button", { name: "Video controls" });
  await frameControl.focus();
  const before = await page.locator(".inspector-cube").getAttribute("style");
  await frameControl.press("ArrowRight");
  assert.equal(
    await page.locator(".inspector-cube").getAttribute("style"),
    before,
  );
  await close.click();
  await player.waitFor({ state: "detached" });
  assert.equal(
    await faceWatch.evaluate((el) => el === document.activeElement),
    true,
  );

  const detailWatch = page.locator(".cube-face-detail .cube-watch-demo");
  await tabTo(page, detailWatch);
  await page.keyboard.press("Enter");
  await player.waitFor();
  await scan(page, `${width}px ${theme}: flat video player`);
  assert.equal(
    await page
      .locator(".cube-modal-panel")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
    true,
  );
  if (process.env.PORTFOLIO_SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/lab-video-${theme}-${width}.png`,
    });
  // Rotation remains usable while the independent flat player is open.
  await page
    .getByRole("button", { name: "Inspect Right face", exact: true })
    .click();
  assert.equal(await player.count(), 1);
  assert.equal(
    await page.locator(".inspector-cube").getAttribute("data-rotate-y"),
    "-90.000",
  );
  await close.click();
  assert.equal(
    await page
      .getByRole("button", { name: "Inspect Front face", exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
    "Return to face navigation when the original trigger is no longer rendered",
  );
  await showFace(page, "Front");
  await detailWatch.focus();
  await page.keyboard.press("Space");
  await player.waitFor();
  await page.keyboard.press("Escape");
  await player.waitFor({ state: "detached" });
  assert.equal(
    await detailWatch.evaluate((el) => el === document.activeElement),
    true,
  );
  assert.equal(await page.locator("#spatial-cube-modal").count(), 1);
}

try {
  if (process.env.PORTFOLIO_SCREENSHOT_DIR)
    await mkdir(process.env.PORTFOLIO_SCREENSHOT_DIR, { recursive: true });
  for (const [width, height, theme, reduced, activation] of [
    [1440, 1100, "dark", false, "face-click"],
    [1440, 1100, "light", false, "detail-enter"],
    [375, 844, "light", false, "face-space"],
    [640, 450, "dark", true, "detail-space"],
    [320, 844, "light", true, "detail-enter"],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      colorScheme: theme,
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (/Blocked aria-hidden|hydration|did not match/i.test(message.text()))
        errors.push(message.text());
    });
    await page.route("**/api/contact", () =>
      assert.fail("Lab checks must not send messages"),
    );
    await page.route("https://tryhackme.com/**", (route) => route.abort());
    await page.route("https://www.youtube-nocookie.com/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><html lang="en"><title>Video fixture</title><body><button>Video controls</button></body></html>',
      }),
    );
    await page.goto(base, { waitUntil: "networkidle" });
    await open(page);
    const detail = page.locator(".cube-face-detail");
    assert.equal(
      await detail.getByRole("heading", { level: 3 }).innerText(),
      "Vivi's Dream",
    );
    assert.equal(
      await detail.locator(".cube-detail-summary").innerText(),
      labProjects[0].summary,
    );
    assert.deepEqual(
      await detail.locator(".cube-lab-tags li").allTextContents(),
      ["PyTorch", "Real-ESRGAN", "FFmpeg", "OpenCV", "FLUX.1"],
    );
    await checkMedia(page, theme, width);
    await external(
      detail.getByRole("link", { name: "Live Demo ↗", exact: true }),
      labProjects[0].liveUrl,
    );
    await external(
      page.locator(".cube-face-front .cube-face-actions a"),
      labProjects[0].liveUrl,
    );
    // Exercise keyboard activation without making a request to the live site.
    await page.context().route(labProjects[0].liveUrl, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<title>Lab demo navigation fixture</title>",
      }),
    );
    await tabTo(
      page,
      detail.getByRole("link", { name: "Live Demo ↗", exact: true }),
    );
    const popupPromise = page.waitForEvent("popup");
    await page.keyboard.press("Enter");
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    assert.equal(popup.url(), labProjects[0].liveUrl);
    await popup.close();
    await page.bringToFront();
    if (width === 1440)
      for (const [face, eyebrow] of [
        ["Right", "02 // R&D QUEUE"],
        ["Back", "03 // R&D QUEUE"],
        ["Left", "04 // R&D QUEUE"],
      ]) {
        await showFace(page, face);
        assert.equal(
          await detail.locator(".cube-eyebrow").innerText(),
          eyebrow,
        );
        assert.equal(
          await detail.locator("h3").innerText(),
          "LAB SLOT // OPEN",
        );
        assert.equal(
          await detail.locator(".cube-detail-summary").innerText(),
          "Reserved for upcoming AI, AppSec, and game prototypes",
        );
      }
    await showFace(page, "Bottom");
    for (const [label, href] of [
      ["GitHub ↗", "https://github.com/Mic-Sp"],
      ["TryHackMe ↗", "https://tryhackme.com/p/mic.drop"],
    ]) {
      await external(
        detail.getByRole("link", { name: label, exact: true }),
        href,
      );
      await external(
        page
          .locator(".cube-face-bottom")
          .getByRole("link", { name: label, exact: true }),
        href,
      );
    }
    await showFace(page, "Front");
    const core = page.getByRole("button", {
      name: "Toggle Amber Worldline Mode",
      exact: true,
    });
    await core.evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await core.click();
    assert.equal(await core.getAttribute("aria-pressed"), "true");
    assert.equal(
      await page.locator(".cube-worldline-state").innerText(),
      "WORLDLINE: 1.048596 // AMBER",
    );
    assert.equal(
      await page
        .locator(".cube-face-front")
        .evaluate((el) => getComputedStyle(el, "::before").borderTopColor),
      "rgb(255, 170, 0)",
    );
    await scan(page, `${width}px ${theme}: amber lab`);
    contrast.push(
      ...(await checkRenderedTextContrast(
        page,
        ".cube-face-detail h3, .cube-detail-summary, .cube-lab-tags li, .cube-detail-actions :is(a, button), .cube-face-actions .cube-watch-demo, .cube-worldline-state, .cube-face-label > span, .cube-eyebrow",
        `${width}px ${theme}: amber lab`,
      )),
    );
    await core.focus();
    await page.keyboard.press("Space");
    assert.equal(await core.getAttribute("aria-pressed"), "false");
    await showFace(page, "Top");
    await scan(page, `${width}px ${theme}: worldline`);
    contrast.push(
      ...(await checkRenderedTextContrast(
        page,
        ".cube-detail-heading h3, .cube-divergence-meter .nixie-digits, .cube-meter-caption, .cube-worldline-state",
        `${width}px ${theme}: worldline`,
      )),
    );
    if (process.env.PORTFOLIO_SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/lab-${theme}-${width}.png`,
      });
    await confirm(page, activation, reduced);
    for (const [index, command] of ["divergence", "elpsykongroo"].entries()) {
      const input = page.locator("#terminal-command");
      await input.fill(command);
      await input.press("Enter");
      await page.waitForFunction(
        ({ readout, count }) =>
          [...document.querySelectorAll(".terminal-line > span")].filter(
            (el) => el.textContent === readout,
          ).length === count,
        { readout: WORLDLINE_CONFIRMATION, count: index + 2 },
      );
    }
    const input = page.locator("#terminal-command");
    await input.fill("help");
    await input.press("Enter");
    await page.waitForFunction(() =>
      document
        .querySelector(".terminal-entry:last-child .terminal-result")
        ?.textContent.includes("AVAILABLE COMMANDS"),
    );
    assert.doesNotMatch(
      await page
        .locator(".terminal-entry:last-child .terminal-result")
        .innerText(),
      /divergence|elpsykongroo/,
    );
    await closeConsole(page);
    if (width === 1440 && theme === "dark") {
      await open(page);
      await confirm(page, "detail-enter", reduced, 4);
      await closeConsole(page);
    }
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    results.push({ width, height, theme, reduced, activation, passed: true });
    await page.close();
  }
  const missing = await browser.newPage({
    viewport: { width: 375, height: 844 },
  });
  await missing.route("https://tryhackme.com/**", (route) => route.abort());
  await missing.route("**/images/lab/vivis-dream-preview.png", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await missing.goto(base, { waitUntil: "networkidle" });
  await open(missing);
  await missing.locator(".cube-face-artwork").waitFor({ state: "detached" });
  await missing
    .getByRole("button", { name: "Toggle Amber Worldline Mode", exact: true })
    .click();
  assert.equal(
    await missing
      .locator("#spatial-cube-modal")
      .getAttribute("data-worldline-mode"),
    "amber",
  );
  assert.equal(
    await missing.locator(".cube-face-front .cube-watch-demo").isVisible(),
    true,
  );
  await missing.keyboard.press("Escape");
  await missing.locator("#spatial-cube-modal").waitFor({ state: "detached" });
  await missing.close();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        passed: true,
        results,
        contrastSamples: contrast.length,
        minimumContrast: Math.min(...contrast.map(({ ratio }) => ratio)),
        errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
