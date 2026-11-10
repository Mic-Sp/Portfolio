// Successful dispatch is mocked: this check never sends real email.
import assert from "node:assert/strict";
import { ContactSchema } from "../../src/lib/schemas/contact.schema.ts";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.PORTFOLIO_BASE_URL || "http://127.0.0.1:3000";
const success = "Message dispatched successfully. I will be in touch shortly.";
const failure = "Transmission failed. Please reach out directly via LinkedIn.";
const values = {
  name: "Jane Operator",
  email: "jane@example.com",
  details:
    "Interested in a custom scheduling platform and AI automation workflow.",
};
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [],
    requests = [];
  let mode = "success";
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/hydration|did not match/i.test(message.text()))
      errors.push(message.text());
  });
  await page.route("**/api/contact", async (route) => {
    const request = route.request();
    requests.push({
      method: request.method(),
      contentType: request.headers()["content-type"],
      payload: request.postDataJSON(),
    });
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (mode === "offline") return route.abort("failed");
    if (mode !== "success")
      return route.fulfill({
        status: Number(mode),
        contentType: "application/json",
        body: JSON.stringify({
          status: "REJECTED",
          error: {
            code: mode === "429" ? "RATE_LIMITED" : "RELAY_UNAVAILABLE",
            message: "Test rejection",
            ...(mode === "400"
              ? { fieldErrors: { message: ["Please revise this message."] } }
              : {}),
          },
        }),
      });
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "TRANSMITTED",
        id: "browser-mock-no-email",
      }),
    });
  });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.servicesFormDocument = "no-reload";
  });
  await page
    .locator(".top-hud")
    .getByRole("link", { name: "Client Services →", exact: true })
    .click();
  await page.waitForURL(base + "/services");
  const section = page.locator("#project-inquiry"),
    form = section.locator("form");
  const submit = section.getByRole("button", {
    name: "Send Project Inquiry",
    exact: true,
  });
  const feedback = section.locator("#services-inquiry-feedback");
  assert.doesNotMatch(await section.innerText(), /preview|not sent yet/i);
  assert.equal(await feedback.getAttribute("data-status"), "idle");
  assert.equal(
    await section.locator('[name="name"]').getAttribute("maxlength"),
    "80",
  );
  assert.equal(
    await section.locator('[name="email"]').getAttribute("maxlength"),
    "120",
  );
  assert.equal(
    await section.locator('[name="details"]').getAttribute("maxlength"),
    "2000",
  );
  await submit.click();
  assert.equal(requests.length, 0);
  assert.equal(await section.locator('[aria-invalid="true"]').count(), 3);
  assert.equal(
    await section
      .locator('[name="name"]')
      .evaluate((el) => el === document.activeElement),
    true,
  );
  async function fill() {
    await section.getByLabel("Name", { exact: true }).fill(values.name);
    await section.getByLabel("Email", { exact: true }).fill(values.email);
    await section
      .getByLabel("Project Overview", { exact: true })
      .fill(values.details);
  }
  async function unchangedDocument() {
    assert.equal(
      await page.evaluate(() => window.servicesFormDocument),
      "no-reload",
    );
    assert.equal(new URL(page.url()).pathname, "/services");
  }
  await fill();
  await form.evaluate((el) => {
    el.requestSubmit();
    el.requestSubmit();
  });
  await page.waitForFunction(
    () =>
      document.querySelector("#services-inquiry-feedback")?.dataset.status ===
      "loading",
  );
  assert.equal(
    await section
      .getByRole("button", { name: "Transmitting...", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(await section.locator('[name="name"]').isDisabled(), true);
  assert.equal(
    await section.locator(".lucide-loader-circle,.lucide-loader-2").count(),
    1,
  );
  await page.waitForFunction(
    () =>
      document.querySelector("#services-inquiry-feedback")?.dataset.status ===
      "success",
  );
  assert.equal(await feedback.innerText(), success);
  assert.equal(
    requests.length,
    1,
    "rapid submissions must dispatch exactly once",
  );
  const sent = requests[0];
  assert.equal(sent.method, "POST");
  assert.equal(sent.contentType, "application/json");
  assert.deepEqual(sent.payload, {
    senderName: values.name,
    senderEmail: values.email,
    message: values.details,
    subject: "Client Services Inquiry",
    origin: "DOSSIER_GUI",
    website: "",
  });
  assert.equal(ContactSchema.safeParse(sent.payload).success, true);
  for (const field of ["name", "email", "details"])
    assert.equal(await section.locator(`[name="${field}"]`).inputValue(), "");
  assert.equal(await submit.isEnabled(), true);
  await unchangedDocument();
  for (const code of ["400", "429", "503", "offline"]) {
    mode = code;
    await fill();
    await submit.click();
    await page.waitForFunction(
      () =>
        document.querySelector("#services-inquiry-feedback")?.dataset.status ===
        "error",
    );
    assert.equal(await feedback.innerText(), failure);
    assert.equal(
      await feedback
        .getByRole("link", { name: "LinkedIn", exact: true })
        .getAttribute("href"),
      "https://www.linkedin.com/in/michael-sprague-it/",
    );
    for (const [field, value] of Object.entries(values))
      assert.equal(
        await section.locator(`[name="${field}"]`).inputValue(),
        value,
      );
    assert.equal(await submit.isEnabled(), true);
    if (code === "400")
      assert.match(await section.innerText(), /Please revise this message\./);
    await unchangedDocument();
  }
  await page
    .getByRole("button", { name: "Toggle light mode", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".services-page")?.dataset.servicesTheme ===
      "light",
  );
  await page.waitForTimeout(250);
  assert.equal(
    await feedback.evaluate((el) => getComputedStyle(el).color),
    "rgb(190, 18, 60)",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  mode = "success";
  await fill();
  await submit.click();
  await page.waitForFunction(
    () =>
      document.querySelector("#services-inquiry-feedback")?.dataset.status ===
      "success",
  );
  assert.equal(await feedback.innerText(), success);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await unchangedDocument();
  if (process.env.PORTFOLIO_SCREENSHOT_DIR)
    await section.screenshot({
      path: `${process.env.PORTFOLIO_SCREENSHOT_DIR}/services-contact-success.png`,
    });
  await page.getByRole("link", { name: /Developer Portfolio/ }).click();
  await page.waitForURL(base + "/");
  assert.equal(
    await page
      .locator(".top-hud")
      .getByRole("link", { name: "Client Services →", exact: true })
      .count(),
    1,
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        passed: true,
        requests: requests.length,
        checks: [
          "shared schema and exact API mapping",
          "local validation before POST",
          "loading spinner and disabled fields",
          "duplicate submission guard",
          "success clears fields and re-enables form",
          "HTTP 400/429/503 and offline feedback preserve drafts",
          "clickable LinkedIn fallback",
          "no document reload",
          "light theme and mobile layout",
          "Client Services navigation round trip",
          "all deliveries mocked; no test emails sent",
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
