import assert from "node:assert/strict";
import { test } from "node:test";
import { PROJECTS_REGISTRY } from "../src/data/projects.registry.ts";
import { PROFILE_CONFIG } from "../src/data/profile.config.ts";
import {
  CLI_COMMANDS,
  parseCommand,
  runCliCommand,
  getAutocomplete,
  getCommandEcho,
  getHistoryCommand,
  safeExternalUrl,
} from "../src/lib/cli-commands.ts";

function environment(registry = PROJECTS_REGISTRY) {
  const state = {
    selected: null,
    view: "grid",
    godMode: false,
    closed: false,
    opened: null,
  };
  const context = {
    registry,
    get godMode() {
      return state.godMode;
    },
    selectProject: (index) => {
      state.selected = index;
    },
    setViewMode: (mode) => {
      state.view = mode;
    },
    setGodMode: (enabled) => {
      state.godMode = enabled;
    },
    closeTerminal: () => {
      state.closed = true;
    },
    openLink: (href) => {
      state.opened = href;
    },
  };
  return { state, context };
}
const output = (result) => result.lines.map((line) => line.text).join("\n");

test("contact aliases, help and completion expose configured contact actions", async () => {
  const { context } = environment();
  const { directChannels, thmTelemetry } = PROFILE_CONFIG.commsAndTelemetry;
  const contact = await runCliCommand("contact", context);
  const links = contact.lines.flatMap((line) => line.links ?? []);
  assert.deepEqual(
    links.map((link) => link.href),
    [
      directChannels.github.href,
      directChannels.linkedin.href,
      directChannels.email.href,
      thmTelemetry.profileUrl,
    ],
  );
  assert.equal(links[2].label, "mic.sprague@gmail.com");
  for (const alias of ["uplink", "socials"])
    assert.deepEqual(await runCliCommand(alias, context), contact);
  assert.equal(getAutocomplete("cont").value, "contact ");
  assert.equal(getAutocomplete("th").value, "thm ");
});

test("thm supplies operator identity and live verification without topic lists or fabricated metrics", async () => {
  const { context } = environment();
  const { thmTelemetry } = PROFILE_CONFIG.commsAndTelemetry;
  const thm = await runCliCommand("thm", context);
  const body = output(thm);
  assert.ok(body.includes(thmTelemetry.handle));
  assert.ok(body.includes(thmTelemetry.league));
  assert.doesNotMatch(
    body,
    /STRIDE|MITRE ATLAS|Web App Pentesting|RSA Crypto|Ghidra/,
  );
  assert.equal(
    thm.lines.flatMap((line) => line.links ?? [])[0].href,
    thmTelemetry.profileUrl,
  );
  assert.doesNotMatch(body, /\d+\s*(rooms|days|%)|top\s*\d/i);
});

test("whois and stack expose the complete shared dossier profile", async () => {
  const { context } = environment();
  const whois = output(await runCliCommand("whois", context));
  assert.ok(whois.includes(PROFILE_CONFIG.executiveBio));
  assert.match(
    whois,
    /intelligent automated workflows, production web applications, and custom developer tools, engineered from the ground up with an application-security mindset\./,
  );
  assert.match(whois, /Holy Cross College \(Notre Dame, IN\)/);
  assert.match(whois, /Summa Cum Laude \(3\.98 GPA\)/);
  assert.match(whois, /Delta Epsilon Sigma National Honor Society/);
  assert.match(whois, /Quantum Computing: An Economic Insight/);
  assert.ok(whois.includes("B.A. in Liberal Arts, Concentration in Business"));
  assert.ok(
    whois.includes(
      "Pathways to Applied AI Solutions Engineering (P.A.I.S.E.) Certificate",
    ),
  );
  assert.ok(whois.includes("AI Software Engineering Apprenticeship"));
  for (const item of PROFILE_CONFIG.education) {
    assert.ok(whois.includes(item.institution));
    assert.ok(whois.includes(item.qualification));
    assert.ok(whois.includes(item.subheader));
    for (const highlight of item.highlights)
      assert.ok(whois.includes(highlight));
    assert.ok(whois.includes(`${item.callout.label}: "${item.callout.text}"`));
  }
  for (const specialization of PROFILE_CONFIG.specializations)
    assert.ok(whois.includes(specialization));
  const stack = output(await runCliCommand("stack", context));
  for (const [category, technologies] of Object.entries(
    PROFILE_CONFIG.engineeringMatrix,
  )) {
    assert.ok(stack.includes(category.toUpperCase()));
    for (const technology of technologies)
      assert.ok(stack.includes(technology));
  }
});

