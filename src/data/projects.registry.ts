import type { PillarCategory, ProjectNode } from "@/types/portfolio";

// The only project/pillar inventory. UI, navigation, and future CLI share these IDs.
export const PROJECTS_REGISTRY: ProjectNode[] = [
  {
    id: "q-split",
    order: 1,
    featured: true,
    pillar: "Applied AI & Quantum Systems",
    pillarShort: "AI // QUANTUM",
    title: "Q-Split",
    version: "v1.1.0",
    status: "ONLINE",
    accent: "cyan",
    tagline: "Hybrid Quantum-Classical Workload Simulator & Co-Design Profiler",
    description:
      "Full-stack simulation engine profiling hybrid quantum-classical workloads across QPU architectures (including IBM Quantum System Two Nighthawk r2 and FTQC surface code bounds), modeling T1/T2 idle decoherence, depth expansion, and repetition-rate telemetry.",
    architectureHighlights: [
      "Hybrid quantum-classical workload profiling",
      "T1/T2 idle decoherence & depth expansion",
      "QPU repetition-rate telemetry",
    ],
    techStack: [
      "Next.js",
      "FastAPI",
      "Qiskit Aer",
      "Docker",
      "Python",
      "TypeScript",
      "Render",
    ],
    links: {
      live: "https://q-split.vercel.app/",
      repo: "https://github.com/Mic-Sp/Q-split",
    },
    cliMeta: { commandAlias: "q-split", quickStat: "HYBRID QPU // CLASSICAL" },
  },
  {
    id: "backlog-buster",
    order: 2,
    featured: true,
    pillar: "Full-Stack & Vector Databases",
    pillarShort: "FULL-STACK // VECTOR",
    title: "Backlog Buster",
    version: "v2.0",
    status: "PRODUCTION",
    accent: "emerald",
    tagline:
      "AI-Driven Video Game Library Tracker & Semantic Recommendation Engine",
    description:
      "Full-stack library manager featuring Steam OpenID 2.0 auto-sync, pgvector semantic search, hybrid IGDB/RAWG/Gemini AI chronological lore ordering, Zod guardrails, and a live Custom Theme Studio.",
    architectureHighlights: [
      "Steam OpenID 2.0 library auto-sync",
      "pgvector semantic recommendations",
      "Guarded AI lore ordering & custom themes",
    ],
    techStack: [
      "Next.js",
      "Neon Postgres",
      "Prisma",
      "pgvector",
      "Gemini AI",
      "Steam OpenID",
      "Zod",
    ],
    links: {
      live: "https://backlog-buster-chi.vercel.app/",
      repo: "https://github.com/Mic-Sp/Backlog-Buster",
    },
    cliMeta: { commandAlias: "backlog", quickStat: "SEMANTIC VECTOR SEARCH" },
  },
  {
    id: "huddle-and-heal",
    order: 3,
    featured: true,
    pillar: "Production Client Infrastructure",
    pillarShort: "EDGE // INFRASTRUCTURE",
    title: "Huddle & Heal",
    version: "v1.0",
    status: "CLIENT PROD",
    accent: "violet",
    tagline:
      "Production Web Platform for Clinical Counseling & Consulting (PLLC)",
    description:
      "Custom production web platform engineered for Huddle & Heal Counseling & Consulting, PLLC, featuring build-time WCAG accessibility contrast verification, clinical copy boundary guardrails, automated GitHub-to-Cloudflare Pages deployment, and streamlined client intake routing.",
    architectureHighlights: [
      "WCAG contrast & clinical copy guardrails",
      "GitHub-to-Cloudflare Pages CI/CD edge deploy",
      "IL/IN/TN teletherapy & client scheduling routing",
    ],
    techStack: [
      "Cloudflare Pages",
      "GitHub CI/CD",
      "WCAG Accessibility",
      "Clinical Copy Guardrails",
      "Responsive UI",
    ],
    links: {
      live: "https://huddleandhealcounselingandconsulting.com/",
    },
    cliMeta: { commandAlias: "huddle", quickStat: "EDGE-DEPLOYED PLATFORM" },
  },
  {
    id: "pwndpass",
    order: 4,
    featured: true,
    pillar: "AppSec & Cryptography",
    pillarShort: "APPSEC // CRYPTO",
    title: "PwndPass",
    version: "v1.0.0",
    status: "ONLINE",
    accent: "amber",
    tagline:
      "Zero-Knowledge Client-Side Password Breach & Shannon Entropy Auditor",
    description:
      "Privacy-first security utility implementing SHA-1 k-Anonymity range queries against the Have I Been Pwned API alongside real-time client-side Shannon entropy bit-strength mathematics.",
    architectureHighlights: [
      "SHA-1 k-Anonymity range queries",
      "Client-side Shannon entropy mathematics",
      "Privacy-first breach auditing",
    ],
    techStack: [
      "TypeScript",
      "SHA-1 k-Anonymity",
      "HIBP API",
      "Shannon Entropy",
      "Zero-Knowledge Crypto",
    ],
    links: {
      live: "https://mic-sp.github.io/PwndPass/",
      repo: "https://github.com/Mic-Sp/PwndPass",
    },
    cliMeta: {
      commandAlias: "pwndpass",
      quickStat: "CLIENT-SIDE // ZERO KNOWLEDGE",
    },
  },
];

export function getActiveProjects(): ProjectNode[] {
  return PROJECTS_REGISTRY.filter(
    (project) => project.status !== "ARCHIVED",
  ).sort((a, b) => a.order - b.order);
}

export function getPillarCategories(
  projects: readonly ProjectNode[] = getActiveProjects(),
): PillarCategory[] {
  const categories = new Map<string, PillarCategory>();
  for (const project of projects) {
    const category = categories.get(project.pillar);
    if (category) category.count += 1;
    else
      categories.set(project.pillar, {
        pillar: project.pillar,
        pillarShort: project.pillarShort,
        accent: project.accent,
        count: 1,
      });
  }
  return [...categories.values()];
}

export function getProjectById(id: string): ProjectNode | undefined {
  return PROJECTS_REGISTRY.find((project) => project.id === id);
}
