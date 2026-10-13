> **Integrated.** Vendored unchanged at `modules/exit/`. `AdventureTimer` and `ExitController` are used directly inside `components/adventure/controller.ts` (not through this module's own React hook, since that controller isn't a React component). No patches. See [`docs/INTEGRATION.md`](../INTEGRATION.md).

---

# Module 05 — Exit + Adventure Timer

## 1. Purpose

Owns the adventure session timer and the exit sequence: recording a single
entry timestamp, computing elapsed duration, reacting to hover/focus on the
board's close control with time-aware Teddy dialogue, and running the
IDLE → CLOSE_INTENT → GOODBYE → EXITING → EXIT_READY state machine that
ends with a handoff callback for the portal module.

It does not render the board, Teddy, the world, or the portal, and does not
perform navigation.

## 2. File Tree

```
exit-module/
  src/
    types.ts             shared local type contracts
    AdventureTimer.ts     session timer
    dialogue.ts            time-aware dialogue generation
    ExitController.ts     exit state machine
    useAdventureExit.ts   React hook composing the two above
    index.ts              public exports
  demo/
    demo.html             standalone, dependency-free local demo
  README.md
```

## 3. Public API

```ts
import {
  AdventureTimer,
  ExitController,
  useAdventureExit,
  formatElapsedSeconds,
  defaultCloseIntentDialogue,
  defaultGoodbyeDialogue,
} from "./src";
```

**`AdventureTimer`**
- `start(): number` — records the entry timestamp once; a second call is a
  no-op and does not reset the clock.
- `reset(): void`
- `isRunning(): boolean`
- `getEntryTime(): number | null`
- `getElapsedSeconds(): number`
- `getElapsedMinutes(): number`
- `getElapsedDuration(): ElapsedDuration`

**`ExitController`** (constructed with `ExitControllerConfig`, see §4)
- `getState(): ExitState`
- `onCloseHover(): void` — wire to `BOARD_CLOSE_HOVER`
- `onCloseUnhover(): void` — optional, for un-hover/blur
- `onCloseSelected(): void` — wire to `BOARD_CLOSE_SELECTED`; runs the full
  exit sequence
- `restart(): void` — resets state to `IDLE` for a new session
- `destroy(): void` — clears any pending exit timer; call on unmount

**`useAdventureExit(options?)`** — the recommended entry point for React
consumers. Owns one `AdventureTimer` + one `ExitController` per mount via
`useRef`, so neither is recreated on ordinary re-renders. Returns:

```ts
{
  state: ExitState;
  elapsedSeconds: number;
  elapsedDuration: ElapsedDuration;
  teddyReaction: TeddyReaction | null;
  start: () => void;
  restart: () => void;
  onCloseHover: () => void;
  onCloseUnhover: () => void;
  onCloseSelected: () => void;
}
```

## 4. Exported Types

```ts
type TeddyExpression = "neutral" | "happy" | "sad" | "angry" | "confused"
  | "surprised" | "excited" | "crying" | "sleepy";

type TeddyAction = "idle" | "blink" | "talk" | "walk" | "jump" | "wave"
  | "hide" | "cry";

interface TeddyReaction {
  expression: TeddyExpression;
  action: TeddyAction;
  dialogue?: string;
}

interface ElapsedDuration {
  totalSeconds: number;
  minutes: number;
  seconds: number;
  formatted: string; // "M:SS"
}

type ExitState = "IDLE" | "CLOSE_INTENT" | "GOODBYE" | "EXITING" | "EXIT_READY";

interface DialogueFns {
  closeIntent: (elapsedSeconds: number) => string;
  goodbye: (elapsedSeconds: number, longSessionThresholdSeconds: number) => string;
}

interface ExitControllerConfig {
  getElapsedSeconds: () => number;
  longSessionThresholdSeconds?: number;   // default 600 (~10 min)
  exitTransitionDurationMs?: number;      // default 900
  reducedMotion?: boolean;
  dialogue?: Partial<DialogueFns>;
  onTeddyReaction?: (reaction: TeddyReaction) => void;
  onExitSequenceStarted?: () => void;
  onAdventureExitReady?: () => void;
  onStateChange?: (state: ExitState, previous: ExitState) => void;
}
```

## 5. Timer Lifecycle

1. Integrator constructs one `AdventureTimer` (directly, or implicitly via
   `useAdventureExit`) when the adventure session begins.
2. `start()` records `Date.now()` into an instance field exactly once. Every
   later call to `start()` while already running is a no-op — the timestamp
   never resets on ordinary React renders.
3. `getElapsedSeconds()` / `getElapsedMinutes()` / `getElapsedDuration()` are
   cheap, side-effect-free reads, safe to call every render or on an
   interval tick.
4. `reset()` clears the timestamp; a subsequent `start()` begins a new
   session. Used by `restart()` on the hook/controller.

No data beyond this single client-side timestamp is collected or persisted.

## 6. Duration API

`formatElapsedSeconds(totalSeconds)` (also available as
`timer.getElapsedDuration()`) returns:

```ts
{ totalSeconds: 97, minutes: 1, seconds: 37, formatted: "1:37" }
```

`formatted` is `M:SS` (minutes not zero-padded, seconds are). Use
`totalSeconds` for threshold comparisons and `formatted` for display.

## 7. Exit State Machine

```
IDLE ──onCloseHover──▶ CLOSE_INTENT ──onCloseUnhover──▶ IDLE
IDLE / CLOSE_INTENT ──onCloseSelected──▶ GOODBYE ──▶ EXITING ──▶ EXIT_READY
```

