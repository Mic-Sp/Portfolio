"use client";

import {
  ArrowLeft,
  ArrowRight,
  Box,
  Command,
  Grid2X2,
  Fingerprint,
  FileText,
  MapPin,
  Moon,
  Sun,
  Send,
  Terminal,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useHud } from "@/context/HudContext";
import { useTheme } from "@/context/ThemeContext";
import { PROFILE_CONFIG } from "@/data/profile.config";
import { cn, getProjectAccent } from "@/lib/theme-utils";
import { TelemetryClock } from "./TelemetryClock";
import { DropDownTerminal } from "./DropDownTerminal";
import { DossierTrigger } from "@/components/portfolio/DossierTrigger";
import { OperatorDossierDrawer } from "@/components/portfolio/OperatorDossier";
import "./hud-theme.css";

export function TelemetryFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isServices = pathname === "/services";
  const { isLight, toggleTheme } = useTheme();
  const {
    projects,
    totalProjects,
    activeIndex,
    activeProject,
    pillarCategories,
    activePillarFilter,
    setActivePillarFilter,
    viewMode,
    setViewMode,
    isTerminalOpen,
    toggleTerminal,
    godMode,
    isDossierOpen,
  } = useHud();
  const frameRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const update = () =>
      frameRef.current?.style.setProperty(
        "--hud-bar-height",
        `${bar.getBoundingClientRect().height}px`,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      data-god-mode={godMode}
      data-theme={isLight ? "light" : "dark"}
      data-page={isServices ? "services" : "portfolio"}
      className="telemetry-frame min-h-svh bg-slate-950 text-slate-100"
    >
      <a href="#main-content" className="skip-link">
        {isServices ? "Skip to services" : "Skip to projects"}
      </a>
      <div className="spatial-backdrop" aria-hidden="true" />
      <header ref={barRef} className="top-hud">
        <div className="location-block">
          <p className="flex items-center gap-2">
            <MapPin size={11} aria-hidden="true" />
            <span>LOC: {PROFILE_CONFIG.location}</span>
          </p>
          <TelemetryClock />
        </div>
        <div className="system-status">
          <p className="flex items-center justify-center gap-2">
            <span className="status-dot" />
            {godMode
              ? "STATUS: GODMODE // UNLIMITED TELEMETRY"
              : PROFILE_CONFIG.systemStatus}
          </p>
          <span className="node-count">
            NODES ONLINE:{" "}
            <span className="text-slate-300">
              {projects.length.toString().padStart(2, "0")}
            </span>
          </span>
        </div>
        <div className="hud-controls">
          <button
            type="button"
            className="hud-button theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle light mode"
            aria-pressed={isLight}
            title={isLight ? "Switch to dark mode" : "Switch to light mode"}
          >
            {isLight ? (
              <Moon size={18} aria-hidden="true" />
            ) : (
              <Sun size={18} aria-hidden="true" />
            )}
          </button>
          <nav className="recruiter-actions" aria-label="Contact and resume">
            <DossierTrigger
              className="hud-button contact-cta"
              target="transmission"
            >
              <Send size={14} aria-hidden="true" />
              <span>Get in Touch</span>
            </DossierTrigger>
            <a
              href="/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hud-button resume-cta"
            >
              <FileText size={14} aria-hidden="true" />
              <span>Resume (PDF)</span>
            </a>
          </nav>
          <DossierTrigger
            className={cn(
              "hud-button dossier-hud-trigger",
              isDossierOpen && "is-active",
            )}
            label="Operator dossier: bio and stack"
          >
            <Fingerprint size={14} aria-hidden="true" />
            <span>DOSSIER</span>
          </DossierTrigger>
          {!isServices && (
            <>
              <button
                type="button"
                onClick={toggleTerminal}
                aria-pressed={isTerminalOpen}
                aria-controls="developer-console"
                aria-expanded={isTerminalOpen}
                data-terminal-trigger
                aria-keyshortcuts="` ~"
                className={cn("hud-button", isTerminalOpen && "is-active")}
              >
                <Terminal size={13} aria-hidden="true" />
                <span>CLI (~)</span>
              </button>
              <div
                className="view-toggle"
                role="group"
                aria-label="Project view"
              >
                <button
                  type="button"
                  aria-pressed={viewMode === "spatial"}
                  onClick={() => setViewMode("spatial")}
                  className={cn(
                    "view-button",
                    viewMode === "spatial" && "is-active",
                  )}
                >
                  <Box size={12} aria-hidden="true" />
                  <span>3D DECK</span>
                </button>
                <span className="text-slate-300" aria-hidden="true">
                  /
                </span>
                <button
                  type="button"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "view-button",
                    viewMode === "grid" && "is-active",
                  )}
                >
                  <Grid2X2 size={12} aria-hidden="true" />
                  <span>GRID</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>
      <DropDownTerminal />
      <OperatorDossierDrawer />
      {children}
      {!isServices && (
        <footer className="bottom-hud">
          <nav className="pillar-nav" aria-label="Pillar quick-jump">
            <span className="pillar-label">
              <Command size={13} aria-hidden="true" /> PILLARS
            </span>
            <button
              type="button"
              className={cn(
                "pillar-pill",
                activePillarFilter === "ALL" &&
                  viewMode === "grid" &&
                  "all-active",
              )}
              aria-pressed={viewMode === "grid" && activePillarFilter === "ALL"}
              onClick={() => setActivePillarFilter("ALL")}
            >
              ALL <span>{totalProjects.toString().padStart(2, "0")}</span>
            </button>
            {pillarCategories.map((category) => {
              const theme = getProjectAccent(category.accent);
              const selected =
                viewMode === "grid"
                  ? activePillarFilter === category.pillar
                  : activeProject?.pillar === category.pillar;
              return (
                <button
                  key={category.pillar}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActivePillarFilter(category.pillar)}
                  className={cn(
                    "pillar-pill",
                    selected && [theme.text, theme.background, theme.border],
                  )}
                >
                  <span
                    className={cn("h-1 w-1 shrink-0", theme.dot)}
                    aria-hidden="true"
                  />
                  {category.pillarShort}
                </button>
              );
            })}
          </nav>
          <div className="keybind-legend">
            <span
              className={cn(
                "cycle-hint",
                (viewMode !== "spatial" || isTerminalOpen) && "opacity-70",
              )}
            >
              <kbd>
                <ArrowLeft size={10} />
                <ArrowRight size={10} />
              </kbd>{" "}
              CYCLE NODES{" "}
              <span className="text-slate-300">
                ({totalProjects > 0 ? activeIndex + 1 : 0}/{totalProjects})
              </span>
            </span>
            <span className="legend-divider">|</span>
            <span>
              <kbd>~</kbd> DROP CONSOLE
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
