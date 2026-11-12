// Run against a production preview with Playwright and axe-core. No messages are sent.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.PORTFOLIO_BASE_URL || "http://127.0.0.1:3000";
const axePath = process.env.AXE_PATH;
assert.ok(axePath, "Set AXE_PATH to an installed axe-core axe.min.js");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  args: ["--no-sandbox"],
});
const results = [];
const contrastResults = [];
const errors = [];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Axe cannot resolve translucent gradients/pseudo elements. Sample the rendered
// backdrop with glyphs hidden and compare it with computed (un-antialiased) text.
async function checkContrast(page, selector, state) {
  for (const element of await page.locator(selector).all()) {
    if (
      await element.evaluate(
        (el) => !!el.closest('[inert], [aria-hidden="true"]'),
      )
    )
      continue;
    await element.evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await wait(80);
    const sample = await element.evaluate((el) => {
      const text = Array.from(el.childNodes).find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
      );
      if (!text) return null;
      const range = document.createRange();
      range.selectNodeContents(text);
      const css = getComputedStyle(el);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d");
      context.fillStyle = css.color;
      context.fillRect(0, 0, 1, 1);
      const color = Array.from(context.getImageData(0, 0, 1, 1).data);
      let opacity = 1;
      for (let ancestor = el; ancestor; ancestor = ancestor.parentElement)
        opacity *= Number(getComputedStyle(ancestor).opacity);
      const points = [];
      for (const rect of Array.from(range.getClientRects()).slice(0, 8)) {
        for (const fraction of [0.15, 0.5, 0.85]) {
          const x = rect.left + rect.width * fraction,
            y = rect.top + rect.height / 2;
          const hit = document.elementFromPoint(x, y);
          if (
            x >= 0 &&
            y >= 0 &&
            x < innerWidth &&
            y < innerHeight &&
            hit &&
            (el.contains(hit) || hit.contains(el))
          )
            points.push({ x, y });
        }
      }
      return {
        color,
        opacity,
        points,
        text: text.textContent.trim().slice(0, 55),
      };
    });
    if (!sample?.points.length) continue;
    const png = await page.screenshot({
      style:
        "* { -webkit-text-fill-color: transparent !important; text-shadow: none !important; }",
    });
    const ratio = await page.evaluate(
      async ({ png, sample }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${png}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        const luminance = (color) =>
          color
            .slice(0, 3)
            .map((n) => {
              n /= 255;
              return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            })
            .reduce(
              (total, n, index) => total + n * [0.2126, 0.7152, 0.0722][index],
              0,
            );
        return Math.min(
          ...sample.points.map(({ x, y }) => {
            const bg = Array.from(
              context.getImageData(Math.floor(x), Math.floor(y), 1, 1).data,
            );
            const alpha = (sample.opacity * sample.color[3]) / 255;
            const fg = sample.color
              .slice(0, 3)
              .map((n, index) => n * alpha + bg[index] * (1 - alpha));
            const a = luminance(fg),
              b = luminance(bg);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          }),
        );
      },
      { png: png.toString("base64"), sample },
    );
    contrastResults.push({ state, selector, text: sample.text, ratio });
    assert.ok(ratio >= 4.5, `${state}: ${selector}: ${ratio.toFixed(2)}:1`);
  }
}

async function scan(page, state) {
  await wait(300);
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async () => {
    const { violations, incomplete } = await window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
      },
    });
    const summarize = (items) =>
      items.map(({ id, nodes }) => ({
        id,
        nodes: nodes.map(({ target, failureSummary, any }) => ({
          target,
          failureSummary,
          contrast: any
            .filter(({ id }) => id === "color-contrast")
            .map(({ data }) => data),
        })),
      }));
    return {
      violations: summarize(violations),
      incomplete: summarize(incomplete),
    };
  });
  results.push({ state, ...result });
  await writeFile(
    process.env.A11Y_REPORT || "/tmp/portfolio-accessibility-report.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(`${state}: ${result.violations.length} axe violations`);
}

async function assertFocus(page, selector) {
  assert.equal(
    await page
      .locator(selector)
      .evaluate((el) => el === document.activeElement),
    true,
    selector,
  );
}

async function assertSkipLink(page) {
  const skip = page.getByRole("link", {
    name: "Skip to main content",
    exact: true,
  });
  assert.equal(await skip.getAttribute("href"), "#main-content");
  await page.keyboard.press("Tab");
  await assertFocus(page, ".skip-link");
  const visible = await skip.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const css = getComputedStyle(el);
    return (
      rect.width > 100 &&
      rect.height >= 44 &&
      rect.top >= 0 &&
      parseFloat(css.outlineWidth) >= 2 &&
      el.matches(":focus-visible")
    );
  });
  assert.equal(visible, true, "skip link becomes visible on the first Tab");
  await page.keyboard.press("Enter");
  await assertFocus(page, "#main-content");
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() =>
      document.querySelector("#main-content").contains(document.activeElement),
    ),
    true,
  );
}

async function assertTrap(page, modal) {
  const close = modal.locator("button").first();
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await modal.evaluate((el) => el.contains(document.activeElement)),
    true,
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await close.evaluate((el) => el === document.activeElement),
    true,
  );
}

