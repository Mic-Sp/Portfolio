import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CUBE_FACE_ROTATIONS,
  INITIAL_INSPECTOR_ROTATION,
  getCubeFrontFace,
  snapCubeRotation,
  stepCubeInertia,
} from "../src/lib/cube-inspector-math.ts";

test("each quick-snap orientation puts its corresponding face toward the viewer", () => {
  assert.equal(getCubeFrontFace(INITIAL_INSPECTOR_ROTATION), "front");
  for (const [face, rotation] of Object.entries(CUBE_FACE_ROTATIONS)) {
    assert.equal(getCubeFrontFace(rotation), face);
    assert.equal(
      getCubeFrontFace({ x: rotation.x + 360, y: rotation.y - 720 }),
      face,
    );
  }
});

test("arrow snaps cleanly align faces and complete horizontal and vertical circuits", () => {
  let rotation = snapCubeRotation(INITIAL_INSPECTOR_ROTATION, "ArrowRight");
  assert.deepEqual(rotation, { x: 0, y: 90 });
  const visited = [getCubeFrontFace(rotation)];
  for (let i = 0; i < 3; i++) {
    rotation = snapCubeRotation(rotation, "ArrowRight");
    visited.push(getCubeFrontFace(rotation));
  }
  assert.equal(new Set(visited).size, 4);
  assert.equal(
    getCubeFrontFace(snapCubeRotation({ x: 0, y: 0 }, "ArrowUp")),
    "top",
  );
  assert.equal(
    getCubeFrontFace(snapCubeRotation({ x: 0, y: 0 }, "ArrowDown")),
    "bottom",
  );
  assert.equal(snapCubeRotation(rotation, "Tab"), null);
});

test("inertia damps smoothly and travels the same distance at 30 and 120 FPS", () => {
  const simulate = (fps) => {
    let state = { rotation: { x: 0, y: 0 }, velocity: { x: 180, y: -360 } };
    for (let i = 0; i < fps; i++)
      state = stepCubeInertia(state.rotation, state.velocity, 1 / fps, false);
    return state;
  };
  const slow = simulate(30),
    fast = simulate(120);
  for (const axis of ["x", "y"]) {
    assert.ok(Math.abs(slow.rotation[axis] - fast.rotation[axis]) < 1e-8);
    assert.ok(Math.abs(slow.velocity[axis] - fast.velocity[axis]) < 1e-8);
    assert.ok(Math.abs(fast.velocity[axis]) < 7);
  }
  const idle = stepCubeInertia({ x: 0, y: 0 }, { x: 0, y: 0 }, 0.05, true);
  assert.ok(idle.rotation.x > 0 && idle.rotation.y > 0);
  const stalled = stepCubeInertia(
    { x: 0, y: 0 },
    { x: 180, y: 360 },
    99,
    false,
  );
  assert.ok(
    stalled.rotation.y < 20,
    "a background-tab delay cannot create a huge spin",
  );
  assert.deepEqual(
    stepCubeInertia({ x: 1, y: 2 }, { x: 0, y: 0 }, NaN, false).rotation,
    { x: 1, y: 2 },
  );
});
