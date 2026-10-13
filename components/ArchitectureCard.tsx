"use client";

import Image from "next/image";
import { ArrowUpRight, Network } from "lucide-react";
import type { ArchitectureCaseStudy } from "@/data/architecture";

interface ArchitectureCardProps {
  study: ArchitectureCaseStudy;
  onOpen: () => void;
}

export function ArchitectureCard({ study, onOpen }: ArchitectureCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded border border-border bg-surface transition-colors duration-300 ease-engineered hover:border-accent/60">
      <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden border-b border-border bg-[#11131a]">
        {study.previewImage ? (
          <Image
            src={study.previewImage}
            alt={`Architecture artifact preview for ${study.title}`}
            fill
            className="object-cover transition-transform duration-500 ease-engineered group-hover:scale-[1.025]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-amber-300">
              <Network size={22} strokeWidth={1.4} aria-hidden />
            </div>
            <p className="label-tag text-white/70">Architecture artifact</p>
            <p className="max-w-xs text-sm leading-relaxed text-white/50">
              Original diagram will appear here when the source export is added.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="label-tag mb-2">{study.context}</p>
        <h3 className="font-display text-lg font-semibold text-fg">{study.title}</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {study.tags.map((tag) => (
            <li key={tag} className="rounded-full border border-border px-2.5 py-1 label-tag">{tag}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onOpen}
          className="mt-auto inline-flex items-center gap-1.5 self-start pt-6 text-[13.5px] font-medium text-accent transition-transform duration-200 ease-engineered group-hover:translate-x-0.5"
        >
          Explore case study
          <ArrowUpRight size={15} aria-hidden />
        </button>
      </div>
    </article>
  );
}
