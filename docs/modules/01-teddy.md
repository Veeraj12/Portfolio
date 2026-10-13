> **Integrated.** Vendored unchanged at `modules/teddy/`. Used inside the World's canvas via `<TeddyMesh>` (see `components/adventure/TeddyActor.tsx`) and standalone via `<Teddy>` for the board's mini header avatar. No patches. See [`docs/INTEGRATION.md`](../INTEGRATION.md).

---

# Module 01 — Teddy (v2: 3D floating companion)

This is a **visual and rendering redesign only** of Module 01. Teddy is no
longer an SVG teddy bear; he's a small, soft-geometric, floating companion
rendered in Three.js / React Three Fiber. The behavioral architecture —
9 expressions, 8 actions, held vs. one-shot, the ref controller, callbacks,
reduced-motion handling, timer cleanup, independent testability — is
unchanged and was carried over file-by-file wherever it didn't touch
rendering. Nothing about World, Bricks, Board, Exit, Portfolio, routing, or
the Portal was added.

---

## 1. What changed vs. v1, at a glance

| Layer | v1 | v2 |
|---|---|---|
| Renderer | SVG + CSS | Three.js meshes via React Three Fiber |
| Body | Teddy-bear silhouette | Deformed-icosahedron "pebble" body |
| Face | Flat SVG paths | Real 3D meshes (spheres, torus arcs, a circle) |
| Motion | CSS `@keyframes` | `useFrame` — sine-based holds, keyframe-sampled one-shots |
| State machine | `useTeddyState.ts` | **unchanged, byte-for-byte reused** |
| Reduced motion | `useReducedMotion.ts` | **unchanged, byte-for-byte reused** |
| Action timing | `teddyActions.ts` | **unchanged, byte-for-byte reused** |
| Public API | `TeddyProps` / `TeddyController` | **unchanged**, plus additive optional props (`position`, `rotation`, `facing`) and an additive `setFacing()` controller method |
| Appendages | — | tiny low-poly flattened "palm" shapes (see §24) instead of plain icosahedra |

`useTeddyState.ts`, `useReducedMotion.ts`, and `teddyActions.ts` were
genuinely renderer-agnostic in v1 (pure state machine / timing, no SVG or
DOM references), so they needed zero changes for this redesign — copied
over as-is. That separation is why this redesign could be "swap the
renderer" rather than "rewrite the module."

---

## 2. New character concept

Teddy is a small, rounded, subtly asymmetric "seed/pebble" — vertically
compact, wider through the middle, tapered toward the top, flattened a
touch on the bottom so he reads as floating/sitting rather than a perfect
ball. Two dark, rounded eyes and a tiny mouth sit on the front face. Two
very small floating appendages rest beside the body for gesture. The
surface is a warm amber matte material with a modest inner glow that
brightens or dims with emotional state.

He is deliberately **not** a teddy bear, not a robot, not a sphere, and not
kawaii-styled — see §11 "What this is not," and the design decisions below
for how each requirement in the brief was addressed.

---

## 3. Design decisions

- **Procedural geometry, not a modeled/imported asset.** `TeddyGeometry.ts`
  deforms a low-poly `IcosahedronGeometry` with a small, fixed set of sine
  terms (never `Math.random()`), so the silhouette is asymmetric and
  organic but **deterministic** — identical on every mount, no popping
  between server/client or across remounts, and nothing to load/await.
- **Emissive glow instead of transmission/subsurface.** True subsurface
  scattering (`MeshPhysicalMaterial.transmission` + `thickness`) triggers
  an extra transmission render pass — a real cost sitting next to a full
  3D world. A moderate-roughness `MeshPhysicalMaterial` with a low, warm
  `emissive` color reads as "light from inside" at a fraction of the
  cost, and — per the brief's own guidance in §16 — if the host world
  already renders bloom, this emissive is picked up by it for free rather
  than Teddy needing its own bloom pass. This is the "convincing
  approximation over a heavy custom pipeline" tradeoff the brief asked
  for explicitly.