async function tabTo(page, locator) {
  for (let index = 0; index < 100; index++) {
    if (await locator.evaluate((el) => el === document.activeElement)) {
      const outline = await locator.evaluate((el) => {
        const css = getComputedStyle(el);
        return {
          width: parseFloat(css.outlineWidth),
          style: css.outlineStyle,
          visible: el.matches(":focus-visible"),
        };
      });
      assert.ok(
        outline.width >= 2 && outline.style !== "none" && outline.visible,
      );
      return;
    }
    await page.keyboard.press("Tab");
  }
  assert.fail(`Not reachable by Tab: ${locator}`);
}

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/hydration|did not match|Blocked aria-hidden/i.test(message.text()))
      errors.push(message.text());
  });
  await page.route("**/api/contact", () =>
    assert.fail("Accessibility checks must not send messages"),
  );
  await page.route("https://tryhackme.com/**", (route) => route.abort());

  for (const theme of ["dark", "light"]) {
    await page.goto(base, { waitUntil: "networkidle" });
    await assertSkipLink(page);
    const toggle = page.getByRole("button", {
      name: "Toggle light mode",
      exact: true,
    });
    if (
      (await toggle.getAttribute("aria-pressed")) !== String(theme === "light")
    )
      await toggle.click();
    await wait(700);
    await scan(page, `${theme}: spatial`);
    await checkContrast(
      page,
      ".hero-institutional-subtitle, [data-offset='0'] .project-spec-label, [data-offset='0'] .project-description, .about-story p, .about-skills-index dd",
      `${theme}: spatial`,
    );
    await page.locator(".showcase-view-toggle").focus();
    await page.keyboard.press("Enter");
    await page.locator(".project-grid").waitFor();
    await wait(400);
    await assertFocus(page, ".showcase-view-toggle");
    assert.equal(
      await page.locator(".showcase-view-toggle").getAttribute("aria-pressed"),
      "true",
    );
    await scan(page, `${theme}: grid`);
    await checkContrast(
      page,
      ".project-grid .project-spec-label",
      `${theme}: grid`,
    );
    const cards = page.locator(".project-grid .project-card");
    for (const card of await cards.all()) {
      const select = card.locator(".select-node");
      await tabTo(page, select);
      await page.keyboard.press("Enter");
      assert.equal(await select.getAttribute("aria-pressed"), "true");
    }
    const caseToggle = cards.first().locator(".case-study-toggle");
    await caseToggle.click();
    assert.equal(await caseToggle.getAttribute("aria-expanded"), "true");
    const contentId = await caseToggle.getAttribute("aria-controls");
    await page.locator(`#${contentId}`).waitFor();
    await scan(page, `${theme}: case study`);
    const preview = cards.first().locator(".project-thumbnail");
    await preview.focus();
    await page.keyboard.press("Enter");
    const lightbox = page.locator("#project-lightbox");
    await lightbox.waitFor();
    assert.equal(await lightbox.getAttribute("aria-modal"), "true");
    await assertTrap(page, lightbox);
    await scan(page, `${theme}: lightbox`);
    await page.keyboard.press("Escape");
    await lightbox.waitFor({ state: "detached" });
    assert.equal(
      await preview.evaluate((el) => el === document.activeElement),
      true,
    );

    const trigger = page.locator(".dossier-hud-trigger");
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dossier = page.locator("#operator-dossier");
    await dossier.waitFor();
    assert.equal(
      await dossier.evaluate((el) => el.contains(document.activeElement)),
      true,
    );
    assert.equal(
      await page.locator("#main-content").getAttribute("aria-hidden"),
      "true",
    );
    assert.equal(
      await page.locator(".top-hud").getAttribute("aria-hidden"),
      "true",
    );
    await assertTrap(page, dossier);
    const input = dossier.locator('input[name="senderName"]');
    const message = dossier.locator("textarea").first();
    for (const field of [input, message]) {
      await field.fill("Keyboard ");
      await field.press("Backquote");
      await field.press("Shift+Backquote");
      assert.match(await field.inputValue(), /`~/);
      assert.equal(await page.locator("#developer-console").count(), 0);
    }
    await scan(page, `${theme}: dossier and message form`);
    await checkContrast(
      page,
      ".dossier-institution-location, .comms-channel-status",
      `${theme}: dossier`,
    );
    await page.keyboard.press("Escape");
    await dossier.waitFor({ state: "detached" });
    await assertFocus(page, ".dossier-hud-trigger");
    assert.equal(
      await page.locator("#main-content").getAttribute("aria-hidden"),
      null,
    );

    await page.keyboard.press("Backquote");
    const consoleInput = page.locator("#terminal-command");
    await consoleInput.waitFor();
    await consoleInput.fill("literal ");
    await consoleInput.press("Backquote");
    await consoleInput.press("Shift+Backquote");
    assert.equal(await consoleInput.inputValue(), "literal `~");
    await scan(page, `${theme}: console`);
    await consoleInput.press("Escape");
    await page.locator("#developer-console").waitFor({ state: "detached" });

    await page.goto(`${base}/services`, { waitUntil: "networkidle" });
    await assertSkipLink(page);
    await scan(page, `${theme}: services`);
    for (const selector of ["#name", "#details"]) {
      const field = page.locator(selector);
      await field.fill("Typing ");
      await field.press("Backquote");
      await field.press("Shift+Backquote");
      assert.match(await field.inputValue(), /`~/);
      assert.equal(await page.locator("#developer-console").count(), 0);
    }
  }

  await page.goto(base, { waitUntil: "networkidle" });
  await wait(700);
  for (const node of await page.locator(".spatial-card-select").all()) {
    await tabTo(page, node);
    assert.equal(
      await node.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return [0.2, 0.5, 0.8].some((fraction) => {
          const hit = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height * fraction,
          );
          return hit && el.contains(hit);
        });
      }),
      true,
      "focused background node must be visible above the active card",
    );
  }
  const wing = page.locator(".spatial-card-select").first();
  await tabTo(page, wing);
  const wingId = await wing
    .locator("..")
    .locator("..")
    .getAttribute("data-node-id");
  await page.keyboard.press("Enter");
  await wait(600);
  assert.equal(
    await page.locator('[data-offset="0"]').getAttribute("data-node-id"),
    wingId,
  );
  await assertFocus(page, '[data-offset="0"] .select-node');
  const spatialCase = page.locator('[data-offset="0"] .case-study-toggle');
  await spatialCase.focus();
  await spatialCase.press("Enter");
  await wait(300);
  await page.keyboard.press("Tab");
  await assertFocus(page, '[data-offset="0"] .case-study-content');
  assert.equal(
    await page
      .locator('[data-offset="0"] .case-study-content')
      .evaluate((el) => getComputedStyle(el).outlineWidth),
    "2px",
  );
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Space");
  await tabTo(
    page,
    page.getByRole("button", { name: "Previous project", exact: true }),
  );
  await tabTo(page, page.locator(".radar-node").first());
  await tabTo(
    page,
    page.getByRole("button", { name: "Next project", exact: true }),
  );
  await tabTo(page, page.locator(".pillar-pill").first());

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () => document.querySelector(".spatial-deck").dataset.motion === "reduced",
  );
  assert.equal(
    await page.locator(".orbital-core").getAttribute("data-motion"),
    "static",
  );
  const surface = page.locator('[data-offset="0"] .spatial-hover-surface');
  await surface.hover();
  assert.doesNotMatch(
    (await surface.getAttribute("style")) || "",
    /rotate[XY]\([^0]/,
  );
  await page.locator(".dossier-hud-trigger").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".dossier-slide")?.dataset.motionState ===
      "settled",
  );
  await page.keyboard.press("Escape");
  await page.locator("#operator-dossier").waitFor({ state: "detached" });

  for (const path of ["/", "/services"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    const tags = await page.evaluate(() =>
      Object.fromEntries(
        Array.from(
          document.head.querySelectorAll("meta[property],meta[name]"),
        ).map((el) => [
          el.getAttribute("property") || el.getAttribute("name"),
          el.content,
        ]),
      ),
    );
    for (const key of [
      "description",
      "og:title",
      "og:description",
      "og:url",
      "og:site_name",
      "og:image",
      "twitter:title",
      "twitter:description",
      "twitter:image",
    ])
      assert.ok(tags[key], key);
    assert.equal(tags["og:type"], "website");
    assert.equal(tags["og:locale"], "en_US");
    assert.equal(tags["twitter:card"], "summary_large_image");
    assert.equal(new URL(tags["og:url"]).pathname, path);
    const icons = await page
      .locator('head link[rel*="icon"]')
      .evaluateAll((elements) => elements.map((el) => el.href));
    assert.ok(icons.some((url) => url.includes("favicon.ico")));
    assert.ok(icons.some((url) => url.includes("icon.svg")));
    assert.ok(icons.some((url) => url.includes("apple-icon.png")));
    for (const url of icons)
      assert.equal((await page.request.get(url)).status(), 200);
  }
  const robots = await (await page.request.get(`${base}/robots.txt`)).text();
  assert.match(robots, /Allow: \/\n/);
  assert.match(robots, /Sitemap: https?:\/\/.+\/sitemap.xml/);
  const sitemap = await (await page.request.get(`${base}/sitemap.xml`)).text();
  assert.match(sitemap, /<loc>https?:\/\/.+\/services<\/loc>/);
  assert.equal((sitemap.match(/<loc>/g) || []).length, 2);
  assert.deepEqual(errors, []);
  const violations = results
    .filter((result) => result.violations.length)
    .map(({ state, violations }) => ({ state, violations }));
  await writeFile(
    process.env.A11Y_REPORT || "/tmp/portfolio-accessibility-report.json",
    JSON.stringify({ results, contrastResults, errors }, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        states: results.length,
        contrastSamples: contrastResults.length,
        minimumContrast: Math.min(...contrastResults.map(({ ratio }) => ratio)),
        violations,
        errors,
      },
      null,
      2,
    ),
  );
  assert.deepEqual(violations, []);
} finally {
  await browser.close();
}
