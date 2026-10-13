/**
 * Data-driven configuration for the adventure. Anything a designer might
 * tune (copy, timings, where Teddy stands, how bricks are laid out) lives
 * here, not inside components.
 */
// Import from the modules' pure files (not their barrels) so this config never
// drags three / R3F into anything that only needs data.
import { DEFAULT_DESTINATIONS } from "@/modules/bricks/src/data/destinations";
import type { DestinationDefinition, NoSelectionStage } from "@/modules/bricks/src/types";
import type { TeddyExpression } from "@/modules/teddy/src/Teddy.types";
import {
  WELCOME_POSITION,
  WELCOME_VIEW_POSITION,
  WELCOME_VIEW_LOOKAT,
  TEDDY_POSITION,
  WORLD_CAMERA_FOV,
} from "@/modules/world/src/layout";
import { WELCOME_REST_Y } from "@/modules/world/src/timing";
import type { TeddyBurstAction, TeddyPose } from "./teddy";

export type Vec3 = [number, number, number];

// ---------------------------------------------------------------------------
// Destinations
// ---------------------------------------------------------------------------

export interface DestinationMeta {
  /** Title shown on the board. */
  boardTitle: string;
  /** Small label above the board title. */
  boardLabel: string;
  hover: { expression: TeddyExpression; burst?: TeddyBurstAction };
  select: { expression: TeddyExpression };
  /** Copy for the board's empty state when the destination has no data yet. */
  emptyMessage: string;
  /** What Teddy says when the board opens with nothing in it. */
  emptyDialogue: string;
}

const DEFAULT_META: DestinationMeta = {
  boardTitle: "Destination",
  boardLabel: "Destination",
  hover: { expression: "happy" },
  select: { expression: "excited" },
  emptyMessage: "Nothing here yet.",
  emptyDialogue: "Hmm, it's empty here for now.",
};

/**
 * Per-destination personality. Hover / select LINES live with the brick
 * definitions (bricks module's DEFAULT_DESTINATIONS, which already match the
 * brief); this map adds what only the integration layer knows.
 */
export const DESTINATION_META: Record<string, DestinationMeta> = {
  projects: {
    boardTitle: "Projects",
    boardLabel: "Destination · 01",
    hover: { expression: "happy", burst: "wave" },
    select: { expression: "excited" },
    emptyMessage: "No projects to show yet.",
    emptyDialogue: "Hmm, nothing here yet.",
  },
  "ai-ml": {
    boardTitle: "AI / ML",
    boardLabel: "Destination · 02",
    hover: { expression: "excited" },
    select: { expression: "excited" },
    emptyMessage: "No AI / ML work to show yet.",
    emptyDialogue: "Hmm, nothing here yet.",
  },
  architecture: {
    boardTitle: "Engineering Archive",
    boardLabel: "Adventure Lab · 03",
    hover: { expression: "happy" },
    select: { expression: "happy" },
    emptyMessage: "The engineering archive is being prepared.",
    emptyDialogue: "Let’s open the archive. The exhibits are being arranged.",
  },
  motion: {
    boardTitle: "Motion",
    boardLabel: "Destination · 04",
    hover: { expression: "surprised" },
    select: { expression: "excited" },
    emptyMessage: "Nothing in this corner yet. It's still being built.",
    emptyDialogue: "Oh. This corner is still empty. Come back soon?",
  },
};

export function getDestinationMeta(id: string): DestinationMeta {
  return DESTINATION_META[id] ?? DEFAULT_META;
}

/** The four destinations of the brief, in order. Add entries to add bricks. */
export const ADVENTURE_DESTINATIONS: DestinationDefinition[] = DEFAULT_DESTINATIONS;

// ---------------------------------------------------------------------------
// Dialogue
// ---------------------------------------------------------------------------

export const DIALOGUE = {
  intro: "Hey, I'm Teddy. What do you want to explore?",
  noSelection: {
    CONFUSED: "Um... see anything you like?",
    SAD: "Did I pick boring options...?",
    CRYING: "Hic... you're only going to look?",
    HIDING: "I'll just... wait back here.",
  } as Record<Exclude<NoSelectionStage, "WAITING">, string>,
  peekOut: "Oh! You're still here!",
  /** Played on the third confirm of the (playfully dodging) exit control. */
  confirmExit: "Fine... leaving so soon. Okay, bye!",
  projectOpened: "Good pick.",
  restart: "Yay! Where to next?",
  touchHint: "Tap again to go there.",
} as const;

