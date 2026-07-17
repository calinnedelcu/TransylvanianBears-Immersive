# Immersive Repository Audit

Date: 2026-07-17

## Decision

The production architecture remains:

`Lenis -> GSAP ScrollTrigger -> canonical world progress -> React Three Fiber`

The site already has the important foundation: one persistent world, authored camera paths,
semantic editorial content, responsive quality tiers, spatial Web Audio, postprocessing, and a
repeatable Blender/glTF pipeline. Replacing that foundation would spend time on migration rather
than art direction.

The next quality gain comes from three authored systems:

1. physical transitions between project worlds;
2. authentic project media embedded in world geometry;
3. material metamorphosis that carries the Citadel through all seven systems.

Vanta and React Bits are not production dependencies. They solve isolated decorative effects,
while this project needs continuity, diegetic interaction, and one visual language.

## Adopt Now

| Repository | Use in this production | Decision |
| --- | --- | --- |
| [GSAP](https://github.com/greensock/GSAP) | Sole owner of scroll timelines, pins, chapter boundaries, and shader progress | Keep |
| [Lenis](https://github.com/darkroomengineering/lenis) | Accessible smooth document scroll synchronized to the GSAP ticker | Keep |
| [React Three Fiber](https://github.com/pmndrs/react-three-fiber) | Persistent canvas, render lifecycle, and declarative world composition | Keep |
| [Drei](https://github.com/pmndrs/drei) | Portal materials, render textures, video textures, authored curve helpers, and selective volumetrics | Use existing dependency |
| [postprocessing](https://github.com/pmndrs/postprocessing) | One composer with restrained bloom, grading, vignette, and scene-specific effects | Keep existing dependency |
| [glTF Transform](https://github.com/donmccurdy/glTF-Transform) | Reproducible validation, inspection, Meshopt compression, and future KTX2 atlases | Extend existing pipeline |
| [meshoptimizer](https://github.com/zeux/meshoptimizer) | Fast geometry delivery through `EXT_meshopt_compression` | Keep |
| [Spector.js](https://github.com/BabylonJS/Spector.js) | Manual frame inspection during lookdev, never production runtime | Development tool |
| [r3f-perf](https://github.com/utsuboco/r3f-perf) | Draw-call, shader, memory, and matrix-update profiling | Development-only candidate |

## Prototype Selectively

| Repository | Useful capability | Constraint |
| --- | --- | --- |
| [THREE-CustomShaderMaterial](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial) | Custom dissolve/displacement while retaining PBR lighting and shadows | Prove one Citadel material before adding a dependency |
| [gl-transitions](https://github.com/gl-transitions/gl-transitions) | Licensed GLSL transition primitives between render targets | Adapt one transition to the narrative; check per-file headers |
| [three.quarks](https://github.com/Alchemist0823/three.quarks) | Batched dust, sparks, bats, and localized VFX | Add only if custom instancing becomes harder to maintain |
| [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | Fast raycasts and spatial queries on dense interactive meshes | Does not improve ordinary render FPS; add only for real interaction load |
| [three-projected-material](https://github.com/marcofugaro/three-projected-material) | Project media onto irregular stone or architectural geometry | Prototype against Buried Hands before adopting |
| [Theatre.js](https://github.com/theatre-js/theatre) | Visual blocking for cameras, lights, and mechanisms | Authoring only; export/bake results and keep GSAP as runtime director |

## Study, Do Not Install

- [r3f-scroll-rig](https://github.com/14islands/r3f-scroll-rig): its one-canvas and DOM-proxy
  model validates the current direction. A migration would duplicate working scroll and lifecycle
  code.
- [Bruno Simon Folio](https://github.com/brunosimon/folio-2019): reference for a persistent world
  where work is spatial, not a list of cards.
- [The Substance](https://github.com/drcmda/the-substance): reference for treating media as glass,
  reflection, refraction, and spatial material.
- [Alien.js](https://github.com/alienkitty/alien.js): reference library for transition, motion blur,
  volumetric, flow-map, hologram, and audio techniques. Reimplement only the technique needed by a
  scene rather than importing a second rendering framework.
- [Codrops repositories](https://github.com/codrops): useful motion studies. Verify each repository
  license and rewrite effects around the Citadel art direction.
- [The Evolution of Trust](https://github.com/ncase/trust): reference for interactions that are
  short, understandable, and meaningful to the content.

## Explicit Exclusions

- [LYGIA](https://github.com/patriciogonzalezvivo/lygia) is technically excellent, but its current
  Prosperity Public License limits free commercial use to a trial. Do not ship its code without an
  appropriate commercial license.
- [Vanta](https://github.com/tengbao/vanta) adds independent decorative background canvases and a
  generic visual identity. It conflicts with the persistent Citadel world.
- [React Bits](https://github.com/DavidHDev/react-bits) is suitable for isolated interface motion,
  not the central cinematic language.
- Tone.js and Howler.js are unnecessary while the production already owns a spatial Web Audio
  graph. Tone becomes relevant only when authentic musical stems require BPM-accurate sequencing.
- Do not introduce WebGPU as a parallel renderer during this production phase.
- Do not add free-roam, alternate endings, obligatory WASD, or replay-dependent content.

## Production Patterns

### One Canonical Journey

Lenis supplies normalized document movement. GSAP maps it to one canonical progress value. Camera,
light, sound, world materials, evidence surfaces, and semantic DOM all consume that value. No other
library owns scroll or the main timeline.

### Diegetic Media Surface

Create a reusable media contract for future acts:

- responsive poster and optional video source;
- lifecycle that starts decoding near the chapter and releases it after departure;
- emissive, glass, paper, CRT, projection, or carved-stone presentation;
- semantic DOM fallback using the same content;
- deterministic first-frame and recovery telemetry for Playwright.

Only one expensive video/render target should be active at a time on mobile.

### Seven Material Metamorphoses

The Citadel remains one place, but each system changes its material rules:

- Nexus: glass, detection overlays, and synthetic light;
- Aegis: brass gates, scanner light, and institutional stone;
- SchoolMate: wood, paper, chalk, and administrative paths;
- Buried Hands: wet mineral stone, mercury, and royal metal;
- infect.exe: 1-bit voxels and pixel erosion;
- Research: paper, plotted terrain, lenses, and data points;
- Finale: all materials resolve into the bear emblem.

Desktop may use displacement and localized particles. Mobile preserves the material/color/emissive
change without high-cost geometry deformation.

### Physical Transitions

Every project transition must originate from an object already in frame:

- QR lattice -> turnstile -> classroom frame;
- stained glass or evidence screen -> detached pixels -> infect.exe map;
- pixel field -> plotted points -> research terrain;
- seven evidence cores -> reconstructed bear emblem.

Avoid arbitrary full-screen fades except as accessibility fallbacks.

## Performance Contract

For every authored chapter, record and enforce:

- transfer bytes per model and media variant;
- draw calls and rendered triangles per quality tier;
- first real WebGL frame and first authentic-media frame;
- number of active canvases, render targets, and video decoders;
- context-loss recovery and reverse-scroll remount;
- deterministic desktop, mobile, landscape, compact, and reduced-motion screenshots.

KTX2 becomes worthwhile for future 512-2048px PBR atlases. It is not useful for the current tiny
procedural textures. Keep named interactive nodes during optimization; automatic flatten/join/prune
must never silently destroy the runtime contract.

## Immediate Sequence

1. Finish and release the Buried Hands vertical slice with strict lifecycle and visual QA.
2. Build one `DiegeticMediaSurface` prototype around authentic gameplay media.
3. Build one PBR Citadel metamorph material and prove desktop/mobile budgets.
4. Use a portal transition on one chapter boundary before propagating the system.
5. Profile the result with Spector.js and a development-only R3F performance overlay.

