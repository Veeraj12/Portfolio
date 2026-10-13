import { forwardRef, useImperativeHandle, useRef, type ReactNode, type Ref } from "react";
import { Canvas } from "@react-three/fiber";
import { AnchorProvider, useAnchorRef, useAnchorGetter } from "./anchors";
import { Ground } from "./Ground";
import { OpeningScene, type OpeningSceneHandle } from "./OpeningScene";
import { useQualitySettings } from "./useQualitySettings";
import { WORLD_CAMERA_FOV, WELCOME_VIEW_POSITION } from "./layout";
import type {
  AnchorId,
  OpeningSceneCallbacks,
  TeddySlotProps,
  WorldHandle,
  WorldQualitySettings,
} from "./types";

export interface WorldProps extends OpeningSceneCallbacks {
  /** Explicit quality/motion overrides. Anything left unset is auto-detected. */
  quality?: Partial<WorldQualitySettings>;
  /** Final integrator's real Teddy renderer — see TeddySlot for the contract. */
  renderTeddy?: TeddySlotProps["renderTeddy"];
  autoStart?: boolean;
  /**
   * INTEGRATION ADDITION. Self-hosted typeface JSON for WELCOME.
   * Strongly recommended in production (default is a third-party CDN).
   */
  fontUrl?: string;
  /**
   * INTEGRATION ADDITION. When true the render loop is stopped
   * (`frameloop="never"`) and the last frame stays on screen. Used while a
   * DOM overlay fully covers the world so we don't burn GPU behind it.
   */
  paused?: boolean;
  /**
   * Extra content placed inside the world, after the opening scene, so a
   * later integration can drop destination bricks / board / portal content
   * in without touching this module. Typically these will read anchor
   * positions via the `useWorldAnchor` hook exported from this package.
   */
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * World root. Owns the <Canvas>, the anchor registry, quality resolution,
 * and the opening choreography. Does not own destination bricks, the
 * board, or Teddy's internals — see MASTER_CONTEXT.md module boundaries.
 */
export const World = forwardRef<WorldHandle, WorldProps>(function World(
  { quality, renderTeddy, autoStart = true, fontUrl, paused = false, onStateChange, onIntroComplete, children, className, style },
  ref,
) {
  const resolvedQuality = useQualitySettings(quality);

  return (
    <div
      className={className}
      style={{ width: "100%", height: "100%", background: "#060504", ...style }}
    >
      <Canvas
        camera={{ position: WELCOME_VIEW_POSITION, fov: WORLD_CAMERA_FOV, near: 0.1, far: 100 }}
        dpr={resolvedQuality.deviceQuality === "low" ? 1 : [1, 2]}
        gl={{ antialias: resolvedQuality.deviceQuality !== "low" }}
        shadows={resolvedQuality.deviceQuality !== "low"}
        frameloop={paused ? "never" : "always"}
      >
        <AnchorProvider>
          <color attach="background" args={["#060504"]} />
          <fog attach="fog" args={["#060504", 10, 26]} />

          {/* The physical stage. Always mounted — darkness hides it until
              the lighting revamp's key light reveals it; see Ground.tsx. */}
          <Ground quality={resolvedQuality.lightingQuality} />

          <WorldInner
            handleRef={ref}
            quality={resolvedQuality}
            renderTeddy={renderTeddy}
            autoStart={autoStart}
            fontUrl={fontUrl}
            onStateChange={onStateChange}
            onIntroComplete={onIntroComplete}
          />

          <DestinationAreaAnchor />
          <PortalAnchor />

          {children}
        </AnchorProvider>
      </Canvas>
    </div>
  );
});

/**
 * Lives inside <AnchorProvider>, so it can both drive the opening scene and
 * expose the anchor registry through the public WorldHandle ref.
 */
function WorldInner({
  handleRef,
  quality,
  renderTeddy,
  autoStart,
  fontUrl,
  onStateChange,
  onIntroComplete,
}: {
  handleRef: Ref<WorldHandle>;
  quality: WorldQualitySettings;
  renderTeddy?: TeddySlotProps["renderTeddy"];
  autoStart: boolean;
  fontUrl?: string;
} & OpeningSceneCallbacks) {
  const sceneRef = useRef<OpeningSceneHandle>(null);
  const getAnchor = useAnchorGetter();

  useImperativeHandle(
    handleRef,
    (): WorldHandle => ({
      playIntro: () => sceneRef.current?.playIntro(),
      skipIntro: () => sceneRef.current?.skipIntro(),
      reset: () => sceneRef.current?.reset(),
      previewComposition: (target) => sceneRef.current?.previewComposition(target),
      getAnchor: (id: AnchorId) => getAnchor(id),
    }),
    [getAnchor],
  );

  return (
    <OpeningScene
      ref={sceneRef}
      quality={quality}
      renderTeddy={renderTeddy}
      autoStart={autoStart}
      fontUrl={fontUrl}
      onStateChange={onStateChange}
      onIntroComplete={onIntroComplete}
    />
  );
}

/** Empty, unpositioned group — Module 03 places/sizes bricks itself. */
function DestinationAreaAnchor() {
  const anchorRef = useAnchorRef("DESTINATION_AREA");
  return <group ref={anchorRef} position={[0, 0, 2]} />;
}

/** Empty, unpositioned group — Module 07 owns the actual portal visual. */
function PortalAnchor() {
  const anchorRef = useAnchorRef("PORTAL_ANCHOR");
  return <group ref={anchorRef} position={[0, 0, 6]} />;
}
