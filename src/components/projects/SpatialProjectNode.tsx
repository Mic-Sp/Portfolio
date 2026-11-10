"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { getPointerPosition } from "@/lib/pointer-math";
import { getSpatialTargets } from "@/lib/spatial-math";
import { cn, getProjectAccent } from "@/lib/theme-utils";
import type { ProjectNode } from "@/types/portfolio";
import { ProjectCard } from "./ProjectCard";

const DECK_SPRING = { stiffness: 260, damping: 28, mass: 0.9 };
const HOVER_SPRING = { stiffness: 300, damping: 24 };

export function SpatialProjectNode({
  project,
  index,
  offset,
  total,
  narrow,
  reducedMotion,
  disabled,
  terminalOpen,
  onSelect,
}: {
  project: ProjectNode;
  index: number;
  offset: number;
  total: number;
  narrow: boolean;
  reducedMotion: boolean;
  disabled: boolean;
  terminalOpen: boolean;
  onSelect: () => void;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const selected = offset === 0;
  const wing = Math.abs(offset) === 1;
  const {
    zIndex,
    pointerEvents,
    opacity: baseOpacity,
    ...targets
  } = getSpatialTargets(offset, total, { narrow, reducedMotion });
  const hidden = baseOpacity === 0;
  const rotateX = useSpring(0, HOVER_SPRING);
  const rotateY = useSpring(0, HOVER_SPRING);
  const lift = useSpring(0, HOVER_SPRING);
  const scale = useSpring(1, HOVER_SPRING);
  const opacity = useSpring(baseOpacity, DECK_SPRING);
  const glareOpacity = useSpring(0, HOVER_SPRING);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.06), transparent 70%)`;

  const reset = useCallback(() => {
    const values = [
      [rotateX, 0],
      [rotateY, 0],
      [lift, 0],
      [scale, 1],
      [glareOpacity, 0],
      [opacity, baseOpacity],
    ] as const;
    for (const [value, target] of values) {
      if (reducedMotion) value.jump(target);
      else value.set(target);
    }
    if (surface.current) surface.current.dataset.pointerHovered = "false";
  }, [
    rotateX,
    rotateY,
    lift,
    scale,
    glareOpacity,
    opacity,
    baseOpacity,
    reducedMotion,
  ]);

  // Selection, drag, terminal and motion-preference changes all release the magnetic layer.
  useEffect(reset, [reset, offset, disabled, narrow]);

  function trackPointer(event: PointerEvent<HTMLDivElement>) {
    if (
      disabled ||
      reducedMotion ||
      (!selected && !wing) ||
      event.pointerType === "touch" ||
      event.buttons !== 0
    )
      return;
    const rect = slot.current?.getBoundingClientRect();
    if (!rect) return;
    const point = getPointerPosition(
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width,
      rect.height,
    );
    if (surface.current) surface.current.dataset.pointerHovered = "true";
    lift.set(selected ? -6 : -5);
    // The outer ring transform already supplies the wing's 0.88 scale.
    scale.set(selected ? 1.015 : 0.9 / 0.88);
    opacity.set(selected ? 1 : 0.85);
    if (selected) {
      rotateX.set(-point.y * 7);
      rotateY.set(point.x * 9);
      mouseX.set(point.localX);
      mouseY.set(point.localY);
      glareOpacity.set(1);
    }
  }

  return (
    <motion.div
      ref={slot}
      className={cn(
        "spatial-card-slot",
        getProjectAccent(project.accent).scope,
      )}
      data-offset={offset}
      data-node-id={project.id}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${total}: ${project.title}`}
      aria-hidden={hidden}
      inert={hidden}
      initial={false}
      animate={targets}
      transition={
        reducedMotion ? { duration: 0 } : { type: "spring", ...DECK_SPRING }
      }
      style={{ zIndex, pointerEvents, opacity }}
      onPointerEnter={trackPointer}
      onPointerMove={trackPointer}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      <motion.div
        ref={surface}
        className="spatial-hover-surface"
        style={{ rotateX, rotateY, y: lift, scale, transformPerspective: 1000 }}
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
            onSelect={onSelect}
            interactive={selected}
          />
        </div>
        {selected && (
          <motion.div
            className="spatial-card-glare"
            aria-hidden="true"
            style={{ background: glare, opacity: glareOpacity }}
          />
        )}
        {!selected && !hidden && (
          <button
            type="button"
            className="spatial-card-select"
            data-deck-select
            tabIndex={-1}
            aria-label={`Focus ${project.title}`}
            disabled={terminalOpen}
            onClick={onSelect}
          >
            <span>
              FOCUS NODE {(index + 1).toString().padStart(2, "0")}{" "}
              <ArrowRight size={11} aria-hidden="true" />
            </span>
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
