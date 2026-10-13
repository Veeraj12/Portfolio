import { useCallback, useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useAnchorRef } from "./anchors";
import { GroundedText3D } from "./GroundedText3D";
import {
  WELCOME_FALL_HEIGHT,
  WELCOME_TIMING,
  WELCOME_REST_Y,
  impliedGravity,
  dampedOscillation,
  easeOutCubic,
  scaledDuration,
} from "./timing";
import { OPENING_STATE_ORDER } from "./types";
import type { OpeningState, QualityLevel } from "./types";

export interface WelcomeTextProps {
  state: OpeningState;
  quality: QualityLevel;
  reducedMotion: boolean;
  /** XZ placement on the stage; the component supplies its own rest height. */
  position?: [number, number, number];
  color?: string;
  /** Surface tuning for the carved letter material. Lower roughness gives the
   *  extruded faces/bevels a subtler sheen so the word reads as a solid,
   *  finished object rather than a flat matte cutout. */
  roughness?: number;
  metalness?: number;
  emissiveIntensity?: number;
  /** Sketch/hatch fill + dark outline, matching the reference text effect. */
  hatch?: boolean;
  hatchSpacing?: number;
  hatchWidth?: number;
  hatchShade?: number;
  outline?: boolean;
  outlineColor?: string;
  outlineThickness?: number;
  /** Typeface JSON URL consumed by drei's Text3D. See README "Dependencies" —
   *  this defaults to three.js's own examples CDN so the module needs no
   *  bundled font asset; swap in a self-hosted URL for production. */
  fontUrl?: string;
}

const DEFAULT_FONT_URL = "https://threejs.org/examples/fonts/helvetiker_bold.typeface.json";

const FALL_START_INDEX = OPENING_STATE_ORDER.indexOf("welcome-falling");

/**
 * Conservative fallback for WELCOME's half-width used to clamp the impact/
 * settle tilt until the real geometry has been measured. Deliberately a bit
 * wider than the actual rendered word (there is no fallback for half-height,
 * since only the horizontal extent matters for tilt) — over-estimating the
 * width only ever makes the clamp stricter. Once GroundedText3D reports the
 * measured box this value is replaced by the source of truth.
 */
const FALLBACK_HALF_WIDTH = 3.5;

/**
 * Largest fraction of the ground clearance the tilt may consume.
 * The impact and settle tilt rotates the word about its bottom-center pivot,
 * which dips the word's horizontal extremes by roughly
 * `halfWidth * sin(tilt)`. Capping that dip below WELCOME_REST_Y is what
 * keeps the beveled underside clear of the ground's top surface through the
 * entire impact/settle choreography.
 */
const MAX_TILT_CLEARANCE_FRACTION = 0.7;

/**
 * WELCOME as a physical object: a heavy, matte, extruded 3D word that falls
 * under real kinematics, THUDs on the ground, bounces once, and settles —
 * rather than fading or scaling in.
 *
 * Motion is driven purely by `state` + elapsed-time-in-state, using the
 * exact same WELCOME_TIMING constants OpeningScene uses to size its state
 * durations, so the visual and the state machine can never drift apart.
 *
 * Grounding: GroundedText3D measures the real geometry (bevel and extrusion
 * included) and reports it via onMeasured; that measurement is what clamps
 * the tilt, and WELCOME_REST_Y is what seats the word's measured bottom a
 * visible clearance above the ground's top surface. No hand-derived height
 * constant participates in the vertical placement.
 */
