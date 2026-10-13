import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { createAppendageMaterial } from "./TeddyMaterials";
import { createPalmGeometry, PALM_RADIUS, PALM_Y_SCALE } from "./TeddyGeometry";
import type { TeddyExpression } from "./Teddy.types";

export interface TeddyAppendagesProps {
  glow: number;
  energy: number;
  /** Current emotional expression — hands lift/spread/droop to match it. */
  expression: TeddyExpression;
  /** True while the "wave" one-shot is the visible action. */
  waving: boolean;
  reducedMotion: boolean;
}

// Anchor points sit clearly outside the body's silhouette. The pebble body
// (see TeddyGeometry.ts) tops out at roughly ±0.66 along X at its widest
// bump — anchoring the hands at ±0.88 leaves a real, visible gap rather
// than burying them inside the body mesh (the bug in the previous pass:
// the old ±0.44 position was *inside* the body's silhouette at that
// height, so the hands were fully occluded and never visible at all).
const ANCHOR_L: [number, number, number] = [-0.88, -0.05, 0.05];
const ANCHOR_R: [number, number, number] = [0.88, -0.05, 0.05];

// The palm mesh is a child of its anchor/pivot group, lifted by half its
// own height so the *bottom* tip of the palm sits exactly at the anchor
// point — i.e. the anchor is the base the hand hangs/stands from, not its
// center. Rotating the pivot then pivots the hand from that bottom point.
const HAND_LIFT = PALM_RADIUS * PALM_Y_SCALE;

// Small resting outward yaw so the palms read as angled little hands at
// rest, not flat paddles facing straight ahead.
const REST_YAW_L = 0.3;
const REST_YAW_R = -0.3;

// Wave = the right hand's pivot twisting back and forth around its own
// vertical (Y) axis, anchored at its bottom point — a plain continuous
// oscillation so there's no start-time bookkeeping that could silently fail
// to animate.
const WAVE_SPEED = 9; // rad/s
const WAVE_AMPLITUDE = 1.1; // rad (~63°) either side of rest

export function TeddyAppendages({ glow, energy, expression, waving, reducedMotion }: TeddyAppendagesProps) {
  const mat = useMemo(() => createAppendageMaterial(glow), [glow]);
  const palmGeometry = useMemo(() => createPalmGeometry(), []);
  const pivotL = useRef<THREE.Group>(null);
  const pivotR = useRef<THREE.Group>(null);

  // How the mood sits in the shoulders: excited/surprised throw hands up and
  // out, happy lifts them a touch, sad/crying let them hang low and inward.
  const lift =
    expression === "excited" ? 0.16 : expression === "surprised" ? 0.12 : expression === "happy" ? 0.06 : expression === "sad" || expression === "crying" || expression === "sleepy" ? -0.1 : 0;
  const spread = expression === "excited" ? 0.07 : expression === "surprised" ? 0.05 : expression === "sad" || expression === "crying" ? -0.05 : 0;
  const droop = expression === "sad" || expression === "crying" || expression === "sleepy" ? 1 : 0;
  const celebrate = expression === "excited" || expression === "happy" || expression === "surprised" ? 1 : 0;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speed = 1.6 * Math.max(0.55, energy);
    const idleBob = reducedMotion ? 0 : Math.sin(t * speed) * (0.008 + 0.012 * energy);

    if (pivotL.current) {
      pivotL.current.position.set(
        ANCHOR_L[0] - spread,
        ANCHOR_L[1] + lift + idleBob,
        ANCHOR_L[2]
      );
      pivotL.current.rotation.y = REST_YAW_L + droop * 0.14;
      pivotL.current.rotation.z =
        droop * 0.28 +
        (reducedMotion ? 0 : Math.sin(t * speed + 0.8) * (0.02 + 0.03 * celebrate));
    }

    const wavingNow = waving && !reducedMotion;
    const wave = wavingNow ? Math.sin(t * WAVE_SPEED) * WAVE_AMPLITUDE : 0;
    const waveBob = wavingNow ? Math.abs(Math.sin(t * WAVE_SPEED)) * 0.055 : 0;
    const waveLean = wavingNow ? Math.sin(t * WAVE_SPEED + 0.6) * 0.22 : 0;

    if (pivotR.current) {
      pivotR.current.position.set(
        ANCHOR_R[0] + spread + (wavingNow ? 0.1 : 0),
        ANCHOR_R[1] + lift + idleBob + (wavingNow ? 0.2 : 0) + waveBob,
        ANCHOR_R[2]
      );
      pivotR.current.rotation.y = REST_YAW_R + wave - droop * 0.14;
      pivotR.current.rotation.z =
        -droop * 0.28 +
        waveLean +
        (reducedMotion ? 0 : Math.sin(t * speed + 1.6) * (0.02 + 0.03 * celebrate));
    }
  });

  return (
    <group>
      <group ref={pivotL}>
        <mesh material={mat} geometry={palmGeometry} position={[0, HAND_LIFT, 0]} />
      </group>
      <group ref={pivotR}>
        <mesh material={mat} geometry={palmGeometry} position={[0, HAND_LIFT, 0]} />
      </group>
    </group>
  );
}
