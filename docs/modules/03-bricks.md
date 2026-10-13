> **Integrated.** Vendored at `modules/bricks/`, with a new canvas-free `DestinationBrickField` (so bricks render inside the World's own canvas) and a `hitAreaScale` prop on `DestinationBrick`. `<DestinationBrickWorld>` is unchanged and still fully standalone. Full details in [`docs/INTEGRATION.md`](../INTEGRATION.md) §3.

---

# Module 03 — Destination Bricks

Part of **Veeraj's World**, a seven-agent parallel build. This README is a
self-contained handoff artifact for the final integrator. It does not
assume any other module's README has been read.

---

## 1. Purpose

Renders the four (data-driven, extensible) destination bricks the user
chooses between after Teddy's arrival: **Projects**, **AI / ML**,
**Architecture**, **Motion**.

Owns:
- Brick 3D visuals, floating/tilt animation, restrained emissive glow
- Particle-to-brick resolve presentation (local demo starting state)
- Hover / focus interaction (mouse, keyboard, touch-equivalent)
- Selection interaction
- The "no selection yet" emotional progression state machine
  (WAITING → CONFUSED → SAD → CRYING → HIDING)
- A typed Teddy-reaction adapter interface

Does **not** own: the board, project data, routing, portal, final exit, or
Teddy's actual rendering. It never imports another module.

---

## 2. File tree

```
modules/bricks/
├── README.md
├── src/
│   ├── index.ts                              # public barrel export
│   ├── types.ts                              # shared type contracts
│   ├── data/
│   │   └── destinations.ts                   # default destination data (content, not markup)
│   ├── adapters/
│   │   └── teddyAdapter.ts                   # Teddy reaction event builders (no real Teddy import)
│   ├── state/
│   │   ├── useNoSelectionStateMachine.ts      # centralized WAITING→...→HIDING timer logic
│   │   └── useControllableState.ts            # controlled/uncontrolled selection helper
│   └── components/
│       ├── DestinationBrick.tsx               # single brick: visual + hover/select + a11y control
│       ├── DestinationBrickWorld.tsx           # manager: Canvas, layout, wiring, public API
│       └── ParticleToBrickField.tsx            # particle→brick resolve presentation
└── demo/
    ├── DemoApp.tsx                             # self-contained local demo
    ├── TeddyReactionLog.tsx                    # fake Teddy adapter log panel
    └── page.tsx                                # example Next.js App Router mount point
```

---

## 3. Data model

```ts
type DestinationId = string; // data-driven, not a hardcoded union

interface DestinationDialogue {
  hover: string;
  select?: string; // falls back to `hover` if omitted
}

interface DestinationDefinition {
  id: DestinationId;
  label: string;
  description?: string;
  dialogue: DestinationDialogue;
  position?: [number, number, number]; // world-space; auto if omitted in a future layout pass
  accentColor?: string;                // optional per-destination color override
}
```

The default set (`DEFAULT_DESTINATIONS` in `src/data/destinations.ts`)
contains `projects`, `ai-ml`, `architecture`, `motion` with the dialogue
lines specified in the module brief. Adding a fifth destination requires
only adding an entry to this array — no component changes.

`DestinationId` is intentionally a plain `string` rather than a fixed
union of the four canonical ids. This keeps the module genuinely
data-driven per the brief ("do not create four unrelated hardcoded
components"). The final integrator can narrow/validate ids against the
canonical `DestinationId` union from MASTER_CONTEXT when wiring this
module to the board/routing layer.

---

## 4. Public API

```tsx
<DestinationBrickWorld
  ref={optionalRef}                         // DestinationBrickWorldHandle
  destinations={DestinationDefinition[]}    // required

  selectedDestinationId={string | null}          // controlled (optional)
  defaultSelectedDestinationId={string | null}   // uncontrolled initial value (optional)

  onDestinationHover={(id) => void}
  onDestinationUnhover={(id) => void}
  onDestinationSelect={(id) => void}        // module never navigates on this
  onTeddyReaction={(event: TeddyReactionEvent) => void}

  reducedMotion={boolean}                   // default false
  quality={"low" | "medium" | "high"}       // default "medium"
  noSelectionTiming={Partial<NoSelectionTimingConfig>}
  particleIntro={boolean}                   // default true
  className={string}
/>
```

Ref handle:

```ts
interface DestinationBrickWorldHandle {
  reset: () => void; // clears selection/hover, restarts the no-selection clock
}
```

Selection supports both patterns:
- **Controlled**: pass `selectedDestinationId` + drive it from `onDestinationSelect`.
- **Uncontrolled**: pass `defaultSelectedDestinationId` (or omit it) and let the module track its own selection internally.

---

## 5. Exported types

From `src/index.ts`:

`DestinationId`, `DestinationDefinition`, `DestinationDialogue`,
`DestinationBrickWorldProps`, `DestinationBrickWorldHandle`,
`TeddyExpression`, `TeddyAction`, `TeddyReactionEvent`,
`TeddyReactionSource`, `OnTeddyReaction`, `NoSelectionStage`,
`NoSelectionTimingConfig`, `QualityLevel`.

Components/functions: `DestinationBrickWorld`, `DestinationBrick`,
`ParticleToBrickField`, `DEFAULT_DESTINATIONS`, `useNoSelectionStateMachine`,
`DEFAULT_NO_SELECTION_TIMING`, `isStageAtLeast`, and the `teddyAdapter`
reaction builders (`reactionForHover`, `reactionForUnhover`,
`reactionForSelect`, `reactionForNoSelectionStage`, `reactionForReset`,
`noopTeddyReaction`).

---

## 6. Hover contract

On hover **or keyboard focus** of a brick:

1. The brick reacts physically (tilt toward camera, scale up slightly, glow brightens).
2. Its label brightens.
3. `onDestinationHover(id)` fires.
4. `onTeddyReaction(event)` fires with `source: "brick-hover"`, an `expression`/`action` pair, and `dialogue` set to that destination's `dialogue.hover` line.

On unhover/blur: `onDestinationUnhover(id)` and a `source: "brick-unhover"` reaction (`neutral` / `idle`, no dialogue) fire, and the brick's physical state relaxes back toward idle.

Hover is not the only way to trigger this — see **Reduced-motion / accessibility** below for keyboard and touch equivalents.

---

## 7. Selection contract

On selecting a brick (click, Enter/Space while focused, or tap):

1. The brick pops forward and settles (unselected siblings visually recede).
2. `onDestinationSelect(id)` fires. **The module never navigates, opens a board, or decides what selection means** — that decision belongs entirely to the parent/integrator.
3. `onTeddyReaction(event)` fires with `source: "brick-select"`, `expression: "excited"`, `action: "jump"`, and `dialogue` set to `dialogue.select ?? dialogue.hover`.
4. The no-selection state machine resets to `WAITING` (see below).

Re-selecting the same destination re-fires the same sequence and still resets the no-selection clock.

---

## 8. Teddy adapter contract

This module never imports or renders the real Teddy. It only ever hands
the parent a plain, serializable event:

```ts
interface TeddyReactionEvent {
  expression: TeddyExpression;
  action: TeddyAction;
  dialogue?: string;
  source: "brick-hover" | "brick-unhover" | "brick-select" | "no-selection-progress" | "reset";
  destinationId?: DestinationId;
}
```

`src/adapters/teddyAdapter.ts` contains small pure builder functions
(`reactionForHover`, `reactionForSelect`, `reactionForNoSelectionStage`,
etc.) so the mapping from "what happened" to "what Teddy should show" is
centralized, typed, and easy for the integrator to re-map onto Module 01's
real API (e.g. `Teddy.setExpression(event.expression)`).

`noopTeddyReaction` is the default for `onTeddyReaction` so the component
works with zero wiring.

---

## 9. No-selection state machine

Implemented in `src/state/useNoSelectionStateMachine.ts`.

Progression: `WAITING → CONFUSED → SAD → CRYING → HIDING`.

Design guarantees:
- **Centralized timing**: all four timers are scheduled from a single
  effect relative to the moment the machine becomes `active`
  (`selectedId == null`). No `setTimeout` calls are scattered elsewhere in
  the module.
- **Cleanup**: every scheduled timer id is tracked in a ref array and
  cleared together on unmount, on deactivation, and before every
  re-schedule — nothing can fire after the effect that created it is
  invalidated.
- **Reset on selection**: selecting a destination sets `active` to
  `false` (via `selectedId != null`), which immediately clears all
  timers and returns the stage to `WAITING`; `handleSelect` also calls
  `resetNoSelectionMachine()` explicitly so re-selecting the same
  destination still resets the clock.
- **Reset on restart**: `DestinationBrickWorldHandle.reset()` clears
  selection and hover state and resets the machine; remounting the
  component (e.g. a `key` change from the integrator) naturally restarts
  it from `WAITING` as well.

When the stage reaches `HIDING`, the module emits a `TeddyReactionEvent`
with `action: "hide"` via `onTeddyReaction` — it does **not** move Teddy
or decide where Teddy hides. That decision belongs to the final
integrator / Module 01.

---

## 10. Timing configuration

Defaults (`DEFAULT_NO_SELECTION_TIMING`):

| Stage    | Default delay |
|----------|----------------|
| CONFUSED | 6,000 ms |
| SAD      | 12,000 ms |
| CRYING   | 20,000 ms |
| HIDING   | 30,000 ms |

Override any subset via the `noSelectionTiming` prop, e.g.:

```tsx
<DestinationBrickWorld noSelectionTiming={{ toConfusedMs: 4000 }} ... />
```

The local demo shortens all four thresholds so the progression is
observable within ~13 seconds.

---

## 11. Reduced-motion behavior

`reducedMotion={true}`:
- Idle floating amplitude drops to 0 (bricks hold a static resting height).
- The slow ambient rotation/tilt-toward-camera animation is skipped.
- The particle-to-brick intro collapses to effectively instant (duration ≈ 0.01s) instead of a ~1s animated resolve.
- Hover/select scale and glow transitions still occur (they communicate state, not just decoration) but read as a snappier cross-fade rather than a physical tilt.

The parent is expected to pass `reducedMotion` from `prefers-reduced-motion` and/or an app-level accessibility toggle — this module does not read `matchMedia` itself, to keep it a pure, testable prop.

**Accessibility beyond motion:**
- Every brick has a real, focusable `<button>` (via `@react-three/drei`'s `<Html>`) layered over its 3D position with a visible native focus ring, an `aria-label` built from the destination's label + description, and `aria-pressed` reflecting selection.
- Enter/Space selects a focused brick; hover is not required.
- On touch devices, `pointerdown` triggers the same hover reaction a mouse hover would, before the subsequent tap/click selects — giving touch users an explicit equivalent to hover-driven Teddy reactions instead of only "hover" being unreachable.

---

## 12. Local demo

`demo/DemoApp.tsx` is fully self-contained:
- Renders `DestinationBrickWorld` with `DEFAULT_DESTINATIONS`.
- Logs every `TeddyReactionEvent` to `TeddyReactionLog`, a fake adapter panel (emoji + expression/action/dialogue), standing in for the real Teddy.
- A "Restart session" button calls the `DestinationBrickWorldHandle.reset()` ref method.
- A "Reduced motion" checkbox toggles the `reducedMotion` prop live.
- Uses shortened `noSelectionTiming` so CONFUSED → HIDING is visible quickly without waiting 30s.

`demo/page.tsx` shows how to mount it under Next.js App Router
(`dynamic(..., { ssr: false })`, required because `@react-three/fiber`
needs a browser WebGL context).

To try it inside the actual repo: copy `demo/page.tsx` and `demo/DemoApp.tsx`/`demo/TeddyReactionLog.tsx` into a route such as `app/dev/bricks-demo/`, adjusting the relative imports to point at wherever `modules/bricks/src` lands, then visit that route.

---

## 13. Dependencies

Already in the host stack (per MASTER_CONTEXT): `react`, `next`, `typescript`.

**New for this module** — not currently listed in MASTER_CONTEXT's stack, so they'll need adding to the host repo:
- `three`
- `@react-three/fiber`
- `@react-three/drei` (used here only for `<Html>` and `<Text>`)

Not required by this module: Framer Motion. All physical motion here runs
inside the R3F render loop (`useFrame` + `THREE.MathUtils.damp`) rather
than through Framer Motion, since the bricks are 3D meshes, not DOM
nodes. If the integrator prefers Framer Motion Layout/AnimatePresence for
any DOM-level chrome around the canvas (labels, panels), that layer can
be added outside this module without touching brick internals.

---

## 14. Final integration boundary

This module hands the integrator:
- `onDestinationHover` / `onDestinationUnhover` — for any UI chrome outside this module that should react to hover (e.g. a description panel).
- `onDestinationSelect(id: DestinationId)` — the integrator decides what happens next (open the board, transition camera, etc.). This module does not know about routing, the board, or `AdventurePhase`.
- `onTeddyReaction(event: TeddyReactionEvent)` — the integrator maps this onto Module 01's real Teddy API. Suggested mapping: call `Teddy.setExpression(event.expression)` and `Teddy.setAction(event.action)`, and display `event.dialogue` if present.
- A `DestinationBrickWorldHandle.reset()` ref method for restarting the interaction when the adventure itself restarts (`ADVENTURE_RESTART`).

The integrator is expected to:
- Supply the real destination list (this module ships the default 4 but accepts any array).
- Decide brick layout/position if the defaults in `data/destinations.ts` don't match the final world composition (positions are a prop on each `DestinationDefinition`, not hardcoded in components).
- Own the transition into `AdventurePhase: "board"` after `onDestinationSelect` fires.
- Optionally seed `ParticleToBrickField`'s starting state from Module 02's real ambient particles instead of this module's local random-sphere starting positions — the field's public props (`target`, `delay`, `duration`, `onResolved`) don't need to change for that swap.

---

## 15. Known limitations

- `ParticleToBrickField` uses its own local random starting positions (a small sphere around each brick's target), per the instruction not to depend on Module 02. It is visually a placeholder for "particles becoming a brick," not a physically simulated particle system.
- Brick auto-layout is minimal: default `position` values in `data/destinations.ts` lay bricks out in a single row. A denser scene (more than ~5–6 destinations) will need either smaller bricks, a grid layout, or camera-distance tuning — none of that layout logic exists yet.
- The keyboard/touch accessible control is a transparent `<button>` positioned via `drei`'s `<Html>`, which layers a real DOM element over the WebGL canvas. This works but its screen-space position depends on `distanceFactor`/camera settings staying roughly in sync with the 3D scene; if the integrator changes camera FOV/position significantly, the button's hit area should be re-checked.
- This module has not been run through an actual bundler/build in this environment (no package registry access here), so it has not been compiler- or runtime-verified beyond careful manual review. Recommend a `tsc --noEmit` pass and a visual smoke test after adding the three new dependencies to the host repo.
- No project/board content, routing, or portal logic exists here by design — see MASTER_CONTEXT module boundaries.

---

## 16. MODULE STATUS

**Complete** — all responsibilities in the module brief are implemented: data-driven bricks, particle-to-brick presentation, hover/selection interaction, centralized no-selection state machine, Teddy reaction adapter, controlled/uncontrolled selection, reduced-motion and quality props, configurable timing, and a self-contained local demo. Not build-verified in this sandbox (no package registry access) — see Known Limitations.

---

## 17. FILES CREATED

```
modules/bricks/README.md
modules/bricks/src/index.ts
modules/bricks/src/types.ts
modules/bricks/src/data/destinations.ts
modules/bricks/src/adapters/teddyAdapter.ts
modules/bricks/src/state/useNoSelectionStateMachine.ts
modules/bricks/src/state/useControllableState.ts
modules/bricks/src/components/DestinationBrick.tsx
modules/bricks/src/components/DestinationBrickWorld.tsx
modules/bricks/src/components/ParticleToBrickField.tsx
modules/bricks/demo/DemoApp.tsx
modules/bricks/demo/TeddyReactionLog.tsx
modules/bricks/demo/page.tsx
```

## 18. FILES MODIFIED

None. This module was built in an isolated workspace (`modules/bricks/`) and does not touch any existing repository files.
