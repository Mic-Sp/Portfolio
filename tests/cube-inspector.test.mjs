import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CUBE_FACE_ROTATIONS,
  INITIAL_INSPECTOR_ROTATION,
  getCubeFrontFace,
  getCubeArrowDirection,
  stepCubeKeyboard,
  CUBE_KEY_NUDGE,
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

test("keyboard taps ease toward a small nudge without rounding existing angles", () => {
  const direction = getCubeArrowDirection("ArrowRight");
  const target = {
    x: INITIAL_INSPECTOR_ROTATION.x,
    y: INITIAL_INSPECTOR_ROTATION.y + direction.y * CUBE_KEY_NUDGE,
  };
  let step = stepCubeKeyboard(
    INITIAL_INSPECTOR_ROTATION,
    target,
    new Set(),
    1 / 60,
  );
  assert.equal(step.rotation.x, INITIAL_INSPECTOR_ROTATION.x);
  assert.ok(
    step.rotation.y > INITIAL_INSPECTOR_ROTATION.y &&
      step.rotation.y < target.y,
  );
  for (let i = 0; i < 90; i++)
    step = stepCubeKeyboard(step.rotation, step.target, new Set(), 1 / 60);
  assert.deepEqual(step.rotation, target);
  assert.equal(step.settled, true);
  assert.deepEqual(getCubeArrowDirection("ArrowUp"), { x: -1, y: 0 });
  assert.deepEqual(getCubeArrowDirection("ArrowDown"), { x: 1, y: 0 });
  assert.deepEqual(getCubeArrowDirection("ArrowLeft"), { x: 0, y: -1 });
  assert.equal(getCubeArrowDirection("Tab"), null);
});

test("held keys rotate continuously, opposing keys cancel, and frame rate does not change total travel", () => {
  const simulate = (fps) => {
    let rotation = { x: 0, y: 0 },
      target = { x: 0, y: 0 };
    for (let i = 0; i < fps; i++) {
      const step = stepCubeKeyboard(
        rotation,
        target,
        new Set(["ArrowRight", "ArrowUp"]),
        1 / fps,
      );
      rotation = step.rotation;
      target = step.target;
    }
    for (let i = 0; i < fps * 2; i++) {
      const step = stepCubeKeyboard(rotation, target, new Set(), 1 / fps);
      rotation = step.rotation;
    }
    return rotation;
  };
  const slow = simulate(30),
    fast = simulate(120);
  assert.ok(Math.abs(slow.x + 60) < 1e-8 && Math.abs(slow.y - 60) < 1e-8);
  assert.ok(
    Math.abs(slow.x - fast.x) < 1e-8 && Math.abs(slow.y - fast.y) < 1e-8,
  );
  const opposing = stepCubeKeyboard(
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]),
    0.05,
  );
  assert.deepEqual(opposing.rotation, { x: 0, y: 0 });
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
