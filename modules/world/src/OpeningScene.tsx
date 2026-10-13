import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import { CameraController, type CameraWaypoint } from "./CameraController";
import { LightingSystem } from "./LightingSystem";
import { AmbientParticles } from "./AmbientParticles";
import { ImpactEffects } from "./ImpactEffects";
import { WelcomeText } from "./WelcomeText";
import { TeddySlot } from "./TeddySlot";
import {
  SPARK_POSITION,
  WELCOME_POSITION,
  TEDDY_POSITION,
  LIGHT_TARGET,
  WELCOME_VIEW_POSITION,
  WELCOME_VIEW_LOOKAT,
} from "./layout";
import { WELCOME_TIMING, WELCOME_FALL_HEIGHT, scaledDuration, impactVelocity } from "./timing";
import type {
  CameraControllerHandle,
  OpeningState,
  OpeningSceneCallbacks,
  TeddySlotPhase,
  TeddySlotProps,
  WorldQualitySettings,
} from "./types";
import { OPENING_STATE_ORDER } from "./types";

export interface OpeningSceneHandle {
  playIntro: () => void;
  skipIntro: () => void;
  reset: () => void;
  /**
   * V3 addition. Jumps directly to a fully-settled, non-animating frame so
   * the static composition can be evaluated without replaying the whole
   * sequence (see README "Local demo instructions" / V3 section). Does not
   * fire onStateChange/onIntroComplete callbacks — this is a design/review
   * aid, not part of the real playback sequence. V4: the camera never
   * travels (HELLO removed, so there is nothing to dolly toward) — this now
   * just jumps the state machine straight to "complete" and resets the
   * camera to its one resting pose.
   */
  previewComposition: (target?: "welcome") => void;
}

export interface OpeningSceneProps extends OpeningSceneCallbacks {
  quality: WorldQualitySettings;
  /** Supplied by the final integrator to render the real Teddy character. */
  renderTeddy?: TeddySlotProps["renderTeddy"];
  /** Whether the intro should start playing as soon as it mounts. */
  autoStart?: boolean;
  /**
   * INTEGRATION ADDITION. Self-hosted typeface JSON for WELCOME.
   * Defaults to the text component's own default.
   */
  fontUrl?: string;
}

// Base (non-reduced-motion) durations in seconds for each timer-driven state.
// Cut ~40% from the original tuning after the first playable build read as
// "slow to show": the early beats (darkness/glow) had no authored content, so
// they gated the WELCOME payoff with dead time rather than building it. The
// physical fall/impact/settle set and Teddy's two entrances keep their full
// lengths — those carry the choreography.
const BASE_DURATIONS: Partial<Record<OpeningState, number>> = {
  darkness: 0.5,
  "glow-appear": 0.5,
  "glow-expand": 0.8,
  falling: 0.35, // the spark light's own short drift (not WELCOME's fall)
  impact: 0.25, // spark light settling / igniting the world
  reveal: 0.7,
  "welcome-falling": WELCOME_TIMING.fall,
  "welcome-impact": WELCOME_TIMING.impact,
  "welcome-settle": WELCOME_TIMING.settle,
  "teddy-slot-active": 0.8,
  "teddy-gesture": 1.0,
  // "complete" is terminal.
};

function stateDuration(state: OpeningState, reducedMotion: boolean): number {
  const base = BASE_DURATIONS[state] ?? 0;
  return scaledDuration(base, reducedMotion);
}

const TEDDY_PHASE_FOR_STATE: Record<OpeningState, TeddySlotPhase> = {
  darkness: "hidden",
  "glow-appear": "hidden",
  "glow-expand": "hidden",
  falling: "hidden",
  impact: "hidden",
  reveal: "hidden",
  "welcome-falling": "hidden",
  "welcome-impact": "hidden",
  "welcome-settle": "hidden",
  "teddy-slot-active": "climbing",
  "teddy-gesture": "gesturing",
  complete: "ready-for-dialogue",
};

/**
 * V4 camera path — now a SINGLE resting waypoint, not a two-stop dolly.
 *
 * HELLO removal means there is only one landmark (WELCOME) for the camera
 * to frame, and the brief's own story has no camera movement at all once
 * the opening settles — the user explores destinations from the same
 * framing WELCOME falls into. So the camera never travels during this
 * scene: it is positioned at WELCOME_VIEW from the very first frame
 * (darkness through "complete" are all seen through this one unmoving
 * pose), and CameraController's `playIntro()` is a correct no-op on a
 * 1-waypoint path (see CameraController.tsx: `if (path.length < 2) return`).
 *
 * WELCOME_VIEW itself lives in layout.ts now (previously duplicated here
 * AND in World.tsx's <Canvas camera> prop as two independent copies of the
 * same numbers) — see layout.ts's doc comment.
 */
const WELCOME_VIEW: CameraWaypoint = {
  position: WELCOME_VIEW_POSITION,
  lookAt: WELCOME_VIEW_LOOKAT,
  duration: 0,
};

