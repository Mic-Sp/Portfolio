"use client";

import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { useProjectCaseStudy } from "@/context/ProjectCaseStudyContext";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import type { ProjectNode } from "@/types/portfolio";
import "./project-case-study.css";

const BLOCKS = [
  { key: "problem", label: "01 // PROBLEM" },
  { key: "decision", label: "02 // DECISION" },
  { key: "tradeOffs", label: "03 // TRADE-OFFS" },
] as const;

export function ProjectCaseStudy({
  project,
  interactive,
  variant,
}: {
  project: ProjectNode;
  interactive: boolean;
  variant: "grid" | "spatial";
}) {
  const { expandedCaseStudyId, toggleCaseStudy } = useProjectCaseStudy();
  const expanded = interactive && expandedCaseStudyId === project.id;
  const toggleId = `case-study-toggle-${project.id}`;
  const contentId = `case-study-${project.id}`;

  return (
    <div
      className="project-case-study"
      data-deck-interactive
      data-variant={variant}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") event.stopPropagation();
      }}
    >
      <button
        id={toggleId}
        type="button"
        className="case-study-toggle"
        aria-expanded={expanded}
        aria-controls={contentId}
        disabled={!interactive}
        onClick={(event) => {
          event.stopPropagation();
          toggleCaseStudy(project.id);
        }}
      >
        {expanded ? "[ - HIDE CASE STUDY ]" : "[ + CASE STUDY // TRADE-OFFS ]"}
      </button>
      <AnimatePresence initial={false}>
        {expanded && <CaseStudyExpansion project={project} variant={variant} />}
      </AnimatePresence>
    </div>
  );
}

function CaseStudyExpansion({
  project,
  variant,
}: {
  project: ProjectNode;
  variant: "grid" | "spatial";
}) {
  const reducedMotion = useMotionPreference();
  const isPresent = useIsPresent();
  return (
    <motion.div
      id={`case-study-${project.id}`}
      className="case-study-expansion"
      role="region"
      aria-labelledby={`case-study-toggle-${project.id}`}
      aria-hidden={!isPresent}
      inert={!isPresent}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{
        duration: reducedMotion ? 0 : 0.22,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div
        className="case-study-content"
        tabIndex={variant === "spatial" ? 0 : undefined}
      >
        {BLOCKS.map(({ key, label }) => (
          <section key={key}>
            <span className="case-study-label">{label}</span>
            <p>{project.caseStudy[key]}</p>
          </section>
        ))}
      </div>
    </motion.div>
  );
}
