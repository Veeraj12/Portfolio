/**
 * Shared timing + physically-inspired motion constants for the WELCOME
 * fall/impact/settle sequence (V2 revamp).
 *
 * These are read by BOTH OpeningScene (to size the state-machine's timer
 * durations) and WelcomeText (to drive the actual kinematics), so the two
 * never drift out of sync — there is exactly one number for "how long the
 * fall takes," not two approximations of it.
 *
 * All durations are seconds at full quality / non-reduced-motion. Reduced
 * motion scales everything down via the same factor OpeningScene already
 * applies to every other timer-driven state (see scaledDuration()).
 */

/** How far above rest WELCOME starts its fall. */
export const WELCOME_FALL_HEIGHT = 5.2;

export const WELCOME_TIMING = {
  /** Free-fall, STATE 7 in the V2 sequence ("welcome-falling"). */
  fall: 0.85,
  /** THUD — squash reaches its minimum, dust/ripple/camera-shake fire once. */
  impact: 0.16,
  /** Bounce + micro-settle back to rest. */
  settle: 0.6,
} as const;

/** Analytic gravity implied by WELCOME_FALL_HEIGHT / WELCOME_TIMING.fall, so
 *  y(t) = H - 0.5*g*t^2 lands exactly on 0 at t = fall duration. Real
 *  kinematics, evaluated analytically (no per-frame integration drift). */
export function impliedGravity(fallHeight: number, fallDuration: number): number {
  return (2 * fallHeight) / (fallDuration * fallDuration);
}

/** Downward velocity at the moment of touchdown — used to scale how hard
 *  the impact effects (squash, dust, camera shake) read. */
export function impactVelocity(fallHeight: number, fallDuration: number): number {
  return impliedGravity(fallHeight, fallDuration) * fallDuration;
}

/**
 * Single reduced-motion scaling rule, shared by OpeningScene (which sizes
 * state-machine timer durations) and WelcomeText (which sizes its own
 * kinematic curves). Having one function instead of two hand-tuned
 * approximations is what keeps the state machine's timing and the visual's
 * timing from drifting apart under reduced motion.
 */
export const REDUCED_MOTION_SCALE = 0.35;
export const REDUCED_MOTION_MIN = 0.15;

export function scaledDuration(base: number, reducedMotion: boolean): number {
  if (!reducedMotion) return base;
  return Math.max(REDUCED_MOTION_MIN, base * REDUCED_MOTION_SCALE);
}

/** Clearance between the measured bottom of WELCOME and the stage top.
 *  GroundedText3D places the text bottom at local y=0; keeping a visible
 *  cushion here prevents the beveled underside from being occluded by the
 *  stage due to depth precision and shadow bias. This is also the budget
 *  WelcomeText clamps the impact/settle tilt against: the tilt's dip at the
 *  word's horizontal extremes (halfWidth x sin(tilt)) must stay within a
 *  fraction of this clearance so the bottom bevel never intersects the
 *  ground through the impact/bounce/settle choreography. */
export const WELCOME_REST_Y = 0.12;

/** Simple exponentially-damped cosine — used for the settle bounce and for
 *  camera shake. Not a physics engine; a small closed-form curve that reads
 *  as a lightly damped spring. */
export function dampedOscillation(
  t: number,
  amplitude: number,
  angularFrequency: number,
  dampingPerSecond: number,
): number {
  if (t < 0) return 0;
  return amplitude * Math.exp(-dampingPerSecond * t) * Math.cos(angularFrequency * t);
}

export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 3);
}
