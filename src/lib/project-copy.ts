import type { ProjectNode } from "@/types/portfolio";

const STATUS_LABELS: Record<ProjectNode["status"], string> = {
  ONLINE: "Live Demo Available",
  PRODUCTION: "Live Demo Available",
  "CLIENT PROD": "Live Client Site",
  "IN DEVELOPMENT": "In Development",
  ARCHIVED: "Archived",
};

export function getProjectCopy(status: ProjectNode["status"]) {
  return {
    statusLabel: STATUS_LABELS[status],
    liveLabel: status === "CLIENT PROD" ? "Live Site ↗" : "Live Demo ↗",
  };
}
