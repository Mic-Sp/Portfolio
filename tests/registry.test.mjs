import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PROJECTS_REGISTRY,
  getActiveProjects,
  getPillarCategories,
  getProjectById,
} from "../src/data/projects.registry.ts";

test("active projects sort by order without mutating the registry", () => {
  const previous = [...PROJECTS_REGISTRY];
  try {
    PROJECTS_REGISTRY.reverse();
    assert.deepEqual(
      getActiveProjects().map((project) => project.order),
      [1, 2, 3, 4],
    );
    assert.equal(PROJECTS_REGISTRY[0].id, "pwndpass");
  } finally {
    PROJECTS_REGISTRY.splice(0, PROJECTS_REGISTRY.length, ...previous);
  }
});

test("new projects and pillars scale automatically; archived projects remain inspectable", () => {
  const previous = [...PROJECTS_REGISTRY];
  try {
    const template = PROJECTS_REGISTRY[0];
    PROJECTS_REGISTRY.push(
      {
        ...template,
        id: "fifth-node",
        order: 5,
        pillar: "New Discipline",
        pillarShort: "NEW // PILLAR",
        accent: "rose",
      },
      {
        ...template,
        id: "sixth-node",
        order: 6,
        pillar: "New Discipline",
        pillarShort: "NEW // PILLAR",
        accent: "blue",
      },
      {
        ...template,
        id: "archived-node",
        order: 7,
        status: "ARCHIVED",
        pillar: "Historical",
      },
    );
    assert.equal(getActiveProjects().length, 6);
    assert.equal(getPillarCategories().length, 5);
    assert.equal(
      getPillarCategories().find(
        (category) => category.pillar === "New Discipline",
      ).count,
      2,
    );
    assert.equal(getProjectById("archived-node").status, "ARCHIVED");
    assert.equal(
      getPillarCategories().some(
        (category) => category.pillar === "Historical",
      ),
      false,
    );
  } finally {
    PROJECTS_REGISTRY.splice(0, PROJECTS_REGISTRY.length, ...previous);
  }
});

test("empty and single-project category lists are safe", () => {
  assert.deepEqual(getPillarCategories([]), []);
  assert.equal(getPillarCategories([PROJECTS_REGISTRY[0]])[0].count, 1);
});

test("CLI IDs are unique slugs and missing IDs return undefined", () => {
  const ids = PROJECTS_REGISTRY.map((project) => project.id);
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach((id) => assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/));
  assert.equal(getProjectById("q-split").title, "Q-Split");
  assert.equal(getProjectById("missing-node"), undefined);
});
