> **Integrated.** Vendored at `modules/world/`, with two additive patches: `layout.ts` now exports what were private position constants, and `<World>`/`<OpeningScene>` gained optional `fontUrl` and `paused` props. Full details in [`docs/INTEGRATION.md`](../INTEGRATION.md) §3.

---

# Module 02 — World / Opening Scene

Owns the world container, the opening cinematic (STATE 1 → STATE 12),
WELCOME/HELLO typography, camera choreography, lighting, ambient particles,
and the Teddy placement slot. Built and tested standalone — it does not
import, require, or assume any other module.

---

## V2 — Physical Stage Revamp

The original build was visually flat: text floating in a void, an
over-bright halo-style light, no ground. This revamp rebuilds the scene
around a **physical stage** — a real ground, a WELCOME that actually falls
under gravity and THUDs, restrained directional lighting with real shadows,
and a much sparser particle field. Nothing here was cosmetically retouched;
the composition and physicality changed.

### What changed

| Area | V1 | V2 |
|---|---|---|
| Ground | none (fog + lighting only) | `Ground.tsx` — a large matte, beveled-edge platform, always mounted, receives shadows |
| Lighting | one point light, radius growing to 16 units, peak intensity 2.4 | three restrained instruments: a fixed-small-radius spark point light, one warm directional key light (casts shadows), a near-zero ambient fill. No light's radius ever grows — that was the structural cause of "everything glows." |
| WELCOME | flat SDF text, fade/scale in | extruded `Text3D` geometry (real thickness + bevel), falls under real kinematics, THUDs, bounces, settles |
| HELLO | flat SDF text, opacity fade | same extruded/matte material language; revealed via a small spatial rotate-in + rise, not an opacity tween |
| Impact feedback | none | `ImpactEffects.tsx` — a small dust burst, a faint expanding ground ripple, and a damped camera shake, all firing once at touchdown |
| Ambient particles | 400 base, opacity 0.55, size 0.045, radius 12 centered on camera | 70 base, opacity 0.22, size 0.03, radius 9, field center pushed to z=-5 (background depth, not a surrounding cloud) |
| Canvas shadows | off | on (`shadows` prop, skipped on `low` quality) |
| Teddy placeholder | small character-ish sphere-and-dot-eyes stand-in | reduced to a plain dark marker — not a design reference, see "Known limitations" |

### New visual architecture

```
Ground (always mounted, receives shadows)
  ↑ lit by
LightingSystem: SPARK (small, fixed radius) + KEY (directional, casts shadows) + FILL (near-zero ambient)
  ↑ reveals
WelcomeText (extruded, falls/impacts/settles) ── ImpactEffects (dust + ripple, triggered on touchdown)
HelloText   (extruded, spatial reveal)
TeddySlot   (unchanged contract, placeholder toned down)
CameraController (unchanged API + additive shake())
```

No postprocessing/bloom dependency was added or is needed — warmth comes
from light + matte material response, per the brief's explicit direction.

### Physics / landing approach

No physics engine was introduced (would complicate a standalone module for
one falling word). Instead, `timing.ts` holds a small set of **real
kinematic** constants and closed-form curves:

- Fall: `y(t) = H − ½gt²`, with `g` solved analytically so `y(fallDuration) = 0`
  exactly — an evaluated equation, not a per-frame integrator, so there's no
  frame-rate-dependent drift.
- Impact: a short eased squash (`scale.y` down, `scale.x/z` up to preserve
  apparent volume) plus a small rotational tilt.
- Settle: an exponentially-damped cosine (`dampedOscillation()`) gives one
  or two visible bounces before resting exactly at `scale = 1, rotation = 0`.
- The same damped-cosine shape drives the camera's impact shake.

`WELCOME_FALL_HEIGHT` and `WELCOME_TIMING` are the two knobs that matter;
everything else (gravity, impact velocity, shake magnitude) is derived from
them so there is exactly one number for "how hard did it land," not several
hand-tuned approximations that could drift apart.

### New timing sequence

```
darkness → glow-appear → glow-expand → falling → impact → reveal
  → welcome-falling → welcome-impact → welcome-settle
  → camera-to-hello → hello → teddy-slot-active → teddy-gesture → complete
```

`falling`/`impact` (STATE 4/5) are unchanged — a small ember doing its own
short drop, which is what *ignites* the world's light. That is deliberately
a separate, quieter beat from WELCOME's own fall, which is the new,
dramatic centerpiece introduced by `welcome-falling` → `welcome-impact` →
`welcome-settle`.

### New dependency

**None as an npm package.** `Text3D` (used for both WELCOME and HELLO) is
already part of `@react-three/drei`, already a peer dependency. It does,
however, load a typeface JSON at runtime from
`https://threejs.org/examples/fonts/helvetiker_bold.typeface.json` (three.js's
own examples CDN) rather than a bundled asset — see "Known limitations" for
why, and how to swap it for a self-hosted URL.

### Public API changes

Documented per the brief's requirement (section 20) rather than silently
broken:

- **Breaking:** `OpeningState` no longer has a `"welcome"` member. It is
  replaced by `"welcome-falling" | "welcome-impact" | "welcome-settle"`,
  because WELCOME is no longer a single fade-in beat — it's a three-phase
  physical event. Anything switching on the literal string `"welcome"`
  needs updating; everything else in the union is unchanged, in the same
  order.
