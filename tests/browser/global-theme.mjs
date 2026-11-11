// Requires Playwright and a production preview. All external messaging is blocked.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.PORTFOLIO_BASE_URL || "http://127.0.0.1:3000";
const screenshots = process.env.PORTFOLIO_SCREENSHOT_DIR;
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const selected = (page) =>
  page.locator('[data-offset="0"]').getAttribute("data-node-id");

async function waitForTheme(page, theme) {
  await page.waitForFunction(
    (theme) =>
      document.documentElement.dataset.theme === theme &&
      document.querySelector(".telemetry-frame").dataset.theme === theme,
    theme,
  );
  await wait(250);
}
async function palette(page) {
  return page.evaluate(() => {
    const css = (selector) =>
      getComputedStyle(document.querySelector(selector));
    const card = '.spatial-card-slot[data-offset="0"] .project-card';
    return {
      canvas: css(".telemetry-frame").backgroundColor,
      hud: css(".top-hud").backgroundColor,
      hero: css(".hero-identity h1").color,
      surface: css(card).backgroundColor,
      title: css(`${card} h3`).color,
      body: css(`${card} .project-description`).color,
      shadow: css(card).boxShadow,
      blur: css(card).backdropFilter,
      tray: css(`${card} .project-schematic`).backgroundColor,
      module: css(`${card} .schematic-modules > div`).backgroundColor,
      footer: css(`${card} .project-links a`).color,
      footerBar: css(".bottom-hud").backgroundColor,
      perspective: css(".spatial-stage").perspective,
      transformStyle: css(".spatial-stage").transformStyle,
      cardTop: document.querySelector(card).getBoundingClientRect().top,
      transforms: Array.from(
        document.querySelectorAll(".spatial-card-slot"),
        (el) => el.style.transform,
      ),
    };
  });
}
async function clickWing(page, id) {
  const wing = page.locator(`[data-node-id="${id}"] .spatial-card-select`);
  const point = await wing.evaluate((el) => {
    const bounds = el.getBoundingClientRect();
    const top =
      document.querySelector(".top-hud").getBoundingClientRect().bottom + 5;
    const bottom =
      document.querySelector(".bottom-hud").getBoundingClientRect().top - 5;
    for (
      let y = Math.max(bounds.top + 8, top);
      y < Math.min(bounds.bottom - 8, bottom);
      y += 12
    )
      for (
        let x = Math.max(bounds.left + 5, 5);
        x < Math.min(bounds.right - 5, innerWidth - 5);
        x += 8
      ) {
        const hit = document.elementFromPoint(x, y);
        if (hit && (hit === el || el.contains(hit))) return { x, y };
      }
    return null;
  });
  assert.ok(point, "Wing should retain an exposed click target");
  await page.mouse.click(point.x, point.y);
  await wait(900);
  assert.equal(await selected(page), id);
}
async function swipe(page, touch = false) {
  const target = page.locator('[data-offset="0"] .project-tagline');
  await target.evaluate((el) =>
    el.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  const b = await target.boundingBox(),
    x = b.x + b.width / 2,
    y = b.y + b.height / 2;
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 12; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x - (150 * i) / 12, y }],
      });
      await wait(15);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 150, y, { steps: 16 });
    await page.mouse.up();
  }
  await wait(900);
}

