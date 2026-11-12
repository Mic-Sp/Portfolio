// Uses the same production preview, Playwright, and axe-core overrides as accessibility.mjs.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.PORTFOLIO_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  args: ["--no-sandbox"],
});
const errors = [],
  results = [];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const faces = ["Front", "Back", "Right", "Left", "Top", "Bottom"];
const rotations = [
  [0, 0],
  [0, 180],
  [0, -90],
  [0, 90],
  [-90, 0],
  [90, 0],
];
const rotation = (page) =>
  page
    .locator(".inspector-cube")
    .evaluate((el) => [Number(el.dataset.rotateX), Number(el.dataset.rotateY)]);

async function configure(page) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/hydration|did not match|Blocked aria-hidden/i.test(message.text()))
      errors.push(message.text());
  });
  await page.route("**/api/contact", () =>
    assert.fail("Cube checks must never send messages"),
  );
  await page.route("https://tryhackme.com/**", (route) => route.abort());
  await page.goto(base, { waitUntil: "networkidle" });
}
async function opened(page, method = "click") {
  const trigger = page.locator(".cube-inspector-trigger");
  assert.equal(
    await trigger.getAttribute("aria-label"),
    "Inspect 3D Spatial Cube",
  );
  if (method === "click") await trigger.click();
  else {
    await trigger.focus();
    await trigger.press(method);
  }
  const modal = page.locator("#spatial-cube-modal");
  await modal.waitFor();
  await page.waitForFunction(() => {
    const panel = document.querySelector(".cube-modal-panel");
    return (
      panel &&
      new DOMMatrix(getComputedStyle(panel).transform).isIdentity &&
      getComputedStyle(document.querySelector("#spatial-cube-modal"))
        .opacity === "1"
    );
  });
  assert.equal(await modal.evaluate((el) => el.matches(":modal")), true);
  assert.equal(
    await page.locator(".telemetry-frame").getAttribute("inert"),
    "",
  );
  assert.equal(
    await page.locator(".telemetry-frame").getAttribute("aria-hidden"),
    "true",
  );
  assert.equal(await trigger.getAttribute("aria-expanded"), "true");
  assert.equal(
    await page.evaluate(() => document.body.style.overflow),
    "hidden",
  );
  assert.equal(await page.locator(".cube-face").count(), 6);
  assert.equal(await page.locator(".cube-inner-core").count(), 1);
  assert.equal(
    await page
      .locator(".cube-stage")
      .evaluate((el) => getComputedStyle(el).perspective),
    "1100px",
  );
  assert.equal(
    await page
      .locator(".inspector-cube")
      .evaluate((el) => getComputedStyle(el).transformStyle),
    "preserve-3d",
  );
  assert.match(
    await page.locator(".cube-inner-core").getAttribute("style"),
    /translateZ\(0px\)/,
  );
  const geometry = await modal.evaluate((el) => {
    const helpBottom = el
      .querySelector(".cube-help")
      .getBoundingClientRect().bottom;
    const navTop = el
      .querySelector(".cube-face-nav")
      .getBoundingClientRect().top;
    return [...el.querySelectorAll(".cube-face")].every((face) => {
      const box = face.getBoundingClientRect();
      return box.top >= helpBottom - 1 && box.bottom <= navTop + 1;
    });
  });
  assert.equal(
    geometry,
    true,
    "3D panels must not overlap instructions or controls",
  );
  return { trigger, modal };
}
async function closed(page, trigger, method = "Escape") {
  if (method === "backdrop") await page.mouse.click(3, 3);
  else if (method === "button")
    await page
      .getByRole("button", { name: "[ CLOSE // ESC ]", exact: true })
      .click();
  else await page.keyboard.press("Escape");
  await page.locator("#spatial-cube-modal").waitFor({ state: "detached" });
  assert.equal(
    await trigger.evaluate((el) => el === document.activeElement),
    true,
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
  assert.equal(await trigger.getAttribute("aria-expanded"), "false");
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

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "dark",
  });
  await configure(page);
  const projectBefore = await page
    .locator('[data-offset="0"]')
    .getAttribute("data-node-id");
  const { trigger, modal } = await opened(page);
  const start = await rotation(page);
  await wait(180);
  await page.waitForFunction(
    (start) =>
      Number(document.querySelector(".inspector-cube").dataset.rotateY) !==
      start[1],
    start,
    { timeout: 3000 },
  );
  assert.notDeepEqual(await rotation(page), start, "idle rotation runs");
  await page
    .getByRole("button", { name: "AUTO ROTATE ON", exact: true })
    .click();
  if (process.env.PORTFOLIO_SCREENSHOT_DIR) {
    await mkdir(process.env.PORTFOLIO_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/cube-opening.png`,
    });
  }
  const paused = await rotation(page);
  await wait(120);
  assert.deepEqual(await rotation(page), paused);
  await page
    .getByRole("button", { name: "[ RESET ORIENTATION ]", exact: true })
    .click();
  for (const [key, expected] of [
    ["ArrowRight", [0, 90]],
    ["ArrowLeft", [0, 0]],
    ["ArrowUp", [-90, 0]],
    ["ArrowDown", [0, 0]],
  ]) {
    await page.keyboard.press(key);
    assert.deepEqual(await rotation(page), expected, key);
  }
  await page.keyboard.press("`");
  assert.equal(await page.locator("#developer-console").count(), 0);
  assert.equal(
    await page.locator('[data-offset="0"]').getAttribute("data-node-id"),
    projectBefore,
  );
  for (let index = 0; index < faces.length; index++) {
    await page
      .getByRole("button", {
        name: `Inspect ${faces[index]} face`,
        exact: true,
      })
      .click();
    assert.deepEqual(await rotation(page), rotations[index]);
    assert.equal(
      await modal.getByRole("status").innerText(),
      `${faces[index]} face selected`,
    );
  }
  await page
    .getByRole("button", { name: "Inspect Front face", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Activate Front face", exact: true })
    .click();
  assert.equal(
    await modal.getByRole("status").innerText(),
    "Front face selected",
  );
  const core = page.getByRole("button", {
    name: "Activate Inner Core",
    exact: true,
  });
  await core.click();
  assert.equal(
    await modal.getByRole("status").innerText(),
    "Inner Core selected",
  );
  await page
    .getByRole("button", { name: "Inspect Front face", exact: true })
    .click();
  const box = await core.boundingBox();
  const cx = box.x + box.width / 2,
    cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 100, cy - 25, { steps: 12 });
  const during = await rotation(page);
  await page.mouse.up();
  await page.waitForFunction(
    (during) =>
      Number(document.querySelector(".inspector-cube").dataset.rotateY) !==
      during[1],
    during,
    { timeout: 3000 },
  );
  assert.notDeepEqual(
    await rotation(page),
    during,
    "drag inertia continues after release",
  );
  assert.equal(
    await modal.getByRole("status").innerText(),
    "Front face selected",
    "a drag must not activate a slot",
  );
  await page
    .getByRole("button", { name: "Inspect Front face", exact: true })
    .click();
  const jitter = await core.boundingBox();
  await page.mouse.move(
    jitter.x + jitter.width / 2,
    jitter.y + jitter.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    jitter.x + jitter.width / 2 + 2,
    jitter.y + jitter.height / 2 + 1,
  );
  await page.mouse.up();
  assert.equal(
    await modal.getByRole("status").innerText(),
    "Inner Core selected",
    "less than 5px is a click",
  );
  // Tab wraps from the final control to the core, and back again.
  const close = page.getByRole("button", {
    name: "[ CLOSE // ESC ]",
    exact: true,
  });
  await close.focus();
  await page.keyboard.press("Tab");
  assert.equal(
    await core.evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await close.evaluate((el) => el === document.activeElement),
    true,
  );
  await scan(page, "dark inspector");
  if (process.env.PORTFOLIO_SCREENSHOT_DIR) {
    await mkdir(process.env.PORTFOLIO_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/cube-dark-desktop.png`,
    });
  }
  await closed(page, trigger);
  for (const key of ["Enter", "Space"]) {
    const openedByKey = await opened(page, key);
    await closed(
      page,
      openedByKey.trigger,
      key === "Space" ? "button" : "backdrop",
    );
  }
  results.push({
    desktop: "mouse, keyboard, inertia, activation, focus trap and restoration",
  });
  await page.close();

  for (const [width, height, theme] of [
    [1440, 1000, "light"],
    [640, 450, "light"],
    [375, 844, "dark"],
    [320, 844, "light"],
  ]) {
    const small = await browser.newPage({
      viewport: { width, height },
      colorScheme: theme,
    });
    await configure(small);
    const { trigger } = await opened(small);
    await small
      .getByRole("button", { name: "Inspect Front face", exact: true })
      .click();
    const fits = await small.locator(".cube-modal-panel").evaluate((el) => ({
      page: document.documentElement.scrollWidth <= innerWidth,
      panel: el.scrollWidth <= el.clientWidth,
      face: getComputedStyle(document.querySelector(".cube-face-glass"))
        .backdropFilter,
      theme: document.querySelector("#spatial-cube-modal").dataset.theme,
    }));
    assert.equal(fits.page, true);
    assert.equal(fits.panel, true);
    assert.equal(fits.face, "blur(2px)");
    assert.equal(fits.theme, theme);
    await scan(small, `${width}px ${theme} inspector`);
    if (process.env.PORTFOLIO_SCREENSHOT_DIR)
      await small.screenshot({
        path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/cube-${theme}-${width}.png`,
      });
    await closed(small, trigger, "button");
    await small.close();
    results.push({ width, height, theme, ...fits });
  }

  const reduced = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await configure(reduced);
  const reducedOpen = await opened(reduced, "Enter");
  const fixed = await rotation(reduced);
  await wait(180);
  assert.deepEqual(
    await rotation(reduced),
    fixed,
    "reduced motion has no idle rotation",
  );
  assert.equal(
    await reduced
      .getByRole("button", { name: "AUTO ROTATE OFF", exact: true })
      .isDisabled(),
    true,
  );
  await reduced.keyboard.press("ArrowRight");
  assert.deepEqual(await rotation(reduced), [0, 90]);
  await reduced.keyboard.press("ArrowLeft");
  const reducedCore = reduced.getByRole("button", {
    name: "Activate Inner Core",
    exact: true,
  });
  const rb = await reducedCore.boundingBox();
  await reduced.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
  await reduced.mouse.down();
  await reduced.mouse.move(rb.x + rb.width / 2 + 80, rb.y + rb.height / 2, {
    steps: 8,
  });
  await reduced.mouse.up();
  const released = await rotation(reduced);
  await wait(180);
  assert.deepEqual(
    await rotation(reduced),
    released,
    "reduced motion has no release inertia",
  );
  await closed(reduced, reducedOpen.trigger);
  await reduced.close();

  const touch = await browser.newPage({
    viewport: { width: 375, height: 844 },
    hasTouch: true,
    isMobile: true,
    colorScheme: "dark",
  });
  await configure(touch);
  const touchOpen = await opened(touch);
  await touch
    .getByRole("button", { name: "Inspect Front face", exact: true })
    .click();
  const beforeTouch = await rotation(touch);
  await touch
    .locator(".cube-stage")
    .evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "instant" }),
    );
  const tb = await touch.locator(".cube-core-button").boundingBox();
  const cdp = await touch.context().newCDPSession(touch);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: tb.x + tb.width / 2, y: tb.y + tb.height / 2 }],
  });
  for (let i = 1; i <= 8; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: tb.x + tb.width / 2 + 10 * i, y: tb.y + tb.height / 2 },
      ],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
  assert.notDeepEqual(await rotation(touch), beforeTouch, "touch drag rotates");
  assert.equal(
    await touchOpen.modal.getByRole("status").innerText(),
    "Front face selected",
    "touch dragging does not activate the core",
  );
  await closed(touch, touchOpen.trigger);
  await touch.close();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      { passed: true, results, reducedMotion: true, touchDrag: true, errors },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
