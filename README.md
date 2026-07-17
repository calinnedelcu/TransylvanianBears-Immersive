# Transylvanian Bears Experience

Immersive portfolio for the Transylvanian Bears team. The public experience combines
a continuous, scroll-directed 3D expedition with fast editorial routes for projects,
people and verified results.

## Public routes

- `/` - 16-chapter immersive story
- `/work` - seven projects grouped across four overlapping domains
- `/work/:slug` - semantic project case studies
- `/team` and `/team/:memberId` - team index and member profiles
- `/archive` - awards, internships and source-backed results

Old `/next/*` prototype URLs redirect to their final public equivalents.

## Content model

The seven projects use overlapping facets:

- Video games: The Buried Hands, Infect.exe
- School software: Aegis, SchoolMate
- Machine learning: Project Nexus, EconomyNews, Automation Risk
- Research papers: EconomyNews, Automation Risk

Project Nexus is applied machine learning and computer vision, not a research paper.
EconomyNews and Automation Risk are both machine-learning projects and research papers.

## Architecture

The home page is a continuous braided route, not a hub of disconnected project worlds.
Editorial clearings keep text, media, proof and 3D space in the same scene. Direct routes
remain available for accessibility, search engines and visitors who want to browse.

Three.js is deferred until the immersive scene is requested. Project media is lazy-loaded,
and the editorial shell ships independently from the 3D runtime.

Key documents:

- [`docs/vertical-slice-art-bible.md`](docs/vertical-slice-art-bible.md)
- [`docs/storyboard-01-04.md`](docs/storyboard-01-04.md)
- [`docs/asset-production-contract.md`](docs/asset-production-contract.md)
- [`docs/vertical-slice-sound-design.md`](docs/vertical-slice-sound-design.md)
- [`docs/greenfield/09-hybrid-world-architecture.md`](docs/greenfield/09-hybrid-world-architecture.md)
- [`docs/greenfield/08-core-loop-control.md`](docs/greenfield/08-core-loop-control.md)
- [`docs/greenfield/01-content-inventory.md`](docs/greenfield/01-content-inventory.md)

## Development

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run build:vertical-slice
npm run lint
npm run build
npm run qa:immersive
npm run qa:school-act
npm run qa:buried-act
npm run qa:visual
npm audit --omit=dev
```

`build:vertical-slice` regenerates the Blender citadel, its poster, the separately
authored desktop/mobile camera curves for chapters 01-04, and the complete Buried
Hands package for chapters 08-10. Camera JSON and runtime assets are schema-checked,
budget-checked, and verified for exact chapter handoffs by the QA suites.

`qa:visual` records the authored opening, all three Nexus lens modes, the Lens-to-Proof
handoff, the three authentic proof frames, and the mobile opening/Nexus states in
`/tmp/transylvanian-bears-qa` for visual review.

The production build is emitted to `dist/` and deployed on Vercel at
`https://www.transylvanianbears.com`.
