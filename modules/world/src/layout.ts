/**
 * INTEGRATION ADDITION — shared world-space layout constants.
 *
 * These were previously private constants inside OpeningScene.tsx. They are
 * now exported (values UNCHANGED from their original V3 tuning, except
 * where noted) so the integration layer can place Teddy poses and the
 * destination bricks relative to the real WELCOME / camera coordinates
 * instead of re-guessing them.
 *
 * HELLO removal: the opening cinematic is WELCOME-only now (see
 * OpeningScene.tsx). HELLO_POSITION / HELLO_VIEW_POSITION /
 * HELLO_VIEW_LOOKAT have been removed — nothing in the active scene
 * resolves a HELLO-relative position anymore. WELCOME_VIEW_POSITION /
 * WELCOME_VIEW_LOOKAT are new: previously the camera's resting pose was a
 * local-only constant inside OpeningScene.tsx (`WELCOME_VIEW`) and World's
 * <Canvas camera> prop hardcoded the same numbers a second time,
 * independently. Both now read from here, so there is exactly one source
 * for "where the camera rests," not two copies that could drift apart —
 * which matters more now that the camera never dollies away from this
 * resting pose (there is no second waypoint to travel to without HELLO).
 */
import type { CameraWaypoint } from "./CameraController";

/** The spark light's own rest spot — separate from where WELCOME lands. */
export const SPARK_POSITION: [number, number, number] = [0, 0.06, -1];
export const WELCOME_POSITION: [number, number, number] = [0, 0, -6];
export const LIGHT_TARGET: [number, number, number] = [0, 0.6, -4];
/**
 * Teddy's slot anchor. WELCOME-relative (X centered on the word, same Z):
 * previously this sat beside HELLO (z=-2); now it sits above WELCOME
 * (z=-6) — see components/adventure/config.ts for how Teddy's actual
 * resting pose above the word is derived from this plus WELCOME's measured
 * height.
 */
export const TEDDY_POSITION: [number, number, number] = [0, 0, -9];

/**
 * The camera's single resting pose for the whole experience. Framed on
 * WELCOME at roughly 35% of frame width with generous negative space and
 * the ground visible in front of it — computed from the word's real width
 * and the camera's vertical FOV (50°) / assumed ~16:9 aspect, not eyeballed
 * (see OpeningScene.tsx's "V3 camera path" doc comment for the original
 * math this preserves). The camera no longer moves during the intro: with
 * HELLO removed there is only one landmark to frame, so this is the only
 * waypoint the path needs (see OpeningScene.tsx).
 */
export const WELCOME_VIEW_POSITION: [number, number, number] = [0, 2.4, 6.5];
export const WELCOME_VIEW_LOOKAT: [number, number, number] = [0, 1.1, -6];

/** Camera vertical field of view (degrees) used by <World />'s Canvas. */
export const WORLD_CAMERA_FOV = 50;

export type { CameraWaypoint };
