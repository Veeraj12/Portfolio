"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  cubicBezier,
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { Project } from "@/data/projects";
import { ProjectCard } from "./ProjectCard";

/**
 * Hydration-safe reduced-motion detection. It starts `false` (matching the
 * server render, which has no media query) and then reflects the user's real
 * preference in an effect. Framer's own `useReducedMotion` captures the value
 * once via `useState` with no updater, which made it unreliable here.
 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

/** Runs before paint on the client so the deck is positioned without a flash. */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Rolling deck → project grid.
 *
 * Every card keeps its existing markup, content and interactions. The grid is
 * rendered exactly once at its real responsive layout, and each card is then
 * offset *visually* (transform only, never layout) back into a coordinated
 * deck. A single shared `scrollYProgress` timeline for the section drives each
 * card from "fully in the deck" to "fully in the grid".
 *
 * Because the destination is the card's own grid slot, the measured geometry is
 * derived from the live DOM (`offsetLeft` / `offsetTop`, which ignore
 * transforms). That keeps the deck correct at every viewport width without any
 * hardcoded two/three-column coordinates, cloned cards or duplicate data.
 */
const GRID_CLASS =
  "relative mt-12 grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3";

const ZERO: DeckGeometry = { x: 0, y: 0 };
const NOOP_REF = () => {};

/**
 * Progress shaping (not a timer): a gentle ease-out so the deck lifts promptly
 * and settles softly, while still showing the fan mid-scroll. Monotonic, so
 * reversing the scroll never jumps.
 */
const DECK_EASE = cubicBezier(0.25, 0.46, 0.45, 0.94);

interface DeckGeometry {
  x: number;
  y: number;
}

interface DeckCardProps {
  project: Project;
  index: number;
  count: number;
  geometry: DeckGeometry;
  progress: MotionValue<number>;
  compact: boolean;
  registerRef: (node: HTMLDivElement | null) => void;
}

/**
 * A single deck participant. Memoised, and driven entirely by `MotionValue`s,
 * so scrolling never re-renders React — it only updates compositor-ready
 * transforms. The accent aura is a separate, opacity-only layer so the deck's
 * depth cue is a cheap composite instead of a per-frame box-shadow repaint.
 */
const DeckCard = memo(function DeckCard({
  project,
  index,
  count,
  geometry,
  progress,
  compact,
  registerRef,
}: DeckCardProps) {
  // Featured card leads; the rest trail slightly. Cards overlap while the
  // section is still low in the viewport and settle as it rises into view.
  const stagger = compact ? 0.08 : 0.1;
  const duration = Math.max(0.5, 1 - (count - 1) * stagger);
  const windowStart = index * stagger;

  // `ease` shapes the scroll mapping (not a timer): fast into place, gentle at
  // rest. Monotonic, so reversing scroll stays jump-free.
  const deckAmount = useTransform(
    progress,
    [windowStart, windowStart + duration],
    [1, 0],
    { ease: DECK_EASE },
  );

  // `strength` softens rotation on phones for a calmer, simplified unfold.
  const strength = compact ? 0.55 : 1;
  const rotateZ =
    (index % 2 === 0 ? -1 : 1) *
    (1.1 + Math.floor(index / 2) * 0.7) *
    strength;
  const rotateX = -(3.5 + index * 0.9) * strength;
  const restingScale = 1 - Math.min(index * 0.02, 0.07) * strength;

  const x = useTransform(deckAmount, [0, 1], [0, geometry.x]);
  const y = useTransform(deckAmount, [0, 1], [0, geometry.y]);
  const rotate = useTransform(deckAmount, [0, 1], [0, rotateZ]);
  const rotateXValue = useTransform(deckAmount, [0, 1], [0, rotateX]);
  const scale = useTransform(deckAmount, [0, 1], [1, restingScale]);
  const zIndex = useTransform(deckAmount, (value) =>
    value > 0.5 ? count - index : 1,
  );
  // Cards still sitting in the deck must never intercept a pointer meant for
  // the card in front of them. The front card always stays interactive.
  const pointerEvents = useTransform(deckAmount, (value) =>
    index > 0 && value > 0.2 ? "none" : "auto",
  );

  return (
    <motion.div
      ref={registerRef}
      data-deck-card=""
      className="relative"
      style={{
        x,
        y,
        rotate,
        rotateX: rotateXValue,
        scale,
        zIndex,
        pointerEvents,
        transformPerspective: 1200,
        transformOrigin: "top left",
        willChange: "transform",
      }}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded"
        style={{
          opacity: deckAmount,
          boxShadow:
            index === 0
              ? "0 24px 50px -28px rgba(139, 92, 246, 0.55), 0 0 0 1px rgba(139, 92, 246, 0.18)"
              : "0 16px 36px -26px rgba(59, 130, 246, 0.45), 0 0 0 1px rgba(168, 85, 247, 0.14)",
        }}
      />
      <ProjectCard project={project} />
    </motion.div>
  );
});

export function ProjectDeck({ projects }: { projects: Project[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [compact, setCompact] = useState(false);
  const [geometry, setGeometry] = useState<DeckGeometry[]>([]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 90%", "start 38%"],
  });

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Read each card's real grid slot and express it relative to the featured
  // (front) card. Differences cancel the offset-parent origin, so this stays
  // valid across one, two and three column layouts.
  const measure = useCallback(() => {
    const nodes = cardRefs.current.slice(0, projects.length);
    const anchor = nodes[0];
    if (!anchor) return;

    const peekX = compact ? 12 : 22;
    const peekY = compact ? 10 : 16;

    const next = nodes.map((node, index) => {
      if (!node) return ZERO;
      return {
        x: anchor.offsetLeft - node.offsetLeft + index * peekX,
        y: anchor.offsetTop - node.offsetTop + index * peekY,
      };
    });

    setGeometry((prev) => {
      const unchanged =
        prev.length === next.length &&
        prev.every((item, index) => {
          const candidate = next[index];
          return candidate
            ? item.x === candidate.x && item.y === candidate.y
            : false;
        });
      return unchanged ? prev : next;
    });
  }, [compact, projects.length]);

  // Layout effect: position the deck before the first paint, so a mid-page
  // reload never flashes an unfolded grid first. Listeners are attached here
  // too but only fire on resize / container reflow.
  useIsomorphicLayoutEffect(() => {
    if (reducedMotion) return;

    measure();
    const container = containerRef.current;
    const observer = container ? new ResizeObserver(measure) : null;
    if (container && observer) observer.observe(container);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, reducedMotion]);

  // Stable per-card ref callbacks keep `DeckCard` memoised across re-renders.
  const refSetters = useMemo(
    () =>
      projects.map(
        (_, index) => (node: HTMLDivElement | null) => {
          cardRefs.current[index] = node;
        },
      ),
    [projects],
  );

  if (reducedMotion) {
    return (
      <div ref={containerRef} className={GRID_CLASS}>
        {projects.map((project) => (
          <div key={project.id}>
            <ProjectCard project={project} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={GRID_CLASS}>
      {projects.map((project, index) => (
        <DeckCard
          key={project.id}
          project={project}
          index={index}
          count={projects.length}
          geometry={geometry[index] ?? ZERO}
          progress={scrollYProgress}
          compact={compact}
          registerRef={refSetters[index] ?? NOOP_REF}
        />
      ))}
    </div>
  );
}
