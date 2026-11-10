interface AcademicCredential {
  id: string;
  institution: string;
  location?: string;
  qualification: string;
  honors: readonly string[];
  capstone?: string;
  heroLabel: string;
}

interface DirectChannel {
  href: `https://${string}`;
  label: string;
  handle: string;
}

export interface CommsAndTelemetry {
  directChannels: {
    github: DirectChannel;
    linkedin: DirectChannel;
    email: { address: string; href: `mailto:${string}` };
  };
  thmTelemetry: {
    handle: string;
    profileUrl: `https://${string}`;
    badgeScriptUrl: `https://${string}`;
    league: string;
  };
}

const COMMS_AND_TELEMETRY = {
  directChannels: {
    github: {
      href: "https://github.com/Mic-Sp",
      label: "GITHUB // MIC-SP",
      handle: "@Mic-Sp",
    },
    linkedin: {
      href: "https://www.linkedin.com/in/michael-sprague-it/",
      label: "LINKEDIN // MICHAEL-SPRAGUE-IT",
      handle: "/in/michael-sprague-it",
    },
    email: {
      address: "mic.sprague@gmail.com",
      href: "mailto:mic.sprague@gmail.com",
    },
  },
  thmTelemetry: {
    handle: "mic.drop",
    profileUrl: "https://tryhackme.com/p/mic.drop",
    badgeScriptUrl:
      "https://tryhackme.com/badge/t/3174f380b77c1bd0c7336280c2fbd30c06221c5f6e9c4250ae8d5352dae1b64f3fc37c020cdbb4ee0a8f98d5dab9ad4d?theme=dark",
    league: "GOLD LEAGUE",
  },
} as const satisfies CommsAndTelemetry;

const EDUCATION: readonly AcademicCredential[] = [
  {
    id: "holy-cross",
    institution: "Holy Cross College",
    location: "Notre Dame, IN",
    qualification: "B.A. in Business",
    honors: [
      "Summa Cum Laude (3.98 GPA)",
      "Delta Epsilon Sigma National Honor Society",
    ],
    capstone: "Quantum Computing: An Economic Insight",
    heroLabel: "B.A. Business",
  },
  {
    id: "columbia",
    institution: "Columbia University",
    qualification: "Applied Artificial Intelligence Certificate",
    honors: [],
    heroLabel: "Applied AI Engineering",
  },
  {
    id: "next-chapter",
    institution: "Next Chapter",
    qualification: "Software Engineering Apprenticeship",
    honors: [],
    heroLabel: "AI Software Engineering",
  },
];

export const PROFILE_CONFIG = {
  name: "Michael A. Sprague",
  legalName: "Michael Anthony Sprague",
  headline: "AI & Full-Stack Systems Engineer // AppSec",
  subheadline: EDUCATION.map((item) => item.heroLabel).join(" • "),
  location: "CHICAGOLAND // NW INDIANA",
  systemStatus: "STATUS: BUILDING // OPEN TO ROLES",
  timeZone: "America/Chicago",
  executiveBio:
    "AI & Full-Stack Software Engineer building intelligent automated workflows, production web applications, and custom developer tools, engineered from the ground up with an application-security mindset.",
  education: EDUCATION,
  commsAndTelemetry: COMMS_AND_TELEMETRY,
  specializations: [
    "Claude Academy MCP Advanced & Claude Code",
    "DeepLearning.AI Supervised Machine Learning",
    "NVIDIA AI Infrastructure",
    "IBM Python for Data Science & ML",
    "Google IT Support & Python",
    "University of Michigan Python Specialization",
  ],
  engineeringMatrix: {
    "AI, Quantum & Data": [
      "Python",
      "Qiskit Aer",
      "Gemini AI",
      "pgvector",
      "Prisma",
      "Neon Postgres",
      "FastAPI",
    ],
    "Full-Stack & Edge": [
      "TypeScript",
      "Next.js (App Router)",
      "React",
      "Tailwind CSS",
      "Node.js",
      "Cloudflare Pages",
      "Docker",
    ],
    "AppSec & Verification": [
      "Web Crypto / SHA-1 k-Anonymity",
      "Shannon Entropy Auditing",
      "Zod Schema Guardrails",
      "OAuth / Steam OpenID 2.0",
      "WCAG Contrast Verification",
    ],
  },
} as const;
