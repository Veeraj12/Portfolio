/**
 * Procedural stone layout for a single destination brick.
 *
 * Generates a small cluster of individually-sized/positioned "stone" slabs
 * that together fill a brick's bounding box (BRICK_FOOTPRINT below) —
 * deliberately NOT a texture: the reference stone-wall photo
 * (public/reference/stone-wall-reference.png) informed the palette and the
 * "layered, individually cut stones" composition, but is not loaded as an
 * asset here. Geometry + material variation reads as stonework at this
 * object's scale without a texture download, stays lightweight (one
 * `boxGeometry`/`RoundedBox` reused per stone, no per-brick textures to
 * load), and never stretches a flat image across the navigation field.
 *
 * Deterministic per `seed` (derived from the destination id) — the same
 * destination always gets the same stone arrangement, across re-renders,
 * hot reload, and reduced-motion toggles. Nothing here is actually random;
 * "random-looking but stable" is the goal, via a tiny seeded PRNG (the
 * same small Park-Miller generator the World module uses for its own
 * particle layouts — duplicated here in ~6 lines rather than imported
 * across the module boundary, per the architecture's module-isolation
 * rule: see MASTER_CONTEXT.md / PART 12).
 */

export interface StoneSlab {
  position: [number, number, number];
  size: [number, number, number];
  /** Small per-stone rotation (radians) around each axis — avoids a perfectly grid-aligned look. */
  rotation: [number, number, number];
  color: string;
  roughness: number;
  /** Corner radius for RoundedBox — the "subtle bevel / softened edge" each stone needs. */
  bevelRadius: number;
}

/** The overall silhouette every brick's stones must fill — unchanged from
 *  the brick's previous single-box footprint, so brick spacing/layout math
 *  in components/adventure/config.ts needs no changes. */
export const BRICK_FOOTPRINT = { width: 1.15, height: 0.75, depth: 0.35 } as const;

/**
 * Restrained stone palette: beige / sand / muted brown / taupe / warm
 * stone grey, per PART 7. No neon, no bright saturated color — every tone
 * here is a desaturated warm or cool neutral.
 */
const STONE_PALETTE = [
  "#c9b79a", // beige
  "#d8c6a6", // sand
  "#a98f6f", // muted brown
  "#b7a890", // taupe
  "#9a9690", // warm stone grey
  "#8c7a5e", // deeper muted brown, for shadowed lower courses
] as const;

function makeSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Simple deterministic string -> int hash (djb2), for turning a destination id into a PRNG seed. */
export function hashSeed(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash) || 1;
}

/**
 * Three roughly-horizontal courses (rows), each with 2 stones of uneven
 * width — the classic dry-stacked look the reference image shows (uneven
 * coursing, not a uniform brick grid). Row heights and stone widths vary
 * within controlled bounds so the four destinations read as related but
 * individually distinct stone clusters, never identical cubes.
 */
export function generateStoneLayout(seed: number): StoneSlab[] {
  const rand = makeSeededRandom(seed);
  const { width, height, depth } = BRICK_FOOTPRINT;
  const rowCount = 3;
  const rowHeight = height / rowCount;
  const slabs: StoneSlab[] = [];

  for (let row = 0; row < rowCount; row++) {
    // Split this course into 2 stones at a jittered seam, rather than
    // always exactly down the middle.
    const seamFraction = 0.42 + rand() * 0.16; // 0.42..0.58
    const gap = 0.012;
    const leftWidth = width * seamFraction - gap / 2;
    const rightWidth = width * (1 - seamFraction) - gap / 2;
    const stoneH = rowHeight * (0.86 + rand() * 0.1); // slight height variation, small gap between courses
    const stoneD = depth * (0.82 + rand() * 0.18); // slight depth variation — not every stone sits perfectly flush
    const y = -height / 2 + rowHeight * (row + 0.5);

    const columns: Array<{ cx: number; w: number }> = [
      { cx: -width / 2 + leftWidth / 2, w: leftWidth },
      { cx: -width / 2 + leftWidth + gap + rightWidth / 2, w: rightWidth },
    ];

    for (const col of columns) {
      const colorIndex = Math.floor(rand() * STONE_PALETTE.length);
      slabs.push({
        position: [col.cx, y, (rand() - 0.5) * depth * 0.08],
        size: [col.w, stoneH, stoneD],
        rotation: [(rand() - 0.5) * 0.02, (rand() - 0.5) * 0.03, (rand() - 0.5) * 0.015],
        color: STONE_PALETTE[colorIndex] ?? STONE_PALETTE[0],
        roughness: 0.82 + rand() * 0.14,
        bevelRadius: Math.min(col.w, stoneH, stoneD) * 0.06,
      });
    }
  }

  return slabs;
}
