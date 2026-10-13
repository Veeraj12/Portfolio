"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { AdventureBoard, type TeddySlotProps as BoardTeddySlotProps } from "@/modules/board";
import { Teddy } from "@/modules/teddy";
import type { WorldHandle } from "@/modules/world";
import { AdventureController } from "./controller";
import { createAdventureEventBus } from "./events";
import { useAdventure } from "./hooks/useAdventure";
import { useWebGLSupport } from "./hooks/useWebGLSupport";
import { useReducedMotionFlag } from "./hooks/useReducedMotionFlag";
import { usePointerKind } from "./hooks/usePointerKind";
import { DialogueBubble } from "./ui/DialogueBubble";
import { TransitionBloom } from "./ui/TransitionBloom";
import { ExitPortalLayer } from "./ui/ExitPortalLayer";
import { AdventureLoader } from "@/modules/portal";
import { useNoSelectionStateMachine } from "@/modules/bricks";
import { getBoardContent } from "./adapters/boardContent";
import { createTechnologyIconResolver } from "./adapters/techIcons";
import { ADVENTURE_DESTINATIONS, LOCAL_FONT_URL, TIMING } from "./config";

// The World module pulls in three.js / R3F, so it's kept out of the initial
// bundle and only loaded once the adventure actually mounts.
const AdventureScene = dynamic(() => import("./AdventureScene").then((m) => m.AdventureScene), {
  ssr: false,
});

const resolveTechnologyIcon = createTechnologyIconResolver();

const EXIT_BUTTON_W = 110;
const EXIT_BUTTON_H = 44;

/**
 * The WELCOME screen's exit control. Playful on purpose: the first two times
 * the pointer reaches for it, it hops somewhere else (and Teddy pipes up with
 * his "leaving so soon?" line on every hover); the third reach it stays put,
 * and confirming it says "fine... leaving so soon" before the real exit runs.
 *
 * Keyboard users are never forced to chase it — focus still shows the line,
 * and a keyboard activation (click `detail === 0`) confirms immediately.
 * Reduced-motion users get a stationary button (no dodging) but the same
 * hover line and confirm flow.
 */
function ExitControl({
  onHover,
  onConfirm,
  reducedMotion,
}: {
  onHover: (intent: boolean) => void;
  onConfirm: () => void;
  reducedMotion: boolean;
}) {
  const attempts = useRef(0);
  // Offset from the button's fixed home (top-right), animated on a spring so a
  // dodge glides rather than teleports. The dodge is deliberately LOCAL: it
  // steps a bounded distance from where the button currently is and is clamped
  // inside the viewport, so it never flings from one edge to the other.
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const dodge = useCallback(() => {
    const w = typeof window === "undefined" ? 0 : window.innerWidth;
    const h = typeof window === "undefined" ? 0 : window.innerHeight;
    const margin = 16;
    const baseLeft = w - EXIT_BUTTON_W - margin;
    const baseTop = margin;
    const curLeft = baseLeft + offset.x;
    const curTop = baseTop + offset.y;

    const minLeft = margin;
    const maxLeft = Math.max(margin, w - EXIT_BUTTON_W - margin);
    const minTop = margin;
    const maxTop = Math.max(margin, h - EXIT_BUTTON_H - margin);
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

    const angle = Math.random() * Math.PI * 2;
    const distance = 130 + Math.random() * 90; // 130–220px: a hop, not a leap
    let nx = clamp(curLeft + Math.cos(angle) * distance, minLeft, maxLeft);
    let ny = clamp(curTop + Math.sin(angle) * distance, minTop, maxTop);

    // If clamping pinned it in place, nudge along a default diagonal instead.
    if (Math.hypot(nx - curLeft, ny - curTop) < 70) {
      nx = clamp(curLeft - 150, minLeft, maxLeft);
      ny = clamp(curTop + 110, minTop, maxTop);
    }
    setOffset({ x: nx - baseLeft, y: ny - baseTop });
  }, [offset]);

  const tryDodge = useCallback(() => {
    if (reducedMotion || attempts.current >= 2) return false;
    attempts.current += 1;
    dodge();
    return true;
  }, [dodge, reducedMotion]);

  return (
    <motion.button
      type="button"
      animate={{ x: offset.x, y: offset.y }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 210, damping: 22, mass: 0.9 }
      }
      onMouseEnter={() => {
        onHover(true);
        tryDodge();
      }}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      onClick={(e) => {
        // Pointer clicks chase the button; keyboard (detail === 0) confirms.
        if (e.detail !== 0 && tryDodge()) return;
        onConfirm();
      }}
      aria-label="Leave Veeraj's World and return to the portfolio"
      className="fixed right-4 top-4 z-40 flex items-center gap-1.5 rounded-sm border border-amber-400/30 bg-[#1a120b]/70 px-3 py-1.5 font-mono text-xs text-amber-100/80 outline-none will-change-transform hover:bg-[#1a120b]/90 hover:text-amber-50 focus-visible:ring-2 focus-visible:ring-amber-300"
    >
      <X size={14} /> Exit
    </motion.button>
  );
}