// ---------------------------------------------------------------------------
// Timing (ms unless noted). All are shortened when reduced motion is on.
// ---------------------------------------------------------------------------

export const TIMING = {
  /** Intro line is on screen this long before the bricks start to form.
   *  Shortened from 2400ms: the intro ends on Teddy's wave, and 2.4s of
   *  empty frame read as "bricks broken" — 1.4s keeps one clear beat of
   *  his line before the field starts resolving. */
  bricksAppearDelayMs: 1400,
  /** Teddy jumps onto the chosen brick, then the board opens. */
  destinationTransitionMs: 1500,
  /** Held goodbye before the portal opens (passed to ExitController).
   *  Shortened from 2400ms — users read the post-close gap as the "back
   *  button hanging"; 1.2s keeps a goodbye beat without the dead wait. */
  exitTransitionMs: 1200,
  /** A touch preview stays armed this long. */
  touchPreviewMs: 8000,
  /** Guard: a click within this window of the preview tap is the same gesture. */
  touchSameGestureMs: 250,
  /** Hover line lingers this long after the pointer leaves. */
  hoverLineLingerMs: 700,
  /** Dialogue read time: base + per character, clamped. */
  dialogueBaseMs: 1800,
  dialoguePerCharMs: 45,
  dialogueMinMs: 2400,
  dialogueMaxMs: 6000,
  /** Reduced motion scale for the transition timers above. */
  reducedMotionScale: 0.3,
} as const;

export function dialogueDurationMs(text: string): number {
  const raw = TIMING.dialogueBaseMs + text.length * TIMING.dialoguePerCharMs;
  return Math.min(TIMING.dialogueMaxMs, Math.max(TIMING.dialogueMinMs, raw));
}

// ---------------------------------------------------------------------------
// Scene layout: bricks + Teddy poses, all in World units.
// ---------------------------------------------------------------------------

/** Brick geometry from the bricks module (DestinationBrick: box 1.15 x 0.75 x 0.35). */
export const BRICK_SIZE = { w: 1.15, h: 0.75 } as const;
/**
 * Mirrors DestinationBrick.tsx's own `popOffset` (local Z the selected
 * brick animates forward by, "pulled out of the structure" — see PART 10).
 * Modules don't import each other, so this is a documented duplicate of
 * that one number — the same pattern BRICK_SIZE above already uses — kept
 * here so Teddy's target position (onBrick, below) lands near where the
 * brick actually ends up once popped forward, not its pre-pop position.
 */
const BRICK_SELECTED_POP_Z = 0.55;
/**
 * Height of the top of WELCOME's letters above the ground.
 *
 * WelcomeText renders "WELCOME" at font `size={1.5}` (see WelcomeText.tsx);
 * GroundedText3D measures the real rendered geometry at runtime and always
 * puts its own bottom at local y=0, so this only needs the font's cap
 * height as a fraction of `size`, not any further offset. That ratio is
 * carried over from this codebase's own previous HELLO constant (HELLO
 * rendered at size={1.05} with a hand-tuned top-of-0.8, i.e. a ~0.762
 * cap-height ratio for this exact typeface/Text3D combination) rather than
 * re-derived from scratch, since it's the one number here that was
 * actually tuned against the real rendered font. 1.5 * 0.762 ≈ 1.14.
 * Worth a quick visual check against the real font once rendered — this is
 * a geometric estimate, not a runtime measurement.
 */
export const WELCOME_TOP_Y = 1.45;
/** Teddy's rendered scale in the world (his pebble radius is 0.55 at scale 1).
 *  Raised from 0.5 so he reads as a present character next to the stage; his
 *  resting height (below) grows with the radius, so the larger body keeps the
 *  same clearance above WELCOME rather than sinking into it. */
export const TEDDY_WORLD_SCALE = 0.62;
const TEDDY_RADIUS = 0.55 * TEDDY_WORLD_SCALE;

export interface BrickLayout {
  /** Where the brick group sits in world space. */
  groupPosition: Vec3;
  groupScale: number;
  /** Per-destination local positions (unscaled group space). */
  positions: Record<string, Vec3>;
  /** Multiplier for the invisible accessible hit-area buttons. */
  hitAreaScale: number;
}

