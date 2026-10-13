const focus = [
  {
    index: "01",
    label: "Problem framing",
    body: "Starting from the actual friction — messy files, fragmented workflows — before touching a stack.",
  },
  {
    index: "02",
    label: "System design",
    body: "Structuring the pieces so the system stays explainable as it grows, not just fast to demo.",
  },
  {
    index: "03",
    label: "Iteration",
    body: "Shipping a working version, then rebuilding the parts that don't hold up — like ReconAI's matching engine.",
  },
];

import { ScrollReveal } from "./ScrollReveal";

export function WhatIBuild() {
  return (
    <section aria-label="What I build" className="overflow-hidden border-b border-border py-16">
      <div className="container-lab grid gap-8 sm:grid-cols-3">
        {focus.map((f) => (
          <ScrollReveal key={f.label} x={40} y={16}>
          <div
            className="group border-l border-border pl-5 transition-colors duration-300 ease-engineered hover:border-accent"
          >
            <div className="mb-2 flex items-baseline gap-2">
              <span className="font-mono text-[11px] text-muted/70 transition-colors duration-300 group-hover:text-accent">
                {f.index}
              </span>
              <p className="label-tag text-accent">{f.label}</p>
            </div>
            <p className="text-[14px] leading-relaxed text-muted">{f.body}</p>
          </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
