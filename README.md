# Michael Anthony Sprague — systems portfolio

A spatial developer portfolio with an obsidian telemetry HUD, a typed project registry, a spring-driven 3D project deck, a responsive filtered grid, and a Quake-style command console. Built with Next.js App Router, TypeScript, Tailwind CSS, Space Grotesk, and JetBrains Mono.

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
npm test            # registry, spatial math, crypto, and CLI regression checks
npm run format     # format source and configuration
npm run format:check
```

## Direct message uplink

The Dossier's **Direct Transmission** form and console `msg <return_email> <message...>` command (aliases: `transmit`, `send`) share `ContactSchema` and `POST /api/contact`. Run `msg` for clickable console/form shortcuts. Messages and return addresses are excluded from console history and command echoes; drafts are not saved to browser storage.

The header, Hero, and conversion footer's **Get in Touch** buttons open the same drawer directly to the form. `openDossierToSection("transmission")` waits for the slide to settle before scrolling, focusing Name, and briefly highlighting the form. `"top"` and `"thm"` target the overview and live badge. Reduced motion uses instant scrolling without the decorative pulse. Scroll and focus stay inside the drawer. The header's **Resume (PDF)** link serves `public/resume.pdf`; replace that file when updating the resume. Client Services remains available in the conversion footer.

Set `SITE_URL` to override the portfolio's public origin (including `https://`) for absolute Open Graph and Twitter preview URLs. If unset, metadata uses `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`, then `https://portfolio-dusky-ten-97.vercel.app/`. Both social previews use the existing `src/app/opengraph-image.png` asset.

With Playwright available and a local server running, `node tests/browser/dossier-message.mjs` checks the actual Hero/CLI triggers, focus timing, drawer motion, responsive layout, and reduced motion. Set `PORTFOLIO_BASE_URL` for a different server URL, or `PLAYWRIGHT_MODULE` to the entry file of an external Playwright installation.

Copy `.env.example` to `.env.local` for development, or set its variables in Vercel project settings and redeploy:

