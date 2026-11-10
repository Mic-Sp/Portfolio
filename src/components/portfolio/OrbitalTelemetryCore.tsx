"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useHud } from "@/context/HudContext";
import { useDeckViewport } from "@/hooks/useDeckViewport";
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
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeToMotion(onChange: () => void) {
  const media = window.matchMedia(MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const readMotionPreference = () => window.matchMedia(MOTION_QUERY).matches;
const serverMotionPreference = () => null;

export function OrbitalTelemetryCore() {
  const { activeIndex, activeProject, godMode } = useHud();
  const initialReducedMotion = useReducedMotion();
  // Also observe live changes: the installed Motion hook retains its initial preference.
  const liveReducedMotion = useSyncExternalStore(
    subscribeToMotion,
    readMotionPreference,
    serverMotionPreference,
  );
  const reducedMotion = liveReducedMotion ?? initialReducedMotion ?? true;
  const viewport = useDeckViewport();
  const enabled = viewport === "wide" && !reducedMotion;
  const root = useRef<HTMLDivElement>(null);
  const sweeps = useRef<SVGGElement>(null);
  const radar = useRef<SVGGElement>(null);
  const cube = useRef<SVGPathElement>(null);
  const coreDot = useRef<SVGCircleElement>(null);
  const brackets = useRef<SVGGElement>(null);
  const hovered = useRef(false);
  const impulseStarted = useRef<number | null>(null);
  const previousHud = useRef({ activeIndex, godMode });
  const accent = activeProject?.accent ?? "cyan";

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
      sweepGroup!.removeAttribute("transform");
      radarGroup!.removeAttribute("transform");
      cubePath!.setAttribute("d", INITIAL_PATH);
      dot!.removeAttribute("transform");
      dot!.setAttribute("opacity", "0.75");
      bracketGroup!.removeAttribute("transform");
      bracketGroup!.setAttribute("opacity", "0.45");
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
      orbitSpeed += (1 + pulse * 1.5 - orbitSpeed) * follow;
      cubeSpeed += (1 + hover * 0.45 + pulse * 1.8 - cubeSpeed) * follow;
      orbitAngle = (orbitAngle + ((dt * 360) / 14000) * orbitSpeed) % 360;
      radarAngle = (radarAngle - (dt * 360) / 22000) % 360;
      angleX =
        (angleX + ((dt * Math.PI * 2) / 18000) * cubeSpeed) % (Math.PI * 2);
      angleY =
        (angleY + ((dt * Math.PI * 2) / 14000) * cubeSpeed) % (Math.PI * 2);
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
      cubePath!.setAttribute("d", getCubeWireframePath(angleX, angleY, angleZ));
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
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    });
    observer.observe(emblem);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [enabled]);

  return (
    <div
      ref={root}
      className={cn(
        "identity-scope orbital-core",
        getProjectAccent(accent).scope,
      )}
      data-accent={accent}
      data-god-mode={godMode}
      data-active-index={activeIndex}
      data-motion={enabled ? "kinetic" : "static"}
      aria-hidden="true"
      onPointerEnter={() => {
        hovered.current = true;
        impulseStarted.current = performance.now();
      }}
      onPointerLeave={() => {
        hovered.current = false;
      }}
    >
      <svg viewBox="0 0 128 128" fill="none" focusable="false">
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
      </svg>
    </div>
  );
}
