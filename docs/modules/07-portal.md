> **Integrated.** Vendored unchanged at `modules/portal/`. `<PortalTrigger>` is the exit portal, `<AdventureLoader>` is the loading screen — both used as-is in `components/adventure/ui/ExitPortalLayer.tsx` and `Adventure.tsx`. No patches. See [`docs/INTEGRATION.md`](../INTEGRATION.md).

---

# Module 07 — Portal / Loading / Transitions

Part of **Veeraj's World**, a seven-agent parallel build. This README is a
self-contained handoff artifact — it does not depend on any other module's
README.

---

## 1. Purpose

Owns the boundary between the professional portfolio and the adventure:

- the dormant/hover/active **portal** visual and its trigger
- the **entry transition** (portfolio → adventure)
- the **adventure loader** (dragon-on-a-circle)
- the **exit transition** (adventure → portfolio)
- a configurable **navigation/route callback** contract

Does **not** own: Teddy, the world, destination bricks, the board, project
data, the timer, or the professional portfolio's content. Does not own the
overall adventure state machine — it exposes hooks the integrator drives.

---

## 2. File tree

```
portal-module/
├── README.md
├── src/
│   ├── types.ts                     # shared type/callback contracts
│   ├── Portal.tsx                   # presentational portal SVG
│   ├── PortalTrigger.tsx            # accessible interactive wrapper
│   ├── PortalTransition.tsx         # imperative full-viewport transition
│   ├── AdventureLoader.tsx          # dragon loader
│   ├── AdventureEntry.tsx           # composes transition + loader (entry)
│   ├── AdventureExit.tsx            # imperative exit sequence
│   ├── hooks/
│   │   └── usePrefersReducedMotion.ts
│   └── index.ts                     # public barrel export
└── demo/
    └── App.tsx                      # standalone demo, no other modules required
```

---

## 3. Public API

```tsx
import {
  Portal,
  PortalTrigger,
  PortalTransition,
  AdventureLoader,
  AdventureEntry,
  AdventureExit,
  usePrefersReducedMotion,
} from "./src"; // or wherever this module is placed in the final repo
```

