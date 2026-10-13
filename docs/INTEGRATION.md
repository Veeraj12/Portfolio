# Veeraj's World — Integration Layer

This document is the "how it all fits together" reference for the assembled
repository. It's written for the next person (human or agent) who touches
this code, per `MASTER_CONTEXT.md`'s requirement that every module explain
where the next one connects.

## 1. What was assembled

Seven module deliverables were vendored into this repo, unmodified in spirit
(same public API, same behavior) but with the integration-boundary patches
listed in §3:

| # | Module | Vendored at | Owns |
|---|--------|-------------|------|
| 01 | Teddy | `modules/teddy/` | The character — expressions, actions, blinking, the imperative `.play()` API |
| 02 | World | `modules/world/` | The opening cinematic, WELCOME/HELLO typography, camera, lighting, the Teddy slot |
| 03 | Bricks | `modules/bricks/` | Destination brick rendering, hover/select interaction, the "patience" no-selection timer |
| 04 | Board | `modules/board/` | The project board, the card → paper expansion, the close control |
| 05 | Exit | `modules/exit/` | The adventure timer and the exit/goodbye state machine |
| 06 | Professional Portfolio | repo root (`app/`, `components/`, `data/`) | The existing recruiter-facing site |
| 07 | Portal | `modules/portal/` | The portal visual, the entry trigger, the loading screen |

Every module's own README is preserved at `docs/modules/0N-*.md` and each
module still works and can be demoed in isolation exactly as documented
there — nothing about their public API was removed, only *added to* where
noted below.

**Not supplied with the bundle:** `ADVENTURE_CONTRACT.md`, referenced by
`FINAL_MASTER_INTEGRATION_PROMPT.md` as the canonical event-name contract.
`components/adventure/events.ts` reconstructs the event names from
`FINAL_MASTER_INTEGRATION_PROMPT.md` §33 (plus `NO_SELECTION_TIMEOUT` from
§34) and defines their payload shapes itself — it is the closest thing this
repo has to that contract now. If `ADVENTURE_CONTRACT.md` turns up later,
diff it against `events.ts` first.

## 2. The integration layer (`components/adventure/`)

This is the only code that imports more than one module. It exists because
the brief requires the modules to stay decoupled ("do not tightly couple
Teddy / World / Bricks / Board / project data / exit system / portal
system") — so something has to own the coupling, and it has to be a single,
inspectable place rather than scattered across module internals.

```
components/adventure/
  events.ts            The typed event bus + AdventureEventMap (the contract)
  teddy.ts              Pose/directive types shared between controller and TeddyActor
  config.ts              Data-driven config: destination copy, timings, brick layout
                          math, Teddy pose → world-position resolution
  controller.ts           AdventureController — plain TS state machine, no React/three.
                          Owns *when* things happen and what Teddy should do.
  Adventure.tsx            Top-level orchestrator. Wires the controller to React state,
                          the DOM board/dialogue/portal layers, and the 3D scene.
  AdventureScene.tsx        The 3D composition: World + bricks + Teddy in ONE <Canvas>.
  TeddyActor.tsx             Teddy inside the World's canvas — tweens between poses,
                          forwards expression/action to <TeddyMesh>.
  adapters/
    boardContent.ts          data/projects.ts + data/architecture.ts -> AdventureProject[]
    techIcons.ts               data/tech-icons.tsx -> TechnologyIconResolver
  hooks/                    useAdventure, useWebGLSupport, useReducedMotionFlag,
                          usePointerKind
  ui/                       DialogueBubble, TransitionBloom, ExitPortalLayer, ArrivalFade
```

### Why a controller class instead of one big component

`AdventureController` (in `controller.ts`) is plain TypeScript — no React,
no `three`. It owns the adventure's phase state machine end to end:

```
loading -> intro -> selection -> destination -> board <-> paper
        -> exit -> portal -> complete   (portal -> selection on restart)
```

It listens to the `AdventureEventBus` for module callbacks (translated into
bus events by the React layer — see below), decides what should happen next,
and emits a `TeddyDirective` (expression / held action / one-shot burst /
pose) that `TeddyActor` renders. It also owns one `AdventureTimer` +
`ExitController` instance per session (module 05's own primitives, used
directly rather than through its React hook, since this is not a React
context) so the entry timestamp is never reset by re-renders.

Keeping this logic outside React makes the "when does Teddy react and what
does he say" behavior unit-testable without a DOM or a WebGL context
(`Scheduler`/`now` are both injectable), and keeps `Adventure.tsx` itself
from becoming the 500-line God component that state machines like this tend
to produce.

### The event bus is the only thing that crosses module boundaries

No module imports another module. `Adventure.tsx` and `AdventureScene.tsx`
translate each module's own callback props (`onDestinationHover`,
`onProjectSelect`, `onCloseIntent`, `onPortalReaction`, ...) into
`bus.emit(...)` calls; `AdventureController` is the only thing that
`bus.on(...)` subscribes. Swapping any one module's implementation should
only ever require touching its adapter code in `Adventure.tsx` /
`AdventureScene.tsx` / `controller.ts` — never another module.

