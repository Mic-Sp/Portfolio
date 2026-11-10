export const CUBE_EDGES: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

const VERTICES = [
  [-12, -12, -12],
  [12, -12, -12],
  [12, 12, -12],
  [-12, 12, -12],
  [-12, -12, 12],
  [12, -12, 12],
  [12, 12, 12],
  [-12, 12, 12],
] as const;

export const INITIAL_CUBE_ANGLES = { x: -0.55, y: 0.65, z: 0.08 } as const;

/** Rotate all eight vertices in XYZ space, then apply a perspective projection. */
export function projectCubeVertices(
  angleX: number,
  angleY: number,
  angleZ = 0,
) {
  const [sx, cx, sy, cy, sz, cz] = [
    Math.sin(angleX),
    Math.cos(angleX),
    Math.sin(angleY),
    Math.cos(angleY),
    Math.sin(angleZ),
    Math.cos(angleZ),
  ];
  return VERTICES.map(([x, y, z]) => {
    const rotatedY = y * cx - z * sx;
    const rotatedZ = y * sx + z * cx;
    const rotatedX = x * cy + rotatedZ * sy;
    const depth = -x * sy + rotatedZ * cy;
    const perspective = 130 / (130 + depth);
    return {
      x: 64 + (rotatedX * cz - rotatedY * sz) * perspective,
      y: 64 + (rotatedX * sz + rotatedY * cz) * perspective,
      depth,
    };
  });
}

export function getCubeWireframePath(
  angleX: number,
  angleY: number,
  angleZ = 0,
) {
  const vertices = projectCubeVertices(angleX, angleY, angleZ);
  return CUBE_EDGES.map(([from, to]) => {
    const a = vertices[from],
      b = vertices[to];
    return `M${a.x.toFixed(3)} ${a.y.toFixed(3)}L${b.x.toFixed(3)} ${b.y.toFixed(3)}`;
  }).join(" ");
}

export function getOrbitalImpulse(elapsedMs: number) {
  return Number.isFinite(elapsedMs) && elapsedMs >= 0
    ? Math.exp(-elapsedMs / 220)
    : 0;
}
