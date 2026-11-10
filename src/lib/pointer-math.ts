/** Local pointer coordinates, bounded independently of any hover transform. */
export function getPointerPosition(
  localX: number,
  localY: number,
  width: number,
  height: number,
) {
  if (
    ![localX, localY, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  )
    return { x: 0, y: 0, localX: 0, localY: 0 };
  const boundedX = Math.max(0, Math.min(width, localX));
  const boundedY = Math.max(0, Math.min(height, localY));
  return {
    x: boundedX / width - 0.5,
    y: boundedY / height - 0.5,
    localX: boundedX,
    localY: boundedY,
  };
}
