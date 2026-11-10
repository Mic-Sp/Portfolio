# Michael Anthony Sprague — systems portfolio

A spatial developer portfolio with an obsidian telemetry HUD, a typed project registry, a spring-driven 3D project deck, and a responsive filtered grid. Built with Next.js App Router, TypeScript, Tailwind CSS, Space Grotesk, and JetBrains Mono.

## Local development

Use Node.js 22.18+ (Node.js 24 recommended) and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Google fonts are fetched at build time through `next/font/google` and self-hosted by Next.js.

```sh
npm run build       # production build and TypeScript validation
npm run start       # serve the production build
npm run lint        # ESLint, with zero warnings allowed
npm run typecheck   # standalone TypeScript validation
npm test            # registry, circular positioning, and swipe regression checks
npm run format     # format source and configuration
npm run format:check
```

## Add a project or pillar

Add one `ProjectNode` to `src/data/projects.registry.ts`. Give it a unique slug `id`, an `order`, a pillar name and compact label, and one of the six accents: `cyan`, `emerald`, `violet`, `amber`, `rose`, or `blue`.

Cards, architecture schematics, technology tags, counters, pillar navigation, selection, and circular deck navigation derive from the registry. A project using a new `pillar` string creates a new quick-jump pill automatically; projects sharing a pillar share its filter. Keep `pillarShort` consistent for projects in the same pillar. The first project in registry order supplies that pillar's accent.

`getActiveProjects()` returns a sorted copy excluding `ARCHIVED` projects. `featured` is metadata for future layouts and does not hide active nodes. `getProjectById()` searches the complete registry, including archived projects, for future `inspect <id>` commands. Optional links render when present; `"#"` is shown as unavailable until a real URL is supplied.

## Module boundaries

- `src/types/portfolio.ts`: shared project and pillar contracts.
- `src/data/projects.registry.ts`: project content and registry selectors.
- `src/data/profile.config.ts`: identity, credentials, location, system status, and Chicago time zone.
- `src/lib/theme-utils.ts`: reusable accent classes and class merging.
- `src/lib/spatial-math.ts`: pure circular offsets, responsive transform tiers, and directional swipe thresholds.
- `src/context/HudContext.tsx`: project selection, pillar filter, view mode, console state, and future `godMode` state. Accepts a project list for isolated previews and testing.
- `src/hooks/useHudKeyboard.ts`: global shortcuts and editable-field guards, with listener cleanup.
- `src/hooks/useDeckViewport.ts`: hydration-safe narrow-screen detection for the deck.
- `src/components/hud/`: persistent frame, hydration-safe clock, and console banner placeholder.
- `src/components/portfolio/`: server-rendered identity header.
- `src/components/projects/`: `ProjectShowcase` switches views with `AnimatePresence`; `SpatialProjectDeck` and `ProjectGridPreview` share the same `ProjectCard` and data-driven schematic. Deck styles live in `spatial-deck.css`.

The root layout owns the provider and persistent frame so they can survive future App Router navigation. The current page composes the identity header, console placeholder, and project showcase.

## Controls and selection

- **Left / Right** cycles all active nodes in spatial mode. Selection wraps modulo the registry length; empty and single-node lists are safe.
- **Pillar pills** select the first matching node in spatial mode. In grid mode they filter all nodes in that pillar. **ALL** clears the filter.
- **3D DECK / GRID** changes view mode with a short crossfade. Inline view buttons provide the same control. Selection persists; returning to the grid clears a previous pillar filter if it would hide the selected project.
- **Drag/swipe left or right**, the **PREV / NEXT** chevrons, or the **node radar** select a node in the spatial deck. A deliberate swipe advances one node; vertical touch scrolling stays available. The radar scrolls horizontally as the registry grows.
- **Background cards** rotate into focus when clicked. Only the center card exposes external links. Dragging suppresses accidental clicks; dragging an active link does not start a deck gesture.
- **Backtick / tilde** or **CLI (~)** toggles the console banner. An open console suspends deck keyboard navigation.
- Shortcuts ignore editable controls, repeated/composing events, and Ctrl/Alt/Meta combinations. The console close shortcut remains available in an editable field while the console is open.
- A crosshair button selects a card directly. Selection always references the full sorted registry, preserving node identity when the grid is filtered.

The clock renders a stable server placeholder and subscribes after hydration. Chicago time automatically displays CST or CDT alongside UTC. Reduced-motion preferences disable decorative animation, 3D positioning, and drag physics. The deck becomes a flat single-project focus view with keyboard, chevron, and radar navigation. Media-dependent transforms start flat on the server and update after hydration. The HUD includes visible focus states, pressed-state controls, a skip link, and horizontally scrollable pillar navigation.

## Spatial positioning

Circular offsets use the shortest signed distance from the selected index. Even-sized rings consistently assign the opposite node `+N/2`; for four nodes, this places the antinode directly behind the center. Immediate wings angle inward at ±28° and retreat 150px. Back-plane nodes retreat 290px; nodes beyond two steps retreat 380px and become noninteractive. The transforms use a spring with stiffness 260, damping 28, and mass 0.9. Narrow viewports below 640px tighten the horizontal offsets.

The grid stage derives its height from the tallest registered card, keeping descriptions and variable technology stacks accessible without project-specific dimensions. Empty and single-node registries are safe. Tests exercise ring lengths 0, 1, 2, 4, 5, and 6, wrapped indices, transform tiers, reduced motion, and horizontal gesture intent.

## Phase 3

`TerminalPlaceholder` remains the Phase 1 banner. Phase 3 can replace it with the Quake-style console, using project IDs, `cliMeta`, `isTerminalOpen`, and `godMode`.