- **Additive, non-breaking:** `CameraControllerHandle.shake(magnitude?,
  duration?)` — a new imperative method. Existing callers of `reset`/
  `playIntro`/`skipIntro`/`setReducedMotion` are unaffected.
- **Additive:** `Ground` and `GroundProps` are new exports.
- **Unchanged:** `World`, `WorldHandle`, `WorldProps`, `OpeningSceneCallbacks`,
  `TeddySlotProps`, `TeddySlotRenderContext`, `AnchorId`, anchor hooks,
  `WorldQualitySettings`. An integrator who only ever touched `World`'s
  props/ref (i.e., never inspected raw `OpeningState` strings) needs no
  changes at all.

### Integration notes for the final Adventure Root

- Everything above is internal to `World`; the integration contract in
  section 16 below is unchanged in shape. If the integrator's own code
  switches on `onStateChange`'s value, it needs the three new state names
  instead of `"welcome"`.
- `Ground` is always mounted and always the same size/material — it is not
  part of the state machine and needs no wiring.
- If the integrator wants the ground/shadow visuals to extend further than
  the current stage bounds (e.g. to visually reach `PORTAL_ANCHOR`), that is
  an intentional gap: `PORTAL_ANCHOR` is a hand-off point owned by Module 07,
  not something this stage's ground was sized to reach.
- The Teddy placeholder rendered when no `renderTeddy` is supplied is
  intentionally inert and abstract. It is not, and should not be treated as,
  a design reference for Module 01's real character.

---

## V3 — Camera & Composition Revamp

V2 fixed the physical stage (ground, real lighting, falling WELCOME) but
the *composition* was still wrong: the camera sat too close to the
typography, extrusion made the letters read as blocks rather than
typography, and the "tiny warm light" was a visible glowing sphere sitting
on the floor — exactly the kind of prop the brief had already warned
against. V3 is a composition pass, not another lighting rebuild: per the
brief's own methodology, the fix is "pull the camera back and get the
static frame right," not "add more effects."

### Camera — pulled back, with the framing computed rather than eyeballed

The previous camera path had three waypoints and started only ~2.8 units
from WELCOME — close enough, combined with the word's width, to crop
letters and distort proportions. V3 uses two waypoints, because the
brief's own story only has **one** camera movement (WELCOME's establishing
view → HELLO); the establishing view is simply the resting pose the intro
starts on, not something the camera dollies into.

The two poses were sized from the actual geometry, not guessed:

- **WELCOME_VIEW** — position `[0, 2.4, 6.5]`, looking at `[0, 1.1, -6]`.
  Distance ≈ 12.5 units. With a 50° vertical FOV and an assumed ~16:9
  aspect, WELCOME's real width (~7.35 units at font size 1.5) occupies
  roughly **35% of frame width** at that distance — comfortably readable,
  fully in frame, with the "generous negative space" and "surrounding
  darkness" the brief asked for. Camera x matches target x (head-on, not a
  raking angle), so there's no "letters at wildly different sizes" effect.
- **HELLO_VIEW** — position `[0, 1.15, 2.2]`, looking at `[0, 0.9, -2]`.
  Distance ≈ 4.2 units, sized the same way for HELLO's smaller word (~3.68
  units wide at font size 1.05) to occupy roughly **50-55%** of frame width
  — a closer, more intimate framing, reached by an actual slow dolly
  (~3.4s, non-reduced-motion) rather than a jump.

Both waypoints keep camera height above the letters' vertical center (a
gentle few-degree downward tilt), never behind or beside them, so the word
is never viewed edge-on.

### The ground — readable without glowing

Two changes, both about *legibility*, not decoration:

- Ground's base color was raised slightly (`#0c0a08` → `#171310`) so it has
  enough albedo to visibly separate from the near-black background/fog
  under the key light, instead of risking "a giant black plane that
  disappears into the background." No emissive was added anywhere — it's
  still lit only by the key/fill lights, matte, roughness 0.9.
- Fog's near/far distances were pushed out (`5,20` → `10,26`) specifically
  so the region the camera actually cares about (WELCOME, HELLO, the
  ground beneath and around them) sits early in the fog gradient and stays
  crisp, while only the platform's far edge and beyond fade toward
  darkness — a horizon/depth cue "without requiring a giant room," per the
  brief.

### No visible light source

This is the single biggest change. V2's "spark" (STATE 2/3's tiny warm
light) was a small emissive sphere paired with a point light at the same
position. V3 feedback was explicit and specific: a visible glowing sphere,
however small, reads as a lighting-effect prop sitting on the floor, not
cinematic lighting. **The mesh has been deleted.** `LightingSystem` still
owns a point light at that position — narratively, it's still "a tiny warm
light that appears and expands" — but there is nothing to look at directly
anymore; the viewer only ever sees its effect: a moving, warming pool of
light on the ground during STATE 4/5, and its steady contribution to the
overall key-lit scene afterward. Same narrative beat, no orb.

### Typography — thickness reduced so it still reads as a word

