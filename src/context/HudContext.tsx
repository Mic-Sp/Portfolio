"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getActiveProjects,
  getPillarCategories,
} from "@/data/projects.registry";
import { useHudKeyboard } from "@/hooks/useHudKeyboard";
import type { PillarCategory, ProjectNode } from "@/types/portfolio";
import type { DossierSection, DossierTarget } from "@/lib/dossier-navigation";

export type { DossierSection, DossierTarget } from "@/lib/dossier-navigation";

type ViewMode = "spatial" | "grid";
interface HudContextValue {
  projects: readonly ProjectNode[];
  pillarCategories: PillarCategory[];
  activeIndex: number;
  activeProject: ProjectNode | undefined;
  totalProjects: number;
  selectProject: (index: number) => void;
  nextProject: () => void;
  prevProject: () => void;
  activePillarFilter: string | "ALL";
  setActivePillarFilter: (pillar: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isTerminalOpen: boolean;
  toggleTerminal: () => void;
  openWorldlineTerminal: () => void;
  worldlineRequestId: number;
  closeTerminal: () => void;
  isDossierOpen: boolean;
  dossierSection: DossierSection;
  dossierRequestId: number;
  openDossier: (section?: DossierSection) => void;
  openDossierToSection: (target: DossierTarget) => void;
  closeDossier: () => void;
  godMode: boolean;
  setGodMode: (enabled: boolean) => void;
}

const DEFAULT_PROJECTS = getActiveProjects();
const HudContext = createContext<HudContextValue | null>(null);
const wrapIndex = (index: number, total: number) =>
  total > 0 ? ((index % total) + total) % total : 0;

export function HudProvider({
  children,
  projects = DEFAULT_PROJECTS,
}: {
  children: ReactNode;
  projects?: readonly ProjectNode[];
}) {
  const totalProjects = projects.length;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeIndex = wrapIndex(selectedIndex, totalProjects);
  const [activePillarFilter, setPillarFilter] = useState<string | "ALL">("ALL");
  const [viewMode, setMode] = useState<ViewMode>("spatial");
  const [isTerminalOpen, setTerminalOpen] = useState(false);
  const [worldlineRequestId, setWorldlineRequestId] = useState(0);
  const [isDossierOpen, setDossierOpen] = useState(false);
  const [dossierSection, setDossierSection] =
    useState<DossierSection>("overview");
  const [dossierRequestId, setDossierRequestId] = useState(0);
  const [godMode, setGodMode] = useState(false);

  const selectProject = useCallback(
    (index: number) => {
      if (Number.isInteger(index))
        setSelectedIndex(wrapIndex(index, totalProjects));
    },
    [totalProjects],
  );
  const nextProject = useCallback(() => {
    setSelectedIndex((index) =>
      totalProjects > 0
        ? (wrapIndex(index, totalProjects) + 1) % totalProjects
        : 0,
    );
  }, [totalProjects]);
  const prevProject = useCallback(() => {
    setSelectedIndex((index) =>
      totalProjects > 0
        ? (wrapIndex(index, totalProjects) - 1 + totalProjects) % totalProjects
        : 0,
    );
  }, [totalProjects]);
  const toggleTerminal = useCallback(() => {
    setDossierOpen(false);
    setTerminalOpen((open) => !open);
  }, []);
  const openWorldlineTerminal = useCallback(() => {
    setDossierOpen(false);
    setWorldlineRequestId((id) => id + 1);
    setTerminalOpen(true);
  }, []);
  const closeTerminal = useCallback(() => setTerminalOpen(false), []);
  const openDossier = useCallback((section: DossierSection = "overview") => {
    setTerminalOpen(false);
    setDossierSection(section);
    setDossierRequestId((id) => id + 1);
    setDossierOpen(true);
  }, []);
  const openDossierToSection = useCallback(
    (target: DossierTarget) => {
      openDossier(target === "top" ? "overview" : target);
    },
    [openDossier],
  );
  const closeDossier = useCallback(() => setDossierOpen(false), []);
  const setViewMode = useCallback(
    (mode: ViewMode) => {
      // A spatial selection can leave the previous grid filter. Keep it visible on return.
      if (
        mode === "grid" &&
        activePillarFilter !== "ALL" &&
        projects[activeIndex]?.pillar !== activePillarFilter
      )
        setPillarFilter("ALL");
      setMode(mode);
    },
    [activePillarFilter, activeIndex, projects],
  );
  const setActivePillarFilter = useCallback(
    (pillar: string) => {
      const firstIndex = projects.findIndex(
        (project) => project.pillar === pillar,
      );
      if (pillar !== "ALL" && firstIndex < 0) return;
      setPillarFilter(pillar);
      if (firstIndex >= 0) setSelectedIndex(firstIndex);
    },
    [projects],
  );
  const pillarCategories = useMemo(
    () => getPillarCategories(projects),
    [projects],
  );

  useHudKeyboard({
    viewMode,
    isTerminalOpen,
    isDossierOpen,
    closeDossier,
    toggleTerminal,
    nextProject,
    prevProject,
  });

  return (
    <HudContext.Provider
      value={{
        projects,
        pillarCategories,
        activeIndex,
        activeProject: projects[activeIndex],
        totalProjects,
        selectProject,
        nextProject,
        prevProject,
        activePillarFilter,
        setActivePillarFilter,
        viewMode,
        setViewMode,
        isTerminalOpen,
        toggleTerminal,
        openWorldlineTerminal,
        worldlineRequestId,
        closeTerminal,
        isDossierOpen,
        dossierSection,
        dossierRequestId,
        openDossier,
        openDossierToSection,
        closeDossier,
        godMode,
        setGodMode,
      }}
    >
      {children}
    </HudContext.Provider>
  );
}

export function useHud() {
  const context = useContext(HudContext);
  if (!context) throw new Error("useHud must be used within a HudProvider");
  return context;
}
