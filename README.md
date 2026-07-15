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
npm run lint
npm run build
npm audit --omit=dev
```

The production build is emitted to `dist/` and deployed on Vercel at
`https://www.transylvanianbears.com`.
