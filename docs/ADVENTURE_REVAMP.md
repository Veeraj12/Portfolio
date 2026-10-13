# Veeraj's World — Opening & Destination-Selection Revamp

This documents the changes made against the repository produced by the
original integration pass (see `docs/INTEGRATION.md`), per the revamp brief
(opening cinematic correctness, HELLO removal, WELCOME-relative Teddy pose,
stone destination bricks). Written in the format PART 16 asked for.

## 1. Root cause of the first-entry startup bug

`AdventureScene.tsx` used to read the World imperative handle like this:

```tsx
const worldRef = useRef<WorldHandle | null>(null);
useEffect(() => {
  onHandleReady(worldRef.current);
  return () => onHandleReady(null);
}, []);
// ...
<World ref={worldRef} autoStart={false} ... >
```

`World`'s actual imperative handle is set by a `useImperativeHandle` call
inside `WorldInner`, which is rendered as a *child of R3F's `<Canvas>`* —
i.e. by React Three Fiber's own internal reconciler instance, which only
exists once the `<canvas>` DOM node has mounted and R3F has bootstrapped a
render root on it. That bootstrap is necessarily asynchronous relative to
the outer (DOM) React tree's own commit. The `useEffect` above has `[]`
deps, so it reads `worldRef.current` exactly once, synchronously after
*this* component's own commit — which can easily be *before* R3F has
mounted `WorldInner` at all. When that happens, `onHandleReady` is called
with `null`, `Adventure.tsx`'s own `worldRef.current` is set to `null`, and
nothing ever corrects it afterward (the effect never re-runs). Later, when
`SceneReadyProbe` (also inside the Canvas, but gated on two real animation
frames having elapsed — plenty of time for R3F to have mounted) calls
`onSceneReady`, the code called `worldRef.current?.playIntro()` — a silent
no-op against the stale `null`. The opening simply never started, with no
error anywhere.

This is a known class of React/React-Three-Fiber timing hazard: reading a
ref's `.current` once in an effect races whichever reconciler actually
attaches that ref, and loses silently if it attaches late.

## 2. Files changed and why

### Startup fix
- **`components/adventure/AdventureScene.tsx`** — replaced the
  `useRef` + one-shot `useEffect` with a **callback ref** passed directly
  as `<World ref={onHandleReady}>`. A callback ref is invoked by whichever
  reconciler actually attaches/detaches the instance, at the exact moment
  that happens — there is no "read it too early" failure mode, regardless
  of R3F's bootstrap timing.
- **`components/adventure/Adventure.tsx`** — replaced the single
  `sceneMounted` boolean with an explicit two-flag readiness gate
  (`handleReady`, `sceneReady`) plus an `introStartedRef` guard. A `useEffect`
  watching both flags calls `playIntro()` exactly once, whichever flag
  resolves last — so there's no assumption about which of the two async
  signals (handle attach vs. first-paint) arrives first. Also added a
  visible **"Skip intro"** button (shown only during `phase === "intro"`),
  calling `worldRef.current?.skipIntro()` — World's existing `skipIntro()`
  already fires the same `onIntroComplete` callback a natural finish would,
  so the controller transitions identically either way; no controller
  changes were needed for this.

### HELLO removal
Removed from the **active** opening scene and all pose/camera/anchor logic
that referenced it (full list of touched files below). Nothing was merely
hidden — every reference was either deleted or (for genuinely shared,
still-used infrastructure like `AnchorId`, `OpeningState`, `TeddyPose`) had
its HELLO-specific member removed from the type, which TypeScript then
mechanically forces out of every exhaustive table/switch that used it:
- `modules/world/src/HelloText.tsx` — **deleted**.
- `modules/world/src/index.ts` — removed its export.
- `modules/world/src/types.ts` — removed `"camera-to-hello"` / `"hello"`
  from `OpeningState`, `HELLO_ANCHOR` from `AnchorId`, and the `"hello"`
  option from `previewComposition`'s target parameter.
- `modules/world/src/OpeningScene.tsx` — rewritten: no `HelloText` render,
  no `helloReveal` state, no HELLO camera waypoint/dolly, simplified
  `previewComposition`. See §3 for the new state sequence.
- `modules/world/src/LightingSystem.tsx` — removed the `"camera-to-hello"`
  / `"hello"` entries from its three `Record<OpeningState, number>` tables
  and from `SPARK_SETTLED_STATES` (TypeScript's excess-property checking on
  those object literals is what makes this kind of removal self-enforcing
  once the union member is gone).
