> **Integrated.** Vendored at `modules/board/`, with additive fields on `AdventureProject` (`technologyNote`, `sections`), a `resolveTechnologyIcon` prop, an `emptyMessage` prop, and a shared-`layoutId` card↔paper transition. Full details in [`docs/INTEGRATION.md`](../INTEGRATION.md) §3.

---

# Module 04 — Adventure Board

## 1. Purpose

A single, reusable board system used by every destination in Veeraj's World
(Projects, AI/ML, Architecture, Motion, or any future destination). The board
shows a scrollable grid of project cards; clicking a card expands it into a
paper/document detail view. The board contains no hardcoded project content —
it renders whatever `AdventureProject[]` it is given, and exposes a close
callback plus a close-intent signal for the exit module to react to.

This module does not implement destination selection, routing, the exit
sequence, or the real Teddy character. Those are explicitly out of scope
(see MASTER_CONTEXT §11, Module 04 boundary).

## 2. File Tree

```
board/
├── README.md
├── index.ts                       # public barrel export
├── types.ts                       # shared types / data contract
├── components/
│   ├── AdventureBoard.tsx         # top-level board container
│   ├── AdventureProjectCard.tsx   # compact card
│   ├── ProjectPaper.tsx           # expanded detail view
│   ├── BoardCloseButton.tsx       # red close control
│   ├── TechnologyList.tsx         # tech chip/icon display
│   └── TeddySlot.tsx              # typed Teddy placement slot
└── demo/
    ├── mockProjects.ts            # mock AdventureProject[] data
    ├── DemoBoard.tsx              # standalone demo wiring
    └── page.tsx                   # example Next.js route (copy + adjust import)
```

## 3. Public Component API

```tsx
<AdventureBoard
  destinationId="projects"          // DestinationId
  title="Projects"                  // board title
  destinationLabel="Destination"    // optional small label, defaults to destinationId
  projects={projects}               // AdventureProject[]
  activeProjectId={undefined}       // optional: controlled paper state (see §7)
  onProjectSelect={(p) => {}}       // card clicked/activated
  onProjectClose={(p) => {}}        // paper closed back to card
  onClose={() => {}}                // board close control activated
  onCloseIntent={(intent) => {}}    // true on hover/focus enter, false on leave
  teddySlot={{ renderTeddy: () => <RealTeddy /> }} // optional
  className=""                      // optional extra classes on the root
/>
```

Sub-components (`AdventureProjectCard`, `ProjectPaper`, `BoardCloseButton`,
`TechnologyList`, `TeddySlot`) are also exported individually from `index.ts`
in case the integrator wants to recompose the layout differently, but
`AdventureBoard` is the intended integration point.

## 4. Exported Types

From `types.ts` (re-exported via `index.ts`):

- `DestinationId` — open string union seeded with `"projects" | "ai-ml" | "architecture" | "motion"`.
- `AdventureProject` — the data-contract shape (see §5).
- `TeddySlotProps` — `{ renderTeddy?: () => ReactNode; className?: string }`.
- `AdventureBoardProps` — full prop shape for `AdventureBoard`.

## 5. Data Contract

```ts
interface AdventureProject {
  id: string;
  title: string;
  category?: string;
  description: string;
  problem?: string;
  solution?: string;
  technologies?: string[];
  github?: string;
  live?: string;
  image?: string;
}
```

Only `id`, `title`, and `description` are required. Every other field is
optional and is handled gracefully when absent — the module never fabricates
a value:

- No `image` → a neutral "no preview" placeholder is shown instead of an `<img>`.
- No `category` → the category line is omitted on both card and paper.
- No `problem` / `solution` → that block is omitted from the paper entirely.
- No `technologies` → the chip row renders nothing.
- No `github` → no GitHub button.
- No `live` → no Live button (this module never invents or infers a URL).

## 6. Data Adapter Expectations

This module does **not** import `data/projects.ts`. The final integrator is
expected to map the real project records into `AdventureProject[]` (field
renames, dropping fields this module doesn't use, generating `id` if the
source data lacks one) before passing them in as the `projects` prop. Keep
that mapping outside this module so the board stays destination-agnostic.

## 7. Card Lifecycle

`CARD → onProjectSelect → EXPAND/UNFOLD → PAPER`

- By default (`activeProjectId` left `undefined`), the board manages open
  paper state internally — clicking a card opens its paper, closing the
  paper returns to the grid. `onProjectSelect` / `onProjectClose` still fire
  either way, so the parent can log or orchestrate without owning state.
- Pass `activeProjectId` (a project id or `null`) to take full control: the
  board then only reflects that prop and relies on the parent to update it
  in response to `onProjectSelect` / `onProjectClose`.
- Cards are keyboard-activatable (Enter/Space) and carry visible focus rings,
  not just hover.

## 8. Paper Lifecycle

`PAPER (open) → close button / backdrop click → onProjectClose → CARD`

The paper renders as an overlay inside the board's own bounds (not a global
portal — no portal logic is implemented here, per scope). It shows name,
description, problem, solution, technology chips, and GitHub/Live actions,
each independently omitted when its source field is absent.

## 9. Scroll Behavior

The card grid sits in its own `overflow-y-auto overscroll-contain` region
with `tabIndex={0}`, so:

- Only the card region scrolls; the board frame (header, close button) stays
  anchored, and the page around the board is unaffected.
