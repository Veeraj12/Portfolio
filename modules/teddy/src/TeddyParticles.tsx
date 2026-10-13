import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";

export interface TeddyParticlesProps {
  /** 0..1 — drives overall opacity/spread. 0 = invisible/inactive. */
  intensity: number;
  reducedMotion: boolean;
}

const COUNT = 7;

/**
 * A handful of tiny warm points drifting up and out. Intentionally sparse
 * (§14: "particles must never become more visually important than Teddy")
 * and skipped entirely under reduced motion.
 */
export function TeddyParticles({ intensity, reducedMotion }: TeddyParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, seeds } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const seedArr: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * 0.4;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * 0.4;
      seedArr.push(angle);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { geometry: geo, seeds: seedArr };
  }, []);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color("#FFC97A"),
        size: 0.035,
        transparent: true,
        opacity: 0,
        sizeAttenuation: true,
      }),
    []
  );

  useFrame((state) => {
    if (!pointsRef.current || reducedMotion || intensity <= 0.01) {
      material.opacity = 0;
      return;
    }
    const t = state.clock.elapsedTime;
    material.opacity = intensity * 0.55;
    const pos = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      // Safe: seeds has exactly COUNT entries, filled above.
      const angle = seeds[i]!;
      const cycle = (t * 0.6 + i * 0.13) % 1;
      const r = 0.32 + cycle * 0.22;
      pos.setXYZ(
        i,
        Math.cos(angle) * r,
        cycle * 0.5,
        Math.sin(angle) * r
      );
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
}
