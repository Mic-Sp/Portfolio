# Michael Anthony Sprague — systems portfolio

Phase 1 of a spatial developer portfolio: an obsidian telemetry HUD, a typed project registry, shared deck state, and a responsive project preview. Built with Next.js App Router, TypeScript, Tailwind CSS, Space Grotesk, and JetBrains Mono.

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
npm test            # registry and extensibility regression checks
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
- `src/context/HudContext.tsx`: project selection, pillar filter, view mode, console state, and future `godMode` state. Accepts a project list for isolated previews and testing.
- `src/hooks/useHudKeyboard.ts`: global shortcuts and editable-field guards, with listener cleanup.
- `src/components/hud/`: persistent frame, hydration-safe clock, and console banner placeholder.
- `src/components/portfolio/`: server-rendered identity header.
- `src/components/projects/`: reusable grid, project card, and data-driven architecture schematic.

The root layout owns the provider and persistent frame so they can survive future App Router navigation. The current page composes the identity header and preview.

## Controls and selection

- **Left / Right** cycles all active nodes in spatial mode. Selection wraps modulo the registry length; empty and single-node lists are safe.
- **Pillar pills** select the first matching node in spatial mode. In grid mode they filter all nodes in that pillar. **ALL** clears the filter.
- **3D DECK / GRID** changes view mode. Both use the grid preview in Phase 1.
- **Backtick / tilde** or **CLI (~)** toggles the console banner. An open console suspends deck keyboard navigation.
- Shortcuts ignore editable controls, repeated/composing events, and Ctrl/Alt/Meta combinations. The console close shortcut remains available in an editable field while the console is open.
- A crosshair button selects a card directly. Selection always references the full sorted registry, preserving node identity when the grid is filtered.

The clock renders a stable server placeholder and subscribes after hydration. Chicago time automatically displays CST or CDT alongside UTC. Reduced-motion preferences disable decorative animation. The HUD includes visible focus states, pressed-state controls, a skip link, and horizontally scrollable pillar navigation.

## Next phases

Phase 2 can consume the existing HUD state to replace the spatial grid with a perspective carousel and physics. Phase 3 can replace `TerminalPlaceholder` with the Quake-style console, using project IDs, `cliMeta`, `isTerminalOpen`, and `godMode`. Neither carousel physics nor a terminal drawer is implemented in Phase 1.
