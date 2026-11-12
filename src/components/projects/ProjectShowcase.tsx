"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useHud } from "@/context/HudContext";
import { ProjectGridPreview } from "./ProjectGridPreview";
import { SpatialProjectDeck } from "./SpatialProjectDeck";
import { ProjectLightbox } from "./ProjectLightbox";
import { useCallback, useRef, useState } from "react";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import type { ProjectNode } from "@/types/portfolio";
import { ProjectCaseStudyProvider } from "@/context/ProjectCaseStudyContext";

export function ProjectShowcase() {
  const { viewMode } = useHud();
  const reducedMotion = useMotionPreference();
  const restoreToggleFocus = useRef(false);
  const [previewProject, setPreviewProject] = useState<ProjectNode | null>(
    null,
  );
  const closePreview = useCallback(() => setPreviewProject(null), []);
  return (
    <ProjectCaseStudyProvider>
      <div
        id="projects"
        className="project-showcase-anchor"
        tabIndex={-1}
        onClickCapture={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest(".showcase-view-toggle")
          )
            restoreToggleFocus.current = true;
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={viewMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.16 }}
            onAnimationComplete={(definition) => {
              if (
                !restoreToggleFocus.current ||
                typeof definition !== "object" ||
                !("opacity" in definition) ||
                definition.opacity !== 1
              )
                return;
              document
                .querySelector<HTMLButtonElement>(".showcase-view-toggle")
                ?.focus({ preventScroll: true });
              restoreToggleFocus.current = false;
            }}
          >
            {viewMode === "spatial" ? (
              <SpatialProjectDeck onPreview={setPreviewProject} />
            ) : (
              <ProjectGridPreview onPreview={setPreviewProject} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <AnimatePresence initial={false}>
        {previewProject && (
          <ProjectLightbox
            key={previewProject.id}
            project={previewProject}
            onClose={closePreview}
          />
        )}
      </AnimatePresence>
    </ProjectCaseStudyProvider>
  );
}
