"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useHud } from "@/context/HudContext";
import { ProjectGridPreview } from "./ProjectGridPreview";
import { SpatialProjectDeck } from "./SpatialProjectDeck";

export function ProjectShowcase() {
  const { viewMode } = useHud();
  const reducedMotion = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={viewMode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.16 }}
      >
        {viewMode === "spatial" ? (
          <SpatialProjectDeck />
        ) : (
          <ProjectGridPreview />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
