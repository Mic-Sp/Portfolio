"use client";

import {
  ArrowUpRight,
  Check,
  Crosshair,
  FileText,
  GitBranch,
} from "lucide-react";
import { cn, getProjectAccent } from "@/lib/theme-utils";
import type { ProjectNode } from "@/types/portfolio";
import { ProjectSchematic } from "./ProjectSchematic";

interface ProjectCardProps {
  project: ProjectNode;
  index: number;
  selected: boolean;
  onSelect: () => void;
}

export function ProjectCard({
  project,
  index,
  selected,
  onSelect,
}: ProjectCardProps) {
  const theme = getProjectAccent(project.accent);
  const links = [
    {
      key: "live",
      label: "LIVE SYSTEM",
      url: project.links.live,
      icon: ArrowUpRight,
    },
    { key: "repo", label: "SOURCE", url: project.links.repo, icon: GitBranch },
    { key: "docs", label: "DOCS", url: project.links.docs, icon: FileText },
  ].filter((link) => link.url);

  return (
    <article
      id={`project-${project.id}`}
      data-project-id={project.id}
      data-selected={selected}
      className={cn(
        "project-card",
        theme.scope,
        selected && ["project-selected", theme.border, theme.glow],
      )}
      aria-labelledby={`title-${project.id}`}
    >
      <div className="card-corner corner-tl" aria-hidden="true" />
      <div className="card-corner corner-br" aria-hidden="true" />
      <div className="card-telemetry">
        <span className={cn("flex items-center gap-2", theme.text)}>
          <span className={cn("h-1 w-1", theme.dot)} />
          {project.pillarShort}
        </span>
        <span className="project-status">
          <span className={cn("h-1 w-1 rounded-full", theme.dot)} />
          {project.status}
        </span>
      </div>
      <div className="project-title-row">
        <div>
          <span className="project-number">
            NODE_{(index + 1).toString().padStart(2, "0")}{" "}
            <span>
              {"// "}
              {project.version}
            </span>
          </span>
          <h3 id={`title-${project.id}`}>{project.title}</h3>
        </div>
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Select ${project.title}`}
          aria-pressed={selected}
          className={cn(
            "select-node",
            selected && [theme.text, theme.border, theme.background],
          )}
        >
          <Crosshair size={20} className={cn(!selected && "opacity-45")} />
        </button>
      </div>
      <p className="project-tagline">{project.tagline}</p>
      <ProjectSchematic project={project} />
      <p className="project-description">{project.description}</p>
      <ul
        className="tech-stack"
        aria-label={`${project.title} technology stack`}
      >
        {project.techStack.map((tech) => (
          <li key={tech}>{tech}</li>
        ))}
      </ul>
      <div className="project-card-footer">
        <div className="project-links">
          {links.map(({ key, url, label, icon: Icon }) =>
            url === "#" ? (
              <span
                key={key}
                className="unavailable-link"
                title="URL not yet provided"
                aria-label={`${label}: URL not yet provided`}
              >
                {label}
                <Icon size={12} aria-hidden="true" />
              </span>
            ) : (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${project.title}: ${label.toLowerCase()} (opens in a new tab)`}
              >
                {label}
                <Icon size={12} aria-hidden="true" />
              </a>
            ),
          )}
        </div>
        <span className={cn("selection-label", selected && theme.text)}>
          {selected ? (
            <>
              <Check size={10} /> SELECTED
            </>
          ) : (
            "STANDBY"
          )}
        </span>
      </div>
    </article>
  );
}