WELCOME's extrusion depth dropped from `0.55` to `0.34` (height-to-size
ratio 0.37 → 0.23), with bevel thickness/size scaled down to match
(`0.045/0.03` → `0.026/0.018`); HELLO's dropped from `0.4` to `0.24`
similarly. The previous depth, at that bevel, was pushing the letters
toward "giant cubes shaped vaguely like letters" rather than "a physical
word" — the brief's own description of the failure mode. `curveSegments`
was also raised (WELCOME: 8 → up to 12 at high quality; HELLO: 6 → 10) so
the round letters (O, C, E) read as curves rather than faceted polygons,
which was contributing to the "disconnected blocks" read as much as the
extrusion depth was. Overall word *size* (`size={1.5}`/`size={1.05}`) is
unchanged — per the brief's own step order, the camera pull-back is what
fixes scale/proportion in frame; extrusion depth is a separate axis that
was independently too aggressive.

### Static Composition Preview — new

The brief's central instruction was to fix the still frame before touching
animation, and asked for a way to inspect that still frame without
replaying the whole sequence. `WorldHandle`/`OpeningSceneHandle` gained
**`previewComposition(target?: "welcome" | "hello")`**, which jumps
directly to a fully-settled, non-animating frame — WELCOME lit/shadowed at
rest, or HELLO lit/revealed with the camera already at `HELLO_VIEW` —
bypassing every timer and camera dolly. It deliberately does *not* fire
`onStateChange`/`onIntroComplete` (it's a review aid, not real playback),
and it's implemented so the frame actually holds indefinitely rather than
silently auto-advancing a moment later (see "Known limitations" for the
specific bug this caught and fixed during development). The demo's two new
"Preview: WELCOME" / "Preview: HELLO" buttons call it directly.

### What did *not* change

No new geometry, no decorative objects, no bloom/postprocessing dependency,
no physics library. `Ground`'s size/shape, `WelcomeText`/`HelloText`'s fall
and settle physics, `ImpactEffects`, `AmbientParticles`' counts, and the
`OpeningState` state names are all unchanged from V2 — this pass is
specifically about camera distance, light visibility, and extrusion depth,
per the brief's own instruction not to fix a composition problem by adding
effects.

### Public API changes (V3)

Purely additive — nothing from V2 was removed or renamed:

- `WorldHandle.previewComposition(target?: "welcome" | "hello"): void` —
  new.
- `OpeningSceneHandle.previewComposition(...)` — new, same signature.
- Everything else (`OpeningState`'s values, `CameraControllerHandle`,
  `TeddySlotProps`, anchors) is unchanged from V2.

### On visually verifying this

**This could not be visually inspected in the environment that built it.**
There is no browser, display, or screenshot capability available here — so
while every distance/size/framing claim above was computed from the actual
geometry (word width, FOV, aspect ratio) rather than guessed, none of it has
been *looked at*. The brief's own acceptance test (the camera/ground/
WELCOME/physics/impact/light/composition checklist) is written to be
checked visually, and that step genuinely has not happened yet. Running
`npm install && npm run dev` and clicking the two new "Preview" buttons is
the necessary next step, and is likely to surface small numeric tweaks
(a waypoint distance, a light intensity) that only become obvious once
actually rendered. See "Known limitations" for what was checked instead
(a real `tsc` pass — see below) and what that does and doesn't cover.

---

## V3.1 — Ground-Sinking Fix

A rendered screenshot (the first actual look this module has had, via a
screenshot the person building against it shared back) showed the exact
failure predicted above: both WELCOME and HELLO were sinking below the
ground's top surface, cut off partway up by the ground's own solid body
occluding their lower half.

**Root cause:** `WelcomeText`/`HelloText` wrapped their `Text3D` in drei's
`<Center bottom>`, on the assumption that `bottom` meant "anchor the
bottom edge at local y=0, extend upward" — and then added a separately
hand-estimated `WELCOME_REST_Y`/`HELLO_REST_Y` constant on top of that,
meant to represent the word's own half-height. The rendered result shows
that assumption was wrong (or the two offsets were compounding in the
wrong direction) — either way, guessing twice about the same unverified
quantity was the mistake.

**Fix:** deleted `<Center>` entirely. New `GroundedText3D.tsx` measures the
actual, already-extruded, already-bevelled geometry at runtime —
`new Box3().setFromObject(...)` on the real mesh, after the font has
loaded and the geometry exists — and positions it so its bottom is
*provably* at local y=0, and it's centered on x/z. This doesn't depend on
which way any library prop's naming convention runs; it reads the real
result and corrects for whatever it actually is. `WELCOME_REST_Y`/
`HELLO_REST_Y` dropped from guessed half-heights (`0.62`/`0.42`) to a tiny
fixed anti-z-fighting lift (`0.01`) — just enough that the letters' bottom
face and the ground's top face aren't perfectly coplanar (which can cause
shadow-acne/flicker), not a compensation for anything guessed.

Everything else — fall physics, camera framing, lighting, ground/fog
tuning — is unchanged from V3; this was purely a vertical-positioning bug
in how the text met the ground.

**Still not visually verified beyond this one screenshot.** The screenshot
confirmed the sinking bug and, incidentally, that the light-only spark
(no visible orb) and the WELCOME/HELLO overlap during a HELLO preview
(WELCOME staying visible, settled, in the background) are both working as
designed. It did not confirm the camera framing/occupancy percentages,
extrusion "blockiness," or ground tonal separation from V3 — those still
need their own look once this fix is running.

