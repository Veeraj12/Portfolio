import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type {
  PointLight as ThreePointLight,
  AmbientLight as ThreeAmbientLight,
  DirectionalLight as ThreeDirectionalLight,
  Object3D,
} from "three";
import type { OpeningState, QualityLevel } from "./types";

export interface LightingSystemProps {
  state: OpeningState;
  quality: QualityLevel;
  reducedMotion: boolean;
  /** Rest position of the small spark light (STATE 2-6's light source). */
  sparkPosition?: [number, number, number];
  /** Point the key light aims at — roughly the stage center. */
  keyTarget?: [number, number, number];
}

/**
 * V3 lighting model — still three restrained instruments, but the "spark"
 * is now light-only: there is deliberately NO visible mesh/sphere at its
 * position. V2 rendered a small emissive sphere there, and V3 feedback was
 * explicit that a visible glowing orb reads as a lighting-effect prop, not
 * cinematic lighting, however small it's made. The light itself still
 * animates position (a brief downward drift during "falling"/"impact",
 * settling afterward) so STATE 4/5's beat still reads as "something
 * happened" — as a moving pool of warm light on the ground, not an object.
 *
 *   SPARK   — tiny point light, fixed short radius, no geometry. This IS
 *              the "tiny warm light" from STATE 2/3. Its radius never
 *              grows, only its intensity and position animate.
 *   KEY     — one warm directional light. This is what actually reveals the
 *              ground/WELCOME and casts the shadows that give the scene
 *              physical weight. Fades in starting at "reveal".
 *   FILL    — very low ambient light so shadows read as dark, not pure
 *              black. Capped low on purpose — the scene stays
 *              predominantly dark by design.
 *
 * No light's "distance"/radius grows over time. That growing-radius pattern
 * was the structural cause of the "everything glows" problem this module
 * has been correcting since V2.
 */

const SPARK_INTENSITY: Record<OpeningState, number> = {
  darkness: 0,
  "glow-appear": 0.55,
  "glow-expand": 1.05,
  falling: 1.15,
  impact: 1.25,
  reveal: 0.55,
  "welcome-falling": 0.3,
  "welcome-impact": 0.3,
  "welcome-settle": 0.25,
  "teddy-slot-active": 0.2,
  "teddy-gesture": 0.2,
  complete: 0.2,
};

// V3: nudged up slightly so the (now slightly lighter) ground and WELCOME
// read with confident contrast at the pulled-back camera distance, while
// staying well short of anything that would look "lit like daytime."
const KEY_INTENSITY: Record<OpeningState, number> = {
  darkness: 0,
  "glow-appear": 0,
  "glow-expand": 0,
  falling: 0,
  impact: 0.06,
  reveal: 0.95,
  "welcome-falling": 1.15,
  "welcome-impact": 1.25,
  "welcome-settle": 1.2,
  "teddy-slot-active": 1.2,
  "teddy-gesture": 1.2,
  complete: 1.2,
};

const FILL_INTENSITY: Record<OpeningState, number> = {
  darkness: 0,
  "glow-appear": 0.01,
  "glow-expand": 0.02,
  falling: 0.03,
  impact: 0.04,
  reveal: 0.09,
  "welcome-falling": 0.12,
  "welcome-impact": 0.14,
  "welcome-settle": 0.12,
  "teddy-slot-active": 0.12,
  "teddy-gesture": 0.12,
  complete: 0.12,
};

// States in which the spark light has already settled at its resting
// height (used to drive its brief positional drift — see SparkEmber's
// removed V2 mesh; this is the same motion, now applied to the light only).
const SPARK_SETTLED_STATES: readonly OpeningState[] = [
  "impact",
  "reveal",
  "welcome-falling",
  "welcome-impact",
  "welcome-settle",
  "teddy-slot-active",
  "teddy-gesture",
  "complete",
];

