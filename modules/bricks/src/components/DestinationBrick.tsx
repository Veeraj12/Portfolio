"use client";

import { useCallback, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Text, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { DestinationDefinition, QualityLevel } from "../types";
import { generateStoneLayout, hashSeed, type StoneSlab } from "../stoneLayout";

const DEFAULT_ACCENT = "#f5a45c"; // warm amber, matches the shared warm/dark palette

interface DestinationBrickProps {
  destination: DestinationDefinition;
  index: number;
  isHovered: boolean;
  isSelected: boolean;
  /** True once any destination has been picked — used to visually settle unselected bricks. */
  someoneSelected: boolean;
  reducedMotion: boolean;
  quality: QualityLevel;
  visible: boolean;
  /** INTEGRATION ADDITION: multiplies the a11y hit-area's distanceFactor. */
  hitAreaScale?: number;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onSelect: () => void;
}

/**
 * A single physical destination brick — now a small cluster of individual
 * stone slabs (see ../stoneLayout.ts) rather than one glowing box, styled
 * after the supplied stone-wall reference: restrained beige/sand/taupe/
 * warm-grey tones, matte (roughness ~0.85-0.95, no metalness), with only a
 * very small emissive lift on hover/select — never a neon glow.
 *
 * Behavior (unchanged from the previous single-mesh version):
 * - Idle: gentle floating bob + slow independent rotation, phase-offset per index.
 * - Hover/focus: tilts toward the camera, label brightens, stones catch a
 *   little more contrast from the existing warm key light.
 * - Selected: pops forward along Z (pulled toward camera/Teddy, "out of the
 *   structure") in addition to the existing scale-up, and settles; unselected
 *   siblings fade/recede slightly once `someoneSelected` is true.
 *
 * Accessibility: hover is not the only way to operate this. An invisible,
 * fully keyboard-operable <button> (via drei's <Html>) sits over the brick
 * and drives the exact same hover/select callbacks on focus/blur/click, so
 * keyboard and touch users get equivalent behavior to mouse hover.
 */
export function DestinationBrick({
  destination,
  index,
  isHovered,
  isSelected,
  someoneSelected,
  reducedMotion,
  quality,
  visible,
  hitAreaScale = 1,
  onHoverStart,
  onHoverEnd,
  onSelect,
}: DestinationBrickProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const phase = useMemo(() => index * 1.7, [index]);
  const accent = destination.accentColor ?? DEFAULT_ACCENT;

  // Stable per-destination stone arrangement — same id always generates the
  // same cluster, across re-renders and hot reload.
  const stones = useMemo<StoneSlab[]>(() => generateStoneLayout(hashSeed(destination.id)), [destination.id]);
  const bevelSmoothness = quality === "low" ? 1 : quality === "medium" ? 2 : 3;

  const floatAmplitude = reducedMotion ? 0 : 0.08;
  const floatSpeed = quality === "low" ? 0.5 : 0.7;
  // Keep this hook before the visibility guard so every render uses the same
  // hook order when a brick resolves from the particle intro.
  const noRaycast = useCallback(() => null, []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const t = state.clock.elapsedTime;

    // Idle float + slow yaw.
    const floatOffset = Math.sin(t * floatSpeed + phase) * floatAmplitude;
    const baseY = destination.position?.[1] ?? 0;
    group.position.y = THREE.MathUtils.damp(group.position.y, baseY + floatOffset, 4, delta);

    // Selection: pop the whole stone cluster forward along Z — "pulled out
    // of the structure" — in addition to the existing scale response below.
    // A controlled, bounded path (damped toward a fixed target), not a
    // free-flying animation: it never approaches the near clipping plane,
    // it just comes forward of its neighbors by less than one brick depth.
    const baseZ = destination.position?.[2] ?? 0;
    const popOffset = isSelected ? 0.55 : 0;
    group.position.z = THREE.MathUtils.damp(group.position.z, baseZ + popOffset, 5, delta);

    if (!reducedMotion) {
      group.rotation.y = THREE.MathUtils.damp(
        group.rotation.y,
        Math.sin(t * 0.2 + phase) * 0.15 + (isHovered ? 0.35 : 0) + (isSelected ? 0.12 : 0),
        4,
        delta
      );
      group.rotation.x = THREE.MathUtils.damp(
        group.rotation.x,
        isHovered ? -0.12 : 0,
        6,
        delta
      );
    }

    // Selection / hover scale response.
    const targetScale = isSelected ? 1.22 : isHovered ? 1.08 : someoneSelected ? 0.92 : 1;
    const dampedScale = THREE.MathUtils.damp(group.scale.x, targetScale, 8, delta);
    group.scale.setScalar(dampedScale);

    // Material response — restrained. Stone stays stone: a SMALL emissive
    // lift in the destination's accent color on hover/select (never above
    // ~0.22), not a glowing panel. This is what "lighting responds
    // subtly" means here; the stone's own roughness/shading under the
    // existing warm key light carries most of the hover feedback.
    const targetEmissive = isSelected ? 0.22 : isHovered ? 0.12 : 0;
    const targetOpacity = someoneSelected && !isSelected ? 0.45 : 1;
    for (const material of materialRefs.current) {
      if (!material) continue;
      material.emissiveIntensity = THREE.MathUtils.damp(material.emissiveIntensity, targetEmissive, 6, delta);
      material.opacity = THREE.MathUtils.damp(material.opacity, targetOpacity, 6, delta);
    }
  });

  if (!visible) return null;

  const position = destination.position ?? [0, 0, 0];
  const castShadow = quality !== "low";

  // Pointer events live on ONE invisible hit-box spanning the whole brick
  // footprint, not on the individual stones. With 6 separate stone meshes
  // as siblings, attaching the handlers per-stone (or relying on raycasts
  // against each of them individually) would fire pointerout/pointerover
  // every time the cursor crosses a seam between two stones in the SAME
  // brick — exactly the flicker PART 8 calls out. The stones themselves
  // have raycasting disabled (`raycast={null}`) so the ray always resolves
  // to this one hit-box instead, which never has internal seams to cross.
  return (
    <group ref={groupRef} position={position}>
      {/*
        NOTE: deliberately no `visible={false}` here — three.js's raycaster
        skips objects with `visible === false` entirely, which would make
        this hit-box invisible to pointer events too, not just to the eye.
        A fully transparent (`opacity: 0`) material is still raycast-
        testable; that's what actually makes it invisible on screen while
        staying interactive.
      */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverStart();
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHoverEnd();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <boxGeometry args={[1.15, 0.75, 0.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {stones.map((stone, stoneIndex) => (
        <RoundedBox
          key={stoneIndex}
          args={stone.size}
          radius={stone.bevelRadius}
          smoothness={bevelSmoothness}
          position={stone.position}
          rotation={stone.rotation}
          castShadow={castShadow}
          receiveShadow
          raycast={noRaycast}
        >
          <meshStandardMaterial
            ref={(m: THREE.MeshStandardMaterial | null) => {
              materialRefs.current[stoneIndex] = m;
            }}
            color={stone.color}
            emissive={accent}
            emissiveIntensity={0}
            roughness={stone.roughness}
            metalness={0.03}
            transparent
            opacity={1}
          />
        </RoundedBox>
      ))}

      <Text
        position={[0, 0, 0.19]}
        fontSize={0.16}
        color={isHovered || isSelected ? "#fff6ea" : "#e8d9c4"}
        anchorX="center"
        anchorY="middle"
        maxWidth={1}
        outlineWidth={0.006}
        outlineColor="#201708"
      >
        {destination.label}
      </Text>

      {/* Accessible, hover-equivalent control. Zero-size so it never blocks layout. */}
      <Html center distanceFactor={6 * hitAreaScale} zIndexRange={[10, 0]} occlude={false}>
        <button
          type="button"
          aria-label={`${destination.label} destination: ${destination.description ?? ""}`}
          aria-pressed={isSelected}
          onFocus={onHoverStart}
          onBlur={onHoverEnd}
          onPointerDown={(e) => {
            // Touch equivalent for hover: first interaction reveals the reaction/dialogue.
            if (e.pointerType === "touch") onHoverStart();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect();
            }
          }}
          onClick={onSelect}
          style={{
            width: 148,
            height: 96,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            outlineOffset: 6,
          }}
        />
      </Html>
    </group>
  );
}
