"use client";

import {
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { ArrowLeft, ArrowRight, MoveHorizontal, ScanLine } from "lucide-react";
import { useEffect, useRef, type PointerEvent } from "react";
import { useHud } from "@/context/HudContext";
import { useDeckViewport } from "@/hooks/useDeckViewport";
import {
  getCircularOffset,
  getSpatialTargets,
  getSwipeDirection,
} from "@/lib/spatial-math";
import { cn, getProjectAccent } from "@/lib/theme-utils";
import { ProjectCard } from "./ProjectCard";
import { ProjectViewToggle } from "./ProjectViewToggle";
import "./spatial-deck.css";

const DECK_SPRING = {
  type: "spring",
  stiffness: 260,
  damping: 28,
  mass: 0.9,
} as const;

export function SpatialProjectDeck() {
  const {
    projects,
    activeIndex,
    activeProject,
    totalProjects,
    selectProject,
    nextProject,
    prevProject,
    isTerminalOpen,
  } = useHud();
  const prefersReducedMotion = useReducedMotion();
  const viewport = useDeckViewport();
  const reducedMotion = viewport === "pending" || prefersReducedMotion === true;
  const dragControls = useDragControls();
  const dragged = useRef(false);
  const radar = useRef<HTMLElement>(null);
  const canNavigate = totalProjects > 1 && !isTerminalOpen;
  const canDrag = canNavigate && !reducedMotion;
  const activeTheme = activeProject
    ? getProjectAccent(activeProject.accent)
    : undefined;
  const position = totalProjects ? activeIndex + 1 : 0;
  const formatNumber = (value: number) => value.toString().padStart(2, "0");

  useEffect(() => {
    const track = radar.current;
    const node = track?.querySelector<HTMLElement>('[aria-current="true"]');
    if (track && node)
      track.scrollTo({
        left: node.offsetLeft - (track.clientWidth - node.clientWidth) / 2,
        behavior: reducedMotion ? "instant" : "smooth",
      });
  }, [activeIndex, reducedMotion]);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    dragged.current = false;
    const target = event.target;
    if (
      !canDrag ||
      !(target instanceof Element) ||
      target.closest(
        'a, button:not([data-deck-select]), input, textarea, select, [contenteditable="true"]',
      )
    )
      return;
    dragControls.start(event, { distanceThreshold: 8 });
  }

  function finishDrag(
    _event: MouseEvent | TouchEvent | globalThis.PointerEvent,
    info: PanInfo,
  ) {
    if (!canDrag) return;
    const direction = getSwipeDirection(
      info.offset.x,
      info.offset.y,
      info.velocity.x,
    );
    if (direction === "next") nextProject();
    if (direction === "previous") prevProject();
  }

  return (
    <section
      id="project-registry"
      className="project-registry spatial-deck"
      aria-labelledby="spatial-heading"
      aria-roledescription="carousel"
      data-motion={reducedMotion ? "reduced" : "spatial"}
    >
      <div className="registry-heading">
        <div className="registry-title">
          <span className="section-index">01 /</span>
          <h2 id="spatial-heading">
            Selected systems
            <span className="registry-count">
              {formatNumber(totalProjects)}
            </span>
          </h2>
        </div>
        <ProjectViewToggle />
      </div>
      <div className="registry-meta">
        <span className="flex items-center gap-2">
          <ScanLine size={11} aria-hidden="true" />
          {reducedMotion
            ? "FOCUS VIEW // REDUCED MOTION"
            : "SPATIAL EXPLORER // PERSPECTIVE 1400"}
        </span>
        <span>
          {formatNumber(position)} / {formatNumber(totalProjects)} IN FOCUS
        </span>
      </div>

      {totalProjects > 0 ? (
        <>
          <div
            className={cn("spatial-viewport", activeTheme?.scope)}
            onPointerDown={startDrag}
            onClickCapture={(event) => {
              if (dragged.current && event.detail > 0) {
                event.preventDefault();
                event.stopPropagation();
                dragged.current = false;
              }
            }}
            style={{ touchAction: canDrag ? "pan-y" : "auto" }}
          >
            <div className="deck-horizon" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <motion.div
              className="spatial-stage"
              data-testid="spatial-stage"
              drag={canDrag ? "x" : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              dragMomentum={false}
              dragTransition={{ bounceStiffness: 260, bounceDamping: 28 }}
              onDragStart={() => {
                dragged.current = true;
              }}
              onDragEnd={finishDrag}
              style={{ touchAction: canDrag ? "pan-y" : "auto" }}
            >
              {projects.map((project, index) => {
                const offset = getCircularOffset(
                  index,
                  activeIndex,
                  totalProjects,
                );
                const selected = offset === 0;
                const { zIndex, pointerEvents, ...targets } = getSpatialTargets(
                  offset,
                  totalProjects,
                  { narrow: viewport === "narrow", reducedMotion },
                );
                const hidden = targets.opacity === 0;
                return (
                  <motion.div
                    key={project.id}
                    className={cn(
                      "spatial-card-slot",
                      getProjectAccent(project.accent).scope,
                    )}
                    data-offset={offset}
                    data-node-id={project.id}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${index + 1} of ${totalProjects}: ${project.title}`}
                    aria-hidden={hidden}
                    inert={hidden}
                    initial={false}
                    animate={targets}
                    transition={reducedMotion ? { duration: 0 } : DECK_SPRING}
                    style={{
                      zIndex,
                      pointerEvents,
                    }}
                  >
                    <div
                      className="spatial-card-content"
                      inert={!selected}
                      aria-hidden={!selected}
                    >
                      <ProjectCard
                        project={project}
                        index={index}
                        selected={selected}
                        onSelect={() => selectProject(index)}
                        interactive={selected}
                      />
                    </div>
                    {!selected && !hidden && (
                      <button
                        type="button"
                        className="spatial-card-select"
                        data-deck-select
                        tabIndex={-1}
                        aria-label={`Focus ${project.title}`}
                        disabled={isTerminalOpen}
                        onClick={() => selectProject(index)}
                      >
                        <span>
                          FOCUS NODE {formatNumber(index + 1)}{" "}
                          <ArrowRight size={11} aria-hidden="true" />
                        </span>
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          <div className="spatial-navigation">
            <button
              type="button"
              className="deck-chevron"
              aria-label="Previous project"
              disabled={!canNavigate}
              onClick={prevProject}
            >
              <ArrowLeft size={13} aria-hidden="true" />
              <span>PREV</span>
            </button>
            <nav
              ref={radar}
              className="node-radar"
              aria-label="Spatial node scrubber"
            >
              {projects.map((project, index) => {
                const theme = getProjectAccent(project.accent);
                return (
                  <button
                    type="button"
                    key={project.id}
                    aria-label={`Focus ${project.title}, ${index + 1} of ${totalProjects}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                    disabled={isTerminalOpen}
                    onClick={() => selectProject(index)}
                    className={cn("radar-node", theme.scope)}
                  >
                    <span className="radar-indicator" />
                    <span>
                      {formatNumber(index + 1)}
                      <span className="radar-separator">{" // "}</span>
                      {formatNumber(totalProjects)}
                    </span>
                  </button>
                );
              })}
            </nav>
            <button
              type="button"
              className="deck-chevron"
              aria-label="Next project"
              disabled={!canNavigate}
              onClick={nextProject}
            >
              <span>NEXT</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
          <div className="spatial-caption">
            <p role="status" aria-live="polite" aria-atomic="true">
              <span className={activeTheme?.text}>
                {formatNumber(position)}
              </span>
              <span className="text-slate-600"> / </span>
              {formatNumber(totalProjects)}
              <span className="caption-divider">—</span>
              {activeProject?.title}
              <span className="caption-pillar">
                {activeProject?.pillarShort}
              </span>
            </p>
            <span className="spatial-gesture-hint">
              <MoveHorizontal size={12} aria-hidden="true" />
              {reducedMotion
                ? "SELECT A NODE TO EXPLORE"
                : "DRAG TO EXPLORE // ARROW KEYS TO CYCLE"}
            </span>
          </div>
        </>
      ) : (
        <div className="empty-registry">
          <p>No active nodes in this view.</p>
        </div>
      )}
    </section>
  );
}
