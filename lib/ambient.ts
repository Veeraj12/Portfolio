/**
 * Shared, framework-free ambient palette used by both the global cursor
 * light (`CursorAmbience`) and the per-card local glow (`useCardGlow`).
 *
 * Keeping the colour maths here — and keeping it as a single mutable
 * `ambientState` object rather than React state — lets the card hook read the
 * current atmospheric colour synchronously on pointer move without triggering
 * re-renders or forcing a `getComputedStyle` read every frame.
 */

export type RGB = [number, number, number];

/**
 * The violet → purple → electric-blue → amber ramp. Index 0 is the leftmost /
 * "resting" accent and index 3 the warmest emphasis.
 */
export const AMBIENT_STOPS: RGB[] = [
  [139, 92, 246], // violet  #8B5CF6
  [168, 85, 247], // purple  #A855F7
  [59, 130, 246], // electric blue #3B82F6
  [245, 158, 11], // warm amber #F59E0B
];

export const DEFAULT_AMBIENT: RGB = AMBIENT_STOPS[0]!;

export interface AmbientState {
  /** Progress through the palette, 0..1. */
  t: number;
  /** The resolved colour currently in use. */
  rgb: RGB;
}

export const ambientState: AmbientState = {
  t: 0.15,
  rgb: DEFAULT_AMBIENT,
};

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Blend smoothly across the four palette stops at progress `t`. */
export function blendStops(t: number): RGB {
  const progress = clamp01(t);
  const scaled = progress * (AMBIENT_STOPS.length - 1);
  const index = Math.min(Math.floor(scaled), AMBIENT_STOPS.length - 2);
  const local = scaled - index;
  const from = AMBIENT_STOPS[index]!;
  const to = AMBIENT_STOPS[index + 1]!;
  return [
    Math.round(from[0] + (to[0] - from[0]) * local),
    Math.round(from[1] + (to[1] - from[1]) * local),
    Math.round(from[2] + (to[2] - from[2]) * local),
  ];
}

/** Format an RGB triple for a CSS custom property (`rgb(var(--x) / a)`). */
export function rgbTriplet([r, g, b]: RGB): string {
  return `${r} ${g} ${b}`;
}

/**
 * Map a normalised viewport position to palette progress. Horizontal motion
 * dominates so the ramp reads left-to-right; vertical position adds a gentle
 * bias so the atmosphere shifts a little as the cursor moves up or down.
 */
export function progressForPosition(nx: number, ny: number): number {
  return clamp01(nx * 0.82 + ny * 0.18);
}
