# Portfolio implementation map

## Experience structure
- `/` — professional-first portfolio. Project cards stay concise; architecture designs are intentionally not shown on this route.
- `/adventure` — optional interactive experience. The `Engineering Archive` destination contains the supplied architecture/workflow designs.

## Project cards and links
- `data/projects.ts` — canonical project descriptions, problem/approach copy, technology tags and repository URLs. Descriptions have been shortened to one-sentence summaries.
- `components/ProjectCard.tsx` — compact card; expandable Problem & approach details; GitHub button; Live demo appears only when `live` is populated.
- `components/ProjectsExplorer.tsx` — professional project browsing/filtering.

## Adventure archive
- `data/architecture.ts` — seven data-driven exhibits, short descriptions, tags and explanatory case-study copy.
- `components/adventure/adapters/boardContent.ts` — maps architecture exhibit data to the Adventure board.
- `modules/board/components/AdventureBoard.tsx` — gallery cards and laboratory visual palette.
- `modules/board/components/AdventureProjectCard.tsx` — compact exhibit cards.
- `modules/board/components/ProjectPaper.tsx` — expanded exhibit view; original supplied image appears at large size before the explanation.
- `public/adventure-archive/` — all seven source artifacts supplied in this conversation, preserved as files: Eco Bin, Result Analyzer PNG and SVG flowchart, system architecture, WebSeekers technical approach, PolarLink flow and PolarLink technical architecture.

## Adventure opening polish
- `modules/world/src/WelcomeText.tsx` — WELCOME uses a restrained metallic material, no hatch/outline effect, and reduced bounce/tilt.
- `modules/world/src/OpeningScene.tsx` — impact shake reduced.
- Teddy model files in `modules/teddy/` were not changed.

## Navigation
- `components/Navbar.tsx` — replaced the now-removed professional Architecture section anchor with an Adventure Lab route link.
- `modules/bricks/src/data/destinations.ts` and `components/adventure/config.ts` — the Adventure architecture destination is labelled Engineering Archive.

## Link verification note
Repository URLs are retained from the project data. The source code was audited for present links and live-demo links remain absent unless explicitly supplied. This package does not claim remote GitHub reachability was verified.

## Original artifacts vs claims
The original diagrams are preserved unchanged. Descriptions identify them as design/workflow artifacts where implementation is not independently established.
