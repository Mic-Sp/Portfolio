import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInThisContext } from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { PROFILE_CONFIG } from "../src/data/profile.config.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const profilePath = path.join(root, "src/data/profile.config.ts");
const require = createRequire(import.meta.url);

// Compile the real components in memory so these tests need neither a Next.js
// server nor a browser. Each loader gets a fresh module graph and config.
function portfolioModules(standing) {
  const cache = new Map();
  function load(filename) {
    if (filename.endsWith(".css")) return {};
    if (cache.has(filename)) return cache.get(filename).exports;
    let source = readFileSync(filename, "utf8");
    if (filename === profilePath) {
      for (const key of ["league", "topPercent"]) {
        source = source.replace(
          JSON.stringify(PROFILE_CONFIG.tryHackMeStats[key]),
          JSON.stringify(standing[key]),
        );
      }
    }
    const compiled = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    const module = { exports: {} };
    cache.set(filename, module);
    const localRequire = (specifier) => {
      if (!specifier.startsWith(".") && !specifier.startsWith("@/"))
        return require(specifier);
      const base = specifier.startsWith("@/")
        ? path.join(root, "src", specifier.slice(2))
        : path.resolve(path.dirname(filename), specifier);
      const resolved = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
      assert.ok(resolved, `Cannot resolve ${specifier} from ${filename}`);
      return load(resolved);
    };
    runInThisContext(`(function(require,module,exports){${compiled}\n})`, {
      filename,
    })(localRequire, module, module.exports);
    return module.exports;
  }
  return (relativePath) => load(path.join(root, relativePath));
}

const configured = PROFILE_CONFIG.tryHackMeStats;
const changed = {
  league: configured.league.replace(/^\S+/, "Test"),
  topPercent: configured.topPercent.replace(/\d+/, (value) =>
    String(Number(value) + 11),
  ),
};

for (const [label, standing] of Object.entries({ configured, changed })) {
  test(`${label} standing reaches every UI display and the console`, async () => {
    const load = portfolioModules(standing);
    const { league, topPercent } = standing;
    const { PROFILE_CONFIG: profile } = load("src/data/profile.config.ts");
    assert.deepEqual(profile.tryHackMeStats, standing);
    const credentials = profile.skillsIndex.find(
      ({ label }) => label === "CREDENTIALS",
    );
    assert.ok(
      credentials.values.includes(`TryHackMe ${league} (${topPercent})`),
    );

    const { AboutSection } = load("src/components/portfolio/AboutSection.tsx");
    const about = renderToStaticMarkup(createElement(AboutSection));
    assert.ok(about.includes(`<li>TryHackMe ${league} ${topPercent}</li>`));
    assert.ok(about.includes(`TryHackMe ${league} (${topPercent})`));
    assert.ok(
      about.includes(`backed by ${topPercent} (${league}) standing on`),
    );

    const { HudProvider } = load("src/context/HudContext.tsx");
    const { HeroUplinks } = load("src/components/portfolio/HeroUplinks.tsx");
    const hero = renderToStaticMarkup(
      createElement(HudProvider, null, createElement(HeroUplinks)),
    );
    assert.ok(hero.includes(`THM // ${league} ${topPercent}`));

    const { CommsUplink } = load("src/components/portfolio/CommsUplink.tsx");
    const dossier = renderToStaticMarkup(
      createElement(CommsUplink, { prefix: "test", telemetryActive: false }),
    );
    assert.ok(
      dossier.includes(
        `<span class="thm-league">${league.toUpperCase()}</span>`,
      ),
    );
    assert.ok(dossier.includes('class="thm-badge-host"'));
    assert.ok(
      dossier.includes(profile.commsAndTelemetry.thmTelemetry.profileUrl),
    );

    const { runCliCommand } = load("src/lib/cli-commands.ts");
    const output = await runCliCommand("thm", {});
    assert.equal(
      output.lines[0].text,
      `TRYHACKME // ${profile.commsAndTelemetry.thmTelemetry.handle} // ${league} // ${topPercent}`,
    );
  });
}

test("standing literals occur only in the central profile configuration", () => {
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
  const literal =
    /\b(?:bronze|silver|gold|platinum|diamond|sapphire|ruby|emerald|master)\s+league\b|\btop\s+\d+(?:\.\d+)?%/gi;
  const matches = [];
  for (const file of files) {
    const source = readFileSync(path.join(root, file), "utf8");
    for (const match of source.matchAll(literal))
      matches.push({ file, value: match[0] });
  }
  assert.deepEqual(matches, [
    { file: "src/data/profile.config.ts", value: configured.league },
    { file: "src/data/profile.config.ts", value: configured.topPercent },
  ]);
});
