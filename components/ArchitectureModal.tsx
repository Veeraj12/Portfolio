"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import type { ArchitectureCaseStudy } from "@/data/architecture";

interface ArchitectureModalProps {
  study: ArchitectureCaseStudy | null;
  onClose: () => void;
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-tag mb-2 text-accent">{label}</p>
      <div className="text-[14.5px] leading-relaxed text-fg/85">{children}</div>
    </div>
  );
}

export function ArchitectureModal({ study, onClose }: ArchitectureModalProps) {
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!study) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [study, onClose]);

  return (
    <AnimatePresence>
      {study && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="architecture-modal-title"
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="my-6 w-full max-w-4xl rounded border border-border bg-bg"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <p className="label-tag">{study.context}</p>
                <h2
                  id="architecture-modal-title"
                  className="font-display text-xl font-semibold text-fg"
                >
                  {study.title}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close case study"
                className="flex h-9 w-9 items-center justify-center rounded border border-border text-fg hover:border-accent hover:text-accent"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-8 px-6 py-8">
              {study.diagramsReady && study.originalImage && study.improvedImage ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <figure className="overflow-hidden rounded border border-border bg-[#0D0C0A]">
                    <div className="relative aspect-[16/10] w-full">
                      <Image src={study.originalImage} alt={`Original architecture diagram for ${study.title}`} fill className="object-contain" />
                    </div>
                    <figcaption className="label-tag px-3 py-2">Original design</figcaption>
                  </figure>
                  <figure className="overflow-hidden rounded border border-border bg-[#0D0C0A]">
                    <div className="relative aspect-[16/10] w-full">
                      <Image src={study.improvedImage} alt={`Final architecture diagram for ${study.title}`} fill className="object-contain" />
                    </div>
                    <figcaption className="label-tag px-3 py-2">Final design</figcaption>
                  </figure>
                </div>
              ) : (
                <div className="rounded border border-dashed border-border bg-surface p-5 sm:p-6">
                  <p className="label-tag mb-2 text-accent">Source artifact needed</p>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted">
                    The architecture reasoning is documented below. The original Canva/exported diagram has not been included in this repository yet, so no placeholder diagram is presented as your work.
                  </p>
                  {study.artifactUrl && (
                    <a href={study.artifactUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                      Open original artifact <ArrowUpRight size={14} aria-hidden />
                    </a>
                  )}
                </div>
              )}

              <Block label="Problem">
                <p>{study.problem}</p>
              </Block>

              <Block label="Original architecture">
                <p>{study.originalArchitecture}</p>
              </Block>

              <Block label="Identified bottlenecks">
                <ul className="list-inside list-disc space-y-1.5">
                  {study.bottlenecks.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </Block>

              <Block label="Proposed improvement">
                <p>{study.proposedImprovement}</p>
              </Block>

              <Block label="Reasoning">
                <p>{study.reasoning}</p>
              </Block>

              <Block label="Trade-offs">
                <ul className="list-inside list-disc space-y-1.5">
                  {study.tradeoffs.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </Block>

              <Block label="Final architecture">
                <p>{study.finalArchitecture}</p>
              </Block>

              {(study.repositoryUrl || study.artifactUrl) && (
                <div className="flex flex-wrap gap-3 border-t border-border pt-5">
                  {study.repositoryUrl && (
                    <a href={study.repositoryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded border border-border px-3.5 py-2 text-sm hover:border-accent hover:text-accent">
                      Repository <ArrowUpRight size={14} aria-hidden />
                    </a>
                  )}
                  {study.artifactUrl && (
                    <a href={study.artifactUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded border border-border px-3.5 py-2 text-sm hover:border-accent hover:text-accent">
                      Original design <ArrowUpRight size={14} aria-hidden />
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