/**
 * The brick shelf's resting band, chosen so the four destination bricks sit
 * BELOW and IN FRONT of WELCOME rather than over it.
 *
 * The previous values (`z=-0.4`, `y=1.75`) put the row at the same height as
 * the top of WELCOME's letters and between the camera and the word, so the
 * brick labels and the "WELCOME" extrusion overlapped on screen — the
 * "text overlapping when a brick is selected" report — and the field read as
 * pasted onto the typography. Moving the row down to near the stage surface
 * and a little further from the camera places it in the lower third of the
 * frame, fully clear of the word (whose bottom sits ~17% below frame centre;
 * the brick tops now resolve ~23% below), while keeping it inside the
 * camera's frustum at the resting pose. See computeBrickLayout() for how
 * `BRICK_Z` feeds the frustum-fit distance.
 */
const BRICK_Z = -1.2;
const BRICK_ROW_Y = 0.55;

/** Visible half-height/width (world units) at a given distance from the camera. */
export function frustumHalfSize(distance: number, aspect: number): { halfH: number; halfW: number } {
  const halfH = Math.tan((WORLD_CAMERA_FOV * Math.PI) / 360) * distance;
  return { halfH, halfW: halfH * aspect };
}

/**
 * Responsive brick layout. Landscape: one row. Portrait / narrow: a 2x2 grid
 * (a blindly shrunk row of four would be unreadably small on a phone).
 * Pure function so it is unit-tested; the scene only feeds it the canvas aspect.
 */
export function computeBrickLayout(ids: string[], aspect: number): BrickLayout {
  const distance = Math.abs(WELCOME_VIEW_POSITION[2] - BRICK_Z);
  const { halfW } = frustumHalfSize(distance, Math.max(0.2, aspect));
  const portrait = aspect < 1.05;
  const positions: Record<string, Vec3> = {};

  let spanUnits: number;
  if (!portrait) {
    const spacing = 2; // unscaled units between brick centres
    ids.forEach((id, i) => {
      positions[id] = [(i - (ids.length - 1) / 2) * spacing, 0, 0];
    });
    spanUnits = (ids.length - 1) * spacing + BRICK_SIZE.w;
  } else {
    const cols = 2;
    const rowH = 1.25;
    const rows = Math.ceil(ids.length / cols);
    ids.forEach((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions[id] = [(col - (cols - 1) / 2) * 1.8, ((rows - 1) / 2 - row) * rowH, 0];
    });
    spanUnits = (cols - 1) * 1.8 + BRICK_SIZE.w;
  }

  // Fit the span into ~88% of the visible width, never bigger than 0.95.
  // The cap was raised from 0.7 so the destination bricks read as larger,
  // chunky objects ("increase the size of the bricks"). Scaling the whole
  // group keeps every brick centre exactly where it was — same alignment,
  // same spacing — only the bricks themselves grow. The 0.88 fit term is
  // still there for narrow/portrait viewports, so this only enlarges the
  // field where there is room for it.
  const groupScale = Math.min(0.95, (halfW * 2 * 0.88) / spanUnits);
  return {
    groupPosition: [0, BRICK_ROW_Y, BRICK_Z],
    groupScale,
    positions,
    hitAreaScale: Math.max(0.2, groupScale * 0.9),
  };
}

/** Bricks with positions applied for the given layout (does not mutate the input). */
export function applyBrickLayout(destinations: DestinationDefinition[], layout: BrickLayout): DestinationDefinition[] {
  return destinations.map((d) => ({ ...d, position: layout.positions[d.id] ?? d.position ?? [0, 0, 0] }));
}

/**
 * The visual centre of the WELCOME glyphs in world space. Horizontally this
 * is the word's own centre (x = 0), which for "WELCOME" (7 letters, centred
 * bounding box) is also the centre of the middle letter "C"; vertically it is
 * the midpoint between the word's resting bottom and its cap top. DOM
 * overlays that must sit "on" the word (the exit portal) project this point.
 */
export const WELCOME_CENTER_POINT: Vec3 = [
  WELCOME_POSITION[0],
  (WELCOME_REST_Y + WELCOME_TOP_Y) / 2,
  WELCOME_POSITION[2],
];

/**
 * Project a world-space point to viewport pixels through the World's single
 * fixed resting camera (HELLO removal left it at one unmoving pose — see
 * layout.ts). Mirrors the same camera math `computeBrickLayout` uses, so a
 * DOM overlay can be pinned exactly onto a point in the 3D scene without
 * reaching into the canvas.
 */
