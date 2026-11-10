"use client";

import { motion, useDragControls, type PanInfo } from "framer-motion";
import { ArrowLeft, ArrowRight, MoveHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useHud } from "@/context/HudContext";
import { useDeckViewport } from "@/hooks/useDeckViewport";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { getCircularOffset, getSwipeDirection } from "@/lib/spatial-math";
import { cn, getProjectAccent } from "@/lib/theme-utils";
import { SpatialProjectNode } from "./SpatialProjectNode";
import { ProjectShowcaseToolbar } from "./ProjectShowcaseToolbar";
import "./spatial-deck.css";

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
    godMode,
  } = useHud();
  const prefersReducedMotion = useMotionPreference();
  const viewport = useDeckViewport();
  const reducedMotion = viewport === "pending" || prefersReducedMotion === true;
  const dragControls = useDragControls();
  const dragged = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
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
    setIsDragging(false);
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
      data-god-mode={godMode}
    >
      <ProjectShowcaseToolbar
        headingId="spatial-heading"
        detail={
          godMode
            ? "GODMODE // UNLIMITED TELEMETRY"
            : reducedMotion
              ? "FOCUS VIEW // REDUCED MOTION"
              : "SPATIAL EXPLORER // PERSPECTIVE 1400"
        }
        counter={`${formatNumber(position)} / ${formatNumber(totalProjects)} IN FOCUS`}
      />

      {totalProjects > 0 ? (
        <>
          <div
            className={cn("spatial-viewport", activeTheme?.scope)}
            onPointerDown={startDrag}
            onPointerCancel={() => setIsDragging(false)}
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
                setIsDragging(true);
              }}
              onDragEnd={finishDrag}
              style={{ touchAction: canDrag ? "pan-y" : "auto" }}
            >
              {projects.map((project, index) => (
                <SpatialProjectNode
                  key={project.id}
                  project={project}
                  index={index}
                  offset={getCircularOffset(index, activeIndex, totalProjects)}
                  total={totalProjects}
                  narrow={viewport === "narrow"}
                  reducedMotion={reducedMotion}
                  disabled={isDragging || isTerminalOpen}
                  terminalOpen={isTerminalOpen}
                  onSelect={() => selectProject(index)}
                />
              ))}
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
              <span className="text-slate-300"> / </span>
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
