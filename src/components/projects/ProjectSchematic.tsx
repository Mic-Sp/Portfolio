import type { ProjectNode } from "@/types/portfolio";

// All modules come from registry data; new projects need no illustration branches.
export function ProjectSchematic({ project }: { project: ProjectNode }) {
  const systems = project.architectureHighlights;
  return (
    <div className="project-schematic" aria-hidden="true">
      <div className="schematic-rail">
        <span>KEY FEATURES &amp; ARCHITECTURE</span>
      </div>
      <div className="schematic-flow">
        <div className="schematic-core">
          <svg viewBox="0 0 64 64" fill="none">
            <path
              d="m32 8 21 12v24L32 56 11 44V20L32 8Z"
              stroke="currentColor"
            />
            <path
              d="m32 19 11 6v14l-11 6-11-6V25l11-6Z"
              stroke="currentColor"
              strokeOpacity=".45"
            />
            <path
              d="M32 0v8m0 48v8M0 32h11m42 0h11"
              stroke="currentColor"
              strokeOpacity=".5"
            />
            <circle cx="32" cy="32" r="3" fill="currentColor" />
          </svg>
        </div>
        <div className="schematic-bus" />
        <div className="schematic-modules">
          {systems.map((system, index) => (
            <div key={system}>
              <span className="module-port" />
              <span className="module-number">
                {(index + 1).toString().padStart(2, "0")}
              </span>
              <span>{system}</span>
              <span className="module-light" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
