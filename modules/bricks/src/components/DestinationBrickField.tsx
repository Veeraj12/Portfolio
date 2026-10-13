"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { DestinationBrick } from "./DestinationBrick";
import { ParticleToBrickField } from "./ParticleToBrickField";
import type { DestinationDefinition, DestinationId, QualityLevel } from "../types";

/**
 * INTEGRATION ADDITION (canvas-free brick scene).
 *
 * Everything <DestinationBrickWorld /> renders INSIDE its <Canvas>, extracted
 * so the integrator can mount bricks inside another module's existing
 * <Canvas> (the World's) instead of opening a second WebGL context and
 * guessing at screen-space alignment.
 *
 * Deliberately pure: it owns brick rendering, the particle -> brick intro
 * and hover/select wiring. It does NOT own Teddy reactions or the
 * no-selection emotional timer — the caller (integration layer) decides
 * when Teddy reacts. <DestinationBrickWorld /> layers those back on for
 * standalone use.
 *
 * Must be rendered inside an R3F <Canvas>.
 */
export interface DestinationBrickFieldProps {
  destinations: DestinationDefinition[];
  /** Controlled selection (the caller owns it). */
  selectedDestinationId?: DestinationId | null;
  hoveredDestinationId?: DestinationId | null;
  onDestinationHover?: (destinationId: DestinationId) => void;
  onDestinationUnhover?: (destinationId: DestinationId) => void;
  onDestinationSelect?: (destinationId: DestinationId) => void;
  /** Fires once, when every brick has resolved out of its particle cloud. */
  onAllResolved?: () => void;
  reducedMotion?: boolean;
  quality?: QualityLevel;
  particleIntro?: boolean;
  /** Group transform, so the caller can place the field in a host scene. */
  position?: [number, number, number];
  scale?: number;
  /** Add the module's own warm lights. Turn off if the host scene is lit. */
  withLights?: boolean;
  /**
   * Multiplier on the accessible hit-area button's size (drei <Html>
   * distanceFactor). Use the host group's `scale` so the invisible button
   * roughly matches the brick's on-screen footprint.
   */
  hitAreaScale?: number;
}

export function DestinationBrickField({
  destinations,
  selectedDestinationId = null,
  hoveredDestinationId = null,
  onDestinationHover,
  onDestinationUnhover,
  onDestinationSelect,
  onAllResolved,
  reducedMotion = false,
  quality = "medium",
  particleIntro = true,
  position = [0, 0, 0],
  scale = 1,
  withLights = true,
  hitAreaScale = 1,
}: DestinationBrickFieldProps) {
  const [resolvedIds, setResolvedIds] = useState<Set<DestinationId>>(
    () => new Set(particleIntro ? [] : destinations.map((d) => d.id))
  );

  const total = destinations.length;
  const markResolved = useCallback((id: DestinationId) => {
    setResolvedIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  // Fire onAllResolved exactly once per mount, from an effect (never from
  // render or a state updater, which StrictMode would double-invoke).
  const firedRef = useRef(false);
  const onAllResolvedRef = useRef(onAllResolved);
  onAllResolvedRef.current = onAllResolved;
  useEffect(() => {
    if (firedRef.current || total === 0) return;
    if (resolvedIds.size >= total) {
      firedRef.current = true;
      onAllResolvedRef.current?.();
    }
  }, [resolvedIds, total]);

  return (
    <group position={position} scale={scale}>
      {withLights && (
        <>
          <ambientLight intensity={0.4} color="#3a2a1c" />
          <pointLight position={[2, 3, 4]} intensity={1.1} color="#f5a45c" />
          <pointLight position={[-3, -1, 2]} intensity={0.3} color="#7a4f2a" />
        </>
      )}
      <Suspense fallback={null}>
        {destinations.map((destination, index) => {
          const isResolved = resolvedIds.has(destination.id);
          return (
            <group key={destination.id}>
              {!isResolved && (
                <ParticleToBrickField
                  target={destination.position ?? [0, 0, 0]}
                  delay={reducedMotion ? 0 : index * 0.12}
                  duration={reducedMotion ? 0.01 : 1.1}
                  quality={quality}
                  accentColor={destination.accentColor}
                  onResolved={() => markResolved(destination.id)}
                />
              )}
              <DestinationBrick
                destination={destination}
                index={index}
                visible={isResolved}
                isHovered={hoveredDestinationId === destination.id}
                isSelected={selectedDestinationId === destination.id}
                someoneSelected={selectedDestinationId != null}
                reducedMotion={reducedMotion}
                quality={quality}
                hitAreaScale={hitAreaScale}
                onHoverStart={() => onDestinationHover?.(destination.id)}
                onHoverEnd={() => onDestinationUnhover?.(destination.id)}
                onSelect={() => onDestinationSelect?.(destination.id)}
              />
            </group>
          );
        })}
      </Suspense>
    </group>
  );
}
