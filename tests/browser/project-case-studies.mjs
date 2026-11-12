// Requires Playwright and a running production preview; never sends messages.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { PROJECTS_REGISTRY } from "../../src/data/projects.registry.ts";
import { PROFILE_CONFIG } from "../../src/data/profile.config.ts";
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
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const button = (page, id) => page.locator(`#case-study-toggle-${id}`);
const selected = (page) =>
  page.locator('[data-offset="0"]').getAttribute("data-node-id");

async function settleOpen(page, id) {
  await page.waitForFunction((id) => {
    const region = document.getElementById(`case-study-${id}`);
    return (
      region?.style.height === "auto" &&
      getComputedStyle(region).opacity === "1"
    );
  }, id);
}
async function verifyCopy(page, project) {
  const sections = page.locator(`#case-study-${project.id} section`);
  assert.equal(await sections.count(), 3);
  for (const [index, key] of ["problem", "decision", "tradeOffs"].entries())
    assert.equal(
      await sections.nth(index).locator("p").innerText(),
      project.caseStudy[key],
    );
  assert.deepEqual(await sections.locator("h4").allTextContents(), [
    "01 // PROBLEM",
    "02 // DECISION",
    "03 // TRADE-OFFS",
  ]);
}
async function beginTrace(page, id) {
  await page.evaluate((id) => {
    window.caseTrace = { running: true, frames: [] };
    const trace = window.caseTrace;
    function frame() {
      if (!trace.running) return;
      trace.frames.push(
        document.getElementById(`case-study-${id}`)?.getBoundingClientRect()
          .height ?? 0,
      );
      requestAnimationFrame(frame);
    }
    frame();
  }, id);
}
async function endTrace(page) {
  return page.evaluate(() => {
    window.caseTrace.running = false;
    return window.caseTrace.frames;
  });
}
async function swipe(page) {
  const hook = page.locator('[data-offset="0"] .project-hook');
  await hook.evaluate((el) =>
    el.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  const box = await hook.boundingBox(),
    x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 150, y, { steps: 16 });
  await page.mouse.up();
  await pause(700);
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
    assert.fail("Accordion checks must not send messages"),
  );
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(
    await page.locator('.case-study-toggle[aria-expanded="true"]').count(),
    0,
  );
  assert.equal(await page.locator(".case-study-expansion").count(), 0);
  const heights = await page
    .locator(".spatial-card-slot .project-card")
    .evaluateAll((nodes) => nodes.map((node) => node.offsetHeight));
  assert.equal(
    new Set(heights).size,
    1,
    "Collapsed cards must retain uniform height",
  );
  for (const project of PROJECTS_REGISTRY) {
    assert.equal(
      await page
        .locator(`[data-project-id="${project.id}"] .project-case-study`)
        .evaluate(
          (el) =>
            el.previousElementSibling.classList.contains("project-schematic") &&
            el.nextElementSibling.classList.contains("project-card-footer"),
        ),
      true,
    );
  }
  await page.evaluate(() => {
    window.caseEvents = { click: 0, key: 0, pointer: 0 };
    window.addEventListener("click", (event) => {
      if (event.target.closest?.(".project-case-study"))
        window.caseEvents.click++;
    });
    window.addEventListener("pointerdown", (event) => {
      if (event.target.closest?.(".project-case-study"))
        window.caseEvents.pointer++;
    });
    window.addEventListener("keydown", (event) => {
      if (
        (event.key === "Enter" || event.key === " ") &&
        event.target.closest?.(".project-case-study")
      )
        window.caseEvents.key++;
    });
  });
  await button(page, "q-split").scrollIntoViewIfNeeded();
  await beginTrace(page, "q-split");
  await button(page, "q-split").click();
  await settleOpen(page, "q-split");
  const frames = await endTrace(page);
  assert.ok(
    new Set(frames.map(Math.round)).size > 3,
    "Expansion must visibly animate in height",
  );
  assert.equal(await selected(page), "q-split");
  await verifyCopy(page, PROJECTS_REGISTRY[0]);
  assert.ok(
    await page
      .locator("#case-study-q-split .case-study-content")
      .evaluate(
        (el) => el.clientHeight <= Math.min(380, innerHeight * 0.48) + 1,
      ),
  );
  const footer = page
    .locator('[data-project-id="q-split"] .project-links a')
    .first();
  await footer.click({ trial: true });
  await button(page, "q-split").press("Space");
  await page.locator("#case-study-q-split").waitFor({ state: "detached" });
  await button(page, "q-split").press("Enter");
  await settleOpen(page, "q-split");
  await button(page, "q-split").click();
  await page.locator("#case-study-q-split").waitFor({ state: "detached" });
  assert.deepEqual(await page.evaluate(() => window.caseEvents), {
    click: 0,
    key: 0,
    pointer: 0,
  });
  await swipe(page);
  assert.equal(await selected(page), "backlog-buster");
  // A preceding drag must not swallow the first accordion click.
  await button(page, "backlog-buster").click();
  await settleOpen(page, "backlog-buster");
  const content = page.locator(
    "#case-study-backlog-buster .case-study-content",
  );
  await content.scrollIntoViewIfNeeded();
  const bounds = await content.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * 0.65, bounds.y + 40);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.25, bounds.y + 40, {
    steps: 10,
  });
  await page.mouse.up();
  assert.equal(await selected(page), "backlog-buster");
  await page
    .locator(".top-hud")
    .getByRole("button", { name: "GRID", exact: true })
    .click();
  await page.locator(".project-grid").waitFor({ state: "visible" });
  await button(page, "q-split").click();
  await settleOpen(page, "q-split");
  assert.equal(
    await button(page, "backlog-buster").getAttribute("aria-expanded"),
    "false",
  );
  await page
    .locator("#case-study-backlog-buster")
    .waitFor({ state: "detached" });
  for (const project of PROJECTS_REGISTRY) {
    if (project.id !== "q-split") {
      await button(page, project.id).click();
      await settleOpen(page, project.id);
    }
    await verifyCopy(page, project);
    assert.equal(
      await page.locator('.case-study-toggle[aria-expanded="true"]').count(),
      1,
    );
  }
  if (screenshots)
    await page.screenshot({ path: `${screenshots}/case-study-grid-dark.png` });
  await page
    .getByRole("button", { name: "Toggle light mode", exact: true })
    .click();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const matrix = page.locator(".about-skills-index");
    await matrix.scrollIntoViewIfNeeded();
    assert.equal(
      await matrix.evaluate(
        (el) =>
          el.closest(".about-summary") !== null &&
          el.previousElementSibling.classList.contains("about-credentials"),
      ),
      true,
    );
    assert.equal(await matrix.locator(":scope > div").count(), 4);
    for (const [index, row] of PROFILE_CONFIG.skillsIndex.entries()) {
      const rendered = matrix.locator(":scope > div").nth(index);
      assert.equal(await rendered.locator("dt").innerText(), row.label);
      assert.equal(
        await rendered.locator("dd").innerText(),
        row.values.join(" · "),
      );
      assert.equal(
        await rendered.evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ")[0],
        ),
        "115px",
      );
    }
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    results.push({ width, skillsRows: 4, noOverflow: true });
    if ([1440, 390].includes(width) && screenshots)
      await page
        .locator(".about-section")
        .screenshot({ path: `${screenshots}/profile-skills-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".top-hud")
    .getByRole("button", { name: "3D DECK", exact: true })
    .click();
  await page.locator(".spatial-stage").waitFor({ state: "visible" });
  await button(page, "backlog-buster").click();
  await settleOpen(page, "backlog-buster");
  const scroll = page.locator("#case-study-backlog-buster .case-study-content");
  assert.ok(await scroll.evaluate((el) => el.scrollHeight > el.clientHeight));
  await scroll.evaluate((el) => (el.scrollTop = el.scrollHeight));
  assert.ok(await scroll.evaluate((el) => el.scrollTop > 0));
  await page
    .locator('[data-offset="0"] .project-links a')
    .first()
    .click({ trial: true });
  if (screenshots)
    await page
      .locator('[data-offset="0"] .project-card')
      .screenshot({ path: `${screenshots}/case-study-spatial-mobile.png` });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator(".case-study-expansion").count(), 0);
  await button(page, "q-split").click();
  await settleOpen(page, "q-split");
  await button(page, "q-split").press("Space");
  await page.locator("#case-study-q-split").waitFor({ state: "detached" });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        passed: true,
        animatedHeights: new Set(frames.map(Math.round)).size,
        results,
        checks: [
          "collapsed uniform cards and exact placement",
          "one open case study across both views",
          "click, Enter, and Space activation without deck events",
          "drag followed by toggle and internal scrolling",
          "three registry-driven content blocks",
          "four static config-driven skills rows",
          "320–1440px layouts, light/dark, and reduced motion",
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
