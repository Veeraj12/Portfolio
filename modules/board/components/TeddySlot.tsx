"use client";

import type { ReactNode } from "react";

interface TeddySlotComponentProps {
  renderTeddy: () => ReactNode;
  className?: string;
}

/**
 * Placement slot only. This component never imports or implements Teddy —
 * the integrator supplies renderTeddy() with the real character.
 */
export function TeddySlot({ renderTeddy, className = "" }: TeddySlotComponentProps) {
  return (
    <div data-teddy-slot="board" className={`pointer-events-none flex items-center justify-center ${className}`}>
      {renderTeddy()}
    </div>
  );
}
