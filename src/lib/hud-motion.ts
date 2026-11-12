import type { Transition } from "framer-motion";

/** Preserve normal drawer travel and remove it when reduced motion is requested. */
export const HUD_DRAWER_TRANSITION = {
  type: "tween",
  duration: 0.23,
  ease: [0.22, 1, 0.36, 1],
} satisfies Transition;

export function getHudDrawerTransition(reducedMotion = false): Transition {
  return reducedMotion ? { duration: 0 } : HUD_DRAWER_TRANSITION;
}
