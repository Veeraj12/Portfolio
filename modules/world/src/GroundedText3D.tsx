import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Text3D, Outlines } from "@react-three/drei";
import * as THREE from "three";
import { Box3, Group as ThreeGroup, Vector3 } from "three";

export interface GroundedText3DProps {
  text: string;
  font: string;
  size: number;
  height: number;
  curveSegments: number;
  bevelThickness: number;
  bevelSize: number;
  bevelSegments: number;
  castShadow: boolean;
  color: string;
  roughness?: number;
  metalness?: number;
  /** Warm self-lift so the carved faces keep definition in the dark stage. */
  emissiveIntensity?: number;
  /**
   * Sketch/hatch fill: draws thin diagonal "pencil" strokes across the front
   * and back faces of the letters procedurally (no texture, no UVs), darkening
   * the base colour along each stroke. Sides are left clean.
   */
  hatch?: boolean;
  /** World-units between hatch strokes. */
  hatchSpacing?: number;
  /** Stroke thickness as a fraction (0–0.5) of the spacing. */
  hatchWidth?: number;
  /** 0–1 brightness multiplier applied on a stroke line. */
  hatchShade?: number;
  /** Dark contour around every glyph, like the reference poster. */
  outline?: boolean;
  outlineColor?: string;
  outlineThickness?: number;
  /**
   * Called synchronously (in the same layout effect) after the rendered,
   * already-bevelled, already-extruded geometry has been measured, with its
   * bounding box in this component's LOCAL space. Parents use this as the
   * source of truth for anything that must be placed relative to the word —
   * e.g. clamping an impact tilt so the word's horizontal extent can never
   * dip below the ground clearance. Fires before any parent layout effect
   * runs (child effects run first), so the first rendered frame of any
   * consumer logic keyed off it is already informed.
   */
  onMeasured?: (box: { width: number; depth: number; height: number }) => void;
}

/**
 * A Text3D word whose bottom edge is guaranteed to sit exactly at this
 * component's own local Y=0, and is X/Z-centered — determined by measuring
 * the actual rendered geometry at runtime with `Box3().setFromObject()`,
 * not by assuming which way a library prop's naming convention runs.
 *
 * The measurement (and the reported box) is expressed in the measure
 * group's LOCAL space: the world-space `Box3` is mapped back through the
 * measure group's inverse world matrix. This is what makes the result
 * independent of where the parent happened to be at measure time — the
 * parent's fall/impact/squash transforms (or an ancestor mid-fall at
 * several world units up) can no longer contaminate the offset, which was
 * the failure mode of the earlier world-space-only measurement.
 *
 * The measurement runs inside the same Suspense boundary that waits on the
 * font, so it only ever runs once real geometry is in the scene graph —
 * not against the `fallback={null}` state.
 */
export function GroundedText3D(props: GroundedText3DProps) {
  return (
    <Suspense fallback={null}>
      <GroundedText3DInner {...props} />
    </Suspense>
  );
}

function GroundedText3DInner({
  text,
  font,
  size,
  height,
  curveSegments,
  bevelThickness,
  bevelSize,
  bevelSegments,
  castShadow,
  color,
  roughness = 0.78,
  metalness = 0.02,
  emissiveIntensity = 0.12,
  hatch = false,
  hatchSpacing = 0.15,
  hatchWidth = 0.16,
  hatchShade = 0.5,
  outline = false,
  outlineColor = "#241809",
  outlineThickness = 0.018,
  onMeasured,
}: GroundedText3DProps) {
  // Two nested groups: `measure` is what we measure (never itself moved),
  // `offset` is what we actually shift. Keeping them separate means
  // re-measuring after a prop change is a plain reset-then-recompute, not
  // a moving target.
  const measureRef = useRef<ThreeGroup | null>(null);
  const offsetRef = useRef<ThreeGroup | null>(null);

  // A real material instance so the hatch shader (injected via
  // onBeforeCompile) survives re-renders and shares one compiled program.
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity,
      roughness,
      metalness,
    });
    if (hatch) {
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uHatchSpacing = { value: hatchSpacing };
        shader.uniforms.uHatchWidth = { value: hatchWidth };
        shader.uniforms.uHatchShade = { value: hatchShade };
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec2 vHatchPos;\nvarying vec3 vHatchNrm;"
          )
          .replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nvHatchPos = position.xy;\nvHatchNrm = normal;"
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec2 vHatchPos;\nvarying vec3 vHatchNrm;\nuniform float uHatchSpacing;\nuniform float uHatchWidth;\nuniform float uHatchShade;"
          )
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
            float hatchCoord = (vHatchPos.x - vHatchPos.y) / uHatchSpacing;
            float hatchFrac = fract(hatchCoord);
            float hatchDist = min(hatchFrac, 1.0 - hatchFrac);
            float hatchLine = 1.0 - smoothstep(0.0, uHatchWidth, hatchDist);
            float hatchFront = smoothstep(0.5, 0.85, abs(vHatchNrm.z));
            float hatchMix = mix(1.0, uHatchShade, hatchLine * hatchFront);
            diffuseColor.rgb *= hatchMix;`
          )
          .replace(
            "#include <emissivemap_fragment>",
            `#include <emissivemap_fragment>
            totalEmissiveRadiance *= hatchMix;`
          );
      };
      mat.customProgramCacheKey = () => "welcome-hatch";
    }
    return mat;
  }, [color, emissiveIntensity, roughness, metalness, hatch, hatchSpacing, hatchWidth, hatchShade]);

  useEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    const measure = measureRef.current;
    const offset = offsetRef.current;
    if (!measure || !offset) return;
    offset.position.set(0, 0, 0);
    measure.updateMatrixWorld(true);
    const box = new Box3().setFromObject(measure);
    if (box.isEmpty()) {
      onMeasured?.({ width: 0, depth: 0, height: 0 });
      return;
    }
    // Map the world-space box back into the measure group's local frame so
    // the result is a property of the geometry alone, not of whatever world
    // position (or squash/fall transform) an ancestor held this frame.
    const inverse = measure.matrixWorld.clone().invert();
    const a = box.min.clone().applyMatrix4(inverse);
    const b = box.max.clone().applyMatrix4(inverse);
    const localMin = new Vector3(
      Math.min(a.x, b.x),
      Math.min(a.y, b.y),
      Math.min(a.z, b.z),
    );
    const localMax = new Vector3(
      Math.max(a.x, b.x),
      Math.max(a.y, b.y),
      Math.max(a.z, b.z),
    );
    offset.position.set(
      -(localMax.x + localMin.x) / 2,
      -localMin.y,
      -(localMax.z + localMin.z) / 2,
    );
    onMeasured?.({
      width: localMax.x - localMin.x,
      depth: localMax.z - localMin.z,
      height: localMax.y - localMin.y,
    });
  }, [text, font, size, height, curveSegments, bevelThickness, bevelSize, bevelSegments, onMeasured]);

  return (
    <group ref={measureRef}>
      <group ref={offsetRef}>
        <Text3D
          font={font}
          size={size}
          height={height}
          curveSegments={curveSegments}
          bevelEnabled
          bevelThickness={bevelThickness}
          bevelSize={bevelSize}
          bevelSegments={bevelSegments}
          castShadow={castShadow}
          material={material}
        >
          {text}
          {outline && <Outlines thickness={outlineThickness} color={outlineColor} />}
        </Text3D>
      </group>
    </group>
  );
}
