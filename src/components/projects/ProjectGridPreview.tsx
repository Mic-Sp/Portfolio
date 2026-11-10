"use client";

import { useHud } from "@/context/HudContext";
import { ProjectCard } from "./ProjectCard";
import { ProjectViewToggle } from "./ProjectViewToggle";

export function ProjectGridPreview() {
  const {
    projects,
    activeIndex,
    selectProject,
    activePillarFilter,
    setActivePillarFilter,
  } = useHud();
  const visibleProjects = projects
    .map((project, index) => ({ project, index }))
    .filter(
      ({ project }) =>
        activePillarFilter === "ALL" || project.pillar === activePillarFilter,
    );

  return (
    <section
      id="project-registry"
      className="project-registry"
      aria-labelledby="registry-heading"
    >
      <div className="registry-heading">
        <div className="registry-title">
          <span className="section-index">01 /</span>
          <h2 id="registry-heading">
            Selected systems
            <span className="registry-count">
              {projects.length.toString().padStart(2, "0")}
            </span>
          </h2>
        </div>
        <ProjectViewToggle />
      </div>
      <div className="registry-meta">
        <span>
          {activePillarFilter !== "ALL"
            ? activePillarFilter
            : "INDEPENDENT BUILDS. CONNECTED DISCIPLINES."}
        </span>
        <span>
          {visibleProjects.length.toString().padStart(2, "0")} /{" "}
          {projects.length.toString().padStart(2, "0")} NODES VISIBLE
        </span>
      </div>
      <div className="project-grid">
        {visibleProjects.map(({ project, index }) => (
          <ProjectCard
            key={project.id}
            project={project}
            index={index}
            selected={activeIndex === index}
            onSelect={() => selectProject(index)}
          />
        ))}
      </div>
      {visibleProjects.length === 0 && (
        <div className="empty-registry">
          <p>No active nodes in this view.</p>
          <button type="button" onClick={() => setActivePillarFilter("ALL")}>
            Show all pillars
          </button>
        </div>
      )}
      <div className="registry-end">
        <span className="flex items-center gap-2">
          <span className="h-1 w-1 bg-cyan-400/60" />
          END OF REGISTRY <span className="text-slate-700">{"//"}</span> ALWAYS
          BUILDING
        </span>
        <span>DESIGNED TO EVOLVE.</span>
      </div>
    </section>
  );
}
