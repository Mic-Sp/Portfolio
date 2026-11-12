import type { CubeFaceId } from "../data/cube-config.ts";

export interface CubeRotation {
  x: number;
  y: number;
}
export const INITIAL_INSPECTOR_ROTATION: CubeRotation = { x: -22, y: -32 };
export const CUBE_DRAG_THRESHOLD = 5;
export const CUBE_DRAG_SENSITIVITY = 0.42;
export const CUBE_FACE_ROTATIONS: Record<CubeFaceId, CubeRotation> = {
  front: { x: 0, y: 0 },
  back: { x: 0, y: 180 },
  right: { x: 0, y: -90 },
  left: { x: 0, y: 90 },
  top: { x: -90, y: 0 },
  bottom: { x: 90, y: 0 },
};

export function snapCubeRotation(
  rotation: CubeRotation,
  key: string,
): CubeRotation | null {
  const x = Math.round(rotation.x / 90) * 90 || 0;
  const y = Math.round(rotation.y / 90) * 90 || 0;
  switch (key) {
    case "ArrowLeft":
      return { x, y: y - 90 };
    case "ArrowRight":
      return { x, y: y + 90 };
    case "ArrowUp":
      return { x: x - 90, y };
    case "ArrowDown":
      return { x: x + 90, y };
    default:
      return null;
  }
}

/** Integrate exponential damping exactly so inertia is independent of frame rate. */
export function stepCubeInertia(
  rotation: CubeRotation,
  velocity: CubeRotation,
  seconds: number,
  idle: boolean,
) {
  const dt = Math.max(
    0,
    Math.min(Number.isFinite(seconds) ? seconds : 0, 0.05),
  );
  const decay = Math.exp(-4 * dt);
  const travel = (1 - decay) / 4;
  return {
    rotation: {
      x: rotation.x + velocity.x * travel + (idle ? 1.8 * dt : 0),
      y: rotation.y + velocity.y * travel + (idle ? 7 * dt : 0),
    },
    velocity: { x: velocity.x * decay, y: velocity.y * decay },
  };
}

/** The face with the largest camera-facing normal owns interactive slot content. */
export function getCubeFrontFace(rotation: CubeRotation): CubeFaceId {
  const rx = (rotation.x * Math.PI) / 180,
    ry = (rotation.y * Math.PI) / 180;
  const normals: Record<CubeFaceId, number> = {
    front: Math.cos(rx) * Math.cos(ry),
    back: -Math.cos(rx) * Math.cos(ry),
    right: -Math.cos(rx) * Math.sin(ry),
    left: Math.cos(rx) * Math.sin(ry),
    top: -Math.sin(rx),
    bottom: Math.sin(rx),
  };
  return (Object.keys(normals) as CubeFaceId[]).reduce((a, b) =>
    normals[a] >= normals[b] ? a : b,
  );
}