const SPARK_COLOR = "#77d8ef";
const KEY_COLOR = "#9fc9e8";
const FILL_COLOR = "#8f9bb0"; // very low intensity, faint cool-neutral fill so shadow reads as dark, not warm

export function LightingSystem({
  state,
  quality,
  reducedMotion,
  sparkPosition = [0, 0.06, -1],
  keyTarget = [0, 0.6, -4],
}: LightingSystemProps) {
  const sparkRef = useRef<ThreePointLight>(null);
  const keyRef = useRef<ThreeDirectionalLight>(null);
  const fillRef = useRef<ThreeAmbientLight>(null);
  const targetRef = useRef<Object3D | null>(null);
  const current = useRef({ spark: 0, key: 0, fill: 0 });
  const sparkY = useRef(sparkPosition[1] + 2.2);

  const smoothing = reducedMotion ? 0.35 : quality === "low" ? 0.12 : 0.07;
  const castShadow = quality !== "low" && !reducedMotion;

  // Configure the directional light's shadow frustum once — a fixed
  // symmetric box sized to comfortably cover the stage, not something that
  // needs to track state.
  useEffect(() => {
    const key = keyRef.current;
    if (!key) return;
    // Assigned imperatively: the target Object3D's ref populates in the
    // same commit as the light's, so wiring it via the `target` JSX prop
    // on first render would race a null ref. Doing it here guarantees both
    // exist first.
    if (targetRef.current) key.target = targetRef.current;
    key.shadow.mapSize.set(quality === "high" ? 1024 : 512, quality === "high" ? 1024 : 512);
    key.shadow.camera.left = -9;
    key.shadow.camera.right = 9;
    key.shadow.camera.top = 9;
    key.shadow.camera.bottom = -9;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 24;
    key.shadow.bias = -0.0015;
    key.shadow.camera.updateProjectionMatrix();
  }, [quality]);

  useFrame((_, delta) => {
    const targetSpark = SPARK_INTENSITY[state];
    const targetKey = KEY_INTENSITY[state];
    const targetFill = FILL_INTENSITY[state];

    current.current.spark += (targetSpark - current.current.spark) * (1 - smoothing);
    current.current.key += (targetKey - current.current.key) * (1 - smoothing);
    current.current.fill += (targetFill - current.current.fill) * (1 - smoothing);

    if (sparkRef.current) sparkRef.current.intensity = current.current.spark;
    if (keyRef.current) keyRef.current.intensity = current.current.key;
    if (fillRef.current) fillRef.current.intensity = current.current.fill;

    // Light-only "fall": a brief downward drift during STATE 4/5, settling
    // at rest height from "impact" onward. No mesh — the viewer only ever
    // sees the moving pool of light this casts on the ground, never an
    // object, per V3 feedback against a visible glowing prop.
    let targetY = sparkPosition[1] + 2.2;
    if (state === "falling") {
      targetY = sparkPosition[1] + (reducedMotion ? 0.4 : 1.4);
    } else if (SPARK_SETTLED_STATES.includes(state)) {
      targetY = sparkPosition[1];
    }
    const speed = reducedMotion ? 0.35 : 0.12;
    sparkY.current += (targetY - sparkY.current) * (1 - Math.pow(speed, delta * 10));
    if (sparkRef.current) {
      sparkRef.current.position.set(sparkPosition[0], sparkY.current, sparkPosition[2]);
    }
  });

  return (
    <>
      <ambientLight ref={fillRef} color={FILL_COLOR} intensity={0} />

      <pointLight
        ref={sparkRef}
        color={SPARK_COLOR}
        position={[sparkPosition[0], sparkPosition[1] + 2.2, sparkPosition[2]]}
        intensity={0}
        distance={2.6}
        decay={2}
      />

      <directionalLight
        ref={keyRef}
        color={KEY_COLOR}
        position={[4.5, 6.5, 2.5]}
        intensity={0}
        castShadow={castShadow}
      />
      <object3D ref={targetRef} position={keyTarget} />
    </>
  );
}