On `onCloseSelected()`:
1. state → `GOODBYE`, `onTeddyReaction` fires with the goodbye line
2. state → `EXITING`, `onExitSequenceStarted()` fires (board may start
   hiding itself here)
3. controller waits `exitTransitionDurationMs` (shortened, not lengthened,
   when `reducedMotion` is true — see §11)
4. state → `EXIT_READY`, `onAdventureExitReady()` fires

`onCloseSelected()` is idempotent once `EXITING`/`EXIT_READY` is reached —
repeat calls do nothing. `restart()` returns to `IDLE` and clears any
pending timer, for re-entering the adventure.

## 8. Teddy Reaction Contract

The controller never imports or renders Teddy. It only calls
`onTeddyReaction(reaction: TeddyReaction)` with an expression/action/dialogue
triple, e.g.:

```ts
{ expression: "sad", action: "talk", dialogue: "Going so soon? It's only been 37 seconds." }
{ expression: "happy", action: "wave", dialogue: "Bye byee! Let's meet again." }
```

The final integrator adapts this into calls on the real Teddy component
(Module 01). Dialogue text can be overridden entirely via
`ExitControllerConfig.dialogue` without touching the state machine.

## 9. Board Callback Expectations

This module does not import or assume the real board (Module 04) exists. It
exposes three plain methods to be called by whatever owns
`BOARD_CLOSE_HOVER` / `BOARD_CLOSE_SELECTED` interactions:

- `onCloseHover()` — mouse enter or keyboard focus on the close control
- `onCloseUnhover()` — mouse leave or blur (optional; safe to omit if the
  board doesn't distinguish hover-out)
- `onCloseSelected()` — click, Enter, or Space on the close control

The board is expected to remain visible/interactive until
`onExitSequenceStarted` fires, at which point it may begin hiding itself;
this module never hides or unmounts anything directly.

## 10. Portal Handoff Contract

`onAdventureExitReady()` (or `onAdventureExitReady` in the hook's `state ===
"EXIT_READY"` transition) is the sole handoff point to the portal module
(Module 07). This module never calls `router.push`, changes `window.location`,
or performs any navigation — that responsibility belongs entirely to the
portal/integration layer.

## 11. Reduced-Motion Behavior

When `reducedMotion: true`:
- `exitTransitionDurationMs` is clamped to at most 150ms (never lengthened
  if the caller passed something already shorter).
- Timer correctness, goodbye dialogue selection, the `onExitSequenceStarted`
  / `onAdventureExitReady` callbacks, and keyboard operation
  (hover/focus/select all work identically via `onCloseHover` /
  `onCloseSelected`) are entirely unaffected — only the wait before
  `EXIT_READY` is compressed.

## 12. Local Demo

`demo/demo.html` is a single, dependency-free HTML file — open it directly
in a browser, no build step, no server required (though a static server
works too). It re-implements the same public API (`AdventureTimer`,
`ExitController`, dialogue functions) in plain JS so it can run without a
bundler, and has zero dependency on the board, Teddy, or portal modules.

To keep the "Bye byee!" branch reachable without a real 10-minute wait, the
demo sets `longSessionThresholdSeconds: 10` — this is a demo-only value; the
default in `ExitControllerConfig` is 600 (10 minutes) as specified.

The demo shows: a running elapsed-time readout, the current exit state,
simulated hover/unhover/select controls, a Teddy reaction log (face icon +
dialogue + expression/action), a reduced-motion toggle, and a restart
control.

## 13. Dependencies

- `src/*.ts`: no runtime dependencies beyond React (only in
  `useAdventureExit.ts`; `AdventureTimer.ts`, `dialogue.ts`, and
  `ExitController.ts` have zero dependencies and can be used outside React).
- `demo/demo.html`: zero dependencies, plain HTML/CSS/JS.

## 14. Final Integration Steps

1. Copy `src/` into the app (e.g. `modules/exit/` or `lib/adventure/exit/`).
2. In the component that owns the adventure board region, call
   `useAdventureExit({ longSessionThresholdSeconds: 600, reducedMotion })`,
   passing `reducedMotion` from the app's existing prefers-reduced-motion
   detection.
3. Wire the returned `onCloseHover` / `onCloseUnhover` / `onCloseSelected`
   to the real board's close control's `onMouseEnter/onMouseLeave/onFocus/
   onBlur/onClick`.
4. Feed `teddyReaction` into the real Teddy component (Module 01) via a
   `useEffect` keyed on `teddyReaction`.
5. When `state === "EXIT_READY"`, hand off to the portal module (Module 07).
6. Display `elapsedDuration.formatted` anywhere the UI wants to surface
   session length.

## 15. Known Limitations

- The timer uses `Date.now()` and does not account for the tab being
  backgrounded/throttled — elapsed time is wall-clock, not
  active-engagement time. This matches the "single entry timestamp" spec.
- `onCloseUnhover` assumes a single close control; if the board ever exposes
  multiple close affordances, the integrator should debounce/coordinate
  calls into this controller.
- No automated test suite is included; `now` is injectable on
  `AdventureTimer` specifically to make one easy to add.

## 16. MODULE STATUS

Complete. Builds and demo-verified in isolation, with no dependency on any
other module's implementation.

## 17. FILES CREATED

- `src/types.ts`
- `src/AdventureTimer.ts`
- `src/dialogue.ts`
- `src/ExitController.ts`
- `src/useAdventureExit.ts`
- `src/index.ts`
- `demo/demo.html`
- `README.md`

## 18. FILES MODIFIED

None. This module was built in an isolated workspace and does not touch any
existing repository files.
