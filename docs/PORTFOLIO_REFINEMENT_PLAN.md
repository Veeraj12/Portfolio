# Portfolio Refinement Plan

## Locked direction

- `/` remains the primary professional portfolio.
- `/adventure` remains optional and is presented as a secondary experience.
- Adventure theme: futuristic technical laboratory.
- Teddy's existing model is retained; polish motion, lighting, and context rather than rebuilding the model.
- Project cards are concise; detailed problem/approach copy remains available on demand.
- Architecture showcase uses a hybrid gallery + detailed case study model.
- Architecture visuals must come from Veeraj's real Canva exports or source artifacts. Do not invent diagrams or present placeholders as completed work.

## Implemented first pass

1. `components/ProjectCard.tsx`
   - Removed always-visible problem and solution paragraphs from the card face.
   - Added a native expandable "Problem & approach" section to preserve the detailed content.
   - Kept GitHub as a clear primary action and live demo conditional on a real `live` URL.
   - Reduced hover tilt and tightened card spacing.

2. `components/ProjectSection.tsx`
   - Replaced the alternating single-column layout with a responsive card grid.

3. `data/architecture.ts`
   - Made image and external artifact/repository fields optional.
   - Removed references to placeholder image paths that do not exist in the uploaded ZIP.

4. `components/ArchitectureCard.tsx` and `components/ArchitectureModal.tsx`
   - Added a clear artifact-needed state instead of broken images or invented architecture diagrams.
   - Only render diagram images when both real image paths are present and `diagramsReady` is true.
   - Support optional links to original artifacts and repositories.

5. `components/ArchitectureLab.tsx`
   - Updated section title and copy to establish the hybrid Architecture & Systems gallery/case-study direction.

## Link audit findings

- `data/projects.ts` contains eight project entries and all eight have syntactically valid `https://github.com/<owner>/<repo>` URLs.
- The repository URLs are unique.
- This source-level audit does **not** confirm that each remote repository is public, reachable, or the intended repository. Verify each destination in a browser before publishing.
- No `live` deployment URLs are currently defined in the project data, so the UI correctly shows no live-demo buttons.
- The IPD Prototype repository belongs to a different GitHub owner and is marked as a team project; preserve that distinction.

## Remaining implementation, in priority order

### P0 — Content and links
- Confirm each GitHub repository destination and permissions.
- Tighten project descriptions to one outcome-focused sentence where possible.
- Keep technology claims conservative where the repository has not been audited.
- Add live links only for deployments that load and represent the listed project.

### P1 — Real architecture artifacts
- Gather Canva links or export the original diagrams as PNG/WebP/PDF/SVG.
- Add one real preview artifact per case study and real original/final diagrams when applicable.
- Populate `previewImage`, `originalImage`, `improvedImage`, `artifactUrl`, and `repositoryUrl` only with real values.
- Add more case studies only after their artifacts and descriptions are supplied.

### P2 — Professional visual polish
- Review `components/Hero.tsx`, `components/Navbar.tsx`, `components/SectionHeading.tsx`, `components/About.tsx`, `components/WhatIBuild.tsx`, and `app/globals.css` for typography, hierarchy, responsive spacing, and consistency.
- Keep motion subtle and retain reduced-motion support.
- Preserve direct recruiter access to Projects, Architecture, and Contact.

### P3 — Adventure redesign
- Keep `app/adventure/page.tsx`, `app/adventure/AdventureClient.tsx`, `components/adventure/`, and the `modules/` boundaries intact.
- Theme pass: technical-lab / digital exhibition, graphite surfaces, restrained amber signal lighting, precise interface-like destinations.
- Opening scene pass: replace the oversized bouncy welcome treatment with controlled reveal, camera settling, refined type scale/material, and subtle Teddy greeting.
- Retain Teddy's model and existing event/controller flow.
- Test both entry from `/` and exit back to `/`.

## Validation before release

- Run `npm ci`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` in an environment with dependencies available.
- Manually test mobile/tablet/desktop, both theme modes, project filters, external links, architecture modal close/Escape behavior, reduced motion, `/adventure` entry/exit, and WebGL fallback.
- Do not mark the portfolio finished until actual architecture artifacts are present and all public links are verified.
