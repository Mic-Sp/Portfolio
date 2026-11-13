import type { ReactNode } from "react";

export type CubeFaceId = "front" | "back" | "right" | "left" | "top" | "bottom";
export interface CubePreviewImage {
  src: string;
  alt: string;
}
export interface LabProject {
  id: string;
  title: string;
  summary: string;
  tags: readonly string[];
  liveUrl: string;
  previewImage?: CubePreviewImage;
  videoDemoUrl?: string;
}
export interface CubeFaceSlot {
  id: CubeFaceId;
  label: string;
  eyebrow?: string;
  content?: ReactNode;
  onActivate?: () => void;
  kind?: "lab" | "queue" | "worldline" | "network";
  project?: LabProject;
  previewImage?: CubePreviewImage;
}
export interface CubeCoreSlot {
  label: string;
  content?: ReactNode;
  onActivate?: () => void;
}

// Add a build here to replace the next open slot on the four lab faces.
export const labProjects: readonly LabProject[] = [
  {
    id: "vivis-dream",
    title: "Vivi's Dream",
    summary:
      "AI video super-resolution & restoration demo remastering classic Final Fantasy IX FMVs—comparing Real-ESRGAN pipelines against custom FLUX.1 LoRA workflows.",
    tags: ["PyTorch", "Real-ESRGAN", "FFmpeg", "OpenCV", "FLUX.1"],
    liveUrl: "https://mic-sp.github.io/NC-Project-Week1/",
    previewImage: {
      src: "/images/lab/vivis-dream-preview.png",
      alt: "Vivi dreaming of a Final Fantasy IX scene before and after AI restoration",
    },
    videoDemoUrl:
      "https://www.youtube-nocookie.com/embed/OFzxl3kdh3c?autoplay=1&rel=0",
  },
];

const LAB_FACES = [
  { id: "front", label: "Front" },
  { id: "right", label: "Right" },
  { id: "back", label: "Back" },
  { id: "left", label: "Left" },
] as const;
export function getLabFaceSlots(
  projects: readonly LabProject[] = labProjects,
): CubeFaceSlot[] {
  return LAB_FACES.map((face, index) => ({
    ...face,
    eyebrow: `${String(index + 1).padStart(2, "0")} // ${projects[index] ? "LAB BUILD" : "R&D QUEUE"}`,
    kind: projects[index] ? "lab" : "queue",
    project: projects[index],
    previewImage: projects[index]?.previewImage,
  }));
}
export const CUBE_FACES: readonly CubeFaceSlot[] = [
  ...getLabFaceSlots(),
  { id: "top", label: "Top", eyebrow: "05 // WORLDLINE", kind: "worldline" },
  { id: "bottom", label: "Bottom", eyebrow: "06 // NETWORK", kind: "network" },
];
export const CUBE_NETWORK_LINKS = [
  { label: "GitHub ↗", href: "https://github.com/Mic-Sp" },
  { label: "TryHackMe ↗", href: "https://tryhackme.com/p/mic.drop" },
] as const;
export const CUBE_CORE: CubeCoreSlot = { label: "FGL // CORE" };
