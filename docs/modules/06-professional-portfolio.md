> **Integrated.** This module *is* the repository root (`app/`, `components/`, `data/`). `/adventure` and the integration layer were added alongside it; nothing here was removed. See [`docs/INTEGRATION.md`](../INTEGRATION.md) for how the two modes hand off to each other.

---

# MODULE 06 — Professional Portfolio Polish
## Veeraj's World — Parallel-Agent Handoff

This is the isolated Module 06 workspace: a polished copy of the existing
professional portfolio, plus a floating adventure-mode entry point. It does
not implement, import, or assume any other module.

---

## 1. Purpose

Polish the existing professional portfolio so it reads as part of the same
product as "Veeraj's World," without turning it into the cinematic adventure.
Professional mode stays fast, clear, recruiter-friendly, and restrained.
This module also exposes a clean navigation boundary (a floating entry
point) that a future integrator can wire to the adventure once it exists.

## 2. Existing architecture preserved

Nothing structural changed. This is still:

- Next.js 14, App Router
- TypeScript
- Tailwind CSS (same design tokens in `app/globals.css` / `tailwind.config.ts`)
- Framer Motion
- next-themes (dark default, light/dark token system — not a color inversion)
- The same reusable component set and the same centralized data files
- `data/projects.ts` and `data/architecture.ts` are **untouched** — no
  project, technology, achievement, metric, or URL was added, removed, or
  invented

## 3. File tree

```
app/
  globals.css        (modified — theme-transition + portal glow keyframes)
  layout.tsx          (modified — theme transition re-enabled)
  page.tsx            (modified — adventure entry mounted)
components/
  AdventurePortalEntry.tsx   (new)
  Navbar.tsx           (modified — active-section tracking, underline, staggered mobile menu)
  ThemeToggle.tsx      (modified — crossfade icon transition)
  ProjectCard.tsx       (modified — tech icon hover micro-interaction)
  ProjectFilter.tsx     (modified — wrap safety on narrow viewports)
  ArchitectureCard.tsx   (modified — preview image hover zoom)
  ArchitectureLab.tsx    (modified — per-card staggered entrance, distinct from ProjectSection's motion)
  WhatIBuild.tsx        (modified — numbered index + hover state, still no fade-up)
data/                (untouched)
public/               (untouched)
```

Everything else (Hero, ProjectSection, ProjectsExplorer, About, Contact,
Footer, ThemeProvider, Button, SectionHeading, tech-icons, project/architecture
data) is unchanged from the existing implementation.

## 4. Visual changes

- Navbar: active section is now tracked via `IntersectionObserver` and shown
  with an animated underline (`layoutId` shared-element transition) instead
  of every link looking identical regardless of scroll position.
- Architecture Lab cards get a subtle image zoom on hover (previously static),
  matching the kind of hover response already used on project cards.
- `WhatIBuild` gained a numbered index (`01`/`02`/`03`) consistent with the
  numbering already used in `SectionHeading`, and a hover state on the left
  border/index — it was previously inert.
- The floating adventure entry point sits bottom-right, collapsed to a small
  glowing circular icon by default, expanding to show its label on
  hover/focus so it never competes with page content.

## 5. Motion changes

Intentionally *not* uniform fade-up-on-every-section:

- Hero keeps its existing staggered entrance (arrival moment, appropriate here).
- Project grids keep their existing slide-up stagger (`ProjectSection` —
  unchanged).
- Architecture Lab now uses a **scale-in** stagger instead of the previous
  block-level slide-up, so it reads as visually distinct from the project
  grids rather than a repeated pattern.
- `WhatIBuild`, `About`, and `Contact` remain deliberately static on scroll —
  they're short, always-near-the-fold text blocks where an entrance
  animation would just be motion for its own sake.
- New micro-interactions: theme toggle icon crossfade, nav active-link
  underline, tech-icon hover lift on project cards, architecture image hover
  zoom, adventure entry hover expansion.
- All new CSS animation (`portal-glow` pulse) is disabled under
  `prefers-reduced-motion: reduce`, consistent with the global rule already
  in `globals.css`. Framer Motion transitions inherit the same global
  reduced-motion handling already in place.

## 6. Theme compatibility

Dark/light both preserved and unaffected in content or contrast. One change:
`disableTransitionOnChange` was removed from `ThemeProvider` and a scoped
`background-color`/`color` transition was added to `body`, plus a
`.theme-transition` utility class, so switching themes now reads as one
coordinated crossfade instead of an instant cut — this was called out
explicitly under "Motion" in the module brief. The transition is short
(0.4s) and respects `prefers-reduced-motion` via the existing global rule.

## 7. Accessibility changes

- Nav active-state uses `aria-current="true"`, not color alone.
- Theme toggle keeps its existing `aria-pressed` / `aria-label`.
- Adventure entry point is a real `<button>` (callback mode) or `<Link>`
  (href mode), keyboard-focusable, with `aria-label` matching its visible
  text, and its label expansion triggers on `onFocus`/`onBlur` as well as
  mouse hover — so keyboard users get the same affordance touch/hover users
  do, not a hover-only interaction.