## 3. Per-module integration patches

Each module's own README documents its original public API in full. These
are the additive changes made to fit them together (all backward
compatible — nothing existing was removed or renamed):

**World (`modules/world/`)**
- `layout.ts` is new: the positions that used to be private constants inside
  `OpeningScene.tsx` (`WELCOME_POSITION`, `HELLO_POSITION`, `TEDDY_POSITION`,
  `HELLO_VIEW_POSITION`, `WORLD_CAMERA_FOV`, ...) are now exported, unchanged
  in value, so `components/adventure/config.ts` can place bricks and Teddy
  poses against the *real* coordinates instead of re-guessing them.
- `<World>` and `<OpeningScene>` gained two optional props: `fontUrl` (so the
  WELCOME/HELLO typeface can be self-hosted instead of loaded from
  threejs.org at runtime — see §5) and `paused` (stops the render loop via
  `frameloop="never"` while the board fully covers the canvas, so we're not
  burning GPU behind an opaque overlay).

**Bricks (`modules/bricks/`)**
- `DestinationBrickField` is new: everything `<DestinationBrickWorld>` used
  to render *inside its own `<Canvas>`* (bricks, particle intro,
  hover/select wiring), extracted so it can be mounted inside the World's
  existing canvas instead of opening a second WebGL context and eyeballing
  the screen-space alignment between two independently-rendered scenes.
  `<DestinationBrickWorld>` itself is unchanged in behavior — it now
  composes `<DestinationBrickField>` internally — so it's still fully usable
  standalone exactly as its README describes.
- `DestinationBrick` gained an optional `hitAreaScale` prop, multiplying its
  accessible hit-area's `distanceFactor`, since the integration layer scales
  the whole brick group responsively (see `computeBrickLayout` below) and
  the invisible hit target needs to track that.
- Fixed: `DestinationBrickWorld`'s selection callback used to forward `null`
  to `onDestinationSelect` on reset; it only forwards real selections now.

