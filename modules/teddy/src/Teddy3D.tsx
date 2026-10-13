import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { createPebbleGeometry } from "./TeddyGeometry";
import { createBodyMaterial } from "./TeddyMaterials";
import { TeddyFace } from "./TeddyFace";
import { TeddyAppendages } from "./TeddyAppendages";
import { TeddyParticles } from "./TeddyParticles";
import { useResolvedReducedMotion } from "./useReducedMotion";
import { useTeddyState } from "./useTeddyState";
import { ACTION_TIMING } from "./teddyActions";
import { EXPRESSIONS } from "./teddyExpressions";
import { sampleKeyframes, damp, type Stop } from "./motionUtils";
import type { TeddyController, TeddyFacing, TeddyMeshProps } from "./Teddy.types";

// Jump: anticipation squash → stretch upward → float → fall → landing
// squash → settle. Values are Y offset (world units).
const JUMP_Y: Stop[] = [
  [0, 0],
  [0.15, -0.02],
  [0.45, 0.42],
  [0.75, 0.42],
  [0.9, -0.015],
  [1, 0],
];
const JUMP_SCALE_Y: Stop[] = [
  [0, 1],
  [0.15, 0.82],
  [0.45, 1.12],
  [0.75, 1.04],
  [0.9, 0.86],
  [1, 1],
];
const JUMP_SCALE_XZ: Stop[] = [
  [0, 1],
  [0.15, 1.14],
  [0.45, 0.92],
  [0.75, 0.97],
  [0.9, 1.12],
  [1, 1],
];

/**
 * TeddyMesh — the actual 3D character. Renders as a group of meshes; has
 * no opinion about cameras, lights, or canvases, so it can live inside any
 * existing React Three Fiber `<Canvas>` (e.g. the World module's scene).
 * Owns the full behavioral contract (state machine, ref controller,
 * callbacks) — `<Teddy />` in Teddy.tsx is a thin DOM/Canvas wrapper around
 * this component for standalone use.
 */
