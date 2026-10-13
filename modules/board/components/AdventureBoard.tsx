"use client";

import { useState, useCallback, useMemo } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { AdventureBoardProps, AdventureProject } from "../types";
import { AdventureProjectCard } from "./AdventureProjectCard";
import { ProjectPaper } from "./ProjectPaper";
import { TeddySlot } from "./TeddySlot";

export function AdventureBoard({
  destinationId,
  title,
  destinationLabel,
  projects,
  activeProjectId,
  onProjectSelect,
  onProjectClose,
  onBack,
  teddySlot,
  emptyMessage,
  resolveTechnologyIcon,
  className = "",
}: AdventureBoardProps) {
  const prefersReducedMotion = useReducedMotion();

  // Uncontrolled fallback state, used only when the parent doesn't pass activeProjectId.
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);
  const isControlled = activeProjectId !== undefined;
  const activeId = isControlled ? activeProjectId : internalActiveId;

  const activeProject = useMemo(() => projects.find((p) => p.id === activeId) ?? null, [projects, activeId]);

  const handleSelect = useCallback(
    (project: AdventureProject) => {
      if (!isControlled) setInternalActiveId(project.id);
      onProjectSelect?.(project);
    },
    [isControlled, onProjectSelect],
  );

  const handleClosePaper = useCallback(() => {
    if (!activeProject) return;
    if (!isControlled) setInternalActiveId(null);
    onProjectClose?.(activeProject);
  }, [activeProject, isControlled, onProjectClose]);

  return (
    <div
      role="region"
      aria-label={`${title} board`}
      data-destination-id={destinationId}
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-cyan-900/35 bg-[#0b1118] text-slate-100 shadow-[0_0_60px_rgba(0,0,0,0.5)] ${className}`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-cyan-900/35 bg-[#111c27] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to destinations"
              title="Back to destinations"
              className="relative z-20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 outline-none transition-colors hover:bg-cyan-400/20 focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-cyan-300/65">{destinationLabel ?? destinationId}</p>
            <h2 className="truncate text-lg font-semibold text-slate-100">{title}</h2>
          </div>
        </div>
        {/* z-20 keeps Teddy ABOVE the project paper's backdrop (z-10), so the
            backdrop-blur applied when a card opens blurs the list behind it
            without blurring Teddy himself. */}
        <div className="relative z-20 flex shrink-0 items-center gap-3">
          {teddySlot?.renderTeddy && <TeddySlot renderTeddy={teddySlot.renderTeddy} className={teddySlot.className} />}
        </div>
      </header>

      <div
        tabIndex={0}
        role="list"
        aria-label={`${title} projects`}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
      >
        {projects.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {projects.map((project) => (
              <AdventureProjectCard
                key={project.id}
                project={project}
                onSelect={handleSelect}
                reducedMotion={!!prefersReducedMotion}
                resolveIcon={resolveTechnologyIcon}
              />
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-cyan-200/45">{emptyMessage ?? "No entries yet for this destination."}</p>
        )}
      </div>

      <AnimatePresence>
        {activeProject && (
          <ProjectPaper
            key={activeProject.id}
            project={activeProject}
            onClose={handleClosePaper}
            reducedMotion={!!prefersReducedMotion}
            resolveIcon={resolveTechnologyIcon}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
