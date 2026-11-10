export type DossierSection =
  "overview" | "credentials" | "stack" | "contact" | "transmission" | "thm";
export type DossierTarget = "top" | "transmission" | "thm";

export function getDossierAnchor(section: DossierSection) {
  return section === "transmission" ? "contact" : section;
}

/** Run after the drawer settles; never let deep-link scrolling move the page. */
export function activateDossierSection(
  container: HTMLElement,
  section: DossierSection,
  {
    isSettled,
    isPresent,
    reducedMotion,
  }: {
    isSettled: boolean;
    isPresent: boolean;
    reducedMotion: boolean;
  },
): (() => void) | undefined {
  if (!isSettled || !isPresent) return;
  const anchorId = getDossierAnchor(section);
  const anchor = container.querySelector<HTMLElement>(
    `[data-dossier-anchor="${anchorId}"]`,
  );
  if (!anchor) return;
  const transmission = anchorId === "contact";
  const bounds = anchor.getBoundingClientRect();
  // Center when the entire form fits; keep its first field visible on short screens.
  const inset = transmission
    ? Math.max(0, (container.clientHeight - bounds.height) / 2)
    : 16;
  const top =
    container.scrollTop +
    bounds.top -
    container.getBoundingClientRect().top -
    inset;
  container.scrollTo({
    top: Math.max(
      0,
      Math.min(top, container.scrollHeight - container.clientHeight),
    ),
    behavior: reducedMotion ? "instant" : "smooth",
  });
  const stopScroll = () =>
    container.scrollTo({ top: container.scrollTop, behavior: "instant" });
  if (!transmission) return stopScroll;
  anchor
    .querySelector<HTMLInputElement>('[name="senderName"]')
    ?.focus({ preventScroll: true });
  if (reducedMotion) return stopScroll;
  anchor.setAttribute("data-dossier-highlight", "true");
  const clearHighlight = () => anchor.removeAttribute("data-dossier-highlight");
  const onAnimationEnd = (event: AnimationEvent) => {
    if (
      event.target === anchor &&
      event.animationName === "transmission-target-pulse"
    )
      clearHighlight();
  };
  anchor.addEventListener("animationend", onAnimationEnd);
  return () => {
    stopScroll();
    anchor.removeEventListener("animationend", onAnimationEnd);
    clearHighlight();
  };
}