- The region is keyboard-focusable and scrollable via arrow keys/Page
  Up/Down once focused, and via touch drag on mobile.

## 10. GitHub/Live Rules

- GitHub button renders only when `project.github` is a non-empty string.
- Live button renders only when `project.live` is a non-empty string.
- Neither button is ever shown as a disabled placeholder — absence means
  omission, per MASTER_CONTEXT §9 ("never fabricate a URL").

## 11. Teddy Slot Contract

```tsx
<TeddySlot renderTeddy={() => <RealTeddy expression="happy" />} />
```

`AdventureBoard` renders `teddySlot.renderTeddy()` inside its header via the
`TeddySlot` wrapper, and skips it entirely when no `teddySlot` (or no
`renderTeddy`) is passed. The real Teddy implementation (Module 01) is never
imported here — the demo substitutes a static emoji placeholder.

## 12. Close / Close-Intent Callbacks

- `onClose()` — fires when the close control is clicked/activated. No timer,
  animation, or portal logic runs here; the integrator/exit module decides
  what happens next (maps to `BOARD_CLOSE_SELECTED`).
- `onCloseIntent(intent: boolean)` — fires `true` on hover/focus enter of the
  close control and `false` on leave/blur, so the exit module can drive a
  Teddy reaction (maps to `BOARD_CLOSE_HOVER`) without this module knowing
  anything about Teddy.

## 13. Reduced-Motion Behavior

`AdventureBoard` reads Framer Motion's `useReducedMotion()` once and passes
a `reducedMotion` boolean down to the card and paper components:

- Cards skip the hover/focus lift-and-scale animation.
- The paper skips its spring scale/slide-in and just cross-fades (fade
  duration also drops to instant), and the backdrop fade shortens.

No motion is gated behind JavaScript feature-detection beyond this hook —
if the OS-level reduced-motion preference is off, normal restrained motion
is used throughout (subtle lift on hover/focus, a short spring on paper
open/close).

## 14. Local Demo

`demo/DemoBoard.tsx` renders a full `AdventureBoard` with 8 mock projects
(mixing complete and sparse field sets), a static Teddy placeholder, an
event log panel showing every callback as it fires, and a "reopen board"
state after `onClose`. `demo/page.tsx` shows how to mount it as a Next.js
App Router page — copy it to `app/board-demo/page.tsx` in the real repo and
adjust the relative import to wherever this module ends up living.

To exercise every listed demo requirement: scroll the grid (8 cards force
overflow at typical viewport heights), hover/focus a card, click into a
paper, close the paper, hover/focus the close button, and click close.

## 15. Dependencies

- `react`, `next` (client components use the `next/navigation`-style
  `"use client"` directive; no App Router APIs are called directly)
- `framer-motion` (card/paper motion + `useReducedMotion`)
- `react-icons` (`react-icons/si` for technology icons)
- `lucide-react` (`Github`, `ExternalLink`, `X` icons in the paper)
- Tailwind CSS utility classes throughout (no separate CSS files)

All of these already appear in MASTER_CONTEXT's stack list.

## 16. Final Integration Boundary

The integrator is expected to:

1. Map real project data (`data/projects.ts`) into `AdventureProject[]`.
2. Supply `destinationId` / `title` / `destinationLabel` per selected
   destination (Module 03 emits the selection; this module only renders
   once a destination is chosen).
3. Pass a real `teddySlot.renderTeddy` (Module 01) instead of the demo
   placeholder.
4. Wire `onClose` / `onCloseIntent` into the exit sequence (Module 05) and
   `onProjectSelect` / `onProjectClose` into any shared event bus/analytics
   if desired — none of that logic lives in this module.
5. Optionally swap the raw Tailwind arbitrary-value colors used here
   (`#1b140d`, `#f6ecd9`, etc.) for the repo's actual design tokens once
   `tailwind.config.ts` conventions are known — they were chosen to match
   MASTER_CONTEXT's warm dark/parchment direction but aren't wired to any
   existing token system.

## 17. Known Limitations

- No virtualization on the card grid — fine for typical portfolio project
  counts, but very large lists (100+) would benefit from windowing.
- The paper is a self-contained overlay, not a shared/portaled modal, so
  nested boards (unlikely in this product) would each get their own overlay.
- Image loading uses a plain `<img>` tag rather than `next/image`, since
  this module is meant to be dropped into an isolated workspace without
  assuming the final image domains/config; the integrator may want to swap
  this for `next/image` once real image sources are known.
- Technology icon coverage is intentionally small (see `TechnologyList.tsx`);
  unmapped technologies always fall back to a text chip rather than blocking
  on an icon.

## 18. MODULE STATUS

Complete for the scope defined in `04_Board.md`. Builds and demos
independently against mock data with no dependency on other modules.

## 19. FILES CREATED

- `board/README.md`
- `board/index.ts`
- `board/types.ts`
- `board/components/AdventureBoard.tsx`
- `board/components/AdventureProjectCard.tsx`
- `board/components/ProjectPaper.tsx`
- `board/components/BoardCloseButton.tsx`
- `board/components/TechnologyList.tsx`
- `board/components/TeddySlot.tsx`
- `board/demo/mockProjects.ts`
- `board/demo/DemoBoard.tsx`
- `board/demo/page.tsx`

## 20. FILES MODIFIED

None. This module was built in an isolated workspace and does not touch any
existing repository files.
