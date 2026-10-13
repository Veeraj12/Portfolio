"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { QualityLevel } from "../types";

const PARTICLE_COUNT_BY_QUALITY: Record<QualityLevel, number> = {
  low: 14,
  medium: 28,
  high: 48,
};

interface ParticleToBrickFieldProps {
  /** Where the particles should converge to (the brick's resting position). */
  target: [number, number, number];
  /** Seconds the resolve animation takes. */
  duration?: number;
  /** Extra delay before this field starts converging (for staggering multiple bricks). */
  delay?: number;
  quality?: QualityLevel;
  accentColor?: string;
  /** Called once, the moment the particles have fully resolved into the brick position. */
  onResolved?: () => void;
}

/**
 * A short-lived presentation: a small cloud of points starts scattered
 * around a destination's target position and converges into it, standing
 * in for "particles becoming a brick".
 *
 * This is intentionally self-contained — it does NOT read from Module 02's
 * ambient particle system. It creates its own local starting state, as
 * instructed. The final integrator can swap this field's starting
 * positions for real world-particle positions later without changing its
 * public props.
 */
export function ParticleToBrickField({
  target,
  duration = 1.1,
  delay = 0,
  quality = "medium",
  accentColor = "#f5a45c",
  onResolved,
}: ParticleToBrickFieldProps) {
  const count = PARTICLE_COUNT_BY_QUALITY[quality];
  const pointsRef = useRef<THREE.Points>(null);
  const elapsedRef = useRef(0);
  const resolvedRef = useRef(false);

  const { startPositions, geometry } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const starts: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const radius = 1.4 + Math.random() * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const start = new THREE.Vector3(
        target[0] + radius * Math.sin(phi) * Math.cos(theta),
        target[1] + radius * Math.sin(phi) * Math.sin(theta),
        target[2] + radius * Math.cos(phi)
      );
      starts.push(start);
      positions[i * 3] = start.x;
      positions[i * 3 + 1] = start.y;
      positions[i * 3 + 2] = start.z;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { startPositions: starts, geometry: geom };
  }, [count, target]);

  useFrame((_, delta) => {
    if (resolvedRef.current || !pointsRef.current) return;

    elapsedRef.current += delta;
    const t = elapsedRef.current - delay;
    if (t < 0) return;

    const progress = Math.min(t / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

    const positionAttr = pointsRef.current.geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;

    for (let i = 0; i < count; i++) {
      // Safe: startPositions is sized to `count` above; i stays < count.
      const start = startPositions[i]!;
      positionAttr.setXYZ(
        i,
        THREE.MathUtils.lerp(start.x, target[0], eased),
        THREE.MathUtils.lerp(start.y, target[1], eased),
        THREE.MathUtils.lerp(start.z, target[2], eased)
      );
    }
    positionAttr.needsUpdate = true;

    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = 1 - eased;

    if (progress >= 1 && !resolvedRef.current) {
      resolvedRef.current = true;
      onResolved?.();
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={accentColor}
        size={0.05}
        sizeAttenuation
        transparent
        opacity={1}
        depthWrite={false}
      />
    </points>
  );
}
