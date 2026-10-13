"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Teddy } from "@/modules/teddy";

export interface AdventurePortalEntryProps {
  /**
   * Where the entry point navigates when no `onAdventureRequest` handler is
   * given. The adventure route is not assumed to exist yet — the final
   * integrator wires this up once it does.
   */
  adventureHref?: string;
  /**
   * Optional callback boundary. When provided, the entry point calls this
   * instead of navigating, so the final integrator can hand off to the
   * adventure's own state machine (e.g. trigger the portal/loading sequence)
   * rather than a hard route change.
   */
  onAdventureRequest?: () => void;
  /** Override the default copy. */
  label?: string;
}

export function AdventurePortalEntry({
  adventureHref = "/adventure",
  onAdventureRequest,
  label = "Wanna go on another adventure?",
}: AdventurePortalEntryProps) {
  const [hovered, setHovered] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const router = useRouter();
  const animationFrame = React.useRef<number | null>(null);

  React.useEffect(
    () => () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    },
    []
  );

  const startAdventure = () => {
    if (loading) return;
    setLoading(true);
    setProgress(0);

    const startedAt = performance.now();
    const tick = (now: number) => {
      const nextProgress = Math.min((now - startedAt) / 1200, 1);
      setProgress(nextProgress);
      if (nextProgress < 1) {
        animationFrame.current = requestAnimationFrame(tick);
        return;
      }
      if (onAdventureRequest) onAdventureRequest();
      else router.push(adventureHref);
    };
    animationFrame.current = requestAnimationFrame(tick);
  };

  const content = (
    <>
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <span
          aria-hidden
          className="portal-glow absolute inset-0 rounded-full bg-accent blur-md"
        />
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-accent/60 bg-bg text-accent">
          <Sparkles size={14} />
        </span>
      </span>
      <motion.span
        initial={false}
        animate={{
          width: hovered ? "auto" : 0,
          opacity: hovered ? 1 : 0,
          marginLeft: hovered ? 4 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="hidden overflow-hidden whitespace-nowrap text-[13px] font-medium text-fg sm:inline-block"
      >
        {label}
      </motion.span>
      <span className="sr-only sm:hidden">{label}</span>
    </>
  );

  const sharedProps = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setHovered(true),
    onBlur: () => setHovered(false),
    "aria-label": label,
    className:
      "theme-transition fixed bottom-5 right-5 z-40 flex items-center rounded-full border border-border bg-surface/90 py-1.5 pl-1.5 pr-1.5 shadow-lg backdrop-blur-md transition-colors duration-200 ease-engineered hover:border-accent/60 sm:bottom-6 sm:right-6 sm:pr-4",
  };

  if (onAdventureRequest) {
    return (
      <>
        <button type="button" onClick={startAdventure} disabled={loading} {...sharedProps}>
          {content}
        </button>
        {loading && <AdventureLoadingScreen progress={progress} />}
      </>
    );
  }

  return (
    <>
      <Link
        href={adventureHref}
        {...sharedProps}
        onClick={(event) => {
          event.preventDefault();
          startAdventure();
        }}
        aria-disabled={loading}
      >
        {content}
      </Link>
      {loading && <AdventureLoadingScreen progress={progress} />}
    </>
  );
}

function AdventureLoadingScreen({ progress }: { progress: number }) {
  const percentage = Math.round(progress * 100);

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-5 bg-[#06050c] px-6 text-center"
      role="status"
      aria-live="polite"
      aria-label={`Preparing Teddy's adventure, ${percentage}%`}
    >
      <Teddy
        expression={progress < 0.75 ? "happy" : "excited"}
        action="walk"
        talking={progress > 0.35 && progress < 0.9}
        className="h-[220px] w-[220px]"
        style={{ width: 220, height: 220 }}
      />
      <div className="w-full max-w-xs">
        <p className="mb-3 text-sm tracking-wide text-amber-100/80">
          Teddy is getting the adventure ready… {percentage}%
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-amber-100/15">
          <div
            className="h-full rounded-full bg-amber-300 transition-[width] duration-100"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
