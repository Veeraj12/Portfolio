import * as THREE from "three";

/**
 * Builds Teddy's body: a deformed icosahedron — vertically compact, wider
 * around the middle, tapered toward the top, subtly asymmetrical. No
 * external noise library: displacement is a small deterministic sum of
 * sines over each vertex's own position, so the shape is identical on
 * every build/run (no per-mount randomness) while still reading as organic
 * rather than a mathematically perfect primitive.
 *
 * Kept deliberately low-poly (detail level 2 → 320 tris) — this sits next
 * to a full 3D world and must stay cheap.
 */
export function createPebbleGeometry(radius = 0.55): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, 2);
  const pos = geo.attributes.position;
  if (!pos) {
    throw new Error("Teddy pebble geometry was created without a position attribute.");
  }
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const nx = v.x / radius;
    const ny = v.y / radius;
    const nz = v.z / radius;

    // Organic bumps — a couple of low-frequency sine terms, not noise.
    const bump =
      1 +
      0.09 * Math.sin(nx * 3.1 + 1.4) * Math.cos(nz * 2.4 + 0.6) +
      0.05 * Math.sin(ny * 4.0 + nz * 2.0);

    // Taper the top toward a rounded point instead of a full sphere cap.
    const topTaper = ny > 0.15 ? 1 - 0.22 * smoothstep(ny, 0.15, 0.9) : 1;

    // Slightly flatten the bottom so Teddy reads as "sitting"/floating
    // rather than perfectly round underneath.
    const bottomFlatten = ny < -0.35 ? 1 - 0.18 * smoothstep(-ny, 0.35, 0.9) : 1;

    // A single gentle asymmetry term so the silhouette isn't perfectly
    // radially symmetric (keeps it feeling designed/organic, not CAD-like).
    const asymmetry = 1 + 0.035 * Math.sin(nx * 1.7 + ny * 1.1);

    const scaleFactor = bump * topTaper * bottomFlatten * asymmetry;

    // Base non-uniform scale: compact vertically, slightly wider middle.
    const bx = v.x * 1.02 * scaleFactor;
    const by = v.y * 0.82 * scaleFactor;
    const bz = v.z * 0.96 * scaleFactor;

    pos.setXYZ(i, bx, by, bz);
  }

  geo.computeVertexNormals();
  return geo;
}

function smoothstep(x: number, edge0: number, edge1: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Builds the tiny low-poly "palm" used for both of Teddy's appendages —
 * a deliberately faceted, flattened shape (not the plain icosahedron blob
 * from the first pass) so a wave reads as a small paddle-like hand instead
 * of a floating pebble of its own. Low segment counts are intentional —
 * the facets are part of the look, matching the body's own low-poly
 * language, not a resolution compromise.
 *
 * `PALM_RADIUS`/`PALM_Y_SCALE` are exported so TeddyAppendages.tsx can
 * compute exactly how far to lift the mesh above its pivot (so the pivot
 * sits at the palm's bottom tip, not its center) without the two files
 * silently drifting out of sync if this shape is ever retuned.
 */
export const PALM_RADIUS = 0.085;
export const PALM_Y_SCALE = 1.3;

export function createPalmGeometry(radius = PALM_RADIUS): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(radius, 7, 5);
  geo.scale(1, PALM_Y_SCALE, 0.4); // flatten into a small palm/paddle silhouette
  geo.computeVertexNormals();
  return geo;
}