/**
 * Veeraj's World — the interactive-adventure mode.
 *
 * This is the ONLY place that imports every module directly; it is the
 * integration layer described in MASTER_CONTEXT.md. Every module still
 * works and can be demoed completely on its own (see each module's own
 * README) — this file is what wires their public APIs together through
 * the AdventureController + AdventureEventBus, per §"ARCHITECTURAL
 * PRINCIPLE": props, callbacks, typed events and data-driven config, never
 * direct imports between the modules themselves.
 */
export function Adventure({ onExit }: { onExit: () => void }) {
  const reducedMotion = useReducedMotionFlag();
  const webglSupported = useWebGLSupport();
  const pointerKind = usePointerKind();
  // The font is copied into public/ during postinstall and preloaded by the
  // route, so using it directly avoids a blocking capability probe and a
  // second render when the font URL resolves.
  const fontUrl = LOCAL_FONT_URL;
  const worldRef = useRef<WorldHandle | null>(null);

  // --- First-entry startup handshake -------------------------------------
  //
  // The opening must start automatically, exactly once, on first entry —
  // including on a hard refresh, on direct navigation to /adventure, and
  // when navigating in from the portfolio. It must not depend on which of
  // two independent async events (the World imperative handle becoming
  // available, and the 3D scene having painted its first real frames)
  // happens to resolve first — root-causing that ordering bug is why
  // `onHandleReady` is now a callback ref passed straight to <World ref>
  // in AdventureScene.tsx, not a `useEffect` reading a ref's `.current`
  // once (see the comment there for the full explanation). This is the
  // other half: the readiness gate those two signals feed into.
  //
  // Three pieces of state, each tracking exactly one fact:
  //   handleReady      — worldRef.current is non-null right now
  //   sceneReady        — the scene has mounted and painted >= 2 frames
  //                        (SceneReadyProbe, inside AdventureScene)
  //   introStartedRef    — playIntro() has already been called for this
  //                        mount of <Adventure> (a ref, not state: it must
  //                        never itself cause a re-render or re-run)
  // The effect below fires playIntro() the moment BOTH become true,
  // whichever arrives second, and only ever once per mount — so leaving
  // and re-entering the adventure (a fresh mount of this whole component)
  // naturally gets a fresh intro, with no stale flag to reset by hand.
  const [handleReady, setHandleReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const introStartedRef = useRef(false);

  const handleWorldHandleReady = useCallback((handle: WorldHandle | null) => {
    worldRef.current = handle;
    setHandleReady(handle != null);
  }, []);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  useEffect(() => {
    if (!handleReady || !sceneReady || introStartedRef.current) return;
    introStartedRef.current = true;
    // worldRef.current is guaranteed non-null here: handleReady is only
    // ever set true in the same callback that sets worldRef.current, and
    // nothing between that call and this effect can clear it (unmounting
    // AdventureScene would also flip handleReady back to false, re-running
    // this effect and short-circuiting on the guard above instead).
    worldRef.current?.playIntro();
  }, [handleReady, sceneReady]);

  const bus = useMemo(() => createAdventureEventBus(), []);
  const controller = useMemo(
    () =>
      new AdventureController({
        bus,
        destinations: ADVENTURE_DESTINATIONS,
        hasContent: (id) => getBoardContent(id).projects.length > 0,
        reducedMotion,
      }),
    // Deliberately created once; `reducedMotion` at mount time is enough
    // (it only scales a couple of transition durations, not correctness).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bus]
  );
  // StrictMode (dev) runs this effect as mount -> cleanup -> mount against
  // the SAME memoized controller, so cleanup must be REVERSIBLE: dispose()
  // here permanently killed the controller's bus subscriptions, leaving the
  // scene stuck after the intro (no bricks/dialogue, no errors). stop()/
  // start() unsubscribe and re-subscribe; true unmount also stops timers.
  useEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);

  const state = useAdventure(controller);

  // The no-selection "patience" ladder (module 03's own timing hook) is
  // driven here, outside the canvas — it needs no R3F context, only the
  // controller's phase. Its stage changes become bus events; the
  // controller decides what Teddy does with them. `patienceEpoch` forces a
  // restart (e.g. after Teddy peeks back out) even when `active` itself
  // doesn't toggle.
  const patienceActive = state.phase === "selection" && state.bricksVisible;
  const { reset: resetPatience } = useNoSelectionStateMachine({
    active: patienceActive,
    onStageChange: (stage) => bus.emit("NO_SELECTION_TIMEOUT", { stage }),
  });
  const patienceEpoch = state.patienceEpoch;
  useEffect(() => {
    resetPatience();
    // Only fires on an explicit epoch bump from the controller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patienceEpoch]);

  // Kick off once WebGL support is confirmed. Loading forever if unsupported.
  useEffect(() => {
    if (webglSupported === true && state.phase === "loading") bus.emit("ADVENTURE_READY", {});
  }, [webglSupported, state.phase, bus]);

  useEffect(() => {
    if (state.phase === "complete") onExit();
  }, [state.phase, onExit]);

  const boardContent = state.destinationId ? getBoardContent(state.destinationId) : null;

  const teddySlot: BoardTeddySlotProps | undefined = useMemo(
    () => ({
      // `animated={false}`: the board header is a static portrait — Teddy
      // holds whatever expression the controller set (e.g. "excited" while a
      // paper is open) with no idle float, blink or gesture.
      renderTeddy: () => (
        <Teddy expression={state.teddy.expression} action={state.teddy.held} talking={state.talking} scale={0.85} reducedMotion={reducedMotion} animated={false} />
      ),
      className: "h-14 w-14",
    }),
    [state.teddy.expression, state.teddy.held, state.talking, reducedMotion]
  );

  if (webglSupported === false) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#0b0806] px-6 text-center text-amber-50">
        <p className="max-w-sm text-sm text-amber-100/80">
          Veeraj&apos;s World needs 3D graphics support, which this browser doesn&apos;t have available right now.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="rounded-sm border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm text-amber-100 outline-none hover:bg-amber-400/20 focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          Go to the portfolio instead
        </button>
      </div>
    );
  }

  const boardOpen = state.phase === "board" || state.phase === "paper";
  const previewId = state.previewDestinationId;
  const showTouchGoAction =
    state.lastInput === "touch" &&
    state.phase === "selection" &&
    previewId != null &&
    previewId === state.hoveredDestinationId;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#06050c]">
      {webglSupported === true && (
        <AdventureScene
          state={state}
          bus={bus}
          reducedMotion={reducedMotion}
          quality="medium"
          fontUrl={fontUrl}
          paused={boardOpen || state.phase === "portal"}
          pointerKind={pointerKind}
          onHandleReady={handleWorldHandleReady}
          onSceneReady={handleSceneReady}
        />
      )}

      {!sceneReady && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#06050c]">
          <AdventureLoader />
        </div>
      )}

      {/* Explicit, visible Skip control for the opening cinematic itself
          (distinct from the "Skip adventure" link below, which leaves the
          whole experience). Calling skipIntro() jumps World straight to its
          settled "complete" frame and fires onIntroComplete the same way
          letting the intro finish naturally would — so the controller sees
          the same INTRO_COMPLETE signal either way and ends up in the same
          "selection" phase. */}
      {sceneReady && state.phase === "intro" && (
        <button
          type="button"
          onClick={() => worldRef.current?.skipIntro()}
          className="absolute right-4 top-4 z-40 rounded-sm border border-amber-400/30 bg-[#1a120b]/70 px-3 py-1.5 font-mono text-xs text-amber-100/80 outline-none hover:bg-[#1a120b]/90 hover:text-amber-50 focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          Skip intro
        </button>
      )}

      {/* The board no longer carries a "leave" control, so the exit action
          (previously the board's cross) now lives here, on the settled
          WELCOME/selection screen. It runs the same goodbye -> portal exit
          sequence as the board's old close button. */}
      {sceneReady && state.phase === "selection" && (
        <ExitControl
          reducedMotion={reducedMotion}
          onHover={(intent) => bus.emit("BOARD_CLOSE_HOVER", { intent })}
          onConfirm={() => bus.emit("EXIT_CONFIRMED", {})}
        />
      )}

      <TransitionBloom active={state.phase === "destination"} durationMs={TIMING.destinationTransitionMs} />

      <DialogueBubble
        line={state.dialogue}
        reducedMotion={reducedMotion}
        action={
          showTouchGoAction && previewId
            ? { label: "Go", onClick: () => bus.emit("DESTINATION_SELECTED", { destinationId: previewId, confirmed: true }) }
            : null
        }
      />

      <AnimatePresence>
        {boardOpen && boardContent && (
          <motion.div
            key={boardContent.destinationId}
            // Opaque, full-viewport backdrop (the same void colour as the
            // World root). Without it the board is a centred panel and the
            // still-mounted 3D scene — WELCOME type, the four bricks, Teddy —
            // stayed visible around and behind it once a brick was picked.
            // Fading it in with the board means the world is hidden the moment
            // the destination content is presented, without touching the
            // opening choreography (which has already finished by then).
            className="absolute inset-0 z-20 flex items-center justify-center bg-[#06050c] p-3 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
          >
            <div className="h-full max-h-[720px] w-full max-w-5xl">
              <AdventureBoard
                destinationId={boardContent.destinationId}
                title={boardContent.title}
                destinationLabel={boardContent.label}
                projects={boardContent.projects}
                activeProjectId={state.projectId}
                emptyMessage={boardContent.emptyMessage}
                resolveTechnologyIcon={resolveTechnologyIcon}
                teddySlot={teddySlot}
                onProjectSelect={(p) => bus.emit("PROJECT_SELECTED", { projectId: p.id, destinationId: boardContent.destinationId })}
                onProjectClose={(p) => bus.emit("PROJECT_CLOSED", { projectId: p.id, destinationId: boardContent.destinationId })}
                onBack={() => bus.emit("BOARD_BACK", {})}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ExitPortalLayer
        visible={state.phase === "portal"}
        reducedMotion={reducedMotion}
        onEnter={() => bus.emit("ADVENTURE_EXIT", {})}
        onStay={() => bus.emit("ADVENTURE_RESTART", {})}
        onHover={() => {}}
      />

      {/* Skip link: reaching the exit sequence without touching the 3D scene at all. */}
      {(state.phase === "selection" || state.phase === "destination") && (
        <button
          type="button"
          onClick={() => bus.emit("BOARD_CLOSE_SELECTED", {})}
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-amber-400/90 focus:px-3 focus:py-2 focus:text-sm focus:text-[#1a120b]"
        >
          Skip adventure and go to the portfolio
        </button>
      )}
    </div>
  );
}