---

## 1. Purpose

Renders the first thing a visitor sees when entering Veeraj's World: a dark
physical stage, a warm ember that ignites the world's light, WELCOME
falling out of the dark and landing with a THUD, a camera move through to
HELLO, and a slot where Teddy climbs on and gestures. On completion it
exposes a single signal so a later integration layer can start the
destination-bricks phase (Module 03) and Teddy's dialogue — this module does
not implement either.

## 2. File tree

```
modules/world/
├── README.md
├── package.json
├── src/
│   ├── index.ts               # public barrel export
│   ├── types.ts                # OpeningState, quality, anchors, Teddy slot contract
│   ├── timing.ts                # V2: shared fall/impact/settle physics + easing constants
│   ├── rng.ts                    # V2: shared seeded PRNG (particles, dust burst)
│   ├── anchors.ts                 # AnchorProvider + useAnchor/useAnchorRef/useAnchorGetter
│   ├── useQualitySettings.ts       # device/reduced-motion detection + override merge
│   ├── World.tsx                    # <Canvas> root, public WorldHandle API, mounts Ground
│   ├── Ground.tsx                     # V2: the physical stage platform
│   ├── OpeningScene.tsx                # STATE 1→12 state machine orchestrator
│   ├── CameraController.tsx             # imperative camera choreography + shake()
│   ├── LightingSystem.tsx                # V2: spark + directional key + ambient fill
│   ├── ImpactEffects.tsx                  # V2: dust burst + ground ripple on touchdown
│   ├── AmbientParticles.tsx                # bounded, seeded, quality-scaled particles
│   ├── WelcomeText.tsx                      # V2: extruded, physically-falling WELCOME
│   ├── HelloText.tsx                         # V2: extruded HELLO, spatial reveal
│   ├── GroundedText3D.tsx                     # V3.1: self-measuring text, fixes ground-sinking
│   └── TeddySlot.tsx                          # Teddy integration boundary + placeholder
└── demo/
    ├── package.json / vite.config.ts / tsconfig.json / index.html
    └── src/
        ├── main.tsx
        └── App.tsx             # standalone demo, includes its own placeholder Teddy
```

## 3. Public components

- `World` — top-level root. Renders the `<Canvas>` (now with `shadows`
  enabled), quality resolution, anchor registry, the physical `Ground`, the
  opening scene, and (currently empty) `DESTINATION_AREA` / `PORTAL_ANCHOR`
  groups. Accepts `children` so later content can be mounted inside the same
  `<Canvas>` without re-creating it.
- `OpeningScene` — the state machine itself. Exposed directly in case an
  integrator wants to mount it inside their own `<Canvas>`/world instead of
  using `World`.
- `Ground` — the stage platform. Exported directly in case another module
  wants the same physical/material language elsewhere (e.g. Module 04's
  board).
- `CameraController` — reusable imperative camera driver, not hardwired to
  the intro; takes any `CameraWaypoint[]` path. Now also exposes `shake()`.
- `LightingSystem`, `AmbientParticles`, `ImpactEffects`, `WelcomeText`,
  `HelloText`, `TeddySlot` — used internally by `OpeningScene`, also
  exported for direct reuse.

## 4. Exported types

See `src/types.ts` (and `src/timing.ts` for V2 physics constants) for full
definitions:

- `OpeningState` (14-value union — see V2 note above; `OPENING_STATE_ORDER`
  gives the sequence)
- `WorldQualitySettings`, `QualityLevel`, `DEFAULT_QUALITY`
- `AnchorId`, `AnchorRegistry`
- `TeddySlotProps`, `TeddySlotRenderContext`, `TeddySlotPhase`
- `CameraControllerHandle` (now includes `shake`), `WorldHandle` (V3: now
  also includes `previewComposition`)
- `OpeningSceneCallbacks`
- `GroundProps` (V2)
- `WELCOME_TIMING`, `WELCOME_FALL_HEIGHT`, `WELCOME_REST_Y`, `HELLO_REST_Y`
  (V3.1: now tiny anti-z-fighting lifts, not half-heights — see below),
  `scaledDuration`, `impliedGravity`, `impactVelocity`, `dampedOscillation`,
  `easeOutCubic` (V2, from `timing.ts`)
- `GroundedText3DProps` (V3.1, from `GroundedText3D.tsx`)

## 5. Scene state machine

```
darkness → glow-appear → glow-expand → falling → impact → reveal
  → welcome-falling → welcome-impact → welcome-settle
  → camera-to-hello → hello → teddy-slot-active
  → teddy-gesture → complete
```

Every state except `camera-to-hello` and `complete` advances on a timer
(`BASE_DURATIONS` in `OpeningScene.tsx`, scaled down under reduced motion via
the shared `scaledDuration()` helper in `timing.ts`). `camera-to-hello`
advances when `CameraController` reports `onPathComplete` (or immediately,
via `skipIntro()`, under reduced motion). `complete` is terminal and fires
`onIntroComplete` exactly once per `playIntro()` call.

## 6. Timing / choreography