- `modules/world/src/layout.ts` — removed `HELLO_POSITION`,
  `HELLO_VIEW_POSITION`, `HELLO_VIEW_LOOKAT`. Added `WELCOME_VIEW_POSITION`
  / `WELCOME_VIEW_LOOKAT` (see §3) and moved `TEDDY_POSITION` to sit over
  WELCOME instead of beside HELLO.
- `modules/world/src/timing.ts` — removed `HELLO_REVEAL_DURATION`,
  `HELLO_REST_Y`.
- `modules/world/src/World.tsx`, `modules/world/src/anchors.ts`,
  `modules/world/src/CameraController.tsx` — doc-comment cleanup only (no
  behavior changes); `World.tsx`'s `<Canvas camera>` prop now reads the
  same `WELCOME_VIEW_POSITION` constant as `OpeningScene.tsx` instead of
  independently hardcoding the same three numbers a second time.
- **`components/adventure/teddy.ts`** — `TeddyPose`'s `"onHello"` /
  `"behindHello"` renamed to `"onWelcome"` / `"behindWelcome"`.
- **`components/adventure/config.ts`** — `HELLO_TOP_Y`, the HELLO-relative
  `TEDDY_CLIMB_START`, `ON_HELLO`/`BEHIND_HELLO`, and the brick-layout
  distance calculation's `HELLO_VIEW_POSITION` reference were all replaced
  with WELCOME-relative equivalents (see §4).
- **`components/adventure/controller.ts`** — every `{ kind: "onHello" }` /
  `{ kind: "behindHello" }` pose literal and comparison updated to
  `"onWelcome"` / `"behindWelcome"`.

A repository-wide search (`grep -rn "HELLO" --include=*.ts --include=*.tsx`)
after these changes turns up only explanatory comments describing what was
removed and why (e.g. "V4 NOTE (HELLO removed): ...") — no active code,
state name, anchor id, or coordinate reference remains.

### Stone destination bricks
- **`modules/bricks/src/stoneLayout.ts`** (new) — pure, deterministic stone
  arrangement generator (see §5).
- **`modules/bricks/src/components/DestinationBrick.tsx`** — rewritten: the
  previous single glowing box is now a cluster of individually-positioned
  `RoundedBox` "stones" in a restrained palette, plus a forward-pop-on-select
  animation and a fix for a hover-flicker risk the stone cluster itself
  would otherwise introduce (see §6).

## 3. The new opening state sequence

```
darkness → glow-appear → glow-expand → falling → impact → reveal
  → welcome-falling → welcome-impact → welcome-settle
  → teddy-slot-active → teddy-gesture → complete
```

`"camera-to-hello"` and `"hello"` are gone; `"welcome-settle"` now advances
directly to `"teddy-slot-active"`. The camera **never moves** during this
sequence — with only one landmark (WELCOME) left to frame, `OpeningScene`'s
camera path is now a single resting waypoint (`WELCOME_VIEW`, exported from
`layout.ts`), and `CameraController.playIntro()` is a documented no-op on a
1-waypoint path (confirmed by reading `CameraController.tsx`: `if
(path.length < 2) return;`) — so no new camera-path logic was needed, just
a shorter path.

## 4. How Teddy's WELCOME-relative pose is calculated

`TEDDY_POSITION` (the slot anchor World mounts Teddy's renderer at) moved
from beside HELLO (`[0.55, 0, -2.05]`) to directly over WELCOME's center
(`[0, 0, -6]`, matching `WELCOME_POSITION`'s X/Z) — satisfying "Teddy is
centered approximately over WELCOME" directly, rather than via an offset
tuned for a different, now-removed word.

Teddy's resting height above the word (`WELCOME_TOP_Y` in `config.ts`) is a
**documented geometric estimate**, not a runtime measurement: `WelcomeText`
renders at font `size={1.5}`, and `GroundedText3D` self-measures its own
geometry at runtime to always sit with its bottom at local y=0 — so the
only unknown is the cap-height as a fraction of `size` for this exact font.
Rather than inventing a new ratio, I reused the one already implicit in
this codebase's own previous HELLO constant (HELLO at `size={1.05}` with a
hand-tuned `HELLO_TOP_Y = 0.8`, i.e. a ratio of ~0.762) and applied it to
WELCOME: `1.5 * 0.762 ≈ 1.14`. **This is worth a quick visual check once
actually rendered** — it's a reasoned estimate carried over from an
existing tuned value, not a fresh measurement, and I was not able to render
the scene to confirm it (see §8).

`ON_WELCOME` then adds Teddy's own radius plus an explicit gap
(`WELCOME_TOP_Y + TEDDY_RADIUS + 0.12`) — the gap was widened from the
previous HELLO constant's `0.03` to `0.12` specifically because the brief
repeatedly emphasizes a clearly *visible* gap and "never intersects," and
`0.03` read as uncomfortably tight for that requirement even before
accounting for the cap-height estimate's own uncertainty.

Teddy only transitions toward `"onWelcome"` after `INTRO_COMPLETE` fires
(i.e. after `"welcome-settle"` → `"teddy-slot-active"` → `"teddy-gesture"`
→ `"complete"`), which was already true of the existing controller
structure — so "do not begin Teddy's entrance while WELCOME is still
falling or bouncing" required no new guard, just confirmation that the
existing phase ordering still holds with HELLO's states removed (it does:
`"welcome-settle"` now flows straight into Teddy's states instead of
passing through the two removed HELLO states first).

