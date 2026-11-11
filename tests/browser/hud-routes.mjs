// Requires Playwright and a running app; uses the same overrides as dossier-message.mjs.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.PORTFOLIO_BASE_URL || "http://127.0.0.1:3000";

async function portfolioBackground(page) {
  return page.locator(".telemetry-frame").evaluate((el) => {
    const context = document.createElement("canvas").getContext("2d");
    context.fillStyle = getComputedStyle(el).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
  });
}

async function palette(page) {
  return page.locator(".services-page").evaluate((el) => {
    const css = (target) => getComputedStyle(target);
    // Normalize modern CSS color spaces and hex colors to the same sRGB format.
    const context = document.createElement("canvas").getContext("2d");
    const color = (value) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
      return alpha === 255
        ? `rgb(${r}, ${g}, ${b})`
        : `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    return {
      theme: el.dataset.servicesTheme,
      background: color(css(el).backgroundColor),
      primary: color(css(el.querySelector("h1")).color),
      headlineFilter: css(el.querySelector("h1")).filter,
      headlineShadow: css(el.querySelector("h1")).textShadow,
      body: css(el.querySelector(".services-body")).color,
      card: css(el.querySelector(".services-surface")).backgroundColor,
      border: css(el.querySelector(".services-surface")).borderColor,
      input: css(el.querySelector("input")).backgroundColor,
      inputText: css(el.querySelector("input")).color,
      submit: css(el.querySelector('[type="submit"]')).backgroundColor,
      scheme: css(el).colorScheme,
      globalScheme: css(document.documentElement).colorScheme,
      hud: css(document.querySelector(".top-hud")).backgroundColor,
      hudTheme:
        document.querySelector(".telemetry-frame").dataset.servicesTheme,
      hudText: css(document.querySelector(".location-block > p")).color,
      hudClock: css(document.querySelector(".telemetry-clock")).color,
      hudUtc: css(document.querySelector(".telemetry-clock .text-slate-300"))
        .color,
      hudDot: css(document.querySelector(".status-dot")).backgroundColor,
      hudDossier: css(document.querySelector(".dossier-hud-trigger"))
        .backgroundColor,
      hudDossierText: css(document.querySelector(".dossier-hud-trigger")).color,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
}

async function waitForTheme(page, theme) {
  await page.waitForFunction(
    (theme) =>
      document.querySelector(".services-page")?.dataset.servicesTheme === theme,
    theme,
  );
  // Child surfaces and text finish their independent color transitions too.
  await page.waitForTimeout(240);
}

async function verifyTheme(page) {
  const toggle = page.getByRole("button", {
    name: "Toggle light mode",
    exact: true,
  });
  await waitForTheme(page, "dark");
  const dark = await palette(page);
  assert.equal(await toggle.getAttribute("aria-pressed"), "false");
  assert.equal(await toggle.getAttribute("title"), "Switch to light mode");
  assert.equal(await toggle.locator("svg.lucide-sun").count(), 1);
  await page.locator('input[name="name"]').fill("Theme verification");
  await toggle.click();
  await waitForTheme(page, "light");
  const light = await palette(page);
  assert.equal(light.background, "rgb(248, 250, 252)");
  assert.ok(
    light.primary
      .match(/\d+/g)
      .every(
        (channel, index) =>
          Math.abs(Number(channel) - [15, 23, 42][index]) <= 1,
      ),
    "slate-900 primary text allows one channel of color-space rounding",
  );
  assert.equal(light.body, "rgb(71, 85, 105)");
  assert.equal(light.headlineFilter, "none");
  assert.equal(light.headlineShadow, "none");
  assert.equal(light.card, "rgb(255, 255, 255)");
  assert.equal(light.border, "rgb(226, 232, 240)");
  assert.equal(light.input, "rgb(255, 255, 255)");
  assert.equal(light.inputText, "rgb(15, 23, 42)");
  assert.equal(light.submit, "rgb(5, 150, 105)");
  assert.equal(light.scheme, "light");
  assert.equal(light.globalScheme, "dark");
  assert.notEqual(light.hud, dark.hud);
  assert.equal(light.hudTheme, "light");
  assert.equal(light.hudText, "rgb(51, 65, 85)");
  assert.equal(light.hudClock, "rgb(51, 65, 85)");
  assert.equal(light.hudUtc, "rgb(100, 116, 139)");
  assert.equal(light.hudDot, "rgb(16, 185, 129)");
  assert.equal(light.hudDossier, "rgb(241, 245, 249)");
  assert.equal(light.hudDossierText, "rgb(30, 41, 59)");
  assert.equal(light.overflow, false);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("services-theme")),
    "light",
  );
  assert.equal(await toggle.getAttribute("aria-pressed"), "true");
  assert.equal(await toggle.locator("svg.lucide-moon").count(), 1);
  assert.equal(
    await page.locator('input[name="name"]').inputValue(),
    "Theme verification",
  );
  await page.reload({ waitUntil: "networkidle" });
  await waitForTheme(page, "light");
  if (process.env.PORTFOLIO_SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/services-light-desktop.png`,
    });
  await toggle.click();
  await waitForTheme(page, "dark");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("services-theme")),
    "dark",
  );
  const restored = await palette(page);
  assert.equal(restored.hudTheme, "dark");
  assert.equal(restored.hud, dark.hud);
  assert.equal(restored.hudText, dark.hudText);
  assert.equal(restored.primary, dark.primary);
  assert.equal(restored.input, dark.input);
  assert.equal(restored.submit, "rgb(16, 185, 129)");
  await page.reload({ waitUntil: "networkidle" });
  await waitForTheme(page, "dark");
  // Keep a saved light preference while navigating to the dark-only portfolio.
  await toggle.click();
  await waitForTheme(page, "light");
  return { dark, light };
}