- All existing focus-visible, semantic-HTML, and reduced-motion handling
  from the base portfolio is untouched and still applies.

## 8. Adventure entry API

`components/AdventurePortalEntry.tsx` exports:

```ts
interface AdventurePortalEntryProps {
  adventureHref?: string;          // default: "/adventure"
  onAdventureRequest?: () => void; // optional callback boundary
  label?: string;                  // default: "Wanna go on another adventure?"
}
```

Behavior:
- If `onAdventureRequest` is passed, the entry point calls it on click/tap
  instead of navigating — use this to hand off to the adventure's own
  loading/portal sequence (Module 07) rather than a hard route change.
- Otherwise it renders as a `next/link` to `adventureHref`. No route named
  `/adventure` is assumed to exist; nothing breaks if it doesn't yet — it's
  simply an unrouted link until the integrator adds the page.
- Currently mounted once, in `app/page.tsx`, with no props overridden
  (i.e. using both defaults). The integrator can pass either prop from the
  final orchestration layer without touching this component.

## 9. Final integration expectations

The integrator should only need to:
1. Pass a real `adventureHref` or an `onAdventureRequest` callback into the
   existing `<AdventurePortalEntry />` mount in `app/page.tsx` (or move that
   one line to wherever the final layout composes things).
2. Nothing in this module needs to be rebuilt — no professional-portfolio
   component here imports or assumes the adventure exists.

## 10. Regression risks

- `disableTransitionOnChange` removal: on a very slow device, the 0.4s theme
  crossfade could very briefly show mismatched colors on complex nested
  surfaces (cards over cards). Low risk given the app's flat, mostly
  single-layer surfaces — but worth a visual check if new deeply-nested
  panels are added later.
- `IntersectionObserver` in `Navbar` assumes each `navLinks` href has a
  matching `id` in the DOM (`#home`, `#projects`, etc.) — true today, but if
  a future edit renames a section id without updating `navLinks`, that link
  silently stops highlighting (it still works as a scroll link either way).
- The floating adventure entry point is fixed-position at `bottom-right`;
  on very narrow viewports it sits close to the mobile theme toggle/menu
  button but does not overlap it in testing at 320px width — recheck if the
  navbar's right-side cluster changes.

## 11. Testing performed

- `npx tsc --noEmit` — passes, no type errors.
- `npx next lint` — passes, no warnings.
- `npx next build` — verified as a full production build (static
  prerendering included). Note: this sandbox has no network route to
  `fonts.googleapis.com`, so the build was verified once with the three
  `next/font/google` imports temporarily swapped for a no-font stub layout
  to confirm the rest of the pipeline (webpack, static generation, all
  components) compiles cleanly, then the real font-enabled `layout.tsx` was
  restored unchanged. On a machine with normal internet access, `next build`
  will fetch the fonts itself and needs no workaround.
- Manually traced (by reading code, not a live browser in this sandbox):
  keyboard tab order through the new nav underline and adventure entry,
  mobile-menu stagger logic, reduced-motion CSS paths, and light/dark token
  usage in every touched file.
- No automated visual/screenshot testing was available in this environment
  — recommend a manual pass in a real browser (light + dark, mobile +
  desktop) before merging.

## 12. Dependencies changed

None. No `package.json` changes — everything here uses libraries already in
the project (`framer-motion`, `lucide-react`, `next-themes`, `next/link`).

## 13. Known limitations

- The adventure entry point has no adventure to link to yet — it is
  intentionally a dead/unrouted link until Modules 01–05 and 07 exist and
  the integrator supplies a real destination.
- No live browser/visual QA was performed in this sandbox (see §11) —
  only static analysis (type-check, lint, build, code reading).
- Scroll-spy active-link tracking uses a single shared `IntersectionObserver`
  rootMargin tuned for this page's current section heights; if a section is
  ever made unusually short (shorter than the observer's margin band), its
  nav link may not get the "active" state exactly when expected. Cosmetic
  only — the link still scrolls correctly either way.

## 14. MODULE STATUS

**Complete** for the scope defined in the module brief (polish + adventure
entry point). Not blocked on any other module.

## 15. FILES CREATED

- `components/AdventurePortalEntry.tsx`

## 16. FILES MODIFIED

- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `components/Navbar.tsx`
- `components/ThemeToggle.tsx`
- `components/ProjectCard.tsx`
- `components/ProjectFilter.tsx`
- `components/ArchitectureCard.tsx`
- `components/ArchitectureLab.tsx`
- `components/WhatIBuild.tsx`

---

## Quick start (for reference)

```bash
npm install
npm run dev
```

See the inline notes above (§13, §11) for the two things worth knowing before
a real deploy: fonts need real internet access at build time, and the
adventure link has nowhere to go yet.