export function WelcomeText({
  state,
  quality,
  reducedMotion,
  position = [0, 0, -6],
  color = "#d9e5ee",
  roughness = 0.34,
  metalness = 0.28,
  emissiveIntensity = 0.055,
  hatch = false,
  hatchSpacing = 0.15,
  hatchWidth = 0.15,
  hatchShade = 0.42,
  outline = false,
  outlineColor = "#241809",
  outlineThickness = 0.018,
  fontUrl = DEFAULT_FONT_URL,
}: WelcomeTextProps) {
  const groupRef = useRef<Group | null>(null);
  const anchorRef = useAnchorRef("WELCOME_ANCHOR");

  const phaseElapsed = useRef(0);
  const lastState = useRef<OpeningState>(state);
  /** Half of the measured geometry width; tilt dip scales with this. */
  const halfWidth = useRef(FALLBACK_HALF_WIDTH);

  // Reduced motion: collapse the whole fall/impact/settle into a near-instant,
  // gentle arrival — no aggressive physics, per accessibility requirements.
  // Uses the exact same scaledDuration() OpeningScene uses to size the
  // corresponding state durations, so visual and state-machine timing agree.
  const fallDuration = scaledDuration(WELCOME_TIMING.fall, reducedMotion);
  const settleDuration = scaledDuration(WELCOME_TIMING.settle, reducedMotion);
  const fallHeight = reducedMotion ? 0.6 : WELCOME_FALL_HEIGHT;
  const gravity = impliedGravity(fallHeight, fallDuration);
  const bounceAmplitude = reducedMotion ? 0 : 0.045;
  const impactTiltAmplitude = reducedMotion ? 0 : 0.015;
  const settleTiltAmplitude = reducedMotion ? 0 : 0.012;

  const stateIndex = OPENING_STATE_ORDER.indexOf(state);
  const visible = stateIndex >= FALL_START_INDEX;

  const setTransform = useCallback(
    (group: Group, dropY: number, squashY: number, tilt: number) => {
      const squashXZ = 1 / Math.sqrt(Math.max(0.35, squashY));
      group.position.set(
        position[0],
        position[1] + WELCOME_REST_Y + dropY,
        position[2],
      );
      group.scale.set(squashXZ, squashY, squashXZ);
      group.rotation.z = tilt;
    },
    [position],
  );

  /** Clamp an intended tilt so its dip (halfWidth * sin(tilt), widened by
   *  any squash expansion) stays within WELCOME_REST_Y's usable clearance.
   *  Strictly shrinks the tilt, so the choreography's shape is preserved. */
  const clampTilt = useCallback((tilt: number, squashY: number): number => {
    const squashXZ = 1 / Math.sqrt(Math.max(0.35, squashY));
    const effectiveHalfWidth = halfWidth.current * squashXZ;
    const maxTilt =
      Math.asin(
        Math.min(
          1,
          (WELCOME_REST_Y * MAX_TILT_CLEARANCE_FRACTION) / Math.max(0.001, effectiveHalfWidth),
        ),
      );
    return Math.sign(tilt) * Math.min(Math.abs(tilt), maxTilt);
  }, []);

  const onMeasured = useCallback(
    (box: { width: number; depth: number; height: number }) => {
      if (box.width > 0) halfWidth.current = box.width / 2;
    },
    [],
  );

  const applyInitialTransform = useCallback(
    (group: Group) => {
      if (state === "welcome-falling") {
        setTransform(group, fallHeight, 1, 0);
      } else if (stateIndex >= FALL_START_INDEX) {
        setTransform(group, 0, 1, 0);
      }
    },
    [fallHeight, setTransform, state, stateIndex],
  );

  // Synchronous guarantee: the callback ref runs the moment the group object
  // attaches, before any rendered frame — so the very first visible frame is
  // already at the correct pose (high in the fall, or settled) and never
  // flickers at the parent's default origin.
  const ref = useCallback(
    (o: Group | null) => {
      groupRef.current = o;
      anchorRef(o);
      if (o) applyInitialTransform(o);
    },
    // anchorRef only references stable context values; see anchors.ts.
    [anchorRef, applyInitialTransform],
  );

  // Backstop for prop-driven transitions after mount (e.g. a replay or
  // quality change) — keeps the transform consistent with `state` before the
  // next useFrame runs.
  useLayoutEffect(() => {
    if (groupRef.current) applyInitialTransform(groupRef.current);
  }, [applyInitialTransform]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (state !== lastState.current) {
      phaseElapsed.current = 0;
      lastState.current = state;
    } else {
      phaseElapsed.current += delta;
    }

    let dropY = 0; // offset above rest, in world units
    let squashY = 1;
    let tilt = 0;

    if (state === "welcome-falling") {
      const t = Math.min(phaseElapsed.current, fallDuration);
      dropY = fallHeight - 0.5 * gravity * t * t;
      // A faint stretch along the fall direction — reads as speed, not jelly.
      squashY = 1 + 0.03 * (t / fallDuration);
    } else if (state === "welcome-impact") {
      dropY = 0;
      const impactDuration = scaledDuration(WELCOME_TIMING.impact, reducedMotion);
      const t = Math.min(1, phaseElapsed.current / impactDuration);
      const squashDepth = reducedMotion ? 0.08 : 0.32;
      squashY = 1 - squashDepth * easeOutCubic(t);
      tilt = clampTilt(impactTiltAmplitude * easeOutCubic(t), squashY);
    } else if (state === "welcome-settle") {
      dropY = 0;
      const t = phaseElapsed.current;
      const settled = t >= settleDuration;
      squashY = settled ? 1 : 1 + dampedOscillation(t, bounceAmplitude, 18, 7);
      tilt = settled ? 0 : clampTilt(dampedOscillation(t, settleTiltAmplitude, 14, 8), squashY);
    } else if (stateIndex > OPENING_STATE_ORDER.indexOf("welcome-settle")) {
      dropY = 0;
      squashY = 1;
      tilt = 0;
    } else {
      // Defensive only: unreachable in practice, since this block only runs
      // once the group has mounted (visible === true), which already
      // implies state is one of the three phases above or later. Kept in
      // case OPENING_STATE_ORDER is ever reordered.
      dropY = fallHeight + 1;
    }

    setTransform(groupRef.current, dropY, squashY, tilt);
  });

  return (
    <group ref={ref} visible={visible}>
      <GroundedText3D
        text="WELCOME"
        font={fontUrl}
        size={1.5}
        // Deeper extrusion + a crisper bevel catch more of the warm key light
        // along the channel edges, giving the word a carved, finished material
        // read rather than a flat front face.
        height={0.42}
        curveSegments={quality === "low" ? 4 : quality === "medium" ? 8 : 12}
        bevelThickness={0.03}
        bevelSize={0.022}
        bevelSegments={quality === "low" ? 2 : 4}
        castShadow={quality !== "low"}
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissiveIntensity={emissiveIntensity}
        hatch={hatch}
        hatchSpacing={hatchSpacing}
        hatchWidth={hatchWidth}
        hatchShade={hatchShade}
        outline={outline}
        outlineColor={outlineColor}
        outlineThickness={outlineThickness}
        onMeasured={onMeasured}
      />
    </group>
  );
}