- **Mouth as three pre-built meshes (arc / capsule / circle), toggled by
  visibility.** Rather than morphing a single mouth geometry (expensive,
  fragile across expression changes) or swapping geometries at runtime
  (allocation churn), all three shapes exist once and only their
  `visible` flag changes. `mouthTilt`/`mouthIntensity` scale and rotate
  the active one per expression. The flat/"unsure" shape is a
  non-uniformly **scaled sphere**, not `THREE.CapsuleGeometry` —
  `CapsuleGeometry` only exists from three.js r142+, and this module
  targets the broadly-available r128 API surface (see §16); a stretched
  sphere gives the same short rounded-bar silhouette with no version risk.
  This was caught by actually running the geometry (see §17), not by
  reading the Three.js changelog — worth flagging since it's exactly the
  kind of bug that compiles fine in TypeScript and only fails at runtime.
- **A hand-rolled keyframe sampler instead of an animation library.**
  `motionUtils.ts`'s `sampleKeyframes()` is ~10 lines and covers jump's
  eased squash/stretch/settle curve. Held/looping motion (idle float,
  walk drift, cry shake) is driven by continuous `Math.sin()`/`Math.cos()`
  terms instead — cheaper than a tween library and trivially composes
  with the expression system's `energy` multiplier. The brief explicitly
  asked to avoid pulling in an animation framework solely for Teddy; this
  is why none was added. Wave (see §9) intentionally does *not* use the
  keyframe sampler — it's a plain continuous oscillation instead, which
  was a deliberate simplification made after the original keyframe-based
  swing wasn't visibly animating and a straightforward, impossible-to-
  mis-time sine wave was the more robust fix than continuing to debug the
  progress-since-start calculation blind.
- **`TeddyMesh` (raw R3F content) is a separate export from `Teddy`
  (Canvas-owning DOM component).** The brief requires Teddy to be
  "renderer-contained" but also to "respond naturally to external
  lighting" once placed in the World's own scene. A component that owns
  its *own* `<Canvas>` can't sit inside another `<Canvas>` (nested
  canvases create a second, wasteful WebGL context) — so `TeddyMesh` is
  the portable 3D content for embedding in the World's existing canvas,
  and `Teddy` is a thin wrapper that gives `TeddyMesh` its own small
  canvas + default lights for every other context (the demo, the board,
  anywhere Teddy needs to "just work" without a surrounding 3D scene).
  Both expose the exact same props/ref contract — see §7.
- **Blink implemented as a scale, not a texture/material swap.** Both eyes
  are a single `MeshStandardMaterial` sphere; blinking scales `y` toward
  ~0. No material or geometry change on blink, so it's essentially free
  every frame it's not happening and cheap the few frames it is.
- **Confused stays readable without eyebrows.** v1 leaned on asymmetric
  eyebrows for "confused." The 3D face has no separate brow geometry
  (kept off the silhouette, per §6 "extremely simple" face) — asymmetry
  instead comes from mismatched eye scale/offset plus a tilted, offset
  "unsure" mouth and a body-roll tilt, which reads clearly as "Hmm?" from
  a normal viewing distance without adding geometry.

---

## 4. File tree

```
modules/teddy/
├── README.md
├── src/
│   ├── Teddy.tsx              # default export — owns its own <Canvas>, full v1-compatible API
│   ├── Teddy3D.tsx             # TeddyMesh — the actual 3D content (embed in an existing Canvas)
│   ├── Teddy.types.ts          # public types — UNCHANGED contract + 2 additive optional props
│   ├── teddyExpressions.ts    # per-expression 3D face/body/glow config (replaces v1's SVG paths)
│   ├── teddyActions.ts        # action timing — UNCHANGED from v1
│   ├── useTeddyState.ts       # state machine — UNCHANGED from v1
│   ├── useReducedMotion.ts    # reduced-motion detection — UNCHANGED from v1
│   ├── TeddyGeometry.ts       # procedural pebble-body geometry
│   ├── TeddyMaterials.ts      # material factories (body/eye/mouth/tear/appendage)
│   ├── TeddyFace.tsx           # eyes, mouth, tears — real meshes, not textures
│   ├── TeddyAppendages.tsx    # tiny floating hands + wave motion
│   ├── TeddyParticles.tsx     # sparse warm particle accents (excited/jump only)
│   └── motionUtils.ts          # tiny keyframe sampler + damp() lerp helper
└── demo/
    └── TeddyPlayground.tsx    # unchanged control panel, now driving the 3D character
```

---

