# Transylvanian Bears Experience

Greenfield rebuild of the Transylvanian Bears team website as an immersive,
browser-native portfolio. The product combines a continuous 3D journey with semantic
case studies, direct URLs and an editorial project index.

## Current stage

The project is in interaction and architecture prototyping. The current vertical
slice validates directed camera travel, local free-look, the Lens interaction,
recovery controls and a factual Project Nexus proof surface.

- `/next` - greenfield editorial prototype
- `/next/work` - multi-facet project index
- `/next/lab/control-loop` - interaction graybox
- `/` - legacy website retained during the rebuild

The seven team projects are organized through overlapping facets:

- Video Games: The Buried Hands, Infect.exe
- School Software: Aegis, SchoolMate
- Machine Learning: Project Nexus, EconomyNews, Automation Risk
- Research Papers: EconomyNews, Automation Risk

Project Nexus is applied machine learning and computer vision, not a research paper.
EconomyNews and Automation Risk are both ML projects and research papers.

## Architecture

The macro experience uses a continuous braided route, not a permanent hub with
separate project worlds. Editorial clearings let visitors read, verify sources and
open full case studies while a persistent index provides direct access to every
project.

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
```

The production build is emitted to `dist/`. Three.js is loaded only for the isolated
interaction laboratory at this stage.
