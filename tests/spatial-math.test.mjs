import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getCircularOffset,
  getSpatialTargets,
  getSwipeDirection,
} from "../src/lib/spatial-math.ts";

for (const [total, expected] of [
  [0, []],
  [1, [0]],
  [2, [0, 1]],
  [4, [0, 1, 2, -1]],
  [5, [0, 1, 2, -2, -1]],
  [6, [0, 1, 2, 3, -2, -1]],
]) {
  test(`shortest ring offsets are stable at every active index for N=${total}`, () => {
    if (total === 0) {
      assert.equal(getCircularOffset(0, 0, 0), 0);
      assert.equal(getCircularOffset(7, 3, 0), 0);
    }
    for (let active = 0; active < total; active++) {
      const offsets = Array.from({ length: total }, (_, step) =>
        getCircularOffset((active + step) % total, active, total),
      );
      assert.deepEqual(offsets, expected);
      assert.equal(new Set(offsets).size, total);
      assert.equal(getCircularOffset(active, active, total), 0);
    }
  });
}

test("indices normalize across either boundary and malformed lengths stay safe", () => {
  assert.equal(getCircularOffset(-1, 0, 4), -1);
  assert.equal(getCircularOffset(4, 3, 4), 1);
  assert.equal(getCircularOffset(0, -1, 4), 1);
  for (const total of [-1, NaN, Infinity, 2.5])
    assert.equal(getCircularOffset(0, 0, total), 0);
});

test("center, wing, antinode, and deep targets preserve their interaction tiers", () => {
  assert.deepEqual(getSpatialTargets(0, 4), {
    x: "0%",
    z: 0,
    rotateY: 0,
    scale: 1,
    opacity: 1,
    zIndex: 30,
    filter: "brightness(1) blur(0px)",
    pointerEvents: "auto",
  });
  for (const offset of [-1, 1]) {
    const wing = getSpatialTargets(offset, 6);
    assert.equal(wing.x, `${offset * 58}%`);
    assert.equal(wing.rotateY, offset * -28);
    assert.equal(wing.z, -150);
    assert.equal(wing.scale, 0.88);
    assert.equal(wing.opacity, 0.68);
    assert.equal(wing.zIndex, 20);
    assert.equal(wing.pointerEvents, "auto");
  }
  for (const offset of [-2, 2]) {
    assert.equal(getSpatialTargets(offset, 4).x, "0%");
    const back = getSpatialTargets(offset, 6);
    assert.equal(back.x, `${offset * 32}%`);
    assert.equal(back.rotateY, 0);
    assert.equal(back.z, -290);
    assert.equal(back.scale, 0.74);
    assert.equal(back.opacity, 0.28);
    assert.equal(back.zIndex, 10);
  }
  for (const offset of [-4, -3, 3, 4]) {
    const deep = getSpatialTargets(offset, 10);
    assert.equal(deep.z, -380);
    assert.equal(deep.opacity, 0);
    assert.equal(deep.pointerEvents, "none");
    assert.equal(deep.zIndex, 1);
  }
});

test("narrow targets tighten the wings and reduced motion is a flat single focus", () => {
  assert.equal(getSpatialTargets(-1, 4, { narrow: true }).x, "-42%");
  for (const offset of [-3, -2, -1, 0, 1, 2, 3]) {
    const flat = getSpatialTargets(offset, 7, { reducedMotion: true });
    assert.equal(flat.x, "0%");
    assert.equal(flat.rotateY, 0);
    assert.equal(flat.z, 0);
    assert.equal(flat.scale, 1);
    assert.equal(flat.opacity, offset === 0 ? 1 : 0);
    assert.equal(flat.pointerEvents, offset === 0 ? "auto" : "none");
  }
});

test("swipes require horizontal intent and resolve to exactly one direction", () => {
  assert.equal(getSwipeDirection(-90, 5, -100), "next");
  assert.equal(getSwipeDirection(90, 5, 100), "previous");
  assert.equal(getSwipeDirection(-15, 0, -700), "next");
  assert.equal(getSwipeDirection(15, 0, 700), "previous");
  for (const args of [
    [10, 0, 700],
    [0, 80, 0],
    [50, 100, 800],
    [-15, 0, 700],
    [NaN, 0, 700],
  ])
    assert.equal(getSwipeDirection(...args), null);
});
