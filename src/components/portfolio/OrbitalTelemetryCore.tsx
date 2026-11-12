"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { useHud } from "@/context/HudContext";
import { useDeckViewport } from "@/hooks/useDeckViewport";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { getPointerPosition } from "@/lib/pointer-math";
import {
  getCubeWireframePath,
  getOrbitalImpulse,
  INITIAL_CUBE_ANGLES,
} from "@/lib/orbital-math";
import { cn, getProjectAccent } from "@/lib/theme-utils";
import "./orbital-telemetry.css";

const INITIAL_PATH = getCubeWireframePath(
  INITIAL_CUBE_ANGLES.x,
  INITIAL_CUBE_ANGLES.y,
  INITIAL_CUBE_ANGLES.z,
);
export function OrbitalTelemetryCore({
  onInspect,
  isInspectorOpen,
}: {
  onInspect: () => void;
  isInspectorOpen: boolean;
}) {
  const { activeIndex, activeProject, godMode } = useHud();
  const reducedMotion = useMotionPreference();
  const viewport = useDeckViewport();
  const enabled = viewport === "wide" && !reducedMotion;
  const root = useRef<HTMLButtonElement>(null);
  const sweeps = useRef<SVGGElement>(null);
  const radar = useRef<SVGGElement>(null);
  const cube = useRef<SVGPathElement>(null);
  const coreDot = useRef<SVGCircleElement>(null);
  const brackets = useRef<SVGGElement>(null);
  const trackingReticle = useRef<SVGGElement>(null);
  const hovered = useRef(false);
  const pointer = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const previousPointer = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const impulseStarted = useRef<number | null>(null);
  const previousHud = useRef({ activeIndex, godMode });
  const accent = activeProject?.accent ?? "cyan";

  function trackPointer(event: PointerEvent<HTMLButtonElement>) {
    if (!enabled || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = getPointerPosition(
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width,
      rect.height,
    );
    const now = performance.now();
    const previous = previousPointer.current;
    const seconds = previous ? Math.max(8, now - previous.time) / 1000 : 1;
    const clampVelocity = (value: number) => Math.max(-3, Math.min(3, value));
    pointer.current = {
      x: point.x,
      y: point.y,
      vx: previous
        ? clampVelocity((event.clientX - previous.x) / rect.width / seconds)
        : 0,
      vy: previous
        ? clampVelocity((event.clientY - previous.y) / rect.height / seconds)
        : 0,
    };
    previousPointer.current = { x: event.clientX, y: event.clientY, time: now };
    hovered.current = true;
  }

  function releasePointer() {
    hovered.current = false;
    pointer.current = { x: 0, y: 0, vx: 0, vy: 0 };
    previousPointer.current = null;
  }

  useEffect(() => {
    if (
      previousHud.current.activeIndex !== activeIndex ||
      previousHud.current.godMode !== godMode
    ) {
      impulseStarted.current = performance.now();
      previousHud.current = { activeIndex, godMode };
    }
  }, [activeIndex, godMode]);

  useEffect(() => {
    const emblem = root.current;
    const sweepGroup = sweeps.current;
    const radarGroup = radar.current;
    const cubePath = cube.current;
    const dot = coreDot.current;
    const bracketGroup = brackets.current;
    const trackingGroup = trackingReticle.current;
    if (
      !emblem ||
      !sweepGroup ||
      !radarGroup ||
      !cubePath ||
      !dot ||
      !bracketGroup
    )
      return;

    function reset() {
      emblem!.dataset.playback = "paused";
      sweepGroup!.removeAttribute("transform");
      radarGroup!.removeAttribute("transform");
      cubePath!.setAttribute("d", INITIAL_PATH);
      dot!.removeAttribute("transform");
      dot!.setAttribute("opacity", "0.75");
      bracketGroup!.removeAttribute("transform");
      bracketGroup!.setAttribute("opacity", "0.45");
      trackingGroup?.setAttribute("opacity", "0");
      releasePointer();
    }
    if (!enabled) {
      reset();
      return;
    }

    let frame = 0,
      lastTime: number | null = null,
      visible = false,
      elapsed = 0;
    let orbitAngle = 0,
      radarAngle = 0,
      orbitSpeed = 1,
      cubeSpeed = 1;
    let steerX = 0,
      steerY = 0;
    let angleX: number = INITIAL_CUBE_ANGLES.x,
      angleY: number = INITIAL_CUBE_ANGLES.y,
      angleZ: number = INITIAL_CUBE_ANGLES.z;

    function tick(now: number) {
      const dt = lastTime === null ? 0 : Math.min(now - lastTime, 40);
      lastTime = now;
      elapsed += dt;
      const pulse =
        impulseStarted.current === null
          ? 0
          : getOrbitalImpulse(now - impulseStarted.current);
      const hover = hovered.current ? 1 : 0;
      const follow = 1 - Math.exp(-dt / 160);
      const control = pointer.current;
      const hoverSpeed =
        2.5 + Math.min(1, Math.hypot(control.vx, control.vy) / 2);
      orbitSpeed +=
        ((hover ? hoverSpeed : 1 + pulse * 1.5) - orbitSpeed) * follow;
      cubeSpeed +=
        ((hover ? hoverSpeed : 1 + pulse * 1.8) - cubeSpeed) * follow;
      steerX += (-control.y * 0.65 * hover - steerX) * follow;
      steerY += (control.x * 0.9 * hover - steerY) * follow;
      orbitAngle = (orbitAngle + ((dt * 360) / 14000) * orbitSpeed) % 360;
      radarAngle = (radarAngle - (dt * 360) / 22000) % 360;
      angleX =
        (angleX + ((dt * Math.PI * 2) / 18000) * cubeSpeed) % (Math.PI * 2);
      angleY =
        (angleY + ((dt * Math.PI * 2) / 14000) * cubeSpeed) % (Math.PI * 2);
      // Movement adds angular momentum; position supplies a bounded axis offset.
      angleX -= control.vy * (dt / 1000) * 0.45 * hover;
      angleY += control.vx * (dt / 1000) * 0.7 * hover;
      const velocityDecay = Math.exp(-dt / 100);
      control.vx *= velocityDecay;
      control.vy *= velocityDecay;
      angleZ =
        (angleZ + ((dt * Math.PI * 2) / 48000) * cubeSpeed) % (Math.PI * 2);
      sweepGroup!.setAttribute(
        "transform",
        `rotate(${orbitAngle.toFixed(3)} 64 64)`,
      );
      radarGroup!.setAttribute(
        "transform",
        `rotate(${radarAngle.toFixed(3)} 64 64)`,
      );
      cubePath!.setAttribute(
        "d",
        getCubeWireframePath(angleX + steerX, angleY + steerY, angleZ),
      );
      trackingGroup?.setAttribute(
        "transform",
        `translate(${64 + control.x * 100} ${64 + control.y * 100})`,
      );
      trackingGroup?.setAttribute("opacity", hover ? "0.65" : "0");
      const corePulse = 0.5 - 0.5 * Math.cos((elapsed * Math.PI * 2) / 3000);
      dot!.setAttribute(
        "transform",
        `scale(${(0.85 + corePulse * 0.35).toFixed(4)})`,
      );
      dot!.setAttribute("opacity", (0.5 + corePulse * 0.5).toFixed(4));
      const breath = Math.sin((elapsed * Math.PI * 2) / 5200) * 2;
      const lock = pulse * 3 + hover * 0.7;
      const bracketScale = 1 + (breath - lock) / 58;
      bracketGroup!.setAttribute(
        "transform",
        `translate(64 64) scale(${bracketScale.toFixed(5)}) translate(-64 -64)`,
      );
      bracketGroup!.setAttribute(
        "opacity",
        Math.min(0.95, 0.45 + pulse * 0.4 + hover * 0.15).toFixed(4),
      );
      frame = requestAnimationFrame(tick);
    }
    function syncPlayback() {
      cancelAnimationFrame(frame);
      lastTime = null;
      // Keep decorative SVG geometry out of the modal's rendering budget.
      // Observing native presence also covers the dossier's complete exit animation.
      const playing =
        visible && !document.hidden && !document.querySelector("dialog[open]");
      emblem!.dataset.playback = playing ? "running" : "paused";
      if (playing) frame = requestAnimationFrame(tick);
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    });
    observer.observe(emblem);
    const modals = new MutationObserver((records) => {
      if (records.some((record) => record.target instanceof HTMLDialogElement))
        syncPlayback();
    });
    modals.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      modals.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [enabled]);

  return (
    <button
      type="button"
      ref={root}
      onClick={onInspect}
      aria-label="Inspect 3D Spatial Cube"
      aria-haspopup="dialog"
      aria-controls="spatial-cube-modal"
      aria-expanded={isInspectorOpen}
      className={cn(
        "identity-scope orbital-core cube-inspector-trigger",
        getProjectAccent(accent).scope,
      )}
      data-accent={accent}
      data-god-mode={godMode}
      data-active-index={activeIndex}
      data-motion={enabled ? "kinetic" : "static"}
      onPointerEnter={(event) => {
        trackPointer(event);
        if (enabled && event.pointerType !== "touch")
          impulseStarted.current = performance.now();
      }}
      onPointerMove={trackPointer}
      onPointerLeave={releasePointer}
      onPointerCancel={releasePointer}
    >
      <svg
        viewBox="0 0 128 128"
        fill="none"
        focusable="false"
        aria-hidden="true"
      >
        <path
          className="orbital-crosshair"
          d="M64 0v128M0 64h128"
          stroke="currentColor"
          strokeDasharray="1 4"
        />
        <circle
          cx="64"
          cy="64"
          r="48"
          stroke="currentColor"
          strokeOpacity=".2"
        />
        <circle
          cx="64"
          cy="64"
          r="25.5"
          stroke="currentColor"
          strokeOpacity=".16"
        />
        <g ref={sweeps} className="orbital-sweeps">
          <path
            d="M64 16a48 48 0 0 1 46.364 35.577M64 112a48 48 0 0 1-46.364-35.577"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <circle cx="110.364" cy="51.577" r="1.8" fill="currentColor" />
          <circle cx="17.636" cy="76.423" r="1.8" fill="currentColor" />
        </g>
        <g ref={radar} className="orbital-radar">
          <circle
            cx="64"
            cy="64"
            r="37"
            stroke="currentColor"
            strokeOpacity=".55"
            strokeWidth=".85"
            strokeDasharray=".7 4.2"
          />
        </g>
        <path
          ref={cube}
          className="orbital-cube"
          d={INITIAL_PATH}
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <g transform="translate(64 64)">
          <circle
            ref={coreDot}
            className="orbital-core-dot"
            cx="0"
            cy="0"
            r="1.7"
            fill="currentColor"
            opacity=".75"
          />
        </g>
        <g ref={brackets} className="orbital-brackets" opacity=".45">
          <path
            d="M6 16V6h10m96 0h10v10M6 112v10h10m96 0h10v-10"
            stroke="currentColor"
            strokeWidth=".8"
            strokeLinecap="round"
          />
        </g>
        <g
          ref={trackingReticle}
          className="orbital-pointer-reticle"
          opacity="0"
        >
          <path
            d="M-7 0h4m6 0h4M0-7v4m0 6v4"
            stroke="currentColor"
            strokeLinecap="round"
          />
          <circle r="2" stroke="currentColor" strokeWidth=".75" />
        </g>
      </svg>
      <span className="cube-trigger-caption" aria-hidden="true">
        INSPECT 3D CUBE ↗
      </span>
    </button>
  );
}