export const OpeningScene = forwardRef<OpeningSceneHandle, OpeningSceneProps>(
  function OpeningScene(
    { quality, renderTeddy, autoStart = true, fontUrl, onStateChange, onIntroComplete },
    ref,
  ) {
    const [state, setState] = useState<OpeningState>("darkness");
    const [impactTrigger, setImpactTrigger] = useState(0);
    const completedFired = useRef(false);
    const cameraRef = useRef<CameraControllerHandle>(null);

    // Single waypoint: nothing to travel between, but CameraController's
    // API still wants an array, and keeping it here (rather than inlining
    // `[WELCOME_VIEW]` in JSX) keeps its identity stable across renders.
    const cameraPath = useMemo<CameraWaypoint[]>(() => [WELCOME_VIEW], []);

    const advanceTo = useCallback(
      (next: OpeningState) => {
        setState(next);
          onStateChange?.(next);
      },
      [onStateChange],
    );

    const goToState = useCallback(
      (next: OpeningState) => {
        advanceTo(next);
        if (next === "welcome-impact" && !quality.reducedMotion) {
          // THUD: fire the dust/ripple burst and a brief camera shake in the
          // same instant WELCOME touches down. Shake magnitude is derived
          // from the actual touchdown velocity (real kinematics from
          // WELCOME_FALL_HEIGHT/WELCOME_TIMING.fall) rather than a bare
          // magic number, via a fixed velocity->magnitude scale tuned by eye.
          setImpactTrigger((n) => n + 1);
          const velocity = impactVelocity(WELCOME_FALL_HEIGHT, WELCOME_TIMING.fall);
          cameraRef.current?.shake(velocity * 0.0014, 0.22);
        }
      },
      [advanceTo, quality.reducedMotion],
    );

    const skipIntro = useCallback(() => {
      cameraRef.current?.skipIntro();
      advanceTo("complete");
      if (!completedFired.current) {
        completedFired.current = true;
        onIntroComplete?.();
      }
    }, [advanceTo, onIntroComplete]);

    const playIntro = useCallback(() => {
      completedFired.current = false;
      cameraRef.current?.reset();
      advanceTo("darkness");
    }, [advanceTo]);

    const reset = useCallback(() => {
      completedFired.current = false;
      cameraRef.current?.reset();
      setState("darkness");
    }, []);

    const previewComposition = useCallback(() => {
      // Deliberately bypasses the timer/callback machinery — jumps straight
      // to a fully-settled frame for visual review. See OpeningSceneHandle.
      // With a single camera waypoint there is only one resting frame to
      // preview; this parks the camera there and freezes on "complete".
      cameraRef.current?.reset();
      setState("complete");
    }, []);

    useImperativeHandle(
      ref,
      () => ({ playIntro, skipIntro, reset, previewComposition }),
      [playIntro, skipIntro, reset, previewComposition],
    );

    useEffect(() => {
      if (autoStart) playIntro();
      // Intentionally run once on mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Progression is driven by cancellable timers rather than accumulated
    // R3F frame deltas. Rendering can temporarily produce a zero/stalled
    // delta while the canvas is initializing or recovering, but the opening
    // state machine must still reach the interactive scene.
    useEffect(() => {
      const duration = stateDuration(state, quality.reducedMotion);
      if (duration <= 0) return;

      const timer = window.setTimeout(() => {
        const idx = OPENING_STATE_ORDER.indexOf(state);
        const next = OPENING_STATE_ORDER[idx + 1];
        if (!next) return;

        if (next === "complete") {
          advanceTo("complete");
          if (!completedFired.current) {
            completedFired.current = true;
            onIntroComplete?.();
          }
          return;
        }
        goToState(next);
      }, duration * 1000);

      return () => window.clearTimeout(timer);
    }, [advanceTo, goToState, onIntroComplete, quality.reducedMotion, state]);

    const teddyPhase = TEDDY_PHASE_FOR_STATE[state];
    const teddyVisible =
      state === "teddy-slot-active" ||
      state === "teddy-gesture" ||
      state === "complete";

    return (
      <>
        <CameraController
          ref={cameraRef}
          path={cameraPath}
          cameraQuality={quality.cameraQuality}
          reducedMotion={quality.reducedMotion}
        />

        <LightingSystem
          state={state}
          quality={quality.lightingQuality}
          reducedMotion={quality.reducedMotion}
          sparkPosition={SPARK_POSITION}
          keyTarget={LIGHT_TARGET}
        />

        <AmbientParticles
          active={state !== "darkness"}
          quality={quality.lightingQuality}
          reducedMotion={quality.reducedMotion}
          density={quality.particleDensity}
        />

        <WelcomeText
          state={state}
          quality={quality.lightingQuality}
          reducedMotion={quality.reducedMotion}
          position={WELCOME_POSITION}
          fontUrl={fontUrl}
        />

        <ImpactEffects
          triggerId={impactTrigger}
          quality={quality.lightingQuality}
          reducedMotion={quality.reducedMotion}
          position={WELCOME_POSITION}
        />

        <TeddySlot
          visible={teddyVisible}
          position={TEDDY_POSITION}
          phase={teddyPhase}
          wiggle={state === "teddy-gesture"}
          renderTeddy={renderTeddy}
        />
      </>
    );
  },
);
