import assert from "node:assert/strict";
import { test } from "node:test";
import { PROJECTS_REGISTRY } from "../src/data/projects.registry.ts";
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
