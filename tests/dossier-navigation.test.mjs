import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activateDossierSection,
  getDossierAnchor,
} from "../src/lib/dossier-navigation.ts";

const ready = { isSettled: true, isPresent: true, reducedMotion: false };
function fixture({ height = 600, viewport = 700, scrollHeight = 3000 } = {}) {
  const events = [],
    attributes = new Map(),
    listeners = new Map();
  const input = { focus: (options) => events.push({ focus: options }) };
  const anchor = {
    getBoundingClientRect: () => ({ top: 1200, height }),
    querySelector: (selector) => {
      assert.equal(selector, '[name="senderName"]');
      return input;
    },
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: (key) => attributes.delete(key),
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
  };
  const container = {
    scrollTop: 20,
    clientHeight: viewport,
    scrollHeight,
    getBoundingClientRect: () => ({ top: 100 }),
    querySelector: (selector) => {
      events.push({ selector });
      return anchor;
    },
    scrollTo: (options) => events.push({ scroll: options }),
  };
  return { container, anchor, attributes, listeners, events };
}

test("transmission and legacy CLI contact targets share the form; THM targets its own panel", () => {
  assert.equal(getDossierAnchor("transmission"), "contact");
  assert.equal(getDossierAnchor("contact"), "contact");
  for (const section of ["overview", "credentials", "stack", "thm"])
    assert.equal(getDossierAnchor(section), section);
});

test("deep links cannot scroll or steal focus while the drawer is entering or exiting", () => {
  for (const flags of [
    { ...ready, isSettled: false },
    { ...ready, isPresent: false },
  ]) {
    const { container, events } = fixture();
    assert.equal(
      activateDossierSection(container, "transmission", flags),
      undefined,
    );
    assert.deepEqual(events, []);
  }
});

test("settled transmission centers in the drawer, focuses Name without scrolling ancestors, and pulses", () => {
  const { container, anchor, events, attributes, listeners } = fixture();
  const cleanup = activateDossierSection(container, "transmission", ready);
  assert.deepEqual(events, [
    { selector: '[data-dossier-anchor="contact"]' },
    { scroll: { top: 1070, behavior: "smooth" } },
    { focus: { preventScroll: true } },
  ]);
  assert.equal(attributes.get("data-dossier-highlight"), "true");
  listeners.get("animationend")({
    target: anchor,
    animationName: "transmission-target-pulse",
  });
  assert.equal(attributes.has("data-dossier-highlight"), false);
  cleanup();
  assert.equal(listeners.size, 0);
  assert.deepEqual(events.at(-1), { scroll: { top: 20, behavior: "instant" } });
});

test("short viewports align the form's top so Name remains visible; scroll targets stay in bounds", () => {
  const tall = fixture({ height: 1000, viewport: 600 });
  const cleanup = activateDossierSection(tall.container, "contact", ready);
  assert.deepEqual(tall.events[1], {
    scroll: { top: 1120, behavior: "smooth" },
  });
  cleanup();
  const small = fixture({ scrollHeight: 800 });
  const clear = activateDossierSection(small.container, "transmission", ready);
  assert.equal(small.events[1].scroll.top, 100);
  clear();
});

test("reduced motion retains the focused deep link with instant scrolling and no decorative pulse", () => {
  const { container, events, attributes, listeners } = fixture();
  const cleanup = activateDossierSection(container, "transmission", {
    ...ready,
    reducedMotion: true,
  });
  assert.equal(events[1].scroll.behavior, "instant");
  assert.deepEqual(events[2], { focus: { preventScroll: true } });
  assert.equal(attributes.size, 0);
  assert.equal(listeners.size, 0);
  cleanup();
});

test("non-form targets scroll without focusing an unrelated input; unavailable targets are safe", () => {
  for (const section of ["overview", "credentials", "stack", "thm"]) {
    const { container, events, attributes } = fixture();
    const cleanup = activateDossierSection(container, section, ready);
    assert.equal(
      events.some((event) => event.focus),
      false,
    );
    assert.equal(attributes.size, 0);
    cleanup();
  }
  assert.equal(
    activateDossierSection(
      { querySelector: () => null },
      "transmission",
      ready,
    ),
    undefined,
  );
});
