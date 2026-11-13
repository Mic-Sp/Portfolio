// Run against a production preview with Playwright and axe-core. No messages are sent.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { checkRenderedTextContrast } from "./helpers/contrast.mjs";

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
const headingResults = [];
const reflowResults = [];
const errors = [];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function assertHeadingHierarchy(page, state) {
  const outline = await page.evaluate(() => {
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];
    const text = (el) => {
      const copy = el.cloneNode(true);
      copy
        .querySelectorAll('[aria-hidden="true"]')
        .forEach((node) => node.remove());
      return copy.textContent.replace(/\s+/g, " ").trim();
    };
    return {
      h1: headings.filter((el) => el.tagName === "H1").map(text),
      projects: [
        ...document.querySelectorAll("#projects .project-card h3"),
      ].map(text),
      deepHeadings: headings
        .filter((el) => Number(el.tagName[1]) > 3)
        .map(text),
      accessible: headings
        .filter((el) => !el.closest('[aria-hidden="true"], [inert]'))
        .map((el) => ({ level: Number(el.tagName[1]), text: text(el) })),
      sections: [...document.querySelectorAll("#main-content h2")].map(text),
      modal: !!document.querySelector(
        'dialog[open], [role="dialog"][aria-modal="true"]',
      ),
      metadataTags: [
        ...document.querySelectorAll(
          ".section-index, .project-number, .project-spec-label, .schematic-rail > span, .case-study-label",
        ),
      ].map((el) => el.tagName),
    };
  });
  assert.deepEqual(outline.h1, ["Michael A. Sprague."], state);
  assert.deepEqual(
    outline.projects,
    [
      "Q-Split",
      "Backlog Buster",
      "Huddle & Heal Counseling & Consulting",
      "PwndPass",
    ],
    state,
  );
  assert.deepEqual(
    outline.deepHeadings,
    [],
    `${state}: metadata must not be headings`,
  );
  assert.ok(
    outline.metadataTags.every((tag) => ["P", "SPAN"].includes(tag)),
    state,
  );
  let previous = outline.modal ? 1 : 0;
  for (const heading of outline.accessible) {
    assert.ok(
      heading.level <= previous + 1,
      `${state}: skipped heading level before ${heading.text}`,
    );
    previous = heading.level;
  }
  if (!outline.modal) {
    assert.deepEqual(outline.sections, ["Projects", "About Me"], state);
  }
  headingResults.push({ state, headings: outline.accessible });
}

async function assertReflowLayout(page, state) {
  const layout = await page.evaluate(() => {
    const failures = [];
    const selectors = [
      ".top-hud",
      ".hero-credentials",
      ".hero-uplinks",
      ".project-toolbar",
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el.scrollWidth > el.clientWidth + 1)
        failures.push(`${selector}: content overflows`);
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (rect.width && (rect.left < -1 || rect.right > innerWidth + 1))
            failures.push(
              `${selector}: clipped text: ${node.textContent.trim()}`,
            );
        }
      }
    }
    for (const selector of [
      ".top-hud .hud-button",
      ".hero-credentials li",
      ".hero-uplink-pill",
      ".project-toolbar > *",
    ]) {
      const boxes = [...document.querySelectorAll(selector)]
        .map((el) => el.getBoundingClientRect())
        .filter((box) => box.width && box.height);
      if (
        boxes.some((a, i) =>
          boxes
            .slice(i + 1)
            .some(
              (b) =>
                Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1,
            ),
        )
      )
        failures.push(`${selector}: overlapping controls`);
    }
    return {
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      failures,
    };
  });
  assert.ok(
    layout.documentWidth <= layout.width,
    `${state}: horizontal page overflow`,
  );
  assert.deepEqual(layout.failures, [], state);
  return layout;
}

