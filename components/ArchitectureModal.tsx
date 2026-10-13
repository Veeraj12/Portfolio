
"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ArchitectureCaseStudy } from "@/data/architecture";

interface ArchitectureModalProps {
  study: ArchitectureCaseStudy | null;
  onClose: () => void;
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="label-tag mb-2 text-accent">{label}</p>
      <div className="text-[14.5px] leading-relaxed text-fg/85">
        {children}
      </div>
    </div>
  );
}

export function ArchitectureModal({
  study,
  onClose,
}: ArchitectureModalProps) {
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!study) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
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
            transition={{
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            onClick={(event) => event.stopPropagation()}
            className="my-6 w-full max-w-4xl rounded border border-border bg-bg"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="pr-4">
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border text-fg hover:border-accent hover:text-accent"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-8 px-6 py-8">
              {/* Original architecture or workflow artifact */}
              {study.diagramsReady && study.previewImage && (
                <figure className="overflow-hidden rounded border border-border bg-[#0D0C0A]">
                  <div className="relative w-full">
                    <Image
                      src={study.previewImage}
                      alt={`Original architecture or workflow diagram for ${study.title}`}
                      width={1600}
                      height={1000}
                      sizes="(max-width: 768px) 100vw, 800px"
                      className="h-auto max-h-[640px] w-full object-contain"
                      unoptimized={study.previewImage.endsWith(".svg")}
                    />
                  </div>

                  <figcaption className="label-tag border-t border-border px-3 py-2">
                    Original design · Preserved artifact
                  </figcaption>
                </figure>
              )}

              {/* Problem */}
              <Block label="Problem">
                <p>{study.problem}</p>
              </Block>

              {/* Original architecture */}
              <Block label="Original architecture">
                <p>{study.originalArchitecture}</p>
              </Block>

              {/* Bottlenecks */}
              <Block label="Identified bottlenecks">
                <ul className="list-inside list-disc space-y-1.5">
                  {study.bottlenecks.map((bottleneck) => (
                    <li key={bottleneck}>{bottleneck}</li>
                  ))}
                </ul>
              </Block>

              {/* Proposed improvement */}
              <Block label="Proposed improvement">
                <p>{study.proposedImprovement}</p>
              </Block>

              {/* Reasoning */}
              <Block label="Reasoning">
                <p>{study.reasoning}</p>
              </Block>

              {/* Trade-offs */}
              <Block label="Trade-offs">
                <ul className="list-inside list-disc space-y-1.5">
                  {study.tradeoffs.map((tradeoff) => (
                    <li key={tradeoff}>{tradeoff}</li>
                  ))}
                </ul>
              </Block>

              {/* Final architecture */}
              <Block label="Final architecture">
                <p>{study.finalArchitecture}</p>
              </Block>

              {/* Tags */}
              {study.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-5">
                  {study.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-border px-3 py-1.5 text-xs text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