**Board (`modules/board/`)**
- `AdventureProject` gained two optional fields: `technologyNote` (shown in
  place of the tech chip row when a project's stack couldn't be verified —
  used by `data/projects.ts`'s existing `unverifiedNote` field) and
  `sections` (ordered heading/body/list blocks rendered after
  Problem/Solution — used to present architecture case studies, which have
  more structure than a project: existing architecture, bottlenecks,
  improved architecture, reasoning, trade-offs, final design).
- `resolveTechnologyIcon` is new on `<AdventureBoard>` / `<TechnologyList>`:
  lets the integrator supply the *same* tech icons the professional
  portfolio already uses (`data/tech-icons.tsx`), checked before the
  module's own small built-in icon map, so both modes show identical marks
  instead of two different icon sets for the same technology.
- `emptyMessage` is new: per-destination empty-state copy (Board's own
  default stays as the fallback).
- The card ↔ paper transition now shares a Framer Motion `layoutId`
  (`AdventureProjectCard` / `ProjectPaper`), so opening a project is
  card-expands-into-paper, matching brief §23 ("expands/transforms the card
  into a paper/document-style detailed view") rather than a fade.

**Exit (`modules/exit/`)** — used as-is, no patches. `AdventureTimer` and
`ExitController` are instantiated directly inside `AdventureController`
(not through the module's `useAdventureExit` hook, since the controller
isn't a React component).

**Portal (`modules/portal/`)** — used as-is, no patches. `PortalTrigger` is
the exit portal (brief §31-32); `AdventureLoader` is the loading screen
shown until the World's canvas has mounted and painted its first frames.

**Teddy (`modules/teddy/`)** — used as-is, no patches. `<TeddyMesh>` (the
canvas-free 3D content) is used inside the World's canvas via `TeddyActor`;
the small DOM-wrapped `<Teddy>` (owns its own tiny canvas) is used for the
board header's mini Teddy, where a second cheap canvas is fine since it's a
fully separate, small widget.

## 4. Data: nothing invented

Per the brief's "DO NOT INVENT" section, `components/adventure/adapters/boardContent.ts`
maps the portfolio's *existing* `data/projects.ts` and `data/architecture.ts`
into the Board's shape and nothing else:

- `projects` destination -> every project in `data/projects.ts`
- `ai-ml` destination -> `data/projects.ts`'s existing `aiMlProjects` filter
- `architecture` destination -> `data/architecture.ts`'s case studies, laid
  out as problem / existing architecture / bottlenecks / improved
  architecture / reasoning / trade-offs / final design (brief §24)
- `motion` destination -> **no data source**. There is no motion work in the
  repository's data files, so this destination resolves to the board's
  empty state rather than inventing content for it.
- `live` links are only ever passed through when the source project has a
  real `http`/`https` URL (`isHttpUrl` guard) — never fabricated.

## 5. Assets

`scripts/copy-three-font.mjs` runs on `postinstall` and copies `three`'s
bundled `helvetiker_bold.typeface.json` into `public/fonts/`, so World's
WELCOME/HELLO typography is self-hosted instead of fetched from
`threejs.org` at runtime. `Adventure.tsx` HEAD-checks the local copy on
mount and falls back to the CDN URL if it's missing (e.g. `postinstall`
didn't run) — same font, just not self-hosted in that case.

## 6. Routing & the two-mode handoff

- `/` — the professional portfolio (module 06, unchanged), plus
  `<AdventurePortalEntry>`, a small floating "Wanna go on another
  adventure?" control (brief §34-35) linking to `/adventure`.
- `/adventure` — `app/adventure/page.tsx` renders `AdventureClient`, a thin
  boundary that mounts `<Adventure>` and, on exit, sets a one-shot
  `sessionStorage` flag (`ARRIVAL_FLAG`, from `config.ts`) before navigating
  back to `/`.
- `<ArrivalFade>` wraps the home page; if that flag is present it fades the
  page in instead of showing it instantly (brief §33, "the user enters the
  professional portfolio"), then clears the flag.
- The World module (`three` / `@react-three/fiber` / `@react-three/drei`) is
  loaded via `next/dynamic({ ssr: false })` inside `Adventure.tsx`, so
  `/adventure`'s JS is the only place that pays for it — `/` never loads it.

## 7. Known limitations

- **No `ADVENTURE_CONTRACT.md`** — see §1. `events.ts` is the de facto
  contract; if a real one is provided later, reconcile the two.
- **A real `npm install` still hasn't been run** (this sandbox has no network
  access), so `next build` itself is unverified. What *has* been done:
  every external package (`react`, `next`, `three`, `@react-three/fiber`,
  `@react-three/drei`, `framer-motion`, `lucide-react`, `react-icons`,
  `clsx`, `tailwindcss`, ...) was stubbed out with hand-written, permissive
  `.d.ts` files in a scratch copy of this repo, and the whole thing was
  actually run through `tsc --noEmit` — not just manually inspected. That
  caught and fixed several real bugs (see below) that a read-through alone
  had missed. Still, run `npm install && npx tsc --noEmit` for real before
  trusting this compiles clean — the stubs are permissive by design, so
  they can hide type errors that only real `@types/react` /
  `@types/three` would catch (they're deliberately loose on exact DOM/R3F
  event-handler signatures — see the last bullet below).
- **Bugs the stubbed type-check found and fixed** (all applied directly to
  this repo, not just the scratch copy): two real issues in
  `components/adventure/Adventure.tsx` (an untyped callback parameter, a
  dead WebGL-support comparison); a `Map`-from-tuple inference bug in both
  `controller.ts` and the vendored `DestinationBrickWorld.tsx`; several
  `noUncheckedIndexedAccess` gaps in the *vendored* Teddy/World/Bricks
  modules (`motionUtils.ts`, `TeddyParticles.tsx`, `AmbientParticles.tsx`,
  `ImpactEffects.tsx`, `ParticleToBrickField.tsx`) — all provably-safe
  array accesses TS couldn't prove, fixed with justified non-null
  assertions; and a type-authoring bug in `useTeddyState.ts`, whose
  declared return type promised a full `TeddyController` (including
  `setFacing`) that its implementation deliberately doesn't provide —
  `Teddy3D.tsx` layers `facing` on top by design (see its own comment),
  so the hook's internal type was narrowed to match what it actually
  returns instead.
- **Remaining stub-only noise** (11 `TS7006` "implicit any" errors, all on
  `(e) => ...` event-handler parameters in `ArchitectureModal.tsx`,
  `ProjectPaper.tsx`, `DestinationBrick.tsx`, `Teddy.tsx`): confirmed by
  inspection to be an artifact of the minimal stubs used for this check,
  not real bugs — real `@types/react`/`@react-three/fiber` give these
  parameters their type from the JSX element's own prop signature
  (`MouseEvent<HTMLDivElement>`, `ThreeEvent<PointerEvent>`, ...), which
  the stubs don't replicate. Worth a quick confirmation once real
  `node_modules` exist, but not expected to be real issues.
- **Touch interaction** (`components/adventure/controller.ts`'s "touch
  two-step": first tap previews, a visible "Go" button or second tap
  confirms) is implemented but only reasoned through, never tested on an
  actual touch device.
- **Bricks' responsive layout** (`computeBrickLayout` in `config.ts`, one row
  vs. a 2×2 grid below `aspect < 1.05`) is a first pass — worth an eye on a
  real narrow/short viewport, since the frustum-based sizing math assumes
  the World's default camera FOV/position stay as they are today.
- **Reduced motion** is threaded through every module's own `reducedMotion`
  prop plus the controller's timing scale-down, but wasn't visually
  reviewed end to end.