async function assertReachable(page, control) {
  await page.mouse.move(0, 0);
  await control.evaluate((el) => {
    el.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "instant",
    });
    el.focus({ preventScroll: true });
  });
  assert.equal(
    await control.evaluate((el) => el === document.activeElement),
    true,
  );
  await control.click({ trial: true });
  const fits = await control.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.left >= -1 &&
      rect.right <= innerWidth + 1 &&
      el.scrollWidth <= el.clientWidth + 1
    );
  });
  assert.equal(fits, true, `Control must fit: ${await control.innerText()}`);
}

async function verifyReflow() {
  // A 1280×900 screen at 200% browser zoom has a 640×450 CSS viewport.
  for (const theme of ["dark", "light"])
    for (const [width, height] of [
      [640, 450],
      [375, 844],
      [320, 844],
    ]) {
      const page = await browser.newPage({
        viewport: { width, height },
        colorScheme: theme,
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/contact", () =>
        assert.fail("Reflow checks must not send messages"),
      );
      await page.route("https://tryhackme.com/**", (route) => route.abort());
      try {
        await page.goto(base, { waitUntil: "networkidle" });
        await wait(700);
        for (const mode of ["spatial", "grid"]) {
          if (mode === "grid") {
            await page
              .getByRole("button", { name: "Switch to Grid View", exact: true })
              .click();
            await page.locator(".project-grid").waitFor();
          }
          const state = `${theme}: ${width}×${height}: ${mode}`;
          const layout = await assertReflowLayout(page, state);
          await assertHeadingHierarchy(page, state);
          for (const control of await page
            .locator(
              ".top-hud .hud-button:visible, .hero-credentials button, .hero-uplinks a, .hero-uplinks button, .showcase-view-toggle",
            )
            .all())
            await assertReachable(page, control);
          const cards =
            mode === "grid"
              ? page.locator(".project-grid .project-card")
              : page.locator('[data-offset="0"] .project-card');
          for (const card of await cards.all()) {
            const accordion = card.locator(".case-study-toggle");
            await assertReachable(page, accordion);
            await accordion.click();
            const contentId = await accordion.getAttribute("aria-controls");
            await page.locator(`#${contentId}`).waitFor();
            await wait(300);
            await assertHeadingHierarchy(page, `${state}: expanded case study`);
            assert.equal(
              await page
                .locator(`#${contentId}`)
                .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
              true,
            );
            for (const link of await card.locator(".project-links a").all())
              await assertReachable(page, link);
            await accordion.click();
            await page.locator(`#${contentId}`).waitFor({ state: "detached" });
          }
          await assertReflowLayout(page, state);
          console.log(
            `${state}: headings, control reachability, and reflow passed`,
          );
          reflowResults.push({
            state,
            ...layout,
            accordions: await cards.count(),
          });
        }
        await page.locator(".dossier-hud-trigger").click();
        await page.waitForFunction(
          () =>
            document.querySelector(".dossier-slide")?.dataset.motionState ===
            "settled",
        );
        await assertHeadingHierarchy(page, `${theme}: ${width}: credentials`);
        assert.equal(
          await page.locator(".dossier-drawer-heading h2").innerText(),
          "CREDENTIALS",
        );
        assert.equal(
          await page
            .locator(".dossier-sheet")
            .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          true,
        );
        await assertReachable(page, page.locator(".contact-submit-row button"));
        await page
          .getByRole("button", { name: "Close Credentials", exact: true })
          .click();
        await page.locator("#operator-dossier").waitFor({ state: "detached" });
      } finally {
        await page.close();
      }
    }
}

async function checkContrast(page, selector, state) {
  contrastResults.push(
    ...(await checkRenderedTextContrast(page, selector, state)),
  );
}

async function scan(page, state) {
  await wait(300);
  if (new URL(page.url()).pathname === "/")
    await assertHeadingHierarchy(page, state);
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
  await verifyReflow();
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
    JSON.stringify(
      { results, contrastResults, headingResults, reflowResults, errors },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        states: results.length,
        contrastSamples: contrastResults.length,
        minimumContrast: Math.min(...contrastResults.map(({ ratio }) => ratio)),
        headingAudits: headingResults.length,
        reflowResults,
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
