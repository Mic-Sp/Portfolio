import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CUBE_EDGES,
  INITIAL_CUBE_ANGLES,
  getCubeWireframePath,
  projectCubeVertices,
  getOrbitalImpulse,
} from "../src/lib/orbital-math.ts";

test("the cube has eight projected vertices and twelve unique edges with degree three", () => {
  const { x, y, z } = INITIAL_CUBE_ANGLES;
  const vertices = projectCubeVertices(x, y, z);
  assert.equal(vertices.length, 8);
  assert.equal(
    new Set(vertices.map((point) => `${point.x},${point.y}`)).size,
    8,
  );
  assert.equal(CUBE_EDGES.length, 12);
  assert.equal(
    new Set(CUBE_EDGES.map(([a, b]) => [a, b].sort().join("-"))).size,
    12,
  );
  for (let vertex = 0; vertex < 8; vertex++)
    assert.equal(CUBE_EDGES.filter((edge) => edge.includes(vertex)).length, 3);
  assert.equal((getCubeWireframePath(x, y, z).match(/M/g) ?? []).length, 12);
});

test("projection changes in both axes and returns to its starting geometry after full rotations", () => {
  const { x, y, z } = INITIAL_CUBE_ANGLES;
  const initial = projectCubeVertices(x, y, z);
  const turned = projectCubeVertices(x + Math.PI / 3, y + Math.PI / 4, z);
  assert.ok(
    turned.some((point, index) => Math.abs(point.x - initial[index].x) > 2),
  );
  assert.ok(
    turned.some((point, index) => Math.abs(point.y - initial[index].y) > 2),
  );
  const fullTurn = projectCubeVertices(
    x + Math.PI * 2,
    y + Math.PI * 2,
    z + Math.PI * 2,
  );
  fullTurn.forEach((point, index) => {
    assert.ok(Math.abs(point.x - initial[index].x) < 1e-10);
    assert.ok(Math.abs(point.y - initial[index].y) < 1e-10);
  });
});

test("all orientations stay finite and inside the central radar ring", () => {
  for (let step = 0; step < 60; step++)
    for (const point of projectCubeVertices(
      step * 0.31,
      step * 0.23,
      step * 0.11,
    )) {
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
      assert.ok(Math.hypot(point.x - 64, point.y - 64) < 25.5);
    }
});

test("selection impulses decay rather than accumulating on repeated switches", () => {
  assert.equal(getOrbitalImpulse(0), 1);
  assert.ok(getOrbitalImpulse(100) > getOrbitalImpulse(400));
  assert.ok(getOrbitalImpulse(1500) < 0.002);
  assert.equal(getOrbitalImpulse(-1), 0);
  assert.equal(getOrbitalImpulse(Infinity), 0);
});
