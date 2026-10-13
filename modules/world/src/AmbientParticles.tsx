import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, Points as ThreePoints } from "three";
import { makeSeededRandom } from "./rng";
import type { QualityLevel } from "./types";

export interface AmbientParticlesProps {
  active: boolean;
  quality: QualityLevel;
  reducedMotion: boolean;
  /** Base particle budget before density/quality scaling. Kept deliberately
   *  small (V2): these communicate atmospheric depth, not "stars/glitter" —
   *  see MASTER_CONTEXT-derived brief section 14. */
  baseCount?: number;
  /** 0..1, multiplies baseCount (wired to WorldQualitySettings.particleDensity). */
  density?: number;
  radius?: number;
  /** Pushes the particle field's center away from the camera's resting
   *  position so particles read as background depth, not a cloud
   *  surrounding the viewer. */
  centerZ?: number;
  color?: string;
}

export function AmbientParticles({
  active,
  quality,
  reducedMotion,
  baseCount = 70,
  density = 1,
  radius = 9,
  centerZ = -5,
  color = "#76c8df",
}: AmbientParticlesProps) {
  const count = Math.max(
    0,
    Math.round(
      baseCount * density * (quality === "low" ? 0.4 : quality === "medium" ? 0.7 : 1),
    ),
  );

  const { positions, seeds } = useMemo(() => {
    const rand = makeSeededRandom(1337);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = radius * Math.cbrt(rand());
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = 0.3 + r * Math.cos(phi) * 0.35; // flatten vertically, keep above ground
      positions[i * 3 + 2] = centerZ + r * Math.sin(phi) * Math.sin(theta);
      seeds[i] = rand() * Math.PI * 2;
    }
    return { positions, seeds };
  }, [count, radius, centerZ]);

  const pointsRef = useRef<ThreePoints>(null);
  const basePositions = useRef(positions);
  basePositions.current = positions;

  useFrame(({ clock }) => {
    if (!active || reducedMotion) return;
    const geom = pointsRef.current?.geometry;
    const attr = geom?.getAttribute("position") as BufferAttribute | undefined;
    if (!attr) return;
    const t = clock.getElapsedTime();
    const base = basePositions.current;
    for (let i = 0; i < count; i++) {
      // Slow, small drift — reinforces depth without reading as motion for
      // its own sake.
      // Safe: seeds/base are both sized to `count` above; i stays < count.
      const drift = Math.sin(t * 0.08 + seeds[i]!) * 0.08;
      attr.array[i * 3 + 1] = base[i * 3 + 1]! + drift;
    }
    attr.needsUpdate = true;
  });

  if (count === 0 || !active) return null;

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={reducedMotion ? 0.02 : 0.03}
        sizeAttenuation
        transparent
        opacity={0.22}
        depthWrite={false}
      />
    </points>
  );
}
