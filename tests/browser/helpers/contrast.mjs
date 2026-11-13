import assert from "node:assert/strict";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Axe cannot resolve translucent gradients/pseudo elements. Sample the rendered
// backdrop with glyphs hidden and compare it with computed (un-antialiased) text.
export async function checkRenderedTextContrast(page, selector, state) {
  const contrastResults = [];
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
    assert.ok(
      ratio >= 4.5,
      `${state}: "${sample.text}": ${ratio.toFixed(2)}:1 (${selector})`,
    );
  }
  return contrastResults;
}
