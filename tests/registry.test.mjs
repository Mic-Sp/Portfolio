import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  PROJECTS_REGISTRY,
  getActiveProjects,
  getPillarCategories,
  getProjectById,
} from "../src/data/projects.registry.ts";

test("project screenshots resolve to real image assets with accessible descriptions", () => {
  for (const project of PROJECTS_REGISTRY) {
    assert.match(project.image, /^\/projects\/[a-z-]+\.(jpg|png)$/);
    assert.ok(project.imageAlt.trim().length > 20);
    const bytes = readFileSync(
      new URL(`../public${project.image}`, import.meta.url),
    );
    assert.ok(bytes.length > 1000, `${project.id} must have a real screenshot`);
    if (project.image.endsWith(".jpg"))
      assert.deepEqual([...bytes.subarray(0, 3)], [0xff, 0xd8, 0xff]);
    else assert.equal(bytes.subarray(1, 4).toString(), "PNG");
  }
});

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
