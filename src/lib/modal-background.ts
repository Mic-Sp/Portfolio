/** Mirror a native modal's inert background for assistive technology, through exit. */
export function hideModalBackground(panel: HTMLDialogElement) {
  const previous = new Map<
    Element,
    { hidden: string | null; inert: string | null }
  >();
  let branch: Element = panel;
  while (branch.parentElement) {
    for (const sibling of branch.parentElement.children) {
      if (sibling === branch || /^(SCRIPT|STYLE|LINK)$/.test(sibling.tagName))
        continue;
      previous.set(sibling, {
        hidden: sibling.getAttribute("aria-hidden"),
        inert: sibling.getAttribute("inert"),
      });
      sibling.setAttribute("inert", "");
      sibling.setAttribute("aria-hidden", "true");
    }
    branch = branch.parentElement;
    if (branch === document.body) break;
  }
  return () => {
    for (const [element, value] of previous) {
      for (const [attribute, original] of [
        ["aria-hidden", value.hidden],
        ["inert", value.inert],
      ] as const) {
        if (original === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, original);
      }
    }
  };
}