- `RESEND_API_KEY`: server-only Resend API key with sending access. Never use a `NEXT_PUBLIC_` variable.
- `CONTACT_FROM_EMAIL`: sender on a [verified Resend domain](https://resend.com/docs/send-with-nextjs). The default `Portfolio Uplink <onboarding@resend.dev>` is for Resend's restricted test-sender flow; configure a verified sender for production.
- `CONTACT_TO_EMAIL`: fixed server-controlled destination, default `mic.sprague@gmail.com`. Visitors cannot override the recipient or sender.

Without a key the route returns a clean `503 RELAY_UNAVAILABLE`; the site still builds. A successful submission means Resend accepted the message for delivery, rather than proving inbox delivery. The provider request times out after ten seconds. Private payloads and provider errors are never logged, and the client never automatically retries a submission with an uncertain outcome.

The route limits both advertised and actual bodies to 16 KB, rejects unknown fields, returns structured validation errors, strips script/control text and escapes all email HTML, and silently drops valid honeypot submissions. It allows three attempts per client IP in a sliding ten-minute window and returns `Retry-After` on `429`. Trust `x-forwarded-for` only behind Vercel or a proxy that overwrites client-supplied forwarding headers. The bounded in-memory limiter is **per running instance** and resets on cold starts; add a shared limiter or Vercel WAF rule if deployment-wide enforcement is needed. No distributed guarantee is implied.

`npm test` exercises schema boundaries, honeypot handling, byte limits, IP windows, mocked provider success/failure, client requests, and CLI privacy/progress without sending live emails.

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
- `src/components/hud/`: persistent frame, hydration-safe clock, `DropDownTerminal`, and structured terminal output. `terminal.css` owns the console and GodMode styling.
- `src/lib/cli-commands.ts`: parser, extensible command definitions, completion, safe links, and secret redaction.
- `src/lib/crypto-auditor.ts`: pure entropy calculations and a native Web Crypto HIBP range client.
- `src/components/portfolio/`: server-rendered identity header.
- `src/components/projects/`: `ProjectShowcase` switches views with `AnimatePresence`; `SpatialProjectDeck` and `ProjectGridPreview` share the same `ProjectCard` and data-driven schematic. Deck styles live in `spatial-deck.css`.

The root layout owns the provider and persistent frame so they can survive future App Router navigation. The current page composes the identity header, console placeholder, and project showcase.

## Controls and selection

- **Left / Right** cycles all active nodes in spatial mode. Selection wraps modulo the registry length; empty and single-node lists are safe.
- **Pillar pills** select the first matching node in spatial mode. In grid mode they filter all nodes in that pillar. **ALL** clears the filter.
- **3D DECK / GRID** changes view mode with a short crossfade. Inline view buttons provide the same control. Selection persists; returning to the grid clears a previous pillar filter if it would hide the selected project.
- **Drag/swipe left or right**, the **PREV / NEXT** chevrons, or the **node radar** select a node in the spatial deck. A deliberate swipe advances one node; vertical touch scrolling stays available. The radar scrolls horizontally as the registry grows.
- **Background cards** rotate into focus when clicked. Only the center card exposes external links. Dragging suppresses accidental clicks; dragging an active link does not start a deck gesture.
- **Backtick / tilde** or **CLI (~)** toggles the drop-down console. **Escape**, `exit`, or `close` closes it and restores the previous focus. An open console suspends deck keyboard navigation.
- Shortcuts ignore editable controls, repeated/composing events, and Ctrl/Alt/Meta combinations. The console close shortcut remains available in an editable field while the console is open.
- A crosshair button selects a card directly. Selection always references the full sorted registry, preserving node identity when the grid is filtered.

The clock renders a stable server placeholder and subscribes after hydration. Chicago time automatically displays CST or CDT alongside UTC. Reduced-motion preferences disable decorative animation, 3D positioning, and drag physics. The deck becomes a flat single-project focus view with keyboard, chevron, and radar navigation. Media-dependent transforms start flat on the server and update after hydration. The HUD includes visible focus states, pressed-state controls, a skip link, and horizontally scrollable pillar navigation.

## Spatial positioning

Circular offsets use the shortest signed distance from the selected index. Even-sized rings consistently assign the opposite node `+N/2`; for four nodes, this places the antinode directly behind the center. Immediate wings angle inward at ±28° and retreat 150px. Back-plane nodes retreat 290px; nodes beyond two steps retreat 380px and become noninteractive. The transforms use a spring with stiffness 260, damping 28, and mass 0.9. Narrow viewports below 640px tighten the horizontal offsets.

The grid stage derives its height from the tallest registered card, keeping descriptions and variable technology stacks accessible without project-specific dimensions. Empty and single-node registries are safe. Tests exercise ring lengths 0, 1, 2, 4, 5, and 6, wrapped indices, transform tiers, reduced motion, and horizontal gesture intent.

## Developer console

The console mounts once in `TelemetryFrame` and keeps bounded, memory-only scrollback and command history across opens. The drawer opens below the measured HUD bar, resizes vertically within viewport bounds, and respects reduced motion. Use Up/Down for history, Tab for command/project completion, or the quick-command chips. `clear` erases scrollback and recall history and cancels any pending query. Closing cancels outstanding work and discards the input draft.

`CLI_COMMANDS` is the command registry. Add a definition with a name, optional aliases, syntax, description, and execution function; help and command-name completion update automatically. The executor accepts HUD callbacks and optional registry/project lists for isolated tests. Project commands derive their nodes from the registry, so adding nodes requires no CLI changes. Project numbers are one-based and follow active registry order. `inspect` includes archives; `select` only targets active nodes. `open <id> [live | repo | docs]` opens a supplied URL and also prints a clickable fallback.

Commands: `help`, `projects` / `ls [--pillar <name>]`, `inspect` / `cat <id>`, `select <id | number>`, `open`, `view <spatial | grid>`, `stack`, `whois`, `entropy [--redact] <string>`, `pwnd <password>`, `iddqd` / `godmode`, `clear`, and `exit` / `close`. Quote values containing spaces. Use `--` before a literal value of `--redact`.

`iddqd` toggles the shared GodMode state, the amber HUD frame and status badge, and the active deck card, horizon, and radar accents. Turning it off restores the project theme.

## Crypto telemetry and privacy

Entropy uses observed Unicode code-point frequencies: `H = -Σ pᵢ log₂(pᵢ)`, with total empirical bits `H × length`. The character-pool model is a separate estimate based on detected ASCII classes and observed Unicode/whitespace diversity. Ratings and crack-time tiers are illustrative; the console explicitly states the uniform-search assumption of 10¹⁰ guesses per second. Frequency entropy does not model dictionary attacks, patterns, or real password guessability.

Both `pwnd` and `entropy` redact their command echoes and are excluded from command recall, including quoted command names and malformed quoted secret arguments. This also covers `entropy --redact`. Results contain counts and aggregate telemetry, never the input. Nothing is saved to local/session storage, sent to analytics, or put in the URL.

`pwnd` computes an uppercase SHA-1 digest with native `TextEncoder` and `crypto.subtle.digest`. Only the first five hex characters are requested directly from the [HIBP range API](https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange); no application server or proxy receives the input. The remaining 35 hash characters are compared locally and fully masked in the output. Requests use `Add-Padding: true`, omit credentials/referrers, avoid caching, and have a five-second timeout covering both fetch and body reading. Cancellation and network, HTTP, malformed-response, or Web Crypto errors resolve through an offline boundary. Offline breach count and status are `null` / **UNKNOWN**, distinct from a successful zero-match result. SHA-1 is used only for HIBP compatibility.

Tests use deterministic mocked range responses rather than transmitting test secrets to a live service. They cover known SHA-1 vectors, padding, match/no-match, offline/error/timeout/cancellation behavior, entropy and Unicode edge cases, parser escaping, redaction, new registry nodes, and GodMode toggling. Browser checks exercise the drawer, command synchronization, history, focus restoration, mobile layouts, and intercepted prefix-only requests.

## Readability scale

Readable labels use a 12px minimum. Desktop HUD controls, project badges, schematic steps, technology pills, and card actions use 14px; card descriptions and terminal output use 16px. The terminal input uses 18px, with a 16px mobile input to avoid browser zoom. Secondary text rests at slate-300 or brighter.

The main shell spans up to 1440px, with 620px spatial cards and 32px desktop card padding. On mobile, cards retain 24px padding and readable labels; the schematic's decorative bus is hidden to give its text room to wrap. The existing ring offsets and spring physics are preserved, with exposed wing surfaces verified at desktop and mobile widths.

The console starts at 62dvh, with a 440px minimum and 720px maximum, each bounded by the available viewport below the measured HUD. Its 1360px shell provides 1280px of desktop content space. Tables scroll inside the console, while prose wraps. HUD rows and controls wrap or scroll within their own containers instead of shrinking their text. Browser calibration covers 1440×1080, 1920×1080, and 390×844 at normal zoom.

## Compact first viewport

The hero omits the pre-header and bottom ribbons. Desktop identity uses a single-line 48px name, a 20px role, 16px credentials, and a 128px reticle without caption rows. Mobile retains a 36px name, 18px role, and 14px credentials. The HUD keeps its calibrated font sizes with tighter vertical padding.

`ProjectShowcaseToolbar` shares the heading, mode detail, count, and view toggle between spatial and grid modes. Desktop places them in one 61px toolbar; narrower screens wrap the same content without reducing the 12px label minimum. The active card begins 14px below that toolbar, including its bottom margin.

With fonts loaded at 100% zoom and `scrollY === 0`, the active card starts at approximately y=327px on both 1440×900 and 1920×1080. At 1440×900, 59% of the card and its full architecture schematic are visible above the fixed footer. The 620px card width, card typography, deck physics, and console controls remain unchanged.

## Kinetic orbital telemetry

`OrbitalTelemetryCore` is a decorative client island beside the server-rendered identity text. Its 128×128px SVG contains clockwise orbital arcs and leading dots (14 seconds per revolution), a counter-rotating dashed radar ring (22 seconds), a pulsing center dot, and breathing corner brackets. The center cube projects eight 3D vertices connected by twelve edges; its geometry lives in the pure `src/lib/orbital-math.ts` module.

Project accents come from the shared theme tokens. HUD selection changes trigger a short, decaying velocity impulse and inward bracket lock; hover gently accelerates the cube and brightens the crosshair. GodMode overrides the color with golden amber. Rotation phase is retained during selection and hover changes.

The frame loop updates SVG attributes without React state updates per frame. It pauses when the core is outside the viewport, hidden by responsive layout, or the document is hidden, and cleans up its observer, visibility listener, and animation frame on unmount. `useReducedMotion()` is paired with a live media subscription because the installed Motion hook retains its initial setting. Reduced motion restores a static geometric frame while keeping accent synchronization. The first server and hydration renders are static and deterministic.

Tests cover cube topology, perspective projection bounds and full-turn periodicity, and impulse decay. Browser verification measures ring rates, projected cube movement, hover acceleration, selection impulses, all active accents, GodMode, initial/live reduced-motion changes, offscreen pause/resume, and the unchanged above-the-fold layout.
