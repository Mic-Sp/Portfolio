// Run against a production preview. External messaging is blocked throughout.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { PROJECTS_REGISTRY } from "../../src/data/projects.registry.ts";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.PORTFOLIO_BASE_URL || "http://127.0.0.1:3000";
const screenshots = process.env.PORTFOLIO_SCREENSHOT_DIR;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  args: ["--no-sandbox"],
});

async function verifyLightbox(page, project) {
  const modal = page.locator("#project-lightbox");
  await modal.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const modal = document.querySelector("#project-lightbox");
    const panel = modal?.querySelector(".project-lightbox-panel");
    return (
      modal &&
      panel &&
      getComputedStyle(modal).opacity === "1" &&
      new DOMMatrix(getComputedStyle(panel).transform).isIdentity
    );
  });
  await page.waitForFunction(
    () =>
      document.querySelector("#project-lightbox img")?.complete &&
      document.querySelector("#project-lightbox img").naturalWidth > 0,
  );
  const data = await modal.evaluate((el) => {
    const image = el.querySelector("img"),
      css = getComputedStyle(image);
    const media = el.querySelector(".project-lightbox-media");
    const close = el.querySelector("button").getBoundingClientRect();
    return {
      src: image.getAttribute("src"),
      alt: image.alt,
      width: image.naturalWidth,
      fit: css.objectFit,
      scale: css.scale,
      transform: css.transform,
      isModal: el.matches(":modal"),
      overflow: el.scrollWidth > el.clientWidth,
      mediaOverflow:
        image.getBoundingClientRect().height >
        media.getBoundingClientRect().height + 1,
      locked: document.body.style.overflow,
      closeTop: close.top,
      maxImageHeight:
        image.getBoundingClientRect().height <= innerHeight * 0.8 + 1,
    };
  });
  assert.equal(data.src, project.image); // original asset, not an optimized/cropped derivative
  assert.equal(data.alt, project.imageAlt);
  assert.ok(data.width >= 1791);
  assert.equal(data.fit, "contain");
  assert.ok(data.scale === "none" || data.scale === "1");
  assert.equal(data.transform, "none");
  assert.equal(data.isModal, true);
  assert.equal(data.overflow, false);
  assert.equal(data.mediaOverflow, false);
  assert.equal(data.maxImageHeight, true);
  assert.ok(data.closeTop >= 0, "close control must remain accessible");
  assert.equal(data.locked, "hidden");
  assert.equal(await modal.locator("h2").innerText(), project.title);
  assert.equal(
    await modal.locator("#project-lightbox-summary").innerText(),
    project.hook,
  );
  for (const [label, href] of [
    ["Live System", project.links.live],
    ["Source", project.links.repo],
  ]) {
    const link = modal.getByRole("link", { name: label, exact: true });
    if (href && href !== "#") {
      assert.equal(await link.getAttribute("href"), href);
      assert.equal(await link.getAttribute("target"), "_blank");
      assert.equal(await link.getAttribute("rel"), "noopener noreferrer");
    } else assert.equal(await link.count(), 0);
  }
  return data;
}

async function close(page, trigger, method = "Escape") {
  if (method === "backdrop") await page.mouse.click(4, 4);
  else if (method === "button")
    await page
      .getByRole("button", { name: "CLOSE // ESC", exact: true })
      .click();
  else await page.keyboard.press("Escape");
  await page.locator("#project-lightbox").waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.body.style.overflow), "");
  assert.equal(
    await trigger.evaluate((el) => el === document.activeElement),
    true,
  );
}

