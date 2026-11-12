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
    image: "/projects/q-split-preview.png",
    imageAlt:
      "Q-Split workload simulator showing hardware profiles, quantum decoherence telemetry, and the execution pipeline.",
    thumbnailClass: "object-cover object-top scale-100",
    hook: "A workload simulator that tests how classical computers and quantum processors can divide complex AI tasks—and predicts when quantum hardware noise outweighs any speed advantage.",
    technicalSpec:
      "Hybrid quantum-classical routing engine built with FastAPI and Qiskit Aer, modeling T1/T2 idle decoherence and gate error rates alongside Gemini API orchestration.",
    caseStudy: {
      problem:
        "Quantum circuit simulations often assume idealized hardware or require manual parameter tuning, making it hard to see where NISQ-era decoherence and gate errors outweigh theoretical speedups in hybrid AI pipelines.",
      decision:
        "Decoupled the Qiskit Aer simulation engine into a containerized Python/FastAPI microservice while keeping the telemetry dashboard in Next.js, using Gemini to parse workload requirements and route subtasks.",
      tradeOffs:
        "Full density-matrix noise modeling (T1/T2 relaxation) scales expensively with qubit depth; bounded interactive circuit depth and pre-computed baseline hardware profiles to keep cloud inference responsive.",
    },
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
    image: "/projects/backlog-buster-preview.png",
    imageAlt:
      "Backlog Buster Safe Room dashboard with the equipped game loadout, playtime, and inventory library.",
    thumbnailClass: "object-cover origin-top scale-[1.45]",
    hook: "A smart game library manager that syncs your Steam account and uses AI similarity matching to recommend what to play next based on your actual playstyle and mood.",
    technicalSpec:
      "Full-stack recommendation platform built with Next.js, Prisma, and Neon Postgres, leveraging pgvector embeddings and Steam OpenID authentication.",
    caseStudy: {
      problem:
        "Large Steam libraries cause choice paralysis, and rigid storefront genre tags fail to match games by actual playstyle, pacing, or vibe.",
      decision:
        "Combined Steam OpenID sync with Neon Postgres (pgvector) for semantic similarity matching, backed by a read-through GameCatalog database cache and strict Zod JSON schema validation for Gemini AI enrichment.",
      tradeOffs:
        "Cold LLM lookups and external RAWG/IGDB metadata fetches add latency and token overhead; implementing a Prisma read-through cache with deterministic fallbacks cut repeat lookups to zero LLM calls while preventing cache-miss storms.",
    },
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
    image: "/projects/huddle-heal-preview.png",
    imageAlt:
      "Huddle & Heal counseling website showing the welcome headline, consultation scheduling, and clinician portrait.",
    thumbnailClass: "object-cover origin-top scale-[1.45]",
    hook: "A custom production website and zero-downtime domain migration built for a licensed clinical counseling practice to streamline client intake and online visibility.",
    technicalSpec:
      "End-to-end client deployment featuring automated GitHub-to-Cloudflare Pages CI/CD and a cross-registrar DNS migration (A, CNAME, and TXT record cutover).",
    caseStudy: {
      problem:
        "A licensed clinician launching a brand-new solo private practice after her former clinic announced its closure needed an authoritative, accessible web presence on a tight timeline—without disrupting her newly registered Google Workspace domain and email.",
      decision:
        "Designed and built a static-first web platform deployed via automated GitHub-to-Cloudflare Pages CI/CD, executing a cross-registrar DNS cutover (A, CNAME, MX, and TXT records) from Google Workspace to Cloudflare.",
      tradeOffs:
        "Offloading DNS and edge hosting to Cloudflare while keeping Google Workspace mail records intact delivered edge caching, automatic SSL, and zero recurring hosting fees while protecting clinical email deliverability from day one.",
    },
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
    image: "/projects/pwnd-pass-preview.png",
    imageAlt:
      "PwndPass security terminal displaying a breach result, k-anonymity query anatomy, and password entropy telemetry.",
    thumbnailClass: "object-cover origin-[50%_42%] scale-[2.2]",
    hook: "A privacy-first security tool that checks whether your password has appeared in known data breaches without ever transmitting your actual password over the internet.",
    technicalSpec:
      "Client-side credential auditor implementing k-anonymity via truncated SHA-1 hash prefixing against the HIBP API, paired with real-time Shannon entropy scoring.",
    caseStudy: {
      problem:
        "Checking whether a password has been exposed in data breaches by submitting it to an external server introduces unacceptable credential exposure risk.",
      decision:
        "Engineered a zero-knowledge client-side auditor in TypeScript using the Web Crypto API to hash passwords locally (SHA-1) and transmit only the 5-character prefix (k-anonymity) to the HIBP range endpoint, alongside local Shannon entropy math.",
      tradeOffs:
        "Executing all hash suffix matching and entropy calculations in the browser eliminates backend attack surface and hosting overhead while guaranteeing plaintext never leaves the device.",
    },
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
