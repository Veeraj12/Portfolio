"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { TeddyMesh, type TeddyController } from "@/modules/teddy";
import {
  ADVENTURE_DESTINATIONS,
  TEDDY_CLIMB_START,
  TEDDY_WORLD_SCALE,
  computeBrickLayout,
  poseTravel,
  resolveTeddyPose,
  type Vec3,
} from "./config";
import { poseKey, type TeddyDirective, type TeddyPoseKind } from "./teddy";

interface Tween {
  from: Vec3;
  to: Vec3;
  t: number;
  duration: number;
  arc: number;
  pose: TeddyPoseKind;
  done: boolean;
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Teddy inside the World's canvas. The INTEGRATION LAYER (controller) says
 * which pose / expression / action Teddy should have; this component only
 * renders it: it tweens the group between poses (with an arc, so travel reads
 * as hopping rather than sliding) and hands expression/actions to TeddyMesh.
 *
 * Rendered from the World's `renderTeddy`, so its group is a child of the
 * TeddySlot group at `slotPosition`; all poses are world-space and converted.
 */
export function TeddyActor({
  directive,
  talking,
  reducedMotion,
  slotPosition,
  onArrived,
}: {
  directive: TeddyDirective;
  talking: boolean;
  reducedMotion: boolean;
  slotPosition: Vec3;
  onArrived: (pose: TeddyPoseKind) => void;
}) {
  const size = useThree((s) => s.size);
  const groupRef = useRef<Group>(null);
  const teddyRef = useRef<TeddyController>(null);
  const tween = useRef<Tween | null>(null);
  const onArrivedRef = useRef(onArrived);
  onArrivedRef.current = onArrived;

  const ids = useMemo(() => ADVENTURE_DESTINATIONS.map((d) => d.id), []);
  const layout = useMemo(() => computeBrickLayout(ids, size.width / Math.max(1, size.height)), [ids, size.width, size.height]);

  const toLocal = (w: Vec3): Vec3 => [w[0] - slotPosition[0], w[1] - slotPosition[1], w[2] - slotPosition[2]];
  // Stable initial position: the very first frame Teddy is visible he is at the climb start.
  const initial = useMemo<Vec3>(() => toLocal(TEDDY_CLIMB_START), []); // eslint-disable-line react-hooks/exhaustive-deps

  // New pose => start a tween from wherever he currently is.
  const key = poseKey(directive.pose);
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const target = toLocal(resolveTeddyPose(directive.pose, layout));
    const travel = poseTravel(directive.pose);
    tween.current = {
      from: [group.position.x, group.position.y, group.position.z],
      to: target,
      t: 0,
      duration: reducedMotion ? 0.01 : travel.duration,
      arc: reducedMotion ? 0 : travel.arc,
      pose: directive.pose.kind,
      done: false,
    };
    // Only re-run when the pose itself changes, or the layout it resolves against does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, layout, reducedMotion]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const tw = tween.current;
    if (!group || !tw) return;
    if (tw.done) return;
    tw.t = Math.min(1, tw.t + delta / tw.duration);
    const e = easeInOutCubic(tw.t);
    group.position.set(
      tw.from[0] + (tw.to[0] - tw.from[0]) * e,
      tw.from[1] + (tw.to[1] - tw.from[1]) * e + Math.sin(Math.PI * e) * tw.arc,
      tw.from[2] + (tw.to[2] - tw.from[2]) * e
    );
    if (tw.t >= 1) {
      tw.done = true;
      onArrivedRef.current(tw.pose);
    }
  });

  // One-shot flourishes replay every time the nonce changes (setting the same
  // `action` prop twice would not), so use the imperative controller.
  const burstNonce = directive.burst?.nonce;
  useEffect(() => {
    if (directive.burst) teddyRef.current?.play(directive.burst.action);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstNonce]);

  return (
    <group ref={groupRef} position={initial}>
      <TeddyMesh
        ref={teddyRef}
        expression={directive.expression}
        action={directive.held}
        talking={talking}
        reducedMotion={reducedMotion}
        scale={TEDDY_WORLD_SCALE}
      />
    </group>
  );
}
