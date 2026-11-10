export interface SpatialTargets {
  x: string;
  z: number;
  rotateY: number;
  scale: number;
  opacity: number;
  zIndex: number;
  filter: string;
  pointerEvents: "auto" | "none";
}

/** Shortest signed ring distance. Even-ring antinodes consistently use +N/2. */
export function getCircularOffset(
  index: number,
  activeIndex: number,
  total: number,
): number {
  if (
    !Number.isInteger(total) ||
    total <= 0 ||
    !Number.isInteger(index) ||
    !Number.isInteger(activeIndex)
  )
    return 0;
  const offset =
    ((((index % total) - (activeIndex % total)) % total) + total) % total;
  return offset > total / 2 ? offset - total : offset;
}

export function getSpatialTargets(
  offset: number,
  total: number,
  {
    narrow = false,
    reducedMotion = false,
  }: { narrow?: boolean; reducedMotion?: boolean } = {},
): SpatialTargets {
  if (offset === 0)
    return {
      x: "0%",
      z: 0,
      rotateY: 0,
      scale: 1,
      opacity: 1,
      zIndex: 30,
      filter: "brightness(1) blur(0px)",
      pointerEvents: "auto",
    };
  if (reducedMotion)
    return {
      x: "0%",
      z: 0,
      rotateY: 0,
      scale: 1,
      opacity: 0,
      zIndex: 1,
      filter: "brightness(1) blur(0px)",
      pointerEvents: "none",
    };
  if (Math.abs(offset) === 1)
    return {
      x: `${offset * (narrow ? 42 : 58)}%`,
      z: -150,
      rotateY: offset * -28,
      scale: 0.88,
      opacity: 0.68,
      zIndex: 20,
      filter: "brightness(0.86) blur(0px)",
      pointerEvents: "auto",
    };
  if (Math.abs(offset) === 2)
    return {
      x: total === 4 ? "0%" : `${offset * (narrow ? 22 : 32)}%`,
      z: -290,
      rotateY: 0,
      scale: 0.74,
      opacity: 0.28,
      zIndex: 10,
      filter: "brightness(0.7) blur(0.6px)",
      pointerEvents: "auto",
    };
  return {
    x: `${Math.sign(offset) * (narrow ? 48 : 72)}%`,
    z: -380,
    rotateY: 0,
    scale: 0.64,
    opacity: 0,
    zIndex: 1,
    filter: "brightness(0.6) blur(1px)",
    pointerEvents: "none",
  };
}

/** One deliberate horizontal gesture advances one node; vertical scroll is ignored. */
export function getSwipeDirection(
  offsetX: number,
  offsetY: number,
  velocityX: number,
): "next" | "previous" | null {
  if (
    ![offsetX, offsetY, velocityX].every(Number.isFinite) ||
    Math.abs(offsetX) <= Math.abs(offsetY)
  )
    return null;
  const intentionalDistance = Math.abs(offsetX) >= 44;
  const fastFlick =
    Math.abs(offsetX) >= 12 &&
    Math.abs(velocityX) >= 550 &&
    Math.sign(offsetX) === Math.sign(velocityX);
  if (!intentionalDistance && !fastFlick) return null;
  return offsetX < 0 ? "next" : "previous";
}
