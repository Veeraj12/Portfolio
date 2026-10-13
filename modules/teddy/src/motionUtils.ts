/** A single keyframe: [progress 0..1, value]. */
export type Stop = [number, number];

/**
 * Linear-interpolates `value` at `progress` (0..1) between the nearest
 * surrounding stops. Stops must be sorted ascending by progress and should
 * cover [0, 1]. Used for the jump/wave one-shot motion curves in
 * Teddy3D.tsx — a tiny hand-rolled substitute for a full animation/tween
 * library, since these are the only two non-trivial eased curves Teddy
 * needs.
 */
export function sampleKeyframes(progress: number, stops: Stop[]): number {
  const p = Math.min(1, Math.max(0, progress));
  for (let i = 0; i < stops.length - 1; i++) {
    // Safe: i and i+1 are both within bounds by the loop condition.
    const [p0, v0] = stops[i]!;
    const [p1, v1] = stops[i + 1]!;
    if (p >= p0 && p <= p1) {
      const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0);
      return v0 + (v1 - v0) * t;
    }
  }
  // Safe: sampleKeyframes is only ever called with a non-empty stops array.
  return stops[stops.length - 1]![1];
}

/** Clamp + smooth 0..1 ease, used for the "hide" settle lerp. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