async function verifyDossier(page) {
  const trigger = page.locator(".top-hud").getByRole("button", {
    name: "Operator dossier: bio and stack",
    exact: true,
  });
  await trigger.click();
  await page.waitForFunction(
    () =>
      document.querySelector(".dossier-slide")?.dataset.motionState ===
      "settled",
  );
  assert.equal(await trigger.getAttribute("aria-expanded"), "true");
  assert.equal(
    await page.locator("#operator-dossier").getAttribute("open"),
    "",
  );
  const lightDossier = await page.evaluate(
    () =>
      location.pathname === "/services" &&
      document.querySelector(".services-page")?.dataset.servicesTheme ===
        "light",
  );
  assert.equal(
    await page.locator("#operator-dossier").getAttribute("data-dossier-theme"),
    lightDossier ? "light" : "dark",
  );
  if (lightDossier) {
    assert.equal(
      await page
        .locator(".dossier-drawer-heading h2")
        .evaluate((el) => getComputedStyle(el).color),
      "rgb(15, 23, 42)",
    );
    assert.equal(
      await page
        .locator(".dossier-sheet")
        .evaluate((el) => getComputedStyle(el).backdropFilter),
      "blur(12px)",
    );
  }
  await page.keyboard.press("Escape");
  await page.locator("#operator-dossier").waitFor({ state: "detached" });
  assert.equal(
    await trigger.evaluate((el) => el === document.activeElement),
    true,
  );
}

async function verifyPortfolio(page) {
  await page.locator(".hero-identity").waitFor({ state: "visible" });
  assert.equal(await page.locator(".bottom-hud").count(), 1);
  assert.equal(
    await page.locator(".top-hud [data-terminal-trigger]").count(),
    1,
  );
  assert.equal(
    await page
      .getByRole("group", { name: "Project view", exact: true })
      .count(),
    1,
  );
  const controls = page.locator(".top-hud");
  const servicesLink = controls.getByRole("link", {
    name: "Client Services →",
    exact: true,
  });
  assert.equal(await servicesLink.getAttribute("href"), "/services");
  assert.equal(
    await servicesLink.evaluate(
      (el) => el === el.parentElement.firstElementChild,
    ),
    true,
  );
  assert.equal(
    await page.locator(".telemetry-frame").getAttribute("data-services-theme"),
    null,
  );
  await controls.getByRole("button", { name: "CLI (~)", exact: true }).click();
  await page.locator("#terminal-command").waitFor({ state: "visible" });
  await page.locator("#terminal-command").press("Escape");
  await page.locator("#developer-console").waitFor({ state: "detached" });
  await controls.getByRole("button", { name: "GRID", exact: true }).click();
  await page.locator(".project-grid").waitFor({ state: "visible" });
  await controls.getByRole("button", { name: "3D DECK", exact: true }).click();
  await page
    .locator('.spatial-card-slot[data-offset="0"]')
    .waitFor({ state: "visible" });
  const before = await page
    .locator('[data-offset="0"] .project-card h3')
    .innerText();
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(
    (before) =>
      document.querySelector('[data-offset="0"] .project-card h3')
        ?.textContent !== before,
    before,
  );
  const pillar = page.locator(".bottom-hud .pillar-pill").last();
  await pillar.click();
  assert.equal(await pillar.getAttribute("aria-pressed"), "true");
  await verifyDossier(page);
}

