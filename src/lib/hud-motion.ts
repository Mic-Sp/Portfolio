import type { Transition } from "framer-motion";

/** Explicit drawer actions keep their physical travel, independent of OS motion settings. */
export const HUD_DRAWER_TRANSITION = {
  type: "tween",
  duration: 0.23,
  ease: [0.22, 1, 0.36, 1],
} satisfies Transition;

export function getHudDrawerTransition(): Transition {
  return HUD_DRAWER_TRANSITION;
}
