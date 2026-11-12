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
    hook: "A workload simulator that tests how classical computers and quantum processors can divide complex AI tasks—and predicts when quantum hardware noise outweighs any speed advantage.",
    technicalSpec:
      "Hybrid quantum-classical routing engine built with FastAPI and Qiskit Aer, modeling T1/T2 idle decoherence and gate error rates alongside Gemini API orchestration.",
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
    hook: "A smart game library manager that syncs your Steam account and uses AI similarity matching to recommend what to play next based on your actual playstyle and mood.",
    technicalSpec:
      "Full-stack recommendation platform built with Next.js, Prisma, and Neon Postgres, leveraging pgvector embeddings and Steam OpenID authentication.",
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
    title: "Huddle & Heal Counseling & Consulting",
    version: "v1.0",
    status: "CLIENT PROD",
    accent: "violet",
    hook: "A custom production website and zero-downtime domain migration built for a licensed clinical counseling practice to streamline client intake and online visibility.",
    technicalSpec:
      "End-to-end client deployment featuring automated GitHub-to-Cloudflare Pages CI/CD and a cross-registrar DNS migration (A, CNAME, and TXT record cutover).",
    architectureHighlights: [
      "WCAG contrast & clinical copy guardrails",
      "Custom DNS migration (A/CNAME/TXT) & Cloudflare edge deploy",
      "IL/IN/TN teletherapy & client scheduling routing",
    ],
    techStack: [
      "Cloudflare Pages",
      "GitHub CI/CD",
      "DNS Migration",
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
    hook: "A privacy-first security tool that checks whether your password has appeared in known data breaches without ever transmitting your actual password over the internet.",
    technicalSpec:
      "Client-side credential auditor implementing k-anonymity via truncated SHA-1 hash prefixing against the HIBP API, paired with real-time Shannon entropy scoring.",
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