### `<Portal state size? className? />`
Presentational only. `state: "dormant" | "hover" | "active" | "transitioning"`.
Reusable outside the trigger (e.g. a small floating portal icon inside the
professional portfolio, Module 06's territory — just pass in `state`).

### `<PortalTrigger onEnterAdventure onPortalReaction? size? label? className? disabled? />`
Renders a real `<button>` wrapping `<Portal>`. Hover *and* focus both drive
the hover visual, so keyboard/touch users aren't second-class. Clicking or
pressing Enter/Space calls `onEnterAdventure()` after a short "active" beat.

### `<PortalTransition ref onEntryComplete? onExitComplete? className? />`
Renders nothing until told to. Exposes an imperative handle:

```ts
interface PortalTransitionHandle {
  playEntry: () => Promise<void>;
  playExit: () => Promise<void>;
}
```

Cheap to keep mounted at the app root; the parent decides when to call
`playEntry()` / `playExit()`.

### `<AdventureLoader progress? onLoaded? minDurationMs? className? />`
- `progress` omitted → indeterminate loop (dragon just orbits forever;
  caller unmounts when actually ready).
- `progress: { value, indeterminate?, statusText? }` → determinate, dragon
  position tracks `value` (0–1), `onLoaded()` fires once when `value >= 1`
  and at least `minDurationMs` (default 500ms) has elapsed.
- Always renders an `aria-live="polite"` status region with `statusText`
  (defaults to a generated string with the percentage).

### `<AdventureEntry destination? progress? onPortalReaction? onNavigate? onEntryComplete? className? />`
Composes `PortalTransition` + `AdventureLoader` into the whole
"portfolio → adventure" sequence. If `progress` isn't supplied it
self-simulates so this module is demoable without the world/board being
ready. Calls `onEntryComplete()` once, and `onNavigate(destination)` first
if `destination` was passed.

### `<AdventureExit ref destination="/" onPortalReaction? onNavigate? onExitTransitionComplete? className? />`
Mirrors `AdventureEntry` but triggered imperatively:

```ts
interface AdventureExitHandle {
  startExit: () => void;
}
```

Call `startExit()` after Module 05 emits its exit-ready event. Internally:
`onPortalReaction("exit-transition-start")` → plays the transition →
`onPortalReaction("exit-transition-complete")` → `onNavigate(destination)`
→ `onExitTransitionComplete()`.

### `usePrefersReducedMotion(): boolean`
SSR-safe (defaults `false` until mounted), live-updates on OS setting
change. Exported in case another module wants the same behavior without
re-implementing it.

---

## 4. Exported types

See `src/types.ts` for the full list; the important ones:

```ts
type PortalState = "dormant" | "hover" | "active" | "transitioning";
type NavigationDestination = string; // loose on purpose, see §10

type PortalReactionKind =
  | "portal-hover-start" | "portal-hover-end" | "portal-activated"
  | "entry-transition-start" | "entry-transition-complete"
  | "exit-transition-start"  | "exit-transition-complete";

interface PortalReactionEvent { kind: PortalReactionKind; timestamp: number }
type OnPortalReaction = (event: PortalReactionEvent) => void;

interface LoaderProgress { value: number; indeterminate?: boolean; statusText?: string }
```

---

## 5. Portal states

| State           | Visual                                                        |
|------------------|----------------------------------------------------------------|
| `dormant`        | Low glow, slow rune rotation (~22s), faint drifting particles |
| `hover`          | Medium glow, faster rotation (~10s), more visible particles   |
| `active`         | Strong glow, fast rotation (~6s), slight scale-up, denser particles |
| `transitioning`  | Reserved for integrator use during hand-off; `Portal` treats it like `active` visually — override via `className` if a distinct look is needed |

---

## 6. Entry API

Two ways to use it, pick one:

**A. Let `AdventureEntry` own the whole sequence (recommended default):**

```tsx
{phase === "entering" && (
  <AdventureEntry
    destination="/adventure"
    onPortalReaction={forwardToTeddyAdapter}
    onNavigate={(d) => router.push(d)}
    onEntryComplete={() => setPhase("adventure")}
  />
)}
```

**B. Drive `PortalTransition` + `AdventureLoader` separately** if the
integrator wants finer control (e.g. real asset-loading progress from
other modules):

```tsx
const ref = useRef<PortalTransitionHandle>(null);
await ref.current?.playEntry();
// ...meanwhile compute real progress from world/board asset loading...
<AdventureLoader progress={{ value: realProgress }} onLoaded={mountWorld} />
```

---

## 7. Exit API

```tsx
const exitRef = useRef<AdventureExitHandle>(null);

// wherever Module 05's exit-ready event is received:
exitRef.current?.startExit();

<AdventureExit
  ref={exitRef}
  destination="/"
  onPortalReaction={forwardToTeddyAdapter}
  onNavigate={(d) => router.push(d)}
  onExitTransitionComplete={() => setPhase("portfolio")}
/>
```

This module does **not** listen for Module 05's event itself — it has no
import of Module 05. The integrator wires the event to `startExit()`.

---

## 8. Loader API

See §3. Key integration note: if the real adventure has async work from
other modules (loading Teddy assets, world geometry, etc.), the integrator
should aggregate that into a single `0..1` number and pass it as
`progress.value` — `AdventureLoader` does not know or care what's being
loaded.

---

## 9. Transition API

`PortalTransitionHandle.playEntry()` / `.playExit()` both return
`Promise<void>` that resolves when the transition visually completes, so
they can be `await`ed inside an async orchestration function if the
integrator prefers that over the `onEntryComplete`/`onExitComplete` props.

---

## 10. Route / navigation boundary

This module **never calls `next/navigation`, `next/router`, or touches
`window.location`.** All three navigation-adjacent surfaces are boundary
points:

- `PortalTriggerProps.onEnterAdventure` — parent decides what "entering"
  means (mount a component, change route, flip a state flag).
- `AdventureEntryProps` / `AdventureExitProps.onNavigate?: (destination) => void`
  — called with whatever string was passed as `destination`. If the final
  architecture is `"/"` + `"/adventure"`, wire this straight to
  `router.push`. If it's a single-page state machine instead, wire it to a
  state setter. Either way, this module doesn't care.
- `NavigationDestination` is typed as a loose `string`, not a union, so no
  adapter is needed regardless of which routing approach wins.

---

## 11. Teddy reaction adapter

No Teddy import anywhere in this module. Instead, every user-facing moment
that *could* warrant a Teddy reaction emits `onPortalReaction(event)` with
a `PortalReactionEvent`:

```ts
"portal-hover-start" | "portal-hover-end" | "portal-activated"
"entry-transition-start" | "entry-transition-complete"
"exit-transition-start"  | "exit-transition-complete"
```

Suggested (non-binding) integrator mapping to Teddy's expression/action API:

| Event                        | Suggested Teddy reaction        |
|-------------------------------|----------------------------------|
| `portal-hover-start`          | `excited` / `wave`              |
| `portal-activated`            | `happy` / `jump`                |
| `entry-transition-complete`   | `neutral` / `idle` (world takes over) |
| `exit-transition-start`       | `sad` / `wave`                  |

This mapping lives in the integrator's adapter code, not in this module.

---

## 12. Reduced-motion behavior

`usePrefersReducedMotion()` gates all continuous/large animations:

- **Portal**: rune ring stops rotating (rendered static), particles render
  as a static ring instead of orbiting, no scale-up on activation.
- **PortalTransition**: duration drops from 0.9s → 0.35s, and the max
  overlay size drops from 2200px → 800px (still fully covers typical
  viewports without an oversized animated element).
- **AdventureLoader**: dragon is positioned via a static CSS `transform`
  instead of an animated one; the wing-flap wiggle is skipped.
- Navigation and loading **status text are always preserved** regardless
  of motion preference — reduced motion never hides information, only
  large movement.

---

## 13. Local demo

`demo/App.tsx` is a complete, standalone page requiring none of the other
six modules:

1. dormant portal → hover/focus → active
2. entry transition → loader (self-simulated progress)
3. placeholder "adventure" screen with an Exit button
4. exit transition → back to the portal
5. a live event log showing every `onPortalReaction` / `onNavigate` /
   `onEntryComplete` / `onExitTransitionComplete` call as it fires

To try it in the existing Next.js app during development, drop
`demo/App.tsx` behind a throwaway route (e.g. `app/dev/portal-demo/page.tsx`
re-exporting it) — remove before shipping, it's a dev harness, not a
deliverable route.

---

## 14. Dependencies

- `react` (18+)
- `framer-motion` (already in the existing portfolio's stack)
- Tailwind CSS utility classes for layout/typography (already in the
  existing portfolio's stack)
- No 3D library — the portal and dragon are both SVG per MASTER_CONTEXT's
  guidance to keep Teddy-adjacent characters lightweight 2D/vector.
- No routing library import — see §10.

---

## 15. Final integration steps

1. Copy `src/` into the chosen module path (e.g. `components/portal/` or
   `modules/portal/`).
2. Place a `<PortalTransition ref={...} />` near the app root (or wherever
   the integrator's top-level layout lives) if using the split entry/exit
   API (§6 option B); otherwise `AdventureEntry`/`AdventureExit` each
   render their own internally.
3. On the professional portfolio (Module 06), render `<PortalTrigger />`
   and wire `onEnterAdventure` to whatever begins the adventure phase in
   the integrator's state machine.
4. Wire `onPortalReaction` to a small adapter function that calls into
   Module 01's Teddy API using the mapping in §11 (or a different mapping
   — it's a suggestion, not a contract).
5. Replace `AdventureEntry`'s self-simulated progress with real aggregate
   progress once the integrator knows what the world/board actually need
   to preload.
6. Wire Module 05's exit-ready event to `AdventureExit`'s `startExit()`.
7. Decide the final navigation approach (`"/"` + `"/adventure"` routes vs.
   single-page phase state) and implement `onNavigate` accordingly.

---

## 16. Known limitations

- The portal and transition are 2D SVG/CSS; MASTER_CONTEXT permits a
  lightweight 3D portal but this implementation deliberately stays 2D for
  performance and simplicity. Swappable later since `Portal` only needs a
  `state` prop.
- `AdventureLoader`'s self-orbit math is a simple sine/cosine placement,
  not a physically simulated path — sufficient for the "small dragon
  moves around a circular path" brief but not a general animation engine.
- `AdventureEntry`'s built-in progress simulation is linear and cosmetic;
  it is not a stand-in for real asset-loading telemetry.
- No automated tests included — the local demo is the verification method
  for this hand-off.
- Colors are hard-coded warm ambers/browns matching MASTER_CONTEXT's
  visual direction; not yet pulled from the existing portfolio's Tailwind
  theme tokens (`tailwind.config.ts`) since this module was built in
  isolation from that file per the parallel-agent rules.

---

## 17. MODULE STATUS

**Complete.** All deliverables (`Portal`, `PortalTrigger`,
`PortalTransition`, `AdventureLoader`, `AdventureEntry`, `AdventureExit`),
the standalone demo, and this README are implemented and internally
consistent with MASTER_CONTEXT.md's shared contract.

---

## 18. Files created

```
src/types.ts
src/Portal.tsx
src/PortalTrigger.tsx
src/PortalTransition.tsx
src/AdventureLoader.tsx
src/AdventureEntry.tsx
src/AdventureExit.tsx
src/hooks/usePrefersReducedMotion.ts
src/index.ts
demo/App.tsx
README.md
```

## 19. Files modified

None. This module was built in an isolated workspace and does not touch
the existing portfolio repository or any other module's files.
