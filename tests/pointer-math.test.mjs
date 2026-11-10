import assert from "node:assert/strict";
import { test } from "node:test";
import { getPointerPosition } from "../src/lib/pointer-math.ts";

test("pointer coordinates normalize independently for card and emblem proportions", () => {
  assert.deepEqual(getPointerPosition(310, 400, 620, 800), {
    x: 0,
    y: 0,
    localX: 310,
    localY: 400,
  });
  assert.deepEqual(getPointerPosition(96, 32, 128, 128), {
    x: 0.25,
    y: -0.25,
    localX: 96,
    localY: 32,
  });
});

test("edge and captured pointer positions cannot exceed the tilt bounds", () => {
  assert.deepEqual(getPointerPosition(-20, 1000, 620, 800), {
    x: -0.5,
    y: 0.5,
    localX: 0,
    localY: 800,
  });
  assert.deepEqual(getPointerPosition(900, -30, 620, 800), {
    x: 0.5,
    y: -0.5,
    localX: 620,
    localY: 0,
  });
});

test("unmeasurable or invalid pointer geometry remains neutral and finite", () => {
  for (const args of [
    [0, 0, 0, 0],
    [1, 1, -1, 128],
    [NaN, 0, 128, 128],
    [0, Infinity, 128, 128],
  ])
    assert.deepEqual(getPointerPosition(...args), {
      x: 0,
      y: 0,
      localX: 0,
      localY: 0,
    });
});
