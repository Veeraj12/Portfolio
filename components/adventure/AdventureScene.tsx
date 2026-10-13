"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { World, type WorldHandle, type OpeningState, type TeddySlotRenderContext } from "@/modules/world";
import { DestinationBrickField } from "@/modules/bricks";
import type { AdventureState } from "./controller";
import type { TeddyPoseKind } from "./teddy";
import type { AdventureEventBus } from "./events";
import { TeddyActor } from "./TeddyActor";
import {
  ADVENTURE_DESTINATIONS,
  applyBrickLayout,
  computeBrickLayout,
  type Vec3,
} from "./config";
import type { InputSource } from "./events";
import type { MutableRefObject } from "react";

/** Signals once the canvas subtree has mounted and painted a couple of frames. */
function SceneReadyProbe({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    const tick = () => {
      if (++frames >= 2) onReady();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Bricks, placed responsively in the World's own scene (no second canvas). */
function BricksLayer({
  state,
  bus,
  reducedMotion,
  quality,
  pointerKind,
}: {
  state: AdventureState;
  bus: AdventureEventBus;
  reducedMotion: boolean;
  quality: "low" | "medium" | "high";
  pointerKind: MutableRefObject<InputSource>;
}) {
  const size = useThree((s) => s.size);
  const ids = useMemo(() => ADVENTURE_DESTINATIONS.map((d) => d.id), []);
  const layout = useMemo(() => computeBrickLayout(ids, size.width / Math.max(1, size.height)), [ids, size.width, size.height]);
  const destinations = useMemo(() => applyBrickLayout(ADVENTURE_DESTINATIONS, layout), [layout]);

  const onHover = useCallback(
    (destinationId: string) => bus.emit("DESTINATION_HOVER", { destinationId, source: pointerKind.current }),
    [bus, pointerKind]
  );
  const onUnhover = useCallback(
    (destinationId: string) => bus.emit("DESTINATION_UNHOVER", { destinationId, source: pointerKind.current }),
    [bus, pointerKind]
  );
  const onSelect = useCallback((destinationId: string) => bus.emit("DESTINATION_SELECTED", { destinationId }), [bus]);
  const onAllResolved = useCallback(() => bus.emit("BRICKS_SETTLED", {}), [bus]);

  if (!state.bricksVisible) return null;
  return (
    <DestinationBrickField
      // A restart remounts the field so the particles -> bricks intro replays.
      key={state.restartCount}
      destinations={destinations}
      selectedDestinationId={state.destinationId}
      hoveredDestinationId={state.hoveredDestinationId ?? state.previewDestinationId}
      onDestinationHover={onHover}
      onDestinationUnhover={onUnhover}
      onDestinationSelect={onSelect}
      onAllResolved={onAllResolved}
      reducedMotion={reducedMotion}
      quality={quality}
      position={layout.groupPosition}
      scale={layout.groupScale}
      hitAreaScale={layout.hitAreaScale}
    />
  );
}

export interface AdventureSceneProps {
  state: AdventureState;
  bus: AdventureEventBus;
  reducedMotion: boolean;
  quality: "low" | "medium" | "high";
  fontUrl: string;
  paused: boolean;
  pointerKind: MutableRefObject<InputSource>;
  /** Called once the world has mounted. */
  onSceneReady: () => void;
  /** Called once, with the World's imperative handle (dynamic-import friendly: no forwardRef through next/dynamic). */
  onHandleReady: (handle: WorldHandle | null) => void;
}

/**
 * The 3D half of the adventure: World (module 02) + Teddy (module 01) +
 * bricks (module 03), composed inside ONE canvas. It reads state and emits
 * bus events; it never decides what should happen.
 */
export function AdventureScene({
  state,
  bus,
  reducedMotion,
  quality,
  fontUrl,
  paused,
  pointerKind,
  onSceneReady,
  onHandleReady,
}: AdventureSceneProps) {
  const worldQuality = useMemo(
    () => ({ reducedMotion, deviceQuality: quality, cameraQuality: quality, lightingQuality: quality }),
    [reducedMotion, quality]
  );

  const onStateChange = useCallback((s: OpeningState) => bus.emit("WORLD_STATE", { state: s }), [bus]);
  const onIntroComplete = useCallback(() => bus.emit("INTRO_COMPLETE", {}), [bus]);
  const onArrived = useCallback((pose: TeddyPoseKind) => bus.emit("TEDDY_ARRIVED", { pose }), [bus]);

  const teddy = state.teddy;
  const talking = state.talking;
  const renderTeddy = useCallback(
    (ctx: TeddySlotRenderContext) => (
      <TeddyActor
        directive={teddy}
        talking={talking}
        reducedMotion={reducedMotion}
        slotPosition={ctx.position as Vec3}
        onArrived={onArrived}
      />
    ),
    [teddy, talking, reducedMotion, onArrived]
  );

  return (
    <World
      // A CALLBACK ref, not a ref object read in a `useEffect`. World's own
      // imperative handle is set via `useImperativeHandle` *inside* R3F's
      // <Canvas> — i.e. by a different React reconciler instance than the
      // one rendering this component, which mounts asynchronously (it has
      // to wait for the <canvas> DOM node to exist first). A `useEffect`
      // with `[]` deps that reads `someRef.current` once, right after this
      // component's own commit, can run *before* that inner reconciler has
      // mounted World at all — silently capturing `null` and then never
      // updating again, since the effect never re-runs. A callback ref
      // sidesteps the ordering question entirely: whichever reconciler
      // attaches the ref calls this function at that exact moment, whenever
      // that turns out to be. See Adventure.tsx for the readiness gate this
      // feeds into (onHandleReady is `useCallback`-stable there, so this
      // doesn't re-fire on every render).
      ref={onHandleReady}
      autoStart={false}
      fontUrl={fontUrl}
      paused={paused}
      quality={worldQuality}
      renderTeddy={renderTeddy}
      onStateChange={onStateChange}
      onIntroComplete={onIntroComplete}
    >
      <SceneReadyProbe onReady={onSceneReady} />
      <BricksLayer state={state} bus={bus} reducedMotion={reducedMotion} quality={quality} pointerKind={pointerKind} />
    </World>
  );
}