| State | What happens | Base duration |
|---|---|---|
| darkness | Everything off. | 0.9s |
| glow-appear | Tiny warm spark light fades in (no visible mesh — V3). | 0.9s |
| glow-expand | Spark intensity ramps up. | 1.3s |
| falling | The spark light drifts down the last short distance toward its rest spot. | 0.5s |
| impact | Spark light's restrained settle — this ignites the world's light, it is not WELCOME. | 0.35s |
| reveal | Directional key light rises; ground/environment becomes visible. | 1.1s |
| welcome-falling | WELCOME (extruded 3D object) free-falls under real kinematics from `WELCOME_FALL_HEIGHT`. | 0.85s |
| welcome-impact | THUD — squash bottoms out, dust burst + ground ripple fire, brief camera shake. | 0.16s |
| welcome-settle | One or two damped bounces, then exact rest. | 0.6s |
| camera-to-hello | Camera dollies WELCOME_VIEW → HELLO_VIEW (V3: one dolly, not two). | camera-driven (~3.4s, non-reduced) |
| hello | Short dwell once camera settles on HELLO. | 0.8s |
| teddy-slot-active | `TeddySlot` becomes visible, phase `climbing`. | 0.8s |
| teddy-gesture | `wiggle = true` (STATE 11's wave/wiggle beat). | 1.0s |
| complete | `onIntroComplete` fires once; phase `ready-for-dialogue`. | terminal |

Under `reducedMotion`, all timer durations are scaled by the same
`scaledDuration()` rule (×0.35, floor 0.15s) used everywhere in this module
— including WELCOME's own fall/impact/settle curves in `WelcomeText.tsx`,
which read the identical constants, so the visual and the state machine
never drift apart. Under reduced motion the fall height is also shrunk, the
bounce amplitude is zeroed, camera shake never fires, and the camera skips
straight to the HELLO waypoint instead of dollying.

## 7. Camera API

`CameraController` (also usable standalone):

```ts
interface CameraControllerHandle {
  reset(): void;
  playIntro(): void;   // walks the given path start → end
  skipIntro(): void;   // jumps straight to the final waypoint
  setReducedMotion(reduced: boolean): void; // kept for API symmetry
  shake(magnitude?: number, duration?: number): void; // V2, additive
}
```

Takes a `path: CameraWaypoint[]` (`{ position, lookAt, duration }`) and
drives whatever camera `@react-three/fiber`'s `useThree()` currently
reports — it does not assume it owns the only camera implementation in the
app. Easing curve is selected by `cameraQuality` (linear / smoothstep /
cubic). `shake()` layers a brief, exponentially-damped positional jitter on
top of the camera's current position every frame, regardless of whether a
leg is currently playing — it's a no-op when `reducedMotion` is true.

V3: `OpeningScene`'s own path now has exactly two waypoints (`WELCOME_VIEW`
→ `HELLO_VIEW`) instead of three — see the V3 section above for the
distance/framing math behind each. `CameraController` itself didn't
change; only the path `OpeningScene` gives it did.

## 8. Lighting API

`LightingSystem` takes `{ state, quality, reducedMotion, sparkPosition,
keyTarget }` and smoothly interpolates three lights toward per-state target
intensities:

- a small, **fixed-radius** warm `PointLight` ("spark"), **with no visible
  mesh at its position (V3)** — this is the tiny light from STATE 2/3, and
  it structurally cannot wash the scene since its radius never grows, only
  its intensity (and, new in V3, its Y position — a brief downward drift
  during "falling"/"impact") animates;
- one warm `DirectionalLight` ("key") that fades in from `reveal` onward,
  casts real shadows (`castShadow`, shadow-map size scaled by quality,
  fixed symmetric shadow-camera frustum sized to the stage), and is what
  actually reveals `Ground`/`WelcomeText`/`HelloText`;
- one very-low-intensity `AmbientLight` ("fill") so shadows read as dark
  rather than pure black, capped low on purpose — the scene stays
  predominantly dark by design.

No postprocessing dependency, no bloom. Warmth comes from light + matte
material response only.

## 9. Particle API

`AmbientParticles` takes `{ active, quality, reducedMotion, baseCount,
density, radius, centerZ, color }`. Positions are generated with a seeded
PRNG (`makeSeededRandom`, in `rng.ts` — shared with `ImpactEffects`), so
layout is stable across re-renders. Count is bounded by `baseCount * density
* qualityMultiplier` and deliberately small (V2: base 70, down from 400) —
these are meant to read as atmospheric depth, not stars/glitter. `centerZ`
biases the field toward the background rather than surrounding the camera.
Under `reducedMotion`, drift animation is skipped entirely (points render
static).

## 10. Anchor API

```ts
<AnchorProvider>...</AnchorProvider>   // provided by <World>, wraps the Canvas contents
useAnchorRef(id: AnchorId)             // pass as a ref callback to register an Object3D
useAnchor(id: AnchorId): Object3D | null   // read a registered anchor
useAnchorGetter(): (id: AnchorId) => Object3D | null
```