## 5. How the stone geometry and materials are implemented

`modules/bricks/src/stoneLayout.ts` is a small, pure, **procedural**
generator — no texture asset is loaded; the supplied reference photo
informed the palette and the "uneven, layered coursing" composition, not a
texture map. For a given destination id it deterministically produces 6
`StoneSlab` descriptors (3 roughly-horizontal courses, each split into 2
stones at a jittered seam — the classic dry-stacked-stone look, not a
uniform grid) via a tiny seeded PRNG (the same ~6-line Park-Miller
generator the World module already uses for its own particle layouts,
duplicated locally rather than imported across the module boundary, per
the "no direct module-to-module dependencies" rule). Each stone gets:
- a size/position within the brick's unchanged overall footprint
  (1.15 × 0.75 × 0.35 — so none of `config.ts`'s brick-spacing math needed
  to change),
- a color drawn from a 6-tone restrained palette (beige / sand / muted
  brown / taupe / warm stone grey / a deeper brown for shadowed lower
  courses),
- roughness in 0.82–0.96 (matte, no metalness beyond a token 0.03), and
- a small bevel radius, rendered via drei's `<RoundedBox>` (already a
  project dependency — `Ground.tsx` uses the same primitive) for the
  "subtle bevels / softened edges" the brief asks for.

`DestinationBrick.tsx` renders these 6 `RoundedBox` stones per brick, each
`castShadow`/`receiveShadow` so they shade each other and the ground
realistically under the existing warm key light. The hover/select emissive
response was drastically reduced from the previous implementation (which
went up to `emissiveIntensity={0.9}` — a genuinely neon-reading glow) to a
damped target of at most `0.22` on select / `0.12` on hover, in the
destination's existing accent color — enough to read as "the lighting
responded," not enough to look like a lit sign.

## 6. How hover and selection coordinate with the controller

