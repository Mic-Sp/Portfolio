"use client";

import type { ReactNode } from "react";
import { CUBE_NETWORK_LINKS, type CubeFaceSlot } from "@/data/cube-config";
import { WORLDLINE } from "@/data/worldline.config";

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
export function getCubeFaceTitle(face: CubeFaceSlot) {
  if (face.kind === "lab") return face.project?.title ?? face.label;
  if (face.kind === "queue") return "LAB SLOT // OPEN";
  if (face.kind === "worldline") return "Divergence Meter";
  if (face.kind === "network") return "Network Quick-Jump";
  return "";
}
interface FaceContentProps {
  face: CubeFaceSlot;
  onWorldline: () => void;
  onWatchDemo: (face: CubeFaceSlot, trigger: HTMLButtonElement) => void;
  pending: boolean;
}

function WatchDemo({
  face,
  onWatchDemo,
  location,
}: Pick<FaceContentProps, "face" | "onWatchDemo"> & {
  location: "face" | "detail";
}) {
  if (!face.project?.videoDemoUrl) return null;
  return (
    <button
      type="button"
      className="cube-watch-demo"
      id={`cube-watch-${face.id}-${location}`}
      onClick={(event) => onWatchDemo(face, event.currentTarget)}
    >
      [ WATCH DEMO ]
    </button>
  );
}

/** Concise glass-face controls leave the central core exposed to pointer input. */
export function CubeFacePreview({
  face,
  onWorldline,
  onWatchDemo,
  pending,
}: FaceContentProps) {
  return (
    <div className="cube-face-actions">
      {face.kind === "lab" && face.project && (
        <>
          <ExternalLink href={face.project.liveUrl}>Live Demo ↗</ExternalLink>
          <WatchDemo face={face} onWatchDemo={onWatchDemo} location="face" />
        </>
      )}
      {face.kind === "queue" && (
        <span className="cube-queue-readout">R&D // RESERVED</span>
      )}
      {face.kind === "worldline" && (
        <button
          type="button"
          className="cube-divergence-meter cube-meter-compact"
          aria-label={`Confirm Worldline ${WORLDLINE}`}
          onClick={onWorldline}
          disabled={pending}
        >
          <span className="nixie-digits">{WORLDLINE}</span>
        </button>
      )}
      {face.kind === "network" &&
        CUBE_NETWORK_LINKS.map((link) => (
          <ExternalLink key={link.href} href={link.href}>
            {link.label}
          </ExternalLink>
        ))}
    </div>
  );
}

/** The selected face's full content stays legible at mobile and zoomed widths. */
export function CubeFaceDetails({
  face,
  onWorldline,
  onWatchDemo,
  pending,
}: FaceContentProps) {
  if (face.content) return <>{face.content}</>;
  return (
    <>
      <div className="cube-detail-heading">
        <span className="cube-eyebrow">{face.eyebrow}</span>
        <h3>{getCubeFaceTitle(face)}</h3>
      </div>
      {face.kind === "lab" && face.project && (
        <>
          <p className="cube-detail-summary">{face.project.summary}</p>
          <ul
            className="cube-lab-tags"
            aria-label={`${face.project.title} technologies`}
          >
            {face.project.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
          <div className="cube-detail-actions">
            <ExternalLink href={face.project.liveUrl}>Live Demo ↗</ExternalLink>
            <WatchDemo
              face={face}
              onWatchDemo={onWatchDemo}
              location="detail"
            />
          </div>
        </>
      )}
      {face.kind === "queue" && (
        <p className="cube-detail-summary">
          Reserved for upcoming AI, AppSec, and game prototypes
        </p>
      )}
      {face.kind === "worldline" && (
        <>
          <button
            type="button"
            className="cube-divergence-meter"
            aria-label={`Confirm Worldline ${WORLDLINE}`}
            onClick={onWorldline}
            disabled={pending}
          >
            <span className="nixie-digits">{WORLDLINE}</span>
            <span className="cube-meter-caption">
              CONFIRM WORLDLINE // OPEN CLI
            </span>
          </button>
          <p className="cube-detail-summary">
            Steins Gate // Future Gadget Lab
          </p>
        </>
      )}
      {face.kind === "network" && (
        <div className="cube-detail-actions">
          {CUBE_NETWORK_LINKS.map((link) => (
            <ExternalLink key={link.href} href={link.href}>
              {link.label}
            </ExternalLink>
          ))}
        </div>
      )}
    </>
  );
}
