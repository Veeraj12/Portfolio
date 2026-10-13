# Veeraj's Portfolio — Professional Site + "Veeraj's World"

A Next.js 14 / TypeScript portfolio with two modes:

- **Professional portfolio** (`/`) — the existing recruiter-facing site.
- **Veeraj's World** (`/adventure`) — an interactive 3D adventure, guided by
  Teddy, that tours the same project data through destination "bricks"
  (Projects, AI/ML, Architecture, Motion) leading to project boards.

This repo is the integrated result of seven separately-built modules (Teddy,
World, Bricks, Board, Exit, the professional portfolio itself, and Portal).
**Start with [`docs/INTEGRATION.md`](docs/INTEGRATION.md)** — it explains how
the modules fit together, what was patched at each module boundary, and
what a stubbed `tsc --noEmit` pass did (and didn't) verify, since this
environment had no network access to run a real `npm install` (see that
doc's "Known limitations" for the bugs that pass caught and fixed, and
what's still worth double-checking once real `node_modules` exist).

Each module's own README, documenting its standalone public API, is at
`docs/modules/0N-*.md`; the original integration brief and shared context
are at `docs/FINAL_MASTER_INTEGRATION_PROMPT.md` and `docs/MASTER_CONTEXT.md`.

A second pass, **[`docs/ADVENTURE_REVAMP.md`](docs/ADVENTURE_REVAMP.md)**,
fixed a first-entry startup race, removed HELLO from the opening entirely
(WELCOME-only now), moved Teddy to a WELCOME-relative pose, and replaced
the destination bricks' single glowing box with a procedural stone-cluster
material/geometry system. Read that doc for the root-cause explanation,
what changed and why, and — importantly — exactly what was and wasn't
verified (no real build or browser was available to confirm any of it
visually; see its own "Remaining limitations").

## Getting started

```bash
npm install    # also self-hosts the WELCOME/HELLO 3D font (postinstall)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the portfolio, or
[http://localhost:3000/adventure](http://localhost:3000/adventure) directly
for Veeraj's World.

## Project layout

```
app/                    Next.js App Router — "/" (professional) and "/adventure"
components/              Professional-portfolio components (Navbar, Hero, ...)
components/adventure/     The integration layer — see docs/INTEGRATION.md
modules/                Vendored module deliverables (teddy, world, bricks,
                       board, exit, portal) — each usable standalone
data/                    Centralized project + architecture case-study data
                       (source of truth for BOTH modes — nothing invented)
docs/                    Integration doc, per-module READMEs, original briefs
scripts/                 copy-three-font.mjs (postinstall)
```

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion ·
Three.js / React Three Fiber / drei · next-themes
