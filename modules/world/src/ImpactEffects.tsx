import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  Points as ThreePoints,
  Mesh as ThreeMesh,
  PointsMaterial,
  MeshBasicMaterial,
} from "three";
import { makeSeededRandom } from "./rng";
import { easeOutCubic } from "./timing";
import type { QualityLevel } from "./types";

export interface ImpactEffectsProps {
  /**
   * A monotonically increasing counter. Incrementing it (from the parent,
   * exactly once per landing) re-triggers the burst/ripple. Using a counter
   * rather than a boolean means a second impact can retrigger cleanly even
   * if the previous burst hasn't fully faded.
   */
  triggerId: number;
  quality: QualityLevel;
  reducedMotion: boolean;
  position?: [number, number, number];
  color?: string;
}

const DUST_LIFESPAN = 0.5; // seconds
const RIPPLE_LIFESPAN = 0.55;

/**
 * Tiny radial dust burst + a faint expanding ground ripple. Reused
 * geometry/material instances — only "age since last trigger" changes per
 * frame, read from a clock timestamp captured at trigger time. Deliberately
 * restrained: this is meant to read as a THUD, not an explosion.
 */
export function ImpactEffects({
  triggerId,
  quality,
  reducedMotion,
  position = [0, 0.02, -6],
  color = "#c9a06a",
}: ImpactEffectsProps) {
  const count = quality === "low" ? 8 : quality === "medium" ? 14 : 20;

  const { basePositions, directions } = useMemo(() => {
    const rand = makeSeededRandom(4242);
    const basePositions = new Float32Array(count * 3);
    const directions = new Float32Array(count * 2); // unit XZ direction per particle
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      directions[i * 2] = Math.cos(angle);
      directions[i * 2 + 1] = Math.sin(angle);
      basePositions[i * 3] = 0;
      basePositions[i * 3 + 1] = 0.02;
      basePositions[i * 3 + 2] = 0;
    }
    return { basePositions, directions };
  }, [count]);

  const pointsRef = useRef<ThreePoints>(null);
  const dustMaterialRef = useRef<PointsMaterial>(null);
  const rippleRef = useRef<ThreeMesh>(null);
  const rippleMaterialRef = useRef<MeshBasicMaterial>(null);
  const triggeredAt = useRef<number | null>(null);
  const lastTriggerId = useRef(triggerId);

  useFrame(({ clock }) => {
    if (triggerId !== lastTriggerId.current) {
      lastTriggerId.current = triggerId;
      triggeredAt.current = reducedMotion ? null : clock.getElapsedTime();
    }

    const age = triggeredAt.current === null ? Infinity : clock.getElapsedTime() - triggeredAt.current;

    // Dust
    const geom = pointsRef.current?.geometry;
    const attr = geom?.getAttribute("position") as BufferAttribute | undefined;
    if (attr) {
      const dustT = Math.min(1, age / DUST_LIFESPAN);
      const eased = easeOutCubic(dustT);
      const spread = 0.5 * eased;
      const lift = Math.sin(Math.PI * Math.min(1, dustT)) * 0.12;
      // Safe: directions is sized to `count` * 2 above; i stays < count.
      for (let i = 0; i < count; i++) {
        attr.array[i * 3] = directions[i * 2]! * spread;
        attr.array[i * 3 + 1] = 0.02 + lift;
        attr.array[i * 3 + 2] = directions[i * 2 + 1]! * spread;
      }
      attr.needsUpdate = true;
    }
    if (dustMaterialRef.current) {
      dustMaterialRef.current.opacity = age >= DUST_LIFESPAN ? 0 : 0.35 * (1 - age / DUST_LIFESPAN);
    }

    // Ripple ring
    if (rippleRef.current && rippleMaterialRef.current) {
      const rippleT = Math.min(1, age / RIPPLE_LIFESPAN);
      const visible = age < RIPPLE_LIFESPAN;
      rippleRef.current.visible = visible;
      if (visible) {
        const s = 0.15 + easeOutCubic(rippleT) * 1.1;
        rippleRef.current.scale.set(s, s, 1);
        rippleMaterialRef.current.opacity = 0.16 * (1 - rippleT);
      }
    }
  });

  return (
    <group position={position}>
      <points ref={pointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[basePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={dustMaterialRef}
          color={color}
          size={0.05}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
        />
      </points>
      <mesh ref={rippleRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} visible={false}>
        <ringGeometry args={[0.5, 0.62, 32]} />
        <meshBasicMaterial ref={rippleMaterialRef} color={color} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
