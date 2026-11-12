export type ProjectAccentColor =
  "cyan" | "emerald" | "violet" | "amber" | "rose" | "blue";

export interface ProjectNode {
  id: string;
  order: number;
  featured: boolean;
  pillar: string;
  pillarShort: string;
  title: string;
  version: string;
  status:
    "ONLINE" | "PRODUCTION" | "CLIENT PROD" | "IN DEVELOPMENT" | "ARCHIVED";
  accent: ProjectAccentColor;
  hook: string;
  technicalSpec: string;
  architectureHighlights: string[];
  techStack: string[];
  links: { live?: string; repo?: string; docs?: string };
  cliMeta?: { commandAlias?: string; quickStat?: string };
}

export interface PillarCategory {
  pillar: string;
  pillarShort: string;
  accent: ProjectAccentColor;
  count: number;
}