## 5. Component tree

```
<Teddy>                              (DOM div — positioning host, owns onInteraction)
 └── <Canvas>                        (own WebGL context, default lights + camera)
      └── <TeddyMesh>                (forwardRef — the real component; embeddable elsewhere)
           └── <group> (motion rig — position/rotation driven by useFrame)
                ├── <mesh> body       (pebble geometry, scaled for squash/stretch)
                ├── <TeddyFace>
                │    ├── eye L (sphere + highlight)
                │    ├── eye R (sphere + highlight)
                │    ├── mouth: arc mesh | flat/capsule mesh | open/circle mesh (visibility-toggled)
                │    └── tears (two cones, shown when expression.tears)
                ├── <TeddyAppendages>
                │    ├── left hand  (low-poly palm, idle bob)
                │    └── right hand (low-poly palm, idle bob + wave swing)
                └── <TeddyParticles> (sparse points, excited/jump only)
```

`TeddyMesh` is the only other component exported publicly besides `Teddy`
itself — `TeddyFace`/`TeddyAppendages`/`TeddyParticles` are internal detail
and may be restructured freely without affecting either public entry point.

---

## 6. Public component API — unchanged

```tsx
import { Teddy } from "modules/teddy/src";
import type { TeddyController } from "modules/teddy/src";

const ref = useRef<TeddyController>(null);

<Teddy
  ref={ref}
  expression="happy"
  action="wave"
  talking={false}
  scale={1}
  className="..."
  style={{}}
  reducedMotion={undefined}
  onAnimationStart={(action) => {}}
  onAnimationComplete={(action) => {}}
  onActionComplete={(action) => {}}
  onInteraction={(type, event) => {}}
/>
```

Every prop, the ref shape, and every callback's semantics are identical to
v1. Two **additive, fully optional** props were introduced for native 3D
placement and are ignored if omitted:

```tsx
position?: [number, number, number]; // default [0,0,0]
rotation?: [number, number, number]; // default [0,0,0]
```

### New: `TeddyMesh` (for embedding inside an existing R3F scene)

```tsx
import { TeddyMesh } from "modules/teddy/src";
import type { TeddyController } from "modules/teddy/src";

// inside the World module's own <Canvas>:
<TeddyMesh
  ref={ref}
  expression="excited"
  action="jump"
  position={[2.4, 0.6, -1.2]}
  scale={0.9}
/>
```

`TeddyMeshProps` is the same contract as `TeddyProps` minus the DOM-only
concerns (`className`, `style`, `id`, `aria-label`, `onInteraction`) that
don't apply to a mesh with no DOM node of its own.

---

## 7. Exported types

Unchanged from v1: `TeddyExpression`, `TeddyAction`, `TeddyProps`,
`TeddyController`, `TeddyInteractionType`, `HELD_ACTIONS`, `ONE_SHOT_ACTIONS`.

New in v2: `TeddyMeshProps` (see §6), and the `TeddyMesh` component itself.

No expression or action name was renamed, removed, or added.

---

## 8. Expression API

Unchanged interface (`expression` prop / `controller.setExpression()`);
new 3D-specific config lives in `teddyExpressions.ts` (`ExpressionConfig`):
per-eye scale and offset (independently, for asymmetry), a `mouth` mode,
mouth intensity/tilt, `tears`, an internal-glow intensity, a motion-energy
multiplier, a body tilt (roll), and a resting vertical offset. Every
expression in the brief's table (§8) — neutral/happy/sad/angry/confused/
surprised/excited/crying/sleepy — has a distinct combination of all of the
above; none is a palette swap.

---

## 9. Action/animation API

Unchanged interface (`action` prop / `controller.play()`); redesigned
motion per §12 of the brief:

| Action | v2 behavior |
|---|---|
| `idle` | gentle multi-frequency vertical float + slight roll — buoyancy, not a UI bob |
| `blink` | eye mesh scale → ~0.06 on Y, briefly, body barely moves |
| `talk` | mouth overridden to the open/circle mesh, flapping via a sine oscillation; body does not bounce |
| `walk` | reinterpreted as low-altitude floating locomotion: side-to-side drift + small vertical bob + roll — no legs, no humanoid gait |
| `jump` | anticipation squash → stretch upward → brief float at peak → fall → landing squash → settle, via `sampleKeyframes()` |
| `wave` | right appendage swings back and forth via a fast sine oscillation while the one-shot is active; left stays at rest |
| `hide` | smoothly (or, under reduced motion, instantly) settles to a lowered, slightly shrunk pose and holds there |
| `cry` | small multi-axis shake + lowered rest position; pairs with `expression="crying"`'s tears, which are independent of action |

