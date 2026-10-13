"use client";

import { motion } from "framer-motion";

export type FilterValue = "all" | "engineering" | "ai-ml" | "utility";

const options: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "engineering", label: "Engineering" },
  { value: "ai-ml", label: "AI / ML" },
  { value: "utility", label: "Utilities" },
];

interface ProjectFilterProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}

export function ProjectFilter({ value, onChange }: ProjectFilterProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter projects by category"
      className="inline-flex flex-wrap items-center gap-1 rounded border border-border p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className="relative rounded px-3.5 py-1.5 text-[13px] font-medium text-fg transition-colors duration-200"
          >
            {active && (
              <motion.span
                layoutId="filter-pill"
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 rounded bg-accent"
              />
            )}
            <span
              className={`relative z-10 ${active ? "text-accent-fg" : "text-muted hover:text-fg"}`}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
