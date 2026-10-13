"use client";

// NOTE: `relative z-20` keeps this control above the project paper's dimmed
// backdrop (ProjectPaper's overlay is z-10 within the board), so "back" never
// looks dead while a paper is open — a click here means intent to leave, and
// the controller closes the paper before running the exit sequence.
interface BoardCloseButtonProps {
  onClose: () => void;
  /** true on hover/focus enter, false on leave/blur. Exit module can react to this. */
  onCloseIntent?: (intent: boolean) => void;
}

export function BoardCloseButton({ onClose, onCloseIntent }: BoardCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      onMouseEnter={() => onCloseIntent?.(true)}
      onMouseLeave={() => onCloseIntent?.(false)}
      onFocus={() => onCloseIntent?.(true)}
      onBlur={() => onCloseIntent?.(false)}
      aria-label="Close board"
      className="relative z-20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-red-400 outline-none transition-colors hover:bg-red-500/20 focus-visible:ring-2 focus-visible:ring-red-400/60"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}
