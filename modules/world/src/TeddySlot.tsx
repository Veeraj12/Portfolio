import { useRef } from "react";
import type { Group } from "three";
import { useAnchorRef } from "./anchors";
import type { TeddySlotProps, TeddySlotRenderContext } from "./types";

/**
 * The Teddy integration boundary.
 *
 * This module NEVER imports a real Teddy implementation. It exposes a slot,
 * positioned at TEDDY_ANCHOR, and calls `renderTeddy(ctx)` if supplied. If
 * no callback is given (true for this module's own local demo), a small
 * neutral placeholder mesh is rendered so the scene stays legible on its
 * own.
 *
 * The final integrator wires this up as:
 *
 *   <TeddySlot
 *     visible={phase !== 'hidden'}
 *     position={teddyAnchorPosition}
 *     phase={teddyPhase}
 *     wiggle={phase === 'gesturing'}
 *     renderTeddy={(ctx) => <Teddy expression={...} action={...} {...ctx} />}
 *   />
 */
export function TeddySlot({
  visible,
  position,
  scale = 1,
  phase,
  wiggle = false,
  renderTeddy,
}: TeddySlotProps) {
  const groupRef = useRef<Group | null>(null);
  const anchorRef = useAnchorRef("TEDDY_ANCHOR");

  if (!visible) return null;

  const ctx: TeddySlotRenderContext = { visible, phase, wiggle, position, scale };

  return (
    <group
      ref={(o: Group | null) => {
        groupRef.current = o;
        anchorRef(o);
      }}
      position={position}
      scale={scale}
    >
      {renderTeddy ? renderTeddy(ctx) : <TeddyPlaceholder ctx={ctx} />}
    </group>
  );
}

/**
 * Minimal stand-in so the local demo and early integration checks render
 * *something* at TEDDY_ANCHOR. Deliberately abstract — a small dark matte
 * marker, not a character. This is NOT a design reference for Teddy; it
 * exists only to prove the slot's position/timing contract works before
 * Module 01's real (separately-designed) 3D companion is wired in.
 */
function TeddyPlaceholder({ ctx }: { ctx: TeddySlotRenderContext }) {
  const bob = ctx.wiggle ? 0.05 : 0;
  return (
    <mesh position={[0, 0.16 + bob, 0]}>
      <sphereGeometry args={[0.16, 12, 12]} />
      <meshStandardMaterial color="#1a1512" roughness={0.85} />
    </mesh>
  );
}
