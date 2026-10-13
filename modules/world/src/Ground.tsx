import { RoundedBox } from "@react-three/drei";
import type { GroundProps } from "./types";

/**
 * The stage. Always mounted, always the same size/material — it is not part
 * of the opening state machine. Darkness hides it naturally (nothing to
 * reflect light) and the lighting revamp reveals it as the warm key light
 * ramps in; the mesh itself never fades or pops.
 *
 * Deliberately ONE object: a large low platform with a soft bevel, not an
 * infinite plane. That bevel/edge is what makes the stage read as a small
 * physical world sitting in darkness rather than a floor extending into a
 * black void. Fog (set in World.tsx) handles the far edge dissolving away.
 *
 * V3: base color raised slightly from V2 (#0c0a08 -> #171310) specifically
 * for tonal separation from the background/fog color (#060504). Both are
 * still very dark, matte, near-black — the point is that under the key
 * light the ground now has enough albedo to read as a distinct lit surface
 * rather than blending into the void behind it. No emissive anywhere on
 * this material; it must never look lit from within.
 */
export function Ground({
  quality,
  // Deliberately huge so the stage reads as an INFINITE plane from the
  // fixed resting camera. At 120×120 centred just ahead of the camera, every
  // edge sits past the fog's far distance (26) — or outside the frustum —
  // from every viewpoint in the experience, including the far corners
  // (~91 units away, still inside the camera's 100 far plane). Fog fades the
  // whole plane to the background colour before any edge could be seen, so
  // there is no horizon line, no converging side edges, and no visible bevel:
  // just ground dissolving into the void.
  size = [120, 120],
  thickness = 0.4,
  position = [0, 0, -2],
  color = "#111820",
}: GroundProps) {
  const [width, depth] = size;
  const segments = quality === "low" ? 2 : quality === "medium" ? 3 : 4;
  const receiveShadow = quality !== "low";

  return (
    <RoundedBox
      args={[width, thickness, depth]}
      radius={0.09}
      smoothness={segments}
      position={[position[0], position[1] - thickness / 2, position[2]]}
      receiveShadow={receiveShadow}
    >
      <meshStandardMaterial color={color} roughness={0.9} metalness={0.02} />
    </RoundedBox>
  );
}