No new event bus members, no new state machine. `DestinationBrick.tsx`'s
public callback props (`onHoverStart`/`onHoverEnd`/`onSelect`) are
unchanged — they still flow through `DestinationBrickField` →
`AdventureScene`'s `BricksLayer` → `bus.emit("DESTINATION_HOVER" /
"DESTINATION_SELECTED" / ...)` → `AdventureController`, exactly as before.
Two implementation-level additions were layered on top of that existing,
unchanged flow:

- **Hover-flicker fix.** Splitting one box into 6 stone meshes introduced a
  real risk the brief doesn't mention by name but clearly cares about
  ("prevent flickering when moving between adjacent bricks," which the same
  logic argues against *within* a brick too): if pointer handlers lived on
  each stone (or relied on raycasting them individually), moving the
  cursor across the seam between two stones in the *same* brick could fire
  spurious `pointerout`/`pointerover` pairs. Fixed by moving all pointer
  handlers onto one invisible, fully-transparent hit-box spanning the
  brick's whole footprint, and disabling raycasting on the visible stones
  (`raycast={() => null}`) so the ray always resolves to that one hit-box.
  (Caught a related bug in my own first draft of this: `visible={false}`
  on the hit-box would have *also* disabled raycasting against it in
  three.js, not just hidden it — the final version uses a fully
  transparent material instead, which stays raycast-testable.)
- **Selected-brick forward pop.** `DestinationBrick.tsx` now damps the
  brick's group `position.z` toward a small forward offset
  (`+0.55` local units) when selected, on top of the existing scale-up —
  "pulled out of the structure," per PART 10 — and `config.ts`'s
  `resolveTeddyPose`'s `"onBrick"` case now adds the same offset (scaled by
  the brick layout's own `groupScale`, documented as a cross-module mirror
  of that one number, the same pattern `BRICK_SIZE` already used) so Teddy
  lands near where the brick actually ends up, not its pre-pop position.

Destination-specific dialogue (`"Want to see what I've built?"` etc.) was
already present verbatim in `modules/bricks/src/data/destinations.ts` —
confirmed by reading the file; no changes were needed there.

## 7. Test commands and their actual results

**What was actually run:** a real `npx tsc --noEmit` against the whole
repository, using hand-written permissive `.d.ts` stubs for every external
package (`react`, `next`, `three`, `@react-three/fiber`,
`@react-three/drei`, `framer-motion`, `lucide-react`, `react-icons`,
`clsx`, `tailwindcss`), since this sandbox has no network access for a real
`npm install`. This is the same approach used to verify the original
integration pass (see `docs/INTEGRATION.md` §"Known limitations"), rerun
here against every file this revamp touched.

```
cd /path/to/repo
npx tsc --noEmit -p tsconfig.json
```

**Actual result:** 11 errors, all `TS7006` ("implicit any" on an `(e) =>
...` event-handler parameter), in `ArchitectureModal.tsx`, `ProjectPaper.tsx`,
`Teddy.tsx`, and (newly, from this revamp's own code) `DestinationBrick.tsx`.
Every one was individually inspected and confirmed to be a stub artifact —
my minimal `.d.ts` stand-ins don't replicate the contextual event-parameter
typing real `@types/react`/`@react-three/fiber` provide for JSX intrinsic
elements (`<mesh onPointerOver={...}>`, `<button onClick={...}>`, etc.) —
not a real bug. **Zero errors were introduced in any file this revamp
changed beyond that one known, pre-existing stub limitation**, and the
error count did not regress from before this round of changes.

**What was NOT run, and why:** no browser, no `npm install`, no `next dev`
/ `next build`, no visual rendering, no actual pointer/keyboard/touch
interaction test, no Lighthouse/perf pass. This sandbox has no network
access and no display. Every acceptance-test checkbox in PART 15 that
requires *seeing* or *interacting with* the running scene (the WELCOME
fall's exact timing and weight, whether `WELCOME_TOP_Y`'s estimate actually
produces a visible-but-close gap under Teddy, whether the stone palette
reads correctly against the existing lighting, whether the brick layout's
frustum-fit math holds at real device aspect ratios, touch-device behavior)
is **unverified** — reasoned through from the code and the existing,
already-tuned constants it builds on, but not watched happen. I'm not
claiming any of those passed; the honest status is "implemented and
internally consistent by static analysis," not "tested."

## 8. Remaining limitations

- **No real build was run** (see §7) — run `npm install && npx tsc --noEmit
  && npm run build` for real before trusting any of this compiles or
  renders, exactly as the original integration doc already cautioned.
- **`WELCOME_TOP_Y` is a carried-over geometric estimate**, not a runtime
  measurement of the actual rendered font (see §4). It should be visually
  checked once the scene can actually be rendered, and adjusted if Teddy
  reads as too close to or too far from the letters.
- **The stone brick visuals are unverified by eye.** The palette, bevel
  size, and per-stone jitter ranges in `stoneLayout.ts` are reasoned
  choices (restrained tones, "individually cut stones, not identical
  cubes," matte matte response) but were never actually rendered against
  the supplied reference image side-by-side.
- **Touch interaction and the responsive brick layout at real narrow/short
  viewports** remain exactly as unverified as the original integration
  pass already noted — this revamp didn't change the underlying responsive
  math (`computeBrickLayout` in `config.ts`), only what it measures distance
  from (`WELCOME_VIEW_POSITION` instead of the removed
  `HELLO_VIEW_POSITION` — a larger distance, discussed in `config.ts`'s own
  comments, but not re-verified against a real viewport).
- **No "Replay the whole opening" button exists inside the live
  experience.** `playIntro()`/`reset()`/`skipIntro()` are all reachable and,
  per the startup fix, now reliably work whenever called — a fresh mount of
  `<Adventure>` (leaving and re-entering `/adventure`) naturally gets a
  fresh intro, which is what PART 15's "Leaving and re-entering" test
  describes — but there's no in-app control to replay the opening cinematic
  without actually leaving and re-entering the route. The brief's own
  Scene-by-scene story never describes one either; I didn't add one beyond
  the explicit "Skip intro" control PART 3 asked for by name.