Anchor ids: `WELCOME_ANCHOR`, `HELLO_ANCHOR`, `TEDDY_ANCHOR`,
`DESTINATION_AREA`, `PORTAL_ANCHOR`. `WelcomeText`, `HelloText`, and
`TeddySlot` self-register at their respective anchors. `World` also mounts
empty, positioned `<group>`s for `DESTINATION_AREA` (`[0,0,2]`) and
`PORTAL_ANCHOR` (`[0,0,6]`) so Modules 03/07 have a stable place to read
from `getAnchor()` before they mount their own content — this module places
no visuals there itself. `Ground`'s footprint is centered at `[0,0,-2]`
(12×14 units); it does not extend to `PORTAL_ANCHOR`, which sits beyond the
stage on purpose (see "Integration notes" above).

`World`'s ref (`WorldHandle`) exposes `getAnchor(id)` alongside
`playIntro`/`skipIntro`/`reset`/`previewComposition` (V3).

## 11. Teddy slot contract

```ts
interface TeddySlotProps {
  visible: boolean;
  position: [number, number, number];
  scale?: number;
  phase: "hidden" | "climbing" | "arrived" | "gesturing" | "ready-for-dialogue";
  wiggle?: boolean;
  renderTeddy?: (ctx: TeddySlotRenderContext) => React.ReactNode;
}
```

Unchanged from V1. `World`/`OpeningScene` never import a real Teddy
component. They call `renderTeddy(ctx)` if supplied; otherwise `TeddySlot`
renders a small, deliberately inert placeholder marker so the scene stays
legible standalone — **this placeholder is not a design reference**; Module
01's real 3D companion is being designed separately, and this module's job
is only to make sure the ground/lighting/camera setup will host it well.
The integrator wires the real character in as:

```tsx
<World
  renderTeddy={(ctx) => (
    <Teddy
      expression={mapPhaseToExpression(ctx.phase)}
      action={ctx.wiggle ? "wave" : "idle"}
      position={ctx.position}
    />
  )}
/>
```

`phase` values map loosely onto MASTER_CONTEXT's `TeddyAction`/
`TeddyExpression`: `climbing` → walk/climb, `arrived` → idle/happy,
`gesturing` → wave, `ready-for-dialogue` → the point at which the
integrator's dialogue system should say the STATE 12 line ("Hey, I'm
Teddy...") — this module does not render that text itself.

## 12. Brick insertion boundary

This module renders nothing at `DESTINATION_AREA`. Module 03 is expected to
either:

- mount its brick field as a sibling passed via `World`'s `children` prop
  (so it lives inside the same `<Canvas>`), positioning itself relative to
  `useAnchor("DESTINATION_AREA")`, or
- mount entirely outside `<World>` in its own `<Canvas>`/overlay, using
  `getAnchor()` from a `WorldHandle` ref only for rough relative placement.

No destination/brick/board/portal code exists in this module.

## 13. Reduced-motion behavior

When `quality.reducedMotion` is true (explicit prop, or detected from
`prefers-reduced-motion: reduce`):

- All timer-driven state durations are compressed via `scaledDuration()`
  (×0.35, floor 0.15s) — including WELCOME's fall/impact/settle.
- WELCOME's fall height is shrunk (`0.6` units instead of `5.2`), its bounce
  amplitude is zeroed, and its squash on impact is shallower — it still
  moves through the same states, just gently.
- Camera shake never fires on impact.
- The camera does not dolly through WELCOME → HELLO; it jumps directly to
  the HELLO waypoint (`skipIntro()` on `CameraController`) when
  `camera-to-hello` begins.
- Ambient particle drift animation is disabled (particles remain, static).
- Lighting interpolation still runs but with a faster convergence constant,
  so there is no lingering fade.
- Shadows are also disabled under reduced motion (in addition to `low`
  quality) as a minor performance/motion-simplicity measure.
- Scene state (which elements are visible) is preserved — nothing is
  skipped structurally, only shortened in time — so `onStateChange` still
  fires every state in order.

## 14. Local demo instructions

The demo lives in `demo/` and does **not** depend on Module 01 — it defines
its own tiny placeholder `DemoTeddy` render function to exercise the
`renderTeddy` contract end to end. Like the internal `TeddySlot` placeholder,
it is intentionally plain and abstract, not a design reference.

```bash
cd modules/world/demo
npm install
npm run dev
```

Open the printed local URL. Controls in the top-left overlay: Play intro,
Skip intro, Reset, **Preview: WELCOME**, **Preview: HELLO** (V3 — see
below), and a Reduced-motion checkbox. The current `OpeningState` and an
"intro complete" flag are shown live.

**V3: evaluating the static composition.** The brief this revision came
from was explicit that the still frame must be checked before judging the
animation. Click **Preview: WELCOME** immediately after opening the demo —
it freezes on WELCOME fully lit, shadowed, and at rest, with the camera
already at its pulled-back establishing distance, without playing the
fall/impact/settle sequence. Click **Preview: HELLO** to jump straight to
the closer HELLO framing. Use these first; only press Play once the static
frames themselves look right.

