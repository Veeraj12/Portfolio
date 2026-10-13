import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  createEyeHighlightMaterial,
  createEyeMaterial,
  createMouthMaterial,
  createTearMaterial,
} from "./TeddyMaterials";
import type { ExpressionConfig, MouthMode } from "./teddyExpressions";

export interface TeddyFaceProps {
  cfg: ExpressionConfig;
  /** True while the natural auto-blink or the explicit "blink" one-shot is
   * mid-flight — forces both eyes near-closed regardless of expression. */
  blinking: boolean;
  /** True while the persistent talking overlay (or "talk" one-shot) is
   * active — overrides the mouth to an animated open shape. */
  talking: boolean;
  reducedMotion: boolean;
}

const EYE_X = 0.17;
const EYE_Y = 0.06;
const EYE_Z = 0.47;
const MOUTH_Y = -0.14;
const MOUTH_Z = 0.5;
const ARC = 2.0;

export function TeddyFace({ cfg, blinking, talking, reducedMotion }: TeddyFaceProps) {
  const eyeMat = useMemo(() => createEyeMaterial(), []);
  const highlightMat = useMemo(() => createEyeHighlightMaterial(), []);
  const mouthMat = useMemo(() => createMouthMaterial(), []);
  const tearMat = useMemo(() => createTearMaterial(), []);

  const eyeGroupL = useRef<THREE.Group>(null);
  const eyeGroupR = useRef<THREE.Group>(null);
  const mouthOpenRef = useRef<THREE.Mesh>(null);
  const tearsRef = useRef<THREE.Group>(null);

  // Subtle idle gaze drift + talk mouth flap + tear fall — all cheap,
  // frame-driven, no re-render involved.
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (!reducedMotion && eyeGroupL.current && eyeGroupR.current) {
      const gaze = Math.sin(t * 0.35) * 0.008;
      eyeGroupL.current.position.x = -EYE_X + gaze;
      eyeGroupR.current.position.x = EYE_X + gaze;
    }

    if (mouthOpenRef.current && talking && !reducedMotion) {
      const flap = 0.4 + Math.abs(Math.sin(t * 11)) * 0.6;
      mouthOpenRef.current.scale.y = flap;
    }

    if (tearsRef.current && cfg.tears) {
      tearsRef.current.children.forEach((tear, i) => {
        const cycle = ((t * (reducedMotion ? 0.4 : 1) + i * 0.55) % 1.4) / 1.4;
        tear.position.y = -cycle * 0.16;
        (tear as THREE.Mesh).visible = cycle < 0.85;
        const s = 1 - cycle * 0.35;
        tear.scale.setScalar(s);
      });
    }
  });

  const eyeScaleY = (base: number) => (blinking ? 0.06 : base);

  const mouthMode: MouthMode = talking ? "open" : cfg.mouth;
  const showArc = mouthMode === "smile" || mouthMode === "frown";
  const showFlat = mouthMode === "flat" || mouthMode === "unsure";
  const showOpen = mouthMode === "open";

  const arcRotationZ =
    mouthMode === "smile"
      ? 1.5 * Math.PI - ARC / 2
      : 0.5 * Math.PI - ARC / 2;

  return (
    <group>
      {/* eyes */}
      <group ref={eyeGroupL} position={[-EYE_X, EYE_Y + cfg.eyeOffsetYL, EYE_Z]}>
        <mesh material={eyeMat} scale={[1, eyeScaleY(cfg.eyeScaleL), 1]}>
          <sphereGeometry args={[0.075, 16, 16]} />
        </mesh>
        <mesh material={highlightMat} position={[-0.022, 0.024, 0.058]}>
          <sphereGeometry args={[0.016, 8, 8]} />
        </mesh>
      </group>

      <group ref={eyeGroupR} position={[EYE_X, EYE_Y + cfg.eyeOffsetYR, EYE_Z]}>
        <mesh material={eyeMat} scale={[1, eyeScaleY(cfg.eyeScaleR), 1]}>
          <sphereGeometry args={[0.075, 16, 16]} />
        </mesh>
        <mesh material={highlightMat} position={[-0.022, 0.024, 0.058]}>
          <sphereGeometry args={[0.016, 8, 8]} />
        </mesh>
      </group>

      {/* mouth — three pre-built shapes, only one visible at a time so we
          never allocate/dispose geometry on expression change */}
      <mesh
        visible={showArc}
        material={mouthMat}
        position={[0, MOUTH_Y, MOUTH_Z]}
        rotation={[0, 0, arcRotationZ]}
        scale={[cfg.mouthIntensity, cfg.mouthIntensity, 1]}
      >
        <torusGeometry args={[0.07, 0.009, 8, 16, ARC]} />
      </mesh>

      <mesh
        visible={showFlat}
        material={mouthMat}
        position={[
          (mouthMode === "unsure" ? 0.02 : 0),
          MOUTH_Y + 0.01,
          MOUTH_Z,
        ]}
        rotation={[0, 0, mouthMode === "unsure" ? cfg.mouthTilt : 0]}
        scale={[cfg.mouthIntensity * 2.4, 0.32, 0.5]}
      >
        {/* A stretched sphere, not a capsule: THREE.CapsuleGeometry only
            exists from three.js r142+, and this module targets r128 (see
            README §16 dependency note) for broad compatibility. */}
        <sphereGeometry args={[0.028, 10, 8]} />
      </mesh>

      <mesh
        ref={mouthOpenRef}
        visible={showOpen}
        material={mouthMat}
        position={[0, MOUTH_Y + 0.02, MOUTH_Z]}
        scale={[0.85 * cfg.mouthIntensity, 0.7 * cfg.mouthIntensity, 1]}
      >
        <circleGeometry args={[0.045, 16]} />
      </mesh>

      {/* tears */}
      <group ref={tearsRef} visible={cfg.tears}>
        <mesh material={tearMat} position={[-EYE_X, EYE_Y - 0.06, EYE_Z - 0.02]}>
          <coneGeometry args={[0.018, 0.045, 8]} />
        </mesh>
        <mesh material={tearMat} position={[EYE_X, EYE_Y - 0.06, EYE_Z - 0.02]}>
          <coneGeometry args={[0.018, 0.045, 8]} />
        </mesh>
      </group>
    </group>
  );
}
