"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useHud } from "@/context/HudContext";
import { ProjectGridPreview } from "./ProjectGridPreview";
import { SpatialProjectDeck } from "./SpatialProjectDeck";
import { ProjectLightbox } from "./ProjectLightbox";
import { useCallback, useState } from "react";
import type { ProjectNode } from "@/types/portfolio";
import { ProjectCaseStudyProvider } from "@/context/ProjectCaseStudyContext";

export function ProjectShowcase() {
  const { viewMode } = useHud();
  const reducedMotion = useReducedMotion();
  const [previewProject, setPreviewProject] = useState<ProjectNode | null>(
    null,
  );
  const closePreview = useCallback(() => setPreviewProject(null), []);
  return (
    <ProjectCaseStudyProvider>
      <div
        id="project-showcase"
        className="project-showcase-anchor"
        tabIndex={-1}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={viewMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.16 }}
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
