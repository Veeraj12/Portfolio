import type { TeddyExpression } from "./Teddy.types";

/**
 * How a mouth is built, in TeddyFace.tsx:
 *  - "flat"       tiny short flat bar — neutral / sleepy
 *  - "smile"      small torus arc, smile orientation
 *  - "frown"      small torus arc, frown orientation
 *  - "open"       small flattened-sphere "o" — surprised / excited / talk
 *  - "unsure"     tiny asymmetric arc — confused ("hmm?")
 */
export type MouthMode = "flat" | "smile" | "frown" | "open" | "unsure";

export interface ExpressionConfig {
  /** Eye vertical scale, LEFT eye. 1 = fully open. */
  eyeScaleL: number;
  /** Eye vertical scale, RIGHT eye. */
  eyeScaleR: number;
  /** Extra per-eye local Y offset (world units) — used for asymmetric
   * "confused" attention and general droop (sad/crying/sleepy). */
  eyeOffsetYL: number;
  eyeOffsetYR: number;
  mouth: MouthMode;
  /** Mouth curvature/size multiplier, 0..1+. */
  mouthIntensity: number;
  /** Small sideways/rotation offset for the mouth (confused = "hmm?"). */
  mouthTilt: number;
  /** Show falling tears. */
  tears: boolean;
  /** 0..1 internal-glow intensity for this emotional state. */
  glow: number;
  /** Multiplier on idle/walk/cry motion amplitude. */
  energy: number;
  /** Body tilt in radians (forward/back pitch + side roll combined per
   * expression — TeddyMesh applies this as rotation.z, a gentle roll). */
  bodyTilt: number;
  /** Extra resting downward offset in world units (sad/crying/sleepy sink
   * a little; happy/excited sit a touch higher — see also §float logic). */
  bodyLower: number;
}

const base: ExpressionConfig = {
  eyeScaleL: 1,
  eyeScaleR: 1,
  eyeOffsetYL: 0,
  eyeOffsetYR: 0,
  mouth: "flat",
  mouthIntensity: 1,
  mouthTilt: 0,
  tears: false,
  glow: 0.45,
  energy: 1,
  bodyTilt: 0,
  bodyLower: 0,
};

export const EXPRESSIONS: Record<TeddyExpression, ExpressionConfig> = {
  neutral: { ...base },

  happy: {
    ...base,
    eyeScaleL: 0.75,
    eyeScaleR: 0.75,
    mouth: "smile",
    mouthIntensity: 0.8,
    glow: 0.65,
    energy: 1.15,
    bodyLower: -0.015,
  },

  sad: {
    ...base,
    eyeScaleL: 0.8,
    eyeScaleR: 0.8,
    eyeOffsetYL: -0.02,
    eyeOffsetYR: -0.02,
    mouth: "frown",
    mouthIntensity: 0.6,
    glow: 0.3,
    energy: 0.55,
    bodyTilt: -0.05,
    bodyLower: 0.03,
  },

  angry: {
    ...base,
    eyeScaleL: 0.6,
    eyeScaleR: 0.6,
    mouth: "frown",
    mouthIntensity: 0.35,
    glow: 0.5,
    energy: 1,
    bodyTilt: 0.06,
    bodyLower: 0,
  },

  confused: {
    ...base,
    eyeScaleL: 1.1,
    eyeScaleR: 0.7,
    eyeOffsetYL: 0.015,
    eyeOffsetYR: -0.01,
    mouth: "unsure",
    mouthIntensity: 0.5,
    mouthTilt: 0.35,
    glow: 0.45,
    energy: 0.8,
    bodyTilt: 0.09,
  },

  surprised: {
    ...base,
    eyeScaleL: 1.45,
    eyeScaleR: 1.45,
    mouth: "open",
    mouthIntensity: 0.55,
    glow: 0.75,
    energy: 1.1,
  },

  excited: {
    ...base,
    eyeScaleL: 1.2,
    eyeScaleR: 1.2,
    mouth: "open",
    mouthIntensity: 0.85,
    glow: 0.85,
    energy: 1.6,
    bodyLower: -0.02,
  },

  crying: {
    ...base,
    eyeScaleL: 0.45,
    eyeScaleR: 0.45,
    eyeOffsetYL: -0.015,
    eyeOffsetYR: -0.015,
    mouth: "frown",
    mouthIntensity: 0.5,
    tears: true,
    glow: 0.25,
    energy: 0.5,
    bodyTilt: -0.03,
    bodyLower: 0.05,
  },

  sleepy: {
    ...base,
    eyeScaleL: 0.15,
    eyeScaleR: 0.15,
    mouth: "flat",
    mouthIntensity: 0.4,
    glow: 0.2,
    energy: 0.3,
    bodyTilt: 0.05,
    bodyLower: 0.06,
  },
};