> **Type-checking note:** this sandbox has no network access, so a real
> `npm install` could not be run here. Instead, the module was verified with
> `tsc --noEmit` against hand-written type shims for `react`, `three`,
> `@react-three/fiber`, and `@react-three/drei` (JSX intrinsic element props
> were stubbed permissively, so this does not check exact prop shapes on
> `<mesh>`/`<pointLight>`/etc. against the real library types). That pass
> caught and fixed two real bugs in V2 (see "Known limitations") and one
> more in V3 (the preview mode's initial implementation would have silently
> un-frozen itself — also below), and came back clean afterward. It's a
> meaningfully stronger check than hand-review alone, but it does **not**
> substitute for actually looking at the rendered scene — the V3 changes
> (camera distance, typography proportions, light visibility) are exactly
> the kind of thing that needs an eyeball, not just a type-checker, and
> that has not happened yet. Running the actual `npm install && npm run
> dev` in an environment with network access and a display is the
> necessary next step.

## 15. Dependencies

Peer dependencies (see `package.json`): `react`, `react-dom`, `three`,
`@react-three/fiber`, `@react-three/drei`. No new package dependency was
added for V2 — `Text3D` is already part of `@react-three/drei`. It does,
at runtime, fetch a typeface JSON from three.js's own examples CDN
(`https://threejs.org/examples/fonts/helvetiker_bold.typeface.json`) rather
than bundling a font asset — see "Known limitations" below.

## 16. Integration contract for final integrator

```tsx
import { World, type WorldHandle } from "modules/world/src";

const worldRef = useRef<WorldHandle>(null);

<World
  ref={worldRef}
  quality={{ /* optional overrides */ }}
  renderTeddy={(ctx) => <Teddy {...adaptToTeddyProps(ctx)} />}
  onStateChange={(state) => { /* map to shared AdventurePhase if desired */ }}
  onIntroComplete={() => {
    // e.g. dispatch INTRO_COMPLETE / ADVENTURE_READY, hand off to Module 03
  }}
>
  {/* Module 03's destination bricks, once ready, can mount here */}
</World>
```

`World`'s `onStateChange`/`onIntroComplete` are the only signals this module
emits; there is no global event bus requirement. `WorldHandle.getAnchor(id)`
lets the integrator read live anchor transforms for positioning content
mounted outside this module's own children. The only change from V1 is the
set of string values `onStateChange` can report (see "Public API changes").

## 17. Known limitations

- **The spark ember (STATE 4/5) is abstract, not Teddy.** MASTER_CONTEXT's
  canonical flow implies something falls and is later revealed to relate to
  Teddy climbing onto HELLO, but this module is explicitly forbidden from
  touching Teddy internals and Teddy isn't guaranteed to exist while this
  module is built/tested in isolation. The ember is treated as the light
  source that ignites the world, decoupled from Teddy's identity, and is a
  distinct, quieter beat from WELCOME's own dramatic fall.
- **Font is loaded from an external CDN at runtime, not bundled.**
  `WelcomeText`/`HelloText` default to
  `https://threejs.org/examples/fonts/helvetiker_bold.typeface.json` via a
  `fontUrl` prop, specifically to avoid bundling a font asset into this
  standalone module. For production/offline reliability, the integrator
  should self-host this JSON and pass `fontUrl` accordingly — this is a
  one-line change at the call site, not a structural one.
- **Fixed (V3.1) — WELCOME/HELLO were sinking into the ground.** A
  rendered screenshot showed both words cut off partway up, the ground's
  solid body occluding their lower half. Root cause: `WelcomeText`/
  `HelloText` wrapped their `Text3D` in drei's `<Center bottom>` and then
  added a separately-guessed `WELCOME_REST_Y`/`HELLO_REST_Y` constant on
  top, assuming `bottom` meant "bottom edge stays at local y=0, object
  extends upward." The actual rendered result showed the opposite/some
  other combination, sinking the letters below y=0 and into the solid
  ground box. Fixed by deleting `<Center>` entirely and adding
  `GroundedText3D.tsx`, which measures the real, already-bevelled geometry
  at runtime with `Box3().setFromObject()` and positions it so the bottom
  is provably at local y=0, regardless of any library flag's semantics.
  `WELCOME_REST_Y`/`HELLO_REST_Y` are now tiny (`0.01`) anti-z-fighting
  lifts, not guessed half-heights — see `GroundedText3D`'s doc comment and
  the V3.1 note below.
- **A pre-existing (not newly introduced) timing quirk:** under
  `reducedMotion`, the generic per-state timer in `OpeningScene.tsx` computes
  a non-zero floor duration (`scaledDuration(0, true) = 0.15s`) even for the
  camera-driven `camera-to-hello` state, whose base duration is `0`. In
  practice this is harmless — the state still advances correctly, either via
  `CameraController`'s `onPathComplete` or, if that callback's closure is
  stale on the same tick, via this 0.15s fallback timer — but it means the
  advance-to-`hello` under reduced motion is not purely callback-driven the
  way it is at full quality. Noted for transparency; not fixed here since it
  doesn't produce an incorrect or stuck state, and this pass's scope was the
  visual/physical revamp.
- No physics engine was introduced; WELCOME's fall/impact/settle is a
  closed-form kinematic + damped-oscillation curve (see `timing.ts`), not a
  rigid-body simulation. It looks physically believable but will not, for
  example, respond to being pushed or interacted with.
- `CameraController.setReducedMotion()` exists for API symmetry per the
  brief but reducedMotion is currently read live from props each frame
  rather than being an internally-stored flag; calling it is a no-op today
  (unchanged from V1).