async function verifyServices(page) {
  const navigation = page.getByRole("navigation", {
    name: "Services navigation",
    exact: true,
  });
  await navigation.waitFor({ state: "visible" });
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  assert.equal(
    await page.locator(".bottom-hud,.pillar-nav,.keybind-legend").count(),
    0,
  );
  assert.equal(
    await page
      .locator(".top-hud [data-terminal-trigger],.top-hud .view-toggle")
      .count(),
    0,
  );
  assert.equal(await page.locator(".hud-controls button").count(), 1);
  assert.equal(
    await page
      .locator(".top-hud")
      .getByRole("link", { name: "Client Services →", exact: true })
      .count(),
    0,
  );
  assert.match(
    await page.locator(".location-block").innerText(),
    /LOC: CHICAGOLAND/,
  );
  assert.match(
    await page.locator(".system-status").innerText(),
    /STATUS: BUILDING/,
  );
  assert.equal(await page.getByRole("banner").count(), 1);
  const layout = await navigation.evaluate((el) => ({
    top: el.getBoundingClientRect().top,
    hudBottom: document.querySelector(".top-hud").getBoundingClientRect()
      .bottom,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  assert.ok(
    layout.top >= layout.hudBottom - 1,
    "services sub-nav must be below the HUD",
  );
  assert.equal(layout.overflow, false);
  assert.equal(
    await page
      .locator('[aria-labelledby="core-services-heading"] article')
      .count(),
    3,
  );
  assert.equal(
    await page
      .locator('[aria-labelledby="core-services-heading"] article a')
      .count(),
    0,
  );
  await verifyDossier(page);
  return layout;
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
try {
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
    assert.fail("navigation must not transmit messages"),
  );
  await page.route("https://tryhackme.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "window.__micspBadgeUnavailable?.();",
    }),
  );
  await page.goto(base, { waitUntil: "networkidle" });
  const portfolioDark = await portfolioBackground(page);
  await verifyPortfolio(page);
  const portfolioHud = await page
    .locator(".top-hud")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => {
    window.hudNavigationToken = "persistent-layout";
  });
  await page
    .locator(".top-hud")
    .getByRole("link", { name: "Client Services →", exact: true })
    .click();
  await page.waitForURL(base + "/services");
  assert.equal(
    await page.evaluate(() => window.hudNavigationToken),
    "persistent-layout",
  );
  results.push({
    route: "/services",
    width: 1440,
    ...(await verifyServices(page)),
  });
  results.push({ palettes: await verifyTheme(page) });
  if (process.env.PORTFOLIO_SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/hud-services-desktop.png`,
    });
  // Next Link and history navigation must update the persistent HUD without a reload.
  await page.evaluate(() => {
    window.hudNavigationToken = "persistent-layout";
  });
  await page.getByRole("link", { name: /Developer Portfolio/ }).click();
  await page.waitForURL(base + "/");
  await verifyPortfolio(page);
  // Cache Components retain previous pages in hidden Activity boundaries.
  assert.equal(await page.locator(".services-page:visible").count(), 0);
  assert.deepEqual(await portfolioBackground(page), portfolioDark);
  assert.equal(
    await page
      .locator(".top-hud")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    portfolioHud,
  );
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    ),
    "dark",
  );
  assert.equal(
    await page.evaluate(() => window.hudNavigationToken),
    "persistent-layout",
  );
  await page.goBack();
  await page.waitForURL(base + "/services");
  results.push({
    route: "/services",
    navigation: "client-history",
    ...(await verifyServices(page)),
  });
  await waitForTheme(page, "light");
  assert.equal(
    await page.evaluate(() => window.hudNavigationToken),
    "persistent-layout",
  );
  await page.goForward();
  await page.waitForURL(base + "/");
  await verifyPortfolio(page);
  await page.goto(base + "/services", { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 390, height: 844 });
  results.push({
    route: "/services",
    width: 390,
    ...(await verifyServices(page)),
  });
  await waitForTheme(page, "light");
  assert.equal((await palette(page)).overflow, false);
  const mobileToggle = page.getByRole("button", {
    name: "Toggle light mode",
    exact: true,
  });
  const toggleSize = await mobileToggle.boundingBox();
  assert.ok(toggleSize.width >= 44 && toggleSize.height >= 44);
  if (process.env.PORTFOLIO_SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/services-light-mobile.png`,
    });
  await mobileToggle.click();
  await waitForTheme(page, "dark");
  if (process.env.PORTFOLIO_SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/hud-services-mobile.png`,
    });
  assert.deepEqual(errors, []);
  // Storage restrictions must not break the local in-memory fallback.
  const blocked = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  blocked.on("pageerror", (error) => errors.push(error.message));
  await blocked.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked");
    };
  });
  await blocked.goto(base + "/services", { waitUntil: "networkidle" });
  await waitForTheme(blocked, "dark");
  await blocked
    .getByRole("button", { name: "Toggle light mode", exact: true })
    .click();
  await waitForTheme(blocked, "light");
  await blocked.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await blocked
      .locator(".services-page")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    "0s",
  );
  assert.equal(
    await blocked
      .locator(".services-theme-toggle")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    "0s",
  );
  await blocked.close();
  // Keep all HUD controls usable as the Services action joins the cluster.
  await page.goto(base, { waitUntil: "networkidle" });
  for (const width of [1440, 1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.locator(".top-hud").evaluate((el) => {
      const blocks = [".location-block", ".system-status", ".hud-controls"].map(
        (selector) => el.querySelector(selector).getBoundingClientRect(),
      );
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        overlap: blocks.some((a, i) =>
          blocks
            .slice(i + 1)
            .some(
              (b) =>
                Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1,
            ),
        ),
      };
    });
    assert.equal(layout.overflow, false, `HUD must fit at ${width}px`);
    assert.equal(
      layout.overlap,
      false,
      `HUD blocks must not overlap at ${width}px`,
    );
    results.push({ portfolioWidth: width, ...layout });
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, results, errors }, null, 2));
} finally {
  await browser.close();
}