test("parser supports quotes, exact whitespace inside strings, escaped spaces, empty strings, and case-insensitive commands", () => {
  assert.deepEqual(parseCommand('LS --pillar "AI // QUANTUM"'), {
    name: "ls",
    args: ["--pillar", "AI // QUANTUM"],
  });
  assert.deepEqual(parseCommand('entropy " a  b "'), {
    name: "entropy",
    args: [" a  b "],
  });
  assert.deepEqual(parseCommand('entropy ""'), { name: "entropy", args: [""] });
  assert.deepEqual(parseCommand(String.raw`inspect q\ split`), {
    name: "inspect",
    args: ["q split"],
  });
  assert.throws(() => parseCommand('pwnd "unclosed'));
});

test("fifth and sixth nodes automatically enter ls, inspect, select, open, and autocomplete", async () => {
  const nodes = [
    ...PROJECTS_REGISTRY,
    {
      ...PROJECTS_REGISTRY[0],
      id: "fifth-node",
      order: 5,
      pillar: "New Pillar",
      pillarShort: "NEW // PILLAR",
    },
    {
      ...PROJECTS_REGISTRY[0],
      id: "sixth-node",
      order: 6,
      title: "Sixth Node",
      cliMeta: undefined,
    },
  ];
  const { state, context } = environment(nodes);
  assert.match(output(await runCliCommand("ls", context)), /6 ACTIVE NODES/);
  assert.match(
    output(await runCliCommand('ls --pillar "NEW // PILLAR"', context)),
    /fifth-node/,
  );
  assert.match(
    output(await runCliCommand("cat sixth-node", context)),
    /Sixth Node/,
  );
  await runCliCommand("select 6", context);
  assert.equal(state.selected, 5);
  assert.equal(state.view, "spatial");
  await runCliCommand("select fifth-node", context);
  assert.equal(state.selected, 4);
  await runCliCommand("open sixth-node repo", context);
  assert.equal(state.opened, nodes[5].links.repo);
  assert.equal(
    getAutocomplete("inspect sixth", nodes).value,
    "inspect sixth-node ",
  );
  assert.equal(
    getAutocomplete("select fifth", nodes).value,
    "select fifth-node ",
  );
});

test("archives remain inspectable but cannot be selected, and invalid commands are bounded", async () => {
  const archived = {
    ...PROJECTS_REGISTRY[0],
    id: "retired",
    status: "ARCHIVED",
  };
  const { state, context } = environment([...PROJECTS_REGISTRY, archived]);
  assert.match(
    output(await runCliCommand("inspect retired", context)),
    /ARCHIVED/,
  );
  await runCliCommand("select retired", context);
  assert.equal(state.selected, null);
  for (const command of [
    "select 0",
    "select 99",
    "select 1foo",
    "select",
    "view bad",
    "inspect missing",
    "open q-split bad",
    'pwnd "unclosed',
    "<script>",
  ])
    assert.equal(
      (await runCliCommand(command, context)).lines[0].tone,
      "error",
    );
  const empty = environment([]);
  assert.match(
    output(await runCliCommand("ls", empty.context)),
    /No active nodes/,
  );
  assert.equal(safeExternalUrl("javascript:alert(1)"), undefined);
  assert.equal(safeExternalUrl("#"), undefined);
});

test("iddqd and godmode toggle shared state both ways; view, clear, close use registry actions", async () => {
  const { state, context } = environment();
  assert.match(
    output(await runCliCommand("iddqd", context)),
    /GODMODE ENGAGED/,
  );
  assert.equal(state.godMode, true);
  await runCliCommand("godmode", context);
  assert.equal(state.godMode, false);
  await runCliCommand("view grid", context);
  assert.equal(state.view, "grid");
  assert.equal((await runCliCommand("clear", context)).action, "clear");
  assert.equal((await runCliCommand("close", context)).action, "close");
  assert.equal(state.closed, true);
});

test("help is registry-driven; secret input never enters echo, history, completion, or output", async () => {
  const { context } = environment();
  const help = output(await runCliCommand("help", context));
  CLI_COMMANDS.forEach((command) => assert.ok(help.includes(command.syntax)));
  for (const raw of [
    "pwnd Unique_Secret_123",
    "entropy --redact Unique_Secret_123",
    '"pwnd" Unique_Secret_123',
    'pwnd "Unique_Secret_123',
  ]) {
    assert.equal(getHistoryCommand(raw), null);
    assert.equal(getCommandEcho(raw).includes("Unique_Secret_123"), false);
    assert.deepEqual(getAutocomplete(raw).suggestions, []);
  }
  context.auditPassword = async () => ({
    prefix: "ABCDE",
    suffixMasked: "*".repeat(35),
    pwnedCount: null,
    isCompromised: null,
    offlineFallback: true,
  });
  const audit = output(await runCliCommand("pwnd Unique_Secret_123", context));
  assert.match(audit, /UNKNOWN/);
  assert.match(audit, /SHANNON/);
  assert.equal(audit.includes("Unique_Secret_123"), false);
  assert.equal(getHistoryCommand("ls"), "ls");
  assert.equal(getAutocomplete("ins").value, "inspect ");
});