- This module was type-checked with `tsc --noEmit` against hand-written
  shims for `react`/`three`/`@react-three/fiber`/`@react-three/drei`
  (no network access in this sandbox to run a real `npm install`). That
  pass caught two real bugs, both fixed: `WelcomeText`/`HelloText`/
  `TeddySlot` were declaring their group ref as `useRef<Group>(null)`,
  which TypeScript types as a read-only `RefObject` — but each of them
  writes to `.current` manually inside a combined ref callback (to keep a
  local mutable reference alongside registering the anchor). Changed to
  `useRef<Group | null>(null)`, which types as a mutable ref, matching how
  they're actually used. The shim's JSX intrinsic element types were
  stubbed permissively (`any` props), so this pass does **not** verify
  exact prop shapes against the real `@react-three/fiber`/`drei` type
  definitions (e.g. whether `RoundedBox` or `Text3D` really accept every
  prop passed to them) — only this module's own logic, null-safety, and
  import/export names against a hand-modeled subset of the real API
  surface. Running the actual `npm install && npm run dev` is still the
  right final check.
- **V3, caught during development and fixed before delivery, not left in:**
  the first implementation of `previewComposition("welcome")` froze `state`
  at the literal `"hello"` value for the HELLO target. `"hello"` carries a
  real 0.8s auto-advance timer (it's meant to flow into
  `teddy-slot-active` during real playback) — so the "frozen" preview would
  have silently un-frozen itself into the Teddy sequence well under a
  second after opening it, and separately, the generic per-frame
  `helloReveal` auto-increment (written assuming `camera-to-hello` always
  means the camera is mid-dolly) would have crept HELLO into visibility
  during a "WELCOME-only" preview even though the camera never moved. Fixed
  by freezing both preview targets on `"camera-to-hello"` (which has no
  timer of its own) and adding a `previewing` guard ref that suppresses the
  auto-increment while a preview is held, cleared on the next real
  `playIntro()`/`reset()`/`skipIntro()`. Mentioned here specifically
  because it's the kind of bug that only shows up by tracing the actual
  runtime behavior, not by reading the diff — worth knowing the review
  caught it, and worth knowing this class of state-machine subtlety exists
  in this file.
- **V3's camera/typography/lighting composition claims are computed, not
  visually verified.** See the V3 section's "On visually verifying this"
  for what that means concretely: distances and frame-occupancy percentages
  were derived from the FOV/aspect/word-width math, which is a real
  improvement over guessing, but nobody has looked at the rendered result.
  Expect the acceptance-test checklist in the brief to surface at least
  minor adjustments (a waypoint distance, a light intensity, a rest-height
  offset) once actually run.

## 18. MODULE STATUS

V3.1 (ground-sinking fix, prompted by an actual screenshot) complete on
top of V3 (camera pull-back + composition fix + no-visible-orb + static
preview mode), which is itself on top of V2 (physical stage: ground, real
lighting, falling WELCOME). Verified with a `tsc --noEmit` pass against
hand-written type shims (see "Known limitations" above) — this caught and
fixed two real ref-mutability bugs in V2 and one real state-machine bug in
V3's preview mode. Self-contained; no dependency on any other module's
implementation.

**One real screenshot has now been seen and acted on** (the ground-sinking
bug, fixed in V3.1) — this is a meaningfully different confidence level
than V3's "computed but never looked at." **The rest of V3's composition
claims (camera framing/occupancy, extrusion proportions, ground tonal
separation) are still only computed, not confirmed** — see V3.1's closing
note. **Not yet verified with a real build** (no network access in
this sandbox to run `npm install`). Recommend running `npm install && npm
run build` (or `npm run dev`) in an environment with network access as
the next step — and, specifically for V3, opening the demo and clicking
the two "Preview" buttons before judging anything else.

## 19. FILES CREATED

```
modules/world/README.md
modules/world/package.json
modules/world/src/index.ts
modules/world/src/types.ts
modules/world/src/timing.ts
modules/world/src/rng.ts
modules/world/src/anchors.ts
modules/world/src/useQualitySettings.ts
modules/world/src/World.tsx
modules/world/src/Ground.tsx
modules/world/src/OpeningScene.tsx
modules/world/src/CameraController.tsx
modules/world/src/LightingSystem.tsx
modules/world/src/ImpactEffects.tsx
modules/world/src/AmbientParticles.tsx
modules/world/src/WelcomeText.tsx
modules/world/src/HelloText.tsx
modules/world/src/GroundedText3D.tsx
modules/world/src/TeddySlot.tsx
modules/world/demo/package.json
modules/world/demo/vite.config.ts
modules/world/demo/tsconfig.json
modules/world/demo/index.html
modules/world/demo/src/main.tsx
modules/world/demo/src/App.tsx
```

(`timing.ts` and `rng.ts` are new in V2; `Ground.tsx` and `ImpactEffects.tsx`
are new in V2; all other files existed in V1 and were substantially rewritten
in V2 except `anchors.ts`, `useQualitySettings.ts`, `package.json`, and the
demo scaffolding files, which were unaffected.)

## 20. FILES MODIFIED

None outside this module. This module was created (V1) and revamped (V2)
entirely within its own isolated workspace (`modules/world/`) and does not
touch the existing portfolio repository or any other module's files.
