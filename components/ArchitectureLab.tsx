"use client";

import * as React from "react";
import { architectureCaseStudies, type ArchitectureCaseStudy } from "@/data/architecture";
import { ArchitectureCard } from "./ArchitectureCard";
import { ArchitectureModal } from "./ArchitectureModal";
import { ScrollReveal } from "./ScrollReveal";
import { SectionHeading } from "./SectionHeading";

export function ArchitectureLab() {
  const [active, setActive] = React.useState<ArchitectureCaseStudy | null>(null);

  return (
    <section id="architecture" className="scroll-mt-20 overflow-hidden border-t border-border py-20 sm:py-24">
      <div className="container-lab">
        <SectionHeading
          index="05"
          title="Architecture & Systems"
          subtitle="A visual gallery of real system designs, with deeper case studies into the decisions, trade-offs, and engineering behind them."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {architectureCaseStudies.map((study, i) => (
            <ScrollReveal
              key={study.id}
              y={28}
              x={i % 2 === 0 ? -30 : 30}
            >
              <ArchitectureCard
                study={study}
                onOpen={() => setActive(study)}
              />
            </ScrollReveal>
          ))}
        </div>
      </div>

      <ArchitectureModal study={active} onClose={() => setActive(null)} />
    </section>
  );
}
