"use client";

import { Check, Crosshair, FileText, ScanEye } from "lucide-react";
import Image from "next/image";
import { cn, getProjectAccent } from "@/lib/theme-utils";
import { getProjectCopy } from "@/lib/project-copy";
import type { ProjectNode } from "@/types/portfolio";
import { ProjectSchematic } from "./ProjectSchematic";
import { ProjectCaseStudy } from "./ProjectCaseStudy";
import "./project-previews.css";

interface ProjectCardProps {
  project: ProjectNode;
  index: number;
  selected: boolean;
  onSelect: () => void;
  interactive?: boolean;
  variant: "grid" | "spatial";
  onPreview: (project: ProjectNode) => void;
}

export function ProjectCard({
  project,
  index,
  selected,
  onSelect,
  interactive = true,
  variant,
  onPreview,
}: ProjectCardProps) {
  const theme = getProjectAccent(project.accent);
  const { statusLabel, liveLabel } = getProjectCopy(project.status);
  const links = [
    {
      key: "live",
      label: liveLabel,
      url: project.links.live,
      icon: null,
    },
    { key: "repo", label: "GitHub ↗", url: project.links.repo, icon: null },
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
      {variant === "grid" && (
        <button
          type="button"
          className="project-thumbnail relative mb-6 block aspect-video w-full overflow-hidden border border-cyan-500/20"
          onClick={() => onPreview(project)}
          aria-label={`Preview ${project.title} screenshot`}
          aria-haspopup="dialog"
          aria-controls="project-lightbox"
        >
          <Image
            src={project.image}
            alt={project.imageAlt}
            fill
            sizes="(max-width: 767px) 200vw, (max-width: 1279px) 100vw, 1200px"
            className={project.thumbnailClass}
            draggable={false}
          />
          <span
            className="thumbnail-corner thumbnail-corner-tl"
            aria-hidden="true"
          />
          <span
            className="thumbnail-corner thumbnail-corner-br"
            aria-hidden="true"
          />
          <span className="thumbnail-label" aria-hidden="true">
            <ScanEye size={14} /> VIEW FULL UI
          </span>
        </button>
      )}
      <div className="card-corner corner-tl" aria-hidden="true" />
      <div className="card-corner corner-br" aria-hidden="true" />
      <div className="card-telemetry">
        <span className={cn("flex items-center gap-2", theme.text)}>
          <span className={cn("h-1 w-1", theme.dot)} />
          {project.pillarShort}
        </span>
        <div className="project-telemetry-actions">
          <span className="project-status">
            <span
              className={cn("h-1 w-1 rounded-full", theme.dot)}
              aria-hidden="true"
            />
            {statusLabel}
          </span>
          {variant === "spatial" && (
            <button
              type="button"
              className="project-preview-trigger"
              disabled={!interactive}
              onClick={() => onPreview(project)}
              aria-label={`Preview ${project.title} screenshot`}
              aria-haspopup="dialog"
              aria-controls="project-lightbox"
            >
              <ScanEye size={14} aria-hidden="true" /> [ UI PREVIEW ]
            </button>
          )}
        </div>
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
          disabled={!interactive}
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
      <p className="project-tagline project-hook">{project.hook}</p>
      <p className="project-description project-technical-spec">
        <span className="project-spec-label">Technical Spec</span>
        {project.technicalSpec}
      </p>
      <ul
        className="tech-stack"
        aria-label={`${project.title} technology stack`}
      >
        {project.techStack.map((tech) => (
          <li key={tech}>{tech}</li>
        ))}
      </ul>
      <ProjectSchematic project={project} />
      <ProjectCaseStudy
        project={project}
        interactive={interactive}
        variant={variant}
      />
      <div className="project-card-footer">
        <div className="project-links">
          {links.map(({ key, url, label, icon: Icon }) =>
            url === "#" || !interactive ? (
              <span
                key={key}
                className="unavailable-link"
                title={
                  url === "#"
                    ? "URL not yet provided"
                    : "Select this project to open links"
                }
                aria-label={`${label}: ${url === "#" ? "URL not yet provided" : "select this project to open links"}`}
              >
                {label}
                {Icon && <Icon size={12} aria-hidden="true" />}
              </span>
            ) : (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                draggable={false}
                aria-label={`${project.title}: ${label} (opens in a new tab)`}
              >
                {label}
                {Icon && <Icon size={12} aria-hidden="true" />}
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
            "Select Project →"
          )}
        </span>
      </div>
    </article>
  );
}