export function projectWorldToScreen(
  point: Vec3,
  viewport: { width: number; height: number }
): { x: number; y: number } {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const aspect = width / height;

  const p0 = WELCOME_VIEW_POSITION;
  const look = WELCOME_VIEW_LOOKAT;
  const fx = look[0] - p0[0];
  const fy = look[1] - p0[1];
  const fz = look[2] - p0[2];
  const flen = Math.hypot(fx, fy, fz) || 1;
  const f: Vec3 = [fx / flen, fy / flen, fz / flen];

  const cross = (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];

  // Camera basis: backward (-look), right, up.
  const z: Vec3 = [-f[0], -f[1], -f[2]];
  const rightRaw = cross([0, 1, 0], z);
  const rlen = Math.hypot(rightRaw[0], rightRaw[1], rightRaw[2]) || 1;
  const right: Vec3 = [rightRaw[0] / rlen, rightRaw[1] / rlen, rightRaw[2] / rlen];
  const up = cross(z, right);

  const v: Vec3 = [point[0] - p0[0], point[1] - p0[1], point[2] - p0[2]];
  const depth = v[0] * f[0] + v[1] * f[1] + v[2] * f[2];
  const xc = v[0] * right[0] + v[1] * right[1] + v[2] * right[2];
  const yc = v[0] * up[0] + v[1] * up[1] + v[2] * up[2];

  const tanHalf = Math.tan((WORLD_CAMERA_FOV * Math.PI) / 360);
  const ndcX = xc / (depth * tanHalf * aspect);
  const ndcY = yc / (depth * tanHalf);

  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (0.5 - ndcY * 0.5) * height,
  };
}

/** Where Teddy starts when he first climbs into view (in front of WELCOME, low). */
export const TEDDY_CLIMB_START: Vec3 = [TEDDY_POSITION[0], 0.32, WELCOME_POSITION[2] + 0.75];

/**
 * Teddy centered over WELCOME, sitting just above its tallest letter with a
 * clearly visible gap. The extra clearance is intentional: TeddyMesh applies
 * expression-dependent body offsets and idle motion after this target is
 * resolved, and the hands sit below the body's widest point. Keeping the
 * clearance here prevents those child animations from merging Teddy into the
 * typography. Bumped from 0.38 to 0.52 together with the character scale-up
 * (TEDDY_WORLD_SCALE) so the bigger body still floats clear of the word.
 */
const ON_WELCOME: Vec3 = [TEDDY_POSITION[0], WELCOME_TOP_Y + TEDDY_RADIUS + 0.52, WELCOME_POSITION[2]];
const BEHIND_WELCOME: Vec3 = [-0.35, TEDDY_RADIUS + 0.12, WELCOME_POSITION[2] - 0.7];
const FAREWELL: Vec3 = [-1.4, TEDDY_RADIUS + 0.28, -0.9];

/** Resolve a pose to a world-space position. */
export function resolveTeddyPose(pose: TeddyPose, layout: BrickLayout): Vec3 {
  switch (pose.kind) {
    case "onWelcome":
      return ON_WELCOME;
    case "behindWelcome":
      return BEHIND_WELCOME;
    case "farewell":
      return FAREWELL;
    case "onBrick": {
      const local = layout.positions[pose.destinationId] ?? [0, 0, 0];
      const k = layout.groupScale;
      return [
        layout.groupPosition[0] + local[0] * k,
        layout.groupPosition[1] + local[1] * k + (BRICK_SIZE.h / 2) * k + TEDDY_RADIUS * 0.9,
        layout.groupPosition[2] + (0.1 + BRICK_SELECTED_POP_Z) * k,
      ];
    }
  }
}

/** Seconds Teddy takes to travel to a pose, and how high his path arcs. */
export function poseTravel(pose: TeddyPose): { duration: number; arc: number } {
  switch (pose.kind) {
    case "onWelcome":
      return { duration: 0.75, arc: 0.45 };
    case "behindWelcome":
      return { duration: 1.1, arc: 0.1 };
    case "onBrick":
      return { duration: 0.85, arc: 0.7 };
    case "farewell":
      return { duration: 1.0, arc: 0.35 };
  }
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

/** Self-hosted by scripts/copy-three-font.mjs (copied from the `three` package). */
export const LOCAL_FONT_URL = "/fonts/helvetiker_bold.typeface.json";

/** Session flag set on exit so the portfolio can fade in from the portal. */
export const ARRIVAL_FLAG = "vw:arrive-from-adventure";