Held vs. one-shot classification, interruption/replacement safety, and
`onActionComplete` semantics are all unchanged from v1 (`useTeddyState.ts`
wasn't touched).

---

## 10. Ref/controller API — unchanged

```ts
interface TeddyController {
  play: (action: TeddyAction) => void;
  setExpression: (expression: TeddyExpression) => void;
  setTalking: (talking: boolean) => void;
  reset: () => void;
  getState: () => {
    expression: TeddyExpression;
    action: TeddyAction;
    heldAction: TeddyAction;
    talking: boolean;
  };
}
```

---

## 11. Events/callbacks — unchanged

`onAnimationStart`, `onAnimationComplete`, `onActionComplete`,
`onInteraction` all fire exactly as documented in v1 — this logic lives
entirely in `useTeddyState.ts`, which was not modified.

---

## 12. 3D rendering approach

- **Geometry**: one `IcosahedronGeometry(radius, 2)` (≈320 triangles),
  displaced once at creation by a small closed-form function of each
  vertex's own normalized position (a couple of sine/cosine terms for
  organic bumps, a smoothstep-based taper at the top, a smoothstep-based
  flatten at the bottom, and one low-amplitude asymmetry term). No noise
  library, no runtime geometry rebuilding, memoized via `useMemo`.
- **Materials**: `MeshPhysicalMaterial` for the body/appendages (matte —
  moderate roughness, a touch of clearcoat, no metalness) with a low warm
  `emissive` whose intensity is driven by the current expression's `glow`
  value. Eyes are `MeshStandardMaterial` (dark, low roughness for a soft
  specular highlight) plus one tiny `MeshBasicMaterial` highlight sphere
  each — no textures anywhere on the character.
- **Face**: eyes are real spheres (scaled on Y for openness/blink, with a
  slow, tiny idle gaze drift), mouth is one of three pre-built primitive
  meshes (`TorusGeometry` arc for smile/frown, a `CapsuleGeometry` bar for
  flat/confused, a `CircleGeometry` disc for open/talk), tears are two
  `ConeGeometry` drops that animate via a looping modulo-time cycle.
- **Motion**: a single `useFrame` in `TeddyMesh` computes position/
  rotation/scale for the whole rig each frame — continuous sine/cosine
  terms for held/looping actions (idle, walk, cry), `sampleKeyframes()`
  (a ~10-line linear-interpolation helper, not a library) for the two
  one-shots with real shape (jump, wave), and an exponential `damp()` lerp
  for the hide transition so it settles smoothly without overshoot or a
  physics engine.
- **Lighting**: the character has no baked-in environment. `TeddyMesh`
  reacts to whatever `ambientLight`/`directionalLight`/`pointLight` exist
  in the scene it's placed in via standard Three.js material response —
  it adds none of its own. `Teddy` (the Canvas-owning wrapper) supplies a
  minimal warm 3-light rig *only inside its own canvas*, for standalone/
  demo use.
- **Particles**: a sparse (7-point) `THREE.Points` cloud, opacity-gated by
  an `intensity` value that's only non-zero for `expression="excited"` or
  `action="jump"`, and skipped entirely under reduced motion.

---

## 13. Performance considerations

- **Polygon count**: the body is ~320 triangles; two eye spheres, two
  highlight spheres, three mouth primitives (only one visible at a time),
  two tear cones, and two appendage icosahedra add roughly another
  200–300 triangles combined. The whole character is comfortably under
  1,000 triangles.
- **No textures, no GLB/GLTF, no asset loading** — everything is
  procedural or a Three.js primitive, created once via `useMemo` and never
  reallocated during normal operation (expression changes update existing
  material properties/visibility flags, not geometry).
- **No transmission/subsurface material** — see §3's design-decision entry
  on the emissive-glow approximation; this is the single biggest
  performance-vs-fidelity tradeoff in the redesign and was made
  deliberately per the brief's own §5 and §16 guidance.
