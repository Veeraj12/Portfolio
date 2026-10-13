"use client";

import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { DestinationBrickField } from "./DestinationBrickField";
import { useControllableState } from "../state/useControllableState";
import { useNoSelectionStateMachine } from "../state/useNoSelectionStateMachine";
import {
  noopTeddyReaction,
  reactionForHover,
  reactionForNoSelectionStage,
  reactionForReset,
  reactionForSelect,
  reactionForUnhover,
} from "../adapters/teddyAdapter";
import type { DestinationBrickWorldProps, DestinationDefinition, DestinationId, NoSelectionStage } from "../types";

const QUALITY_DPR: Record<string, [number, number]> = {
  low: [1, 1],
  medium: [1, 1.5],
  high: [1, 2],
};

/** Imperative handle so a parent can restart the interaction (e.g. re-entering the adventure). */
export interface DestinationBrickWorldHandle {
  /** Clears selection/hover and resets the no-selection state machine to WAITING. */
  reset: () => void;
}

/**
 * STANDALONE entry point for Module 03 (owns its own <Canvas>).
 *
 * Owns: brick layout, hover/select interaction, the particle-to-brick
 * intro, and the no-selection emotional state machine.
 *
 * INTEGRATION NOTE: the scene content now lives in <DestinationBrickField />
 * (canvas-free). This wrapper is unchanged in behaviour and public API; it
 * simply composes the Field with a Canvas, the emotional state machine and
 * the Teddy-reaction adapter. The integrated app mounts the Field inside
 * the World's canvas instead, and coordinates Teddy itself.
 */
export const DestinationBrickWorld = forwardRef<DestinationBrickWorldHandle, DestinationBrickWorldProps>(
  function DestinationBrickWorld(
    {
      destinations,
      selectedDestinationId,
      defaultSelectedDestinationId = null,
      onDestinationHover,
      onDestinationUnhover,
      onDestinationSelect,
      onTeddyReaction = noopTeddyReaction,
      reducedMotion = false,
      quality = "medium",
      noSelectionTiming,
      particleIntro = true,
      className,
    },
    ref
  ) {
    const [hoveredId, setHoveredId] = useState<DestinationId | null>(null);
    // INTEGRATION FIX: only forward real selections. Resetting the
    // interaction sets selection to null and must not call
    // onDestinationSelect(null) on the consumer.
    const notifySelect = useCallback(
      (value: DestinationId | null) => {
        if (value != null) onDestinationSelect?.(value);
      },
      [onDestinationSelect]
    );
    const [selectedId, setSelectedId] = useControllableState<DestinationId | null>(
      selectedDestinationId,
      defaultSelectedDestinationId,
      notifySelect
    );

    const byId = useMemo(
      () => new Map(destinations.map((d): [DestinationId, DestinationDefinition] => [d.id, d])),
      [destinations]
    );

    const handleStageChange = useCallback(
      (stage: NoSelectionStage) => {
        const reaction = reactionForNoSelectionStage(stage);
        if (reaction) onTeddyReaction(reaction);
      },
      [onTeddyReaction]
    );

    const { reset: resetNoSelectionMachine } = useNoSelectionStateMachine({
      active: selectedId == null,
      timing: noSelectionTiming,
      onStageChange: handleStageChange,
    });

    const handleHoverStart = useCallback(
      (id: DestinationId) => {
        setHoveredId(id);
        onDestinationHover?.(id);
        const destination = byId.get(id);
        if (destination) onTeddyReaction(reactionForHover(destination));
      },
      [byId, onDestinationHover, onTeddyReaction]
    );

    const handleHoverEnd = useCallback(
      (id: DestinationId) => {
        setHoveredId((current) => (current === id ? null : current));
        onDestinationUnhover?.(id);
        const destination = byId.get(id);
        if (destination) onTeddyReaction(reactionForUnhover(destination));
      },
      [byId, onDestinationUnhover, onTeddyReaction]
    );

    const handleSelect = useCallback(
      (id: DestinationId) => {
        setSelectedId(id);
        const destination = byId.get(id);
        if (destination) onTeddyReaction(reactionForSelect(destination));
        // Selecting always resets the no-selection clock, even if `active`
        // doesn't change (e.g. re-selecting the same destination).
        resetNoSelectionMachine();
      },
      [byId, onTeddyReaction, resetNoSelectionMachine, setSelectedId]
    );

    const resetInteraction = useCallback(() => {
      setSelectedId(null);
      setHoveredId(null);
      resetNoSelectionMachine();
      onTeddyReaction(reactionForReset());
    }, [onTeddyReaction, resetNoSelectionMachine, setSelectedId]);

    useImperativeHandle(ref, () => ({ reset: resetInteraction }), [resetInteraction]);

    return (
      <div className={className} style={{ width: "100%", height: "100%", minHeight: 360 }}>
        <Canvas
          dpr={QUALITY_DPR[quality] ?? QUALITY_DPR.medium}
          camera={{ position: [0, 0.4, 5.5], fov: 45 }}
          shadows={quality === "high"}
        >
          <DestinationBrickField
            destinations={destinations}
            selectedDestinationId={selectedId}
            hoveredDestinationId={hoveredId}
            onDestinationHover={handleHoverStart}
            onDestinationUnhover={handleHoverEnd}
            onDestinationSelect={handleSelect}
            reducedMotion={reducedMotion}
            quality={quality}
            particleIntro={particleIntro}
          />
        </Canvas>
      </div>
    );
  }
);