try {
  if (screenshots) await mkdir(screenshots, { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [],
    results = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/hydration|did not match/i.test(message.text()))
      errors.push(message.text());
  });
  await page.route("**/api/contact", () =>
    assert.fail("Theme checks must not send email"),
  );
  await page.route("https://tryhackme.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "window.__micspBadgeUnavailable?.();",
    }),
  );
  await page.goto(base, { waitUntil: "networkidle" });
  await waitForTheme(page, "dark");
  await wait(900);
  const dark = await palette(page);
  const toggle = page.getByRole("button", {
    name: "Toggle light mode",
    exact: true,
  });
  assert.equal(await toggle.count(), 1);
  await toggle.click();
  await waitForTheme(page, "light");
  const light = await palette(page);
  assert.equal(light.canvas, "rgb(241, 245, 249)");
  assert.equal(light.hero, "rgb(15, 23, 42)");
  assert.equal(light.title, "rgb(15, 23, 42)");
  assert.equal(light.body, "rgb(71, 85, 105)");
  assert.equal(light.surface, "rgba(255, 255, 255, 0.95)");
  assert.equal(light.blur, "blur(24px)");
  assert.equal(light.module, "rgb(255, 255, 255)");
  assert.equal(light.footer, "rgb(30, 41, 59)");
  assert.match(light.shadow, /inset/);
  assert.equal(light.perspective, "1400px");
  assert.equal(light.transformStyle, "preserve-3d");
  assert.deepEqual(light.transforms, dark.transforms);
  assert.ok(Math.abs(light.cardTop - dark.cardTop) < 1);
  assert.ok(light.cardTop < 400);
  assert.equal(await page.evaluate(() => scrollY), 0);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("portfolio-theme")),
    "light",
  );
  const orbit = page.locator(".orbital-cube");
  const before = await orbit.getAttribute("d");
  await wait(150);
  assert.notEqual(await orbit.getAttribute("d"), before);
  if (screenshots)
    await page.screenshot({ path: `${screenshots}/cleanroom-desktop.png` });

  await page.keyboard.press("ArrowRight");
  await wait(900);
  assert.equal(await selected(page), "backlog-buster");
  assert.equal(
    await page.locator(".orbital-core").getAttribute("data-accent"),
    "emerald",
  );
  assert.equal(
    await page
      .locator(".orbital-core")
      .evaluate((el) => getComputedStyle(el).color),
    "rgb(4, 120, 87)",
  );
  await clickWing(page, "q-split");
  assert.equal(
    await page.locator('.spatial-card-slot:not([data-offset="0"]) a').count(),
    0,
  );
  const front = page.locator('[data-offset="0"] .spatial-hover-surface');
  const bounds = await page
    .locator('[data-offset="0"] .project-tagline')
    .boundingBox();
  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + 10);
  await wait(250);
  assert.equal(await front.getAttribute("data-pointer-hovered"), "true");
  assert.match(await front.getAttribute("style"), /rotate[XY]/);
  await page.mouse.move(5, 5);
  await wait(400);
  await swipe(page);
  assert.equal(await selected(page), "backlog-buster");
  await page.locator(".bottom-hud .pillar-pill").last().click();
  await wait(900);
  assert.equal(await selected(page), "pwndpass");
  await page.keyboard.press("`");
  const input = page.locator("#terminal-command");
  await input.waitFor({ state: "visible" });
  assert.equal(
    await page
      .locator(".drop-down-terminal")
      .evaluate((el) => getComputedStyle(el).colorScheme),
    "dark",
  );
  await input.fill("iddqd");
  await input.press("Enter");
  await page.waitForFunction(
    () => document.querySelector(".telemetry-frame").dataset.godMode === "true",
  );
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".system-status > p")).color ===
      "rgb(146, 64, 14)",
  );
  assert.equal(
    await page
      .locator(".system-status > p")
      .evaluate((el) => getComputedStyle(el).color),
    "rgb(146, 64, 14)",
  );
  await input.fill("iddqd");
  await input.press("Enter");
  await input.press("Escape");
  await page.locator("#developer-console").waitFor({ state: "detached" });
  await page
    .locator(".top-hud")
    .getByRole("button", { name: "GRID", exact: true })
    .click();
  await page.locator(".project-grid").waitFor({ state: "visible" });
  await page.locator(".pillar-pill").first().click();
  assert.equal(await page.locator(".project-grid .project-card").count(), 4);
  assert.equal(
    await page
      .locator(".project-grid .project-card")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgba(255, 255, 255, 0.95)",
  );
  if (screenshots)
    await page.screenshot({ path: `${screenshots}/cleanroom-grid.png` });
  await page
    .locator(".top-hud")
    .getByRole("button", { name: "3D DECK", exact: true })
    .click();
  await page.locator(".spatial-stage").waitFor({ state: "visible" });
  await page.keyboard.press("Home");
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));

  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.locator(".top-hud").evaluate((el) => {
      const boxes = [".location-block", ".system-status", ".hud-controls"].map(
        (selector) => el.querySelector(selector).getBoundingClientRect(),
      );
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        overlaps: boxes.some((a, i) =>
          boxes
            .slice(i + 1)
            .some(
              (b) =>
                Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1,
            ),
        ),
      };
    });
    assert.equal(layout.overflow, false, `Overflow at ${width}`);
    assert.equal(layout.overlaps, false, `HUD overlap at ${width}`);
    results.push({ width, ...layout });
    if (width === 390 && screenshots)
      await page.screenshot({ path: `${screenshots}/cleanroom-mobile.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .locator(".top-hud")
    .getByRole("link", { name: "Client Services →", exact: true })
    .click();
  await page.waitForURL(base + "/services");
  await waitForTheme(page, "light");
  assert.equal(
    await page.locator('.services-page[data-services-theme="light"]').count(),
    1,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Toggle light mode", exact: true })
      .count(),
    1,
  );
  await page.locator(".dossier-hud-trigger").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".dossier-slide")?.dataset.motionState ===
      "settled",
  );
  assert.equal(
    await page.locator("#operator-dossier").getAttribute("data-dossier-theme"),
    "light",
  );
  if (screenshots)
    await page.screenshot({ path: `${screenshots}/cleanroom-dossier.png` });
  await page.keyboard.press("Escape");
  await page.locator("#operator-dossier").waitFor({ state: "detached" });
  await page.getByRole("link", { name: /Developer Portfolio/ }).click();
  await page.waitForURL(base + "/");
  await waitForTheme(page, "light");
  await page.reload({ waitUntil: "networkidle" });
  await waitForTheme(page, "light");
  await toggle.click();
  await waitForTheme(page, "dark");
  await wait(900);
  assert.deepEqual(await palette(page), dark);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await toggle.click();
  await waitForTheme(page, "light");
  assert.equal(
    await page.locator(".spatial-deck").getAttribute("data-motion"),
    "reduced",
  );
  assert.equal(
    await page.locator(".orbital-core").getAttribute("data-motion"),
    "static",
  );
  const staticPath = await orbit.getAttribute("d");
  await wait(100);
  assert.equal(await orbit.getAttribute("d"), staticPath);
  await page.keyboard.press("ArrowRight");
  await wait(100);
  assert.equal(await selected(page), "backlog-buster");

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await mobile.addInitScript(() =>
    localStorage.setItem("services-theme", "light"),
  );
  await mobile.goto(base, { waitUntil: "networkidle" });
  await waitForTheme(mobile, "light");
  await wait(900);
  assert.equal(
    await mobile.evaluate(() => localStorage.getItem("portfolio-theme")),
    "light",
  );
  await swipe(mobile, true);
  assert.equal(await selected(mobile), "backlog-buster");
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        passed: true,
        dark,
        light,
        results,
        checks: [
          "global persistence and legacy preference migration",
          "no hydration errors",
          "light shaders and unchanged 3D transforms",
          "unchanged card position above the fold",
          "keyboard, wing clicks, hover tilt, drag, and touch swipe",
          "dark console and legible light godmode",
          "grid, Services, and Dossier theme synchronization",
          "original dark palette restored",
          "reduced motion geometry fallback",
        ],
        errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