- **No physics engine, no external animation library** — motion is
  `useFrame` + arithmetic (§12), so there's no per-frame allocation beyond
  the `Vector3` reused inside `TeddyGeometry.ts`'s one-time build pass.
- **Particles are capped at 7 points** and only active in two states,
  never competing with Teddy for visual weight (brief §14).
- **Nested-canvas avoidance**: `TeddyMesh` is the thing to embed in the
  World's own canvas (see §15) — never render `<Teddy />` (which owns its
  own canvas) inside another `<Canvas>`; that would create a second,
  redundant WebGL context and renderer.
- **`dpr` is capped at `[1, 1.75]`** on `Teddy`'s own canvas to avoid
  full-resolution rendering costs on high-DPI displays for a
  160×190-ish on-screen character.

---

## 14. Reduced-motion behavior

Unchanged detection mechanism (`useReducedMotion.ts`, untouched) and
unchanged policy shape from v1, reapplied to the new motion system:

- Idle float, walk drift, jump's arc, wave's swing, and cry's shake are
  all removed or reduced to non-displacing amplitudes.
- `walk` becomes a tiny in-place vertical bob (no side-to-side drift).
- `hide` still reaches its lowered/shrunk pose (a deliberate content state
  requested by the parent, not decorative motion) but transitions there
  instantly instead of easing.
- Blinking, mouth/talk articulation, expression changes (eye
  scale/offset, mouth shape, glow intensity), and tears are all preserved
  — Teddy stays visibly alive and emotionally legible without any
  positional animation.
- Particles are disabled entirely under reduced motion.
- Nothing flashes, strobes, or shakes rapidly in this mode.

---

## 15. Integration instructions / adapter expectations

- **Standalone / demo / anywhere without an existing 3D scene**: use the
  default `<Teddy />` export exactly as in v1 — it owns its own small
  canvas and default lighting.
- **Embedding inside the World module's existing `<Canvas>`**: import and
  render `<TeddyMesh />` directly, positioned/scaled/rotated by whatever
  slot the World module provides, so Teddy is lit by the World's actual
  lights (ambient/directional/point/warm glow) rather than his own
  isolated rig. **Do not** nest `<Teddy />` inside another `<Canvas>`.
- **Story-beat mapping is unchanged from v1** — hover progression
  (`neutral → confused → sad → crying`, then `play("hide")`), jump-on-
  select (`setExpression("excited")` + `play("jump")`, gated on
  `onActionComplete("jump")`), exit-hover reactions, and the `talking`
  overlay for dialogue text are all driven the same way as documented in
  the v1 README — only the visual result changed, not the contract any
  other module programs against.
- Teddy still has zero built-in knowledge of World/WELCOME/HELLO/Bricks/
  Board/Exit/Portfolio/Portal/routing — every reaction is driven by
  whichever module owns that event, through `expression`/`action`/
  `talking`/the ref, exactly as before.

---

## 16. New dependency requirements

Two runtime dependencies were added (both already implied by
MASTER_CONTEXT's "React Three Fiber / Three.js may be used" for the
World/Bricks/Board modules — Teddy does not introduce a *new* ecosystem to
the project, just consumes the one already anticipated):

- `three` (tested against the r128 API surface — `IcosahedronGeometry`,
  `MeshPhysicalMaterial` with `clearcoat`/`emissive`, `TorusGeometry`,
  `CapsuleGeometry`, `CircleGeometry`, `ConeGeometry`, `Points`; nothing
  version-exotic)
- `@react-three/fiber` (`Canvas`, `useFrame`) — v8.x

No `@react-three/drei`, no physics library, no dedicated animation/tween
library, and no texture/asset pipeline were added — consistent with the
brief's §15/§16 constraints.

---

## 17. Testing / verification note

This redesign was built and iterated against a **vanilla Three.js parity
preview** (r128, the same geometry/material/motion math as the real
`TeddyGeometry.ts`/`TeddyMaterials.ts`/`Teddy3D.tsx`) rendered live during
development to actually look at the shape, material, and motion rather
than trusting that "the TypeScript compiles" — per the brief's closing
instruction. That preview is not a repo artifact; it was a throwaway
verification step. It does **not** substitute for the final integrator
running the real `TeddyPlayground` inside the actual Next.js + React
Three Fiber app — this sandbox cannot run an `npm install` / dev server
for the true R3F component tree, so **please do run `/dev/teddy` in the
real app before shipping** and sanity-check silhouette, material
response under the World's actual lighting, and frame rate alongside the
rest of the scene.

