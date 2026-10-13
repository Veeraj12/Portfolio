"use client";

import { motion } from "framer-motion";
import { Github, ExternalLink, X } from "lucide-react";
import type { AdventureProject, TechnologyIconResolver } from "../types";
import { TechnologyList } from "./TechnologyList";
import { projectSurfaceId } from "./AdventureProjectCard";

interface ProjectPaperProps {
  project: AdventureProject;
  onClose: () => void;
  reducedMotion: boolean;
  resolveIcon?: TechnologyIconResolver;
}

const LAYOUT_SPRING = { type: "spring" as const, stiffness: 300, damping: 34, mass: 0.9 };

function Block({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-l-2 border-cyan-600/50 pl-3.5">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-800/80">{heading}</p>
      {children}
    </div>
  );
}

export function ProjectPaper({ project, onClose, reducedMotion, resolveIcon }: ProjectPaperProps) {
  const sections = (project.sections ?? []).filter((s) => s.body || (s.items && s.items.length > 0));

  return (
    <motion.div
      // The backdrop stays fully transparent (no dark tint) so the board's
      // project list remains the visual context while its details are open;
      // a backdrop blur pushes the list out of focus instead of covering it.
      // Clicking anywhere off the paper (the "sides") closes it and brings the
      // list back into focus.
      className="absolute inset-0 z-10 flex items-center justify-center bg-transparent p-3 backdrop-blur-sm sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.2 }}
      onClick={onClose}
    >
      {/*
        INTEGRATION: the paper shares a layoutId with its card, so opening is
        CARD -> EXPAND -> PAPER and closing is PAPER -> CARD (one continuous
        surface, not a fade). The written content fades in after the surface
        has mostly grown, so text is never seen stretched mid-transition.
      */}
      <motion.div
        layoutId={reducedMotion ? undefined : projectSurfaceId(project.id)}
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        onClick={(e) => e.stopPropagation()}
        initial={reducedMotion ? { opacity: 0 } : undefined}
        animate={reducedMotion ? { opacity: 1 } : undefined}
        exit={reducedMotion ? { opacity: 0 } : undefined}
        transition={reducedMotion ? { duration: 0 } : LAYOUT_SPRING}
        className="relative flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-xl border border-cyan-500/25 bg-gradient-to-b from-[#111c27] to-[#0a1017] text-slate-100 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.8)]"
        style={{ borderRadius: 12 }}
      >
        {/* Warm accent edge so the open "item" reads as a distinct card. */}
        <div aria-hidden="true" className="h-1.5 w-full shrink-0 bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600" />

        {/*
          The close control lives on the paper itself (not inside the scroll
          area below), pinned to its top-right corner, so it stays reachable no
          matter how far the details have been scrolled.
        */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close project details"
          className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-500/20 bg-[#111c27]/90 text-slate-300 outline-none backdrop-blur-[1px] hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-cyan-600/60"
        >
          <X size={16} />
        </button>

        <motion.div
          className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: reducedMotion ? 0 : 0.18, delay: reducedMotion ? 0 : 0.16 } }}
          exit={{ opacity: 0, transition: { duration: 0.06 } }}
        >
          <div className="flex items-center gap-2 pr-9">
            {project.category && (
              <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-cyan-200/90">
                {project.category}
              </span>
            )}
          </div>

          <h3 className="mt-3 pr-9 text-2xl font-bold leading-tight tracking-tight text-slate-100">{project.title}</h3>

          {project.image && (
            <figure className="mt-4 overflow-hidden rounded-lg border border-slate-500/20 bg-slate-950">
              {/* Original source artifact: kept intact and opened at the largest available width. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={project.image} alt={`Original design artifact: ${project.title}`} className="max-h-[58vh] w-full object-contain" />
              <figcaption className="border-t border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">Original design · supplied artifact</figcaption>
            </figure>
          )}

          <p className="mt-3 text-[15px] leading-relaxed text-slate-300">{project.description}</p>

          {project.problem && (
            <Block heading="Problem">
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-300">{project.problem}</p>
            </Block>
          )}

          {project.solution && (
            <Block heading="Solution">
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-300">{project.solution}</p>
            </Block>
          )}

          {sections.map((section) => (
            <Block key={section.heading} heading={section.heading}>
              {section.body && <p className="mt-1.5 text-[15px] leading-relaxed text-slate-300">{section.body}</p>}
              {section.items && section.items.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[15px] leading-relaxed text-slate-300 marker:text-cyan-700/60">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </Block>
          ))}

          <div className="mt-6 border-t border-slate-500/20 pt-4">
            <TechnologyList
              technologies={project.technologies}
              note={project.technologyNote}
              size="md"
              theme="dark"
              resolveIcon={resolveIcon}
            />
          </div>

          {(project.github || project.live) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-sm border border-[#2a2015]/15 bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/60"
                >
                  <Github size={14} /> GitHub
                </a>
              )}
              {project.live && (
                <a
                  href={project.live}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-sm border border-cyan-500/35 bg-transparent px-3 py-1.5 text-xs font-medium text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/60"
                >
                  <ExternalLink size={14} /> Live
                </a>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