try {
  if (screenshots) await mkdir(screenshots, { recursive: true });
  const page = await browser.newPage({
    colorScheme: "dark",
    viewport: { width: 1440, height: 900 },
  });
  const errors = [],
    results = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/hydration|did not match/i.test(message.text()))
      errors.push(message.text());
  });
  page.on("response", (response) => {
    if (
      response.status() >= 400 &&
      /projects|_next\/image/.test(response.url())
    )
      errors.push(response.url());
  });
  await page.route("**/api/contact", () =>
    assert.fail("Preview checks must not transmit email"),
  );
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => document.querySelector(".spatial-deck")?.dataset.motion === "spatial",
  );
  assert.equal(await page.locator(".project-thumbnail").count(), 0);
  assert.equal(
    await page.locator(".project-preview-trigger:not([disabled])").count(),
    1,
  );
  assert.equal(
    await page
      .locator(
        '.spatial-card-slot:not([data-offset="0"]) .project-preview-trigger:enabled',
      )
      .count(),
    0,
  );
  const selected = await page
    .locator('[data-offset="0"]')
    .getAttribute("data-node-id");
  const trigger = page.locator('[data-offset="0"] .project-preview-trigger');
  await trigger.click();
  results.push({
    mode: "spatial",
    ...(await verifyLightbox(page, PROJECTS_REGISTRY[0])),
  });
  const closeButton = page.getByRole("button", {
    name: "CLOSE // ESC",
    exact: true,
  });
  await closeButton.focus();
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await page
      .locator("#project-lightbox a")
      .last()
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await closeButton.evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("`");
  assert.equal(
    await page.locator('[data-offset="0"]').getAttribute("data-node-id"),
    selected,
  );
  assert.equal(await page.locator("#developer-console").count(), 0);
  await page.locator("#project-lightbox img").click();
  assert.equal(await page.locator("#project-lightbox").count(), 1);
  if (screenshots)
    await page.screenshot({ path: `${screenshots}/lightbox-desktop.png` });
  await close(page, trigger);
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(
    () =>
      document.querySelector('[data-offset="0"]')?.dataset.nodeId ===
      "backlog-buster",
  );
  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction(
    () =>
      document.querySelector('[data-offset="0"]')?.dataset.nodeId === "q-split",
  );
  await page
    .locator(".top-hud")
    .getByRole("button", { name: "GRID", exact: true })
    .click();
  await page.locator(".project-grid").waitFor({ state: "visible" });
  for (let i = 0; i < PROJECTS_REGISTRY.length; i++) {
    const project = PROJECTS_REGISTRY[i];
    const thumb = page.locator(
      `[data-project-id="${project.id}"] .project-thumbnail`,
    );
    await thumb.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      (id) =>
        document.querySelector(
          `[data-project-id="${id}"] .project-thumbnail img`,
        )?.naturalWidth > 0,
      project.id,
    );
    const framing = await thumb.evaluate((el) => {
      const image = el.querySelector("img"),
        css = getComputedStyle(image),
        b = el.getBoundingClientRect();
      return {
        ratio: b.width / b.height,
        fit: css.objectFit,
        scale: css.scale,
        origin: css.transformOrigin,
        imageClass: image.className,
      };
    });
    assert.ok(Math.abs(framing.ratio - 16 / 9) < 0.02);
    assert.equal(framing.fit, "cover");
    assert.equal(Number(framing.scale), [1, 1.45, 1.45, 2.2][i]);
    for (const token of project.thumbnailClass.split(" "))
      assert.ok(framing.imageClass.split(" ").includes(token));
    await thumb.click();
    await verifyLightbox(page, project);
    await close(page, thumb, ["Escape", "button", "backdrop", "Escape"][i]);
    results.push({ project: project.id, ...framing });
  }
  if (screenshots) {
    await page.locator(".project-grid").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${screenshots}/grid-thumbnails-dark.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "Toggle light mode", exact: true })
    .click();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const thumb = page.locator(".project-thumbnail").last();
    await thumb.scrollIntoViewIfNeeded();
    await thumb.click();
    await verifyLightbox(page, PROJECTS_REGISTRY.at(-1));
    assert.equal(
      await page.locator("#project-lightbox").getAttribute("data-theme"),
      "light",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    if (width === 390 && screenshots)
      await page.screenshot({
        path: `${screenshots}/lightbox-mobile-light.png`,
      });
    await close(page, thumb, "button");
    results.push({ width, theme: "light", noOverflow: true });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const thumb = page.locator(".project-thumbnail").first();
  await thumb.scrollIntoViewIfNeeded();
  await thumb.click();
  await verifyLightbox(page, PROJECTS_REGISTRY[0]);
  await close(page, thumb);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        passed: true,
        results,
        checks: [
          "16:9 thumbnails with independent crop configuration",
          "original PNGs shown uncropped at full source resolution",
          "spatial cards use compact triggers only",
          "active-card controls and deck shortcuts preserved",
          "keyboard focus trap and focus restoration",
          "Escape, backdrop, and close control",
          "dark/light, reduced motion, and 320–1440px layouts",
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