---

## 18. Local demo instructions

Unchanged from v1: `demo/TeddyPlayground.tsx` only imports from `../src`.

1. Copy `modules/teddy/` into the repo.
2. `app/dev/teddy/page.tsx`:
   ```tsx
   export { default } from "../../../modules/teddy/demo/TeddyPlayground";
   ```
3. `npm install three @react-three/fiber` (if not already present from
   another module), then `npm run dev` and visit `/dev/teddy`.

The playground is functionally identical to v1: all 9 expressions, all 8
actions (via the ref), `talking`, `reducedMotion`, `reset()`, and a live
event log for `onAnimationStart`/`onActionComplete` — now visually
demonstrating the 3D character instead of the SVG rig.

---

## 19. Known limitations

- The body mesh squashes/stretches independently of the face/appendages
  (they're siblings under the same group, not parented to the body mesh)
  — this keeps eyes/mouth undistorted during a jump's squash-stretch,
  which reads better than a distorted face, but means the face doesn't
  "belong" to the deforming body during that one action. Acceptable
  tradeoff; flagged here in case the integrator wants the face to inherit
  body squash later.
- No true subsurface/transmission effect — see §3 and §13. If a future
  pass wants real subsurface, `TeddyMaterials.ts` is the only file that
  needs to change.
- Eye "gaze" is a small idle drift, not a true look-at-target system —
  sufficient for "feels alive," not sufficient for "looks at the cursor"
  or "looks at a destination brick." That would be a deliberate future
  addition, not implied by the current brief.
- No shadow-casting setup beyond `castShadow`/`receiveShadow` flags on
  the body mesh — actual shadows depend on the host scene's renderer
  (`shadowMap.enabled`) and a shadow-casting light, which are the World
  module's responsibility, not Teddy's.
- As in v1, Teddy has no built-in "boredom" timer for the hover-neglect
  emotional progression — that pacing is still owned by whichever module
  drives `expression`/`action` in response to hover events.

---

## 20. Addendum — "look back" facing + low-poly palm appendages

Two additive follow-up changes, both fully backward compatible (nothing
renamed or removed):

**Facing / "look back."** A new optional `facing?: "front" | "back"` prop
(also on `TeddyMeshProps`) and a matching `controller.setFacing()` method
let a parent turn Teddy 180° to look the opposite direction — e.g. a story
beat where he glances back over his shoulder. Same pattern as every other
piece of state here: controlled via the prop, or driven imperatively via
the ref, your choice. The turn is animated (a short damped rotation, same
`damp()` helper used for `hide`) unless reduced motion is active, in which
case it snaps instantly — consistent with the rest of the reduced-motion
policy in §14. `TeddyFacing` is exported from `Teddy.types.ts` /
`index.ts`. This is deliberately **not** folded into `useTeddyState.ts` —
that file stays exactly what it was in v1 (see §1's table); facing is a
small, separate `useState` inside `TeddyMesh` that follows the same
controlled-prop-plus-ref-override shape by hand.

```tsx
<Teddy expression="confused" facing="back" />
// or imperatively:
teddyRef.current?.setFacing("back");
```

**Low-poly palm appendages.** The two tiny floating hands were plain
`IcosahedronGeometry` blobs in the first pass. `TeddyGeometry.ts` now also
exports `createPalmGeometry()` — a low-segment `SphereGeometry` (facets
intentionally visible, matching the body's own low-poly language)
non-uniformly scaled into a small flattened palm/paddle silhouette. Both
appendages share one geometry instance (created once, reused for left and
right — no extra allocation).

**Hands weren't visible at all — real bug, now fixed.** The original hand
position (`x = ±0.44`) was, on checking the actual body geometry's extent,
*inside* the pebble body's silhouette at that height (the body's widest
bump reaches roughly ±0.66 along X) — so both hands were fully occluded by
the opaque body mesh the entire time, on every action, not just wave.
They're now anchored at `x = ±0.88`, clearly outside the body, with
`PALM_RADIUS`/`PALM_Y_SCALE` exported from `TeddyGeometry.ts` so the two
files can't silently drift back out of sync on a future resize. The
default `<Teddy />` canvas was also widened (200×200 square instead of
160×190, camera pulled back to `z = 3.7`) so the now-wider silhouette
(body + both outstretched hands) stays comfortably inside frame instead
of clipping at the edges — `<TeddyMesh />` embedded in the World's own
canvas is unaffected, since framing there is the World module's own
camera's responsibility.

**Wave is now a literal bottom-anchored Y-axis pivot, per explicit
request.** Each hand is a child of its own pivot `<group>`, offset upward
by exactly half the palm's height (`HAND_LIFT`) so the pivot sits at the
palm's *bottom* tip rather than its center. `wave` rotates the right
pivot's `rotation.y` — the hand swings/twists from that fixed bottom
point, exactly as described, rather than spinning in the screen plane
around its own center the way the first pass did.

**Wave, simplified.** The original wave swing computed a progress-since-
start value and sampled a hand-authored keyframe curve from it (the same
pattern jump still uses). That wasn't visibly animating and, without a
way to inspect a live render from here, continuing to debug the timing
calculation blind wasn't a responsible way to fix it. `wave` now drives
the right hand with a plain `Math.sin(t * speed) * amplitude` for as long
as the one-shot is active — no start-time bookkeeping to get wrong, no
step where a bad value silently produces zero visible motion. It's a
less "choreographed" swing than the keyframe version was intended to be,
but it is guaranteed to move. If a more designed swing is wanted later,
`sampleKeyframes()` (kept, still used by `jump`) is the tool for it —
just verify it against a real render before relying on it again.

---

## 21. MODULE STATUS

**Complete.** All 9 expressions and 8 actions are implemented on the new
3D renderer, the public API (props, ref, callbacks, expression/action
names) is unchanged from v1 aside from two additive optional 3D-placement
props and the new `TeddyMesh` export, reduced motion is handled per the
brief, and the demo playground exercises every combination.

## 22. FILES CREATED / CHANGED

```
modules/teddy/README.md                    (rewritten for v2, updated again for §20 addendum)
modules/teddy/src/Teddy.tsx                 (rewritten — Canvas wrapper; passes through `facing`)
modules/teddy/src/Teddy3D.tsx               (new — TeddyMesh; §20 added `facing`/`setFacing`)
modules/teddy/src/Teddy.types.ts            (additive changes only; §20 added `TeddyFacing`)
modules/teddy/src/teddyExpressions.ts       (rewritten for 3D config)
modules/teddy/src/TeddyGeometry.ts          (new; §20 added `createPalmGeometry()`)
modules/teddy/src/TeddyMaterials.ts         (new)
modules/teddy/src/TeddyFace.tsx             (new — capsule geometry swapped for a stretched sphere, see §3/§16)
modules/teddy/src/TeddyAppendages.tsx       (new; §20 swapped icosahedra for low-poly palms + rest tilt)
modules/teddy/src/TeddyParticles.tsx        (new)
modules/teddy/src/motionUtils.ts            (new)
modules/teddy/src/teddyActions.ts           (unchanged — carried over as-is)
modules/teddy/src/useTeddyState.ts          (unchanged — carried over as-is)
modules/teddy/src/useReducedMotion.ts       (unchanged — carried over as-is)
modules/teddy/demo/TeddyPlayground.tsx      (adds facing toggle; otherwise unchanged)
```

Files removed (superseded by the above, SVG/CSS renderer no longer used):
`Teddy.module.css` (v1's CSS keyframe file — no longer applicable).

## 23. FILES MODIFIED OUTSIDE THIS MODULE

None. This redesign, like v1, was built in an isolated workspace and does
not touch any other module or any existing repository file.

## 24. Confirmation of independence

Teddy (v2) does not import from, reference, or assume the existence of
Modules 02–07 (World, Bricks, Board, Exit, Professional Portfolio, Portal).
It has no knowledge of WELCOME/HELLO, destinations, projects, the board,
routing, or the portal. All emotional/behavioral reactions to page-level
events remain the responsibility of whichever module owns that event,
driven entirely through Teddy's existing props/ref surface.
