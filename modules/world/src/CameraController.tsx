import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { makeSeededRandom } from "./rng";
import type { CameraControllerHandle, QualityLevel } from "./types";

export interface CameraWaypoint {
  /** World-space position the camera should move to. */
  position: [number, number, number];
  /** World-space point the camera should look at. */
  lookAt: [number, number, number];
  /** Seconds this leg of the journey should take at full quality. */
  duration: number;
}

export interface CameraControllerProps {
  /** Ordered path the intro plays through. Currently a single resting
   *  waypoint (see OpeningScene.tsx) — kept as an array since a future
   *  scene may need a real multi-stop camera move again. */
  path: CameraWaypoint[];
  cameraQuality: QualityLevel;
  reducedMotion: boolean;
  /** Called every time the controller settles on a new waypoint index. */
  onWaypointReached?: (index: number) => void;
  /** Called once the final waypoint in the path is reached. */
  onPathComplete?: () => void;
  children?: ReactNode;
}

const EASING: Record<QualityLevel, (t: number) => number> = {
  // Cheaper linear-ish ease for low quality, smoother cubic for high.
  low: (t) => t,
  medium: (t) => t * t * (3 - 2 * t), // smoothstep
  high: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), // cubic in/out
};

/**
 * Drives the camera through `path` on command. Does not assume it owns the
 * only camera in the app — it manipulates whatever camera R3F currently has
 * active via useThree(), so a parent can swap camera implementations later.
 */
export const CameraController = forwardRef<
  CameraControllerHandle,
  CameraControllerProps
>(function CameraController(
  { path, cameraQuality, reducedMotion, onWaypointReached, onPathComplete, children },
  ref,
) {
  const { camera } = useThree();

  const stateRef = useRef({
    playing: false,
    fromIndex: 0,
    toIndex: 0,
    elapsed: 0,
    startPos: new Vector3(),
    startLookAt: new Vector3(),
    currentLookAt: new Vector3(0, 0, -1),
    // "Intended" position, ignoring shake. Shake is layered on top of this
    // every frame rather than on top of camera.position directly, so it
    // never accumulates drift and works whether or not a leg is playing.
    base: new Vector3(0, 0, 5),
  });

  const shakeRef = useRef({
    active: false,
    elapsed: 0,
    duration: 0,
    magnitude: 0,
    seedX: 0,
    seedY: 0,
  });
  const shakeRng = useRef(makeSeededRandom(9001));

  const applyImmediate = useCallback(
    (index: number) => {
      const wp = path[index];
      if (!wp) return;
      stateRef.current.base.set(...wp.position);
      camera.position.copy(stateRef.current.base);
      stateRef.current.currentLookAt.set(...wp.lookAt);
      camera.lookAt(stateRef.current.currentLookAt);
    },
    [camera, path],
  );

  const beginLeg = useCallback(
    (fromIndex: number, toIndex: number) => {
      const from = path[fromIndex];
      if (!from) return;
      stateRef.current.playing = true;
      stateRef.current.fromIndex = fromIndex;
      stateRef.current.toIndex = toIndex;
      stateRef.current.elapsed = 0;
      stateRef.current.startPos.set(...from.position);
      stateRef.current.startLookAt.set(...from.lookAt);
    },
    [path],
  );

  useImperativeHandle(
    ref,
    (): CameraControllerHandle => ({
      reset: () => {
        stateRef.current.playing = false;
        stateRef.current.fromIndex = 0;
        stateRef.current.toIndex = 0;
        applyImmediate(0);
      },
      playIntro: () => {
        if (path.length < 2) return;
        applyImmediate(0);
        beginLeg(0, 1);
      },
      skipIntro: () => {
        const last = path.length - 1;
        stateRef.current.playing = false;
        applyImmediate(last);
        onWaypointReached?.(last);
        onPathComplete?.();
      },
      setReducedMotion: () => {
        // Quality/motion is read live from props each frame; nothing to
        // store here, kept for API symmetry / future manual overrides.
      },
      shake: (magnitude = 0.05, duration = 0.32) => {
        if (reducedMotion) return; // never shake in reduced-motion mode
        shakeRef.current.active = true;
        shakeRef.current.elapsed = 0;
        shakeRef.current.duration = duration;
        shakeRef.current.magnitude = magnitude;
        shakeRef.current.seedX = shakeRng.current() * Math.PI * 2;
        shakeRef.current.seedY = shakeRng.current() * Math.PI * 2;
      },
    }),
    [path, applyImmediate, beginLeg, onWaypointReached, onPathComplete, reducedMotion],
  );

  useFrame((_, delta) => {
    const s = stateRef.current;

    if (s.playing) {
      const leg = path[s.toIndex];
      if (!leg) {
        s.playing = false;
      } else {
        // Reduced motion: collapse travel time so it reads as a quick
        // settle rather than a long dolly, without a hard teleport (keeps
        // orientation legible).
        const legDuration = reducedMotion ? Math.min(leg.duration, 0.4) : leg.duration;

        s.elapsed += delta;
        const t = Math.min(1, s.elapsed / Math.max(legDuration, 0.001));
        const eased = EASING[cameraQuality](t);

        s.base.set(
          s.startPos.x + (leg.position[0] - s.startPos.x) * eased,
          s.startPos.y + (leg.position[1] - s.startPos.y) * eased,
          s.startPos.z + (leg.position[2] - s.startPos.z) * eased,
        );
        s.currentLookAt.set(
          s.startLookAt.x + (leg.lookAt[0] - s.startLookAt.x) * eased,
          s.startLookAt.y + (leg.lookAt[1] - s.startLookAt.y) * eased,
          s.startLookAt.z + (leg.lookAt[2] - s.startLookAt.z) * eased,
        );

        if (t >= 1) {
          s.playing = false;
          onWaypointReached?.(s.toIndex);
          if (s.toIndex >= path.length - 1) {
            onPathComplete?.();
          } else {
            beginLeg(s.toIndex, s.toIndex + 1);
          }
        }
      }
    }

    // Shake is layered on top of `base` every frame, whether or not a leg
    // is currently playing (impact happens while the camera is otherwise
    // stationary, mid-way through the intro).
    camera.position.copy(s.base);
    camera.lookAt(s.currentLookAt);

    const shake = shakeRef.current;
    if (shake.active) {
      shake.elapsed += delta;
      const t = shake.elapsed / shake.duration;
      if (t >= 1) {
        shake.active = false;
      } else {
        const decay = Math.exp(-4.5 * t);
        const freq = 26;
        const dx = Math.sin(t * freq + shake.seedX) * shake.magnitude * decay;
        const dy = Math.cos(t * freq * 1.3 + shake.seedY) * shake.magnitude * 0.6 * decay;
        camera.position.x += dx;
        camera.position.y += dy;
      }
    }
  });

  return children ?? null;
});

export function restingCameraDefaults() {
  return { restingPosition: [0, 0, 5] as [number, number, number] };
}
