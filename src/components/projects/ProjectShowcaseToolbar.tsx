"use client";

import { ScanLine } from "lucide-react";
import { useHud } from "@/context/HudContext";
import { ProjectViewToggle } from "./ProjectViewToggle";

interface ProjectShowcaseToolbarProps {
  headingId: string;
  detail: string;
  counter: string;
}

export function ProjectShowcaseToolbar({
  headingId,
  detail,
  counter,
}: ProjectShowcaseToolbarProps) {
  const { totalProjects } = useHud();
  return (
    <div className="project-toolbar">
      <div className="registry-title">
        <span className="section-index">01 /</span>
        <h2 id={headingId}>
          Selected systems
          <span className="registry-count">
            {totalProjects.toString().padStart(2, "0")}
          </span>
        </h2>
      </div>
      <p className="project-toolbar-detail">
        <ScanLine size={12} aria-hidden="true" />
        {detail}
      </p>
      <p className="project-toolbar-counter">{counter}</p>
      <ProjectViewToggle />
    </div>
  );
}
