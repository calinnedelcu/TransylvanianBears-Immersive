# Production runtime: the living system

Status: implementation contract

This document replaces the prototype-era runtime decisions without replacing the
narrative architecture in `09-hybrid-world-architecture.md`.

## Product bar

The production experience is judged as one complete work. Visual design, interaction,
content, sound, accessibility, performance and route behavior must support the same
idea: seven projects become one inspectable system.

No technology is included as decoration. Every runtime dependency must improve at
least one of these outcomes:

1. spatial continuity;
2. clarity of evidence;
3. meaningful agency;
4. cinematic control;
5. reliability across devices.

## Adopted stack

| Concern | Production decision | Boundary |
| --- | --- | --- |
| UI and semantics | React 18 + TypeScript | all text, controls, routes and evidence remain DOM |
| Realtime world | Three.js + React Three Fiber | one persistent canvas per continuous world |
| Choreography | GSAP ScrollTrigger | maps native scroll to normalized chapter progress |
| Discrete experience logic | XState 5 | chapter, quality, motion, audio and interaction states |
| Camera authoring | Theatre.js in development | exported keyframes only; Studio never ships by default |
| Offline geometry | Blender | modeling, UV, bake, pivots, cameras and deterministic animation |
| Delivery | glTF/GLB + glTF Transform | per-chapter packages, Meshopt/Draco measured separately |
| GPU textures | KTX2 where profiling justifies it | WebP/AVIF remains valid for editorial media |
| Post processing | selective WebGL effects | quality-tiered, never required for legibility |
| Sound | Web Audio API | explicit opt-in, spatial and velocity-aware |
| Route continuity | browser View Transitions + persistent media bridge | progressive enhancement over real links |

WebGPU/TSL is a separate enhancement spike. The production renderer remains WebGL 2
until the same scene, effects, fallbacks and device matrix pass without regressions.

Rapier is allowed only for short authored physical beats. It never controls camera,
navigation, critical evidence or scroll progress.

Higgsfield and Seedance are previsualization and nondocumentary plate tools. They do
not own reversible transitions, project proof or the identity apparatus.

## Sources of truth

The runtime has two deliberately different sources of truth.

### Continuous progress

Scroll progress is stored in mutable refs and sampled by the render loop. React is not
updated on every pixel. The director exposes:

- `globalProgress`: normalized across the guided expedition;
- `chapterProgress`: normalized inside the active chapter;
- `velocity`: damped signed scroll velocity;
- `direction`: forward, backward or resting;
- `cameraProgress`: authored remap, independent from document distance.

### Discrete state

XState owns changes that have meaning outside a single frame:

- booting, ready and fallback;
- active chapter and visited chapters;
- cinematic, composed or editorial quality tier;
- motion preference and manual override;
- audio locked, enabled or muted;
- Lens mode, trace outcome and discovered rules;
- transition and recovery states.

The scene reads a stable snapshot. It does not infer experience state from arbitrary
DOM classes or direct `window.scrollY` reads.

## Module boundaries

```text
experience/
  chapters.ts            typed chapter registry and authored ranges
  experienceMachine.ts   discrete statechart
  ExperienceProvider.tsx React bridge and public commands
  useJourneyDirector.ts  scroll sampling and chapter sentinels
  quality.ts             capability probe and adaptive quality policy
  audio/                 opt-in sound engine and scene cues
  transition/            route and spatial-media bridge

world/
  LivingWorld.tsx        canvas, renderer and lifecycle
  camera/                camera rail and authored shots
  lighting/              temporal light rig and atmosphere
  materials/             shared mineral, brass and signal materials
  scenes/                chapter-owned scene groups
  fx/                    quality-tiered post processing
```

Chapter modules implement the same lifecycle:

- `prepare`: metadata, poster and minimum assets;
- `activate`: GPU resources and optional listeners;
- `update`: deterministic state from progress and velocity;
- `deactivate`: animation, audio and observers stop;
- `dispose`: geometries, materials, textures and bitmaps are released;
- `fallback`: static poster and complete semantic content.

Only the current chapter and its immediate neighbors may own heavy GPU resources.

## Quality policy

### Tier A: cinematic

- precise pointer, sufficient viewport and stable measured frame rate;
- DPR between 1 and 1.5 while moving, up to 1.75 at rest;
- realtime shadows, atmospheric particles and selective post processing;
- full camera rail and local free-look;
- target 60 fps on the reference desktop.

### Tier B: composed

- touch, narrow screens, low memory or performance below the cinematic threshold;
- DPR 1, reduced particles, simplified shadows and no expensive depth effects;
- 2.5D layers and shorter camera offsets;
- target stable 30 fps minimum, preferably 60.

### Tier C: editorial

- reduced motion, WebGL failure or explicit manual selection;
- no long pinned travel and no required canvas;
- responsive posters, DOM, SVG and all project evidence;
- identical routes and actions.

Quality can fall during a chapter, but can rise only at the next chapter boundary.
This avoids visible oscillation.

## Rendering contract

- One global color pipeline and one temporal lighting rig.
- Shared mineral, plaster, timber, brass, glass and signal material families.
- Instancing or batching for repeated architecture and particles.
- No permanent animation loop when the world is static and audio is disabled.
- Frustum culling plus authored chapter visibility; hidden chapters do not update.
- Post effects are restrained: antialiasing, subtle bloom, depth haze, vignette and
  grain. Chromatic aberration and glitch belong only to the Infect breach.
- Decorative 3D text is allowed; primary copy remains accessible DOM.

## Spatial media contract

Project images and video are evidence, not wallpaper.

- A semantic DOM slot defines layout and fallback.
- A WebGL plane may track that slot and detach during a spatial transition.
- Screens use correct aspect ratios, captions and source context.
- Stencil masks, clipping planes and depth occlusion may integrate media into props.
- The same media object can travel from the guided world into a case-study hero.
- The DOM image remains available when GPU media is disabled.

## Sound contract

- Audio never starts before an explicit user action.
- The first action creates/resumes one AudioContext.
- A restrained bed uses wind, room tone and mechanical resonance.
- Chapter cues are short and spatialized; proof surfaces remain quiet.
- Scroll velocity may change filter, gain or texture, never pitch dialogue.
- Muting is immediate, persistent for the session and keyboard accessible.
- Reduced motion does not imply muted audio, but disables velocity-reactive swells.

## Asset pipeline

1. Approve composition with a graybox and camera path.
2. Model only geometry visible from authored shots.
3. Preserve stable names, pivots, route ids and media anchors.
4. Bake high-frequency detail into low-poly PBR assets.
5. Export a GLB package per chapter ownership boundary.
6. Validate with Khronos glTF Validator.
7. Run glTF Transform optimization and compare Meshopt versus Draco.
8. Convert eligible textures to KTX2 with mipmaps.
9. Record compressed bytes, estimated GPU memory, triangles and draw calls.
10. Verify desktop, mobile composition and static fallback before merging.

## Route transition contract

- Every destination remains a real anchor with a shareable URL.
- Browser history, back/forward and focus restoration remain correct.
- The selected project media is the transition object where possible.
- View Transition API is enhancement only; unsupported browsers navigate normally.
- The persistent canvas never delays route content or traps input.

## Production gates

A sequence is production-ready only when:

- the frame reads clearly without explanatory narration;
- reverse scroll reconstructs the previous state without a jump;
- scroll velocity spikes do not reveal unloaded or invalid frames;
- keyboard, touch, reduced motion and no-WebGL paths retain the content;
- console, TypeScript, lint and accessibility checks are clean;
- mobile is recomposed rather than cropped;
- measured budgets are recorded and respected;
- every visual effect has a narrative purpose.