export const TeddyMesh = forwardRef<TeddyController, TeddyMeshProps>(function TeddyMesh(
  {
    expression: expressionProp,
    action: actionProp,
    talking: talkingProp,
    reducedMotion: reducedMotionProp,
    onAnimationStart,
    onAnimationComplete,
    onActionComplete,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    facing: facingProp,
    animated = true,
  },
  ref
) {
  const reducedMotion = useResolvedReducedMotion(reducedMotionProp);
  // `still` == a completely static portrait: no continuous motion at all,
  // while the expression's shape (eyes/mouth, resting hand pose) is kept.
  const still = animated === false;

  const { state, controller } = useTeddyState({
    expression: expressionProp,
    action: actionProp,
    talking: talkingProp,
    reducedMotion: reducedMotion || still,
    onAnimationStart,
    onAnimationComplete,
    onActionComplete,
  });

  // Facing is a separate, small piece of state — deliberately NOT folded
  // into useTeddyState.ts, so that file stays exactly as it was for v1/v2
  // (see README §1). It follows the same controlled-prop-plus-imperative
  // pattern as expression/action/talking, just with its own tiny store.
  const [facing, setFacingState] = useState<TeddyFacing>(facingProp ?? "front");
  useEffect(() => {
    if (facingProp !== undefined) setFacingState(facingProp);
  }, [facingProp]);
  const setFacing = useCallback((next: TeddyFacing) => setFacingState(next), []);

  useImperativeHandle(
    ref,
    () => ({
      ...controller,
      setFacing,
      getState: () => ({ ...controller.getState(), facing }),
    }),
    [controller, setFacing, facing]
  );

  const cfg = EXPRESSIONS[state.expression];
  const { visibleAction, autoBlink, talking } = state;
  const blinking = autoBlink || visibleAction === "blink";

  const geometry = useMemo(() => createPebbleGeometry(), []);
  const material = useMemo(() => createBodyMaterial(cfg.glow), [cfg.glow]);

  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const lastActionRef = useRef<string>(visibleAction);
  const actionStartRef = useRef(0);
  const hideProgressRef = useRef(0); // 0 = normal, 1 = fully hidden pose
  const facingYawRef = useRef(facing === "back" ? Math.PI : 0);

  const particleIntensity =
    (state.expression === "excited" ? 0.6 : 0) +
    (visibleAction === "jump" ? 0.5 : 0);

  useFrame((r3f, delta) => {
    const t = r3f.clock.elapsedTime;

    if (lastActionRef.current !== visibleAction) {
      lastActionRef.current = visibleAction;
      actionStartRef.current = t;
    }
    const localT = t - actionStartRef.current;

    if (!groupRef.current || !bodyRef.current) return;

    // Static portrait mode: hold the expression's resting pose and nothing
    // else — no float, bob, gesture, hide lerp or facing turn.
    if (still) {
      groupRef.current.position.set(position[0], position[1] + cfg.bodyLower, position[2]);
      groupRef.current.rotation.set(
        rotation[0],
        rotation[1] + (facing === "back" ? Math.PI : 0),
        rotation[2] + cfg.bodyTilt
      );
      bodyRef.current.scale.set(1, 1, 1);
      return;
    }

    // -- hide: smoothly lerp toward a lowered, shrunk pose and hold -----
    const hideTarget = visibleAction === "hide" ? 1 : 0;
    hideProgressRef.current = reducedMotion
      ? hideTarget
      : damp(hideProgressRef.current, hideTarget, 6, delta);

    let y = -hideProgressRef.current * 0.32;
    let x = 0;
    let rotZ = cfg.bodyTilt;
    let bodyScaleY = 1 - hideProgressRef.current * 0.18;
    let bodyScaleXZ = 1 - hideProgressRef.current * 0.1;

    const energy = reducedMotion ? Math.min(cfg.energy, 0.4) : cfg.energy;

    if (visibleAction === "idle" || (!reducedMotion && visibleAction === "walk")) {
      // idle float (also underlies walk, on top of its own drift below)
      y += Math.sin(t * 1.3) * 0.045 * energy;
      rotZ += Math.sin(t * 0.5) * 0.04 * energy;
    }

    if (visibleAction === "walk") {
      if (!reducedMotion) {
        x += Math.sin(t * 0.8) * 0.22;
        y += Math.sin(t * 3.4) * 0.03;
        rotZ += Math.sin(t * 0.8) * 0.05;
      } else {
        // Reduced motion: legible but non-displacing — tiny in-place bob.
        y += Math.sin(t * 1.6) * 0.012;
      }
    }

    if (visibleAction === "cry") {
      if (!reducedMotion) {
        x += Math.sin(t * 9) * 0.006 + Math.cos(t * 13) * 0.004;
        rotZ += Math.sin(t * 9) * 0.02;
      }
      y -= 0.05;
    }

    if (visibleAction === "jump" && !reducedMotion) {
      const timing = ACTION_TIMING.jump.durationMs / 1000;
      const p = Math.min(1, localT / timing);
      y += sampleKeyframes(p, JUMP_Y);
      bodyScaleY *= sampleKeyframes(p, JUMP_SCALE_Y);
      bodyScaleXZ *= sampleKeyframes(p, JUMP_SCALE_XZ);
    }

    // Expression-led body language, layered on top of whatever action is
    // playing: excited bounces, happy breathes, surprised perks up, and
    // sad/crying sways low. Makes the expression legible even while idle.
    if (!reducedMotion) {
      if (state.expression === "excited") {
        y += Math.abs(Math.sin(t * 5)) * 0.034;
        rotZ += Math.sin(t * 5) * 0.035;
      } else if (state.expression === "happy") {
        y += Math.sin(t * 2.3) * 0.02;
        rotZ += Math.sin(t * 1.15) * 0.022;
      } else if (state.expression === "surprised") {
        y += Math.sin(t * 3.4) * 0.018;
      } else if (state.expression === "sad" || state.expression === "crying") {
        rotZ += Math.sin(t * 0.9) * 0.016;
      }
    }

    // Resting bodyLower per expression (sad/crying/sleepy sink slightly).
    y += cfg.bodyLower;

    // -- facing: smoothly turn 180° to look the other way ("look back") -
    const yawTarget = facing === "back" ? Math.PI : 0;
    facingYawRef.current = reducedMotion
      ? yawTarget
      : damp(facingYawRef.current, yawTarget, 5, delta);

    groupRef.current.position.set(position[0] + x, position[1] + y, position[2]);
    groupRef.current.rotation.set(
      rotation[0],
      rotation[1] + facingYawRef.current,
      rotation[2] + rotZ
    );
    bodyRef.current.scale.set(bodyScaleXZ, bodyScaleY, bodyScaleXZ);
  });

  // A static portrait freezes every child too (no gaze drift, hand bob,
  // particle drift, talk flap), but the expression's resting hand pose is
  // still derived from `expression` inside TeddyAppendages.
  const childReducedMotion = reducedMotion || still;

  return (
    <group ref={groupRef} scale={scale}>
      <mesh ref={bodyRef} geometry={geometry} material={material} castShadow receiveShadow />
      <TeddyFace cfg={cfg} blinking={blinking} talking={talking} reducedMotion={childReducedMotion} />
      <TeddyAppendages
        glow={cfg.glow}
        energy={cfg.energy}
        expression={state.expression}
        waving={visibleAction === "wave"}
        reducedMotion={childReducedMotion}
      />
      <TeddyParticles intensity={childReducedMotion ? 0 : particleIntensity} reducedMotion={childReducedMotion} />
    </group>
  );
});

TeddyMesh.displayName = "TeddyMesh";
