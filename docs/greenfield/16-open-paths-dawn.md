# Open Paths and Dawn

## Purpose

The citadel does not end in another menu or a detached closing screen. Its map tilts back into a
landscape, two routes leave the system, and the same camera reaches dawn. The epilogue preserves
the expedition feeling while returning control to a normal, navigable website.

## Continuous-world contract

- Evidence Weave, Final Return, Open Paths, and Dawn share one React Three Fiber canvas.
- The top-down citadel becomes the horizon-level terrain; no portal, cut, or loading interstitial is
  introduced between the map and the epilogue.
- The cyan route leads to Join the team. The gold route leads to Work with us.
- Both paths exist as physical tube geometry and signposts in the world, with matching semantic
  buttons and links for keyboard and assistive-technology access.
- After the sticky world ends, a normal document-flow footer remains available for Work, Team,
  Archive, and Contact.

## Atmosphere and camera

- Three.js `Sky` provides the daylight model so dawn can react continuously to scroll instead of
  playing as a fixed video plate.
- Fog color, terrain color, sun position, directional-light energy, and camera target interpolate
  from the dark citadel state into the final morning state.
- The camera first reads the citadel as a plan, lowers toward the route split, then looks back across
  the complete system from the open landscape.
- Stars and evidence displays recede before dawn so the final frame is spatially quieter without
  discarding the citadel itself.

## Navigation synchronization

- Scene thresholds and chapter sentinels use the same measured scroll travel.
- Sentinel offsets include the progress rail's 46% viewport focus line, so chapter labels change on
  the exact frame where the 3D timeline changes state.
- Once the visitor passes the final sentinel, the rail remains on Dawn instead of remounting the
  opening WebGL world behind the footer.

## Asset pipeline

- Procedural terrain is intentional for this interactive prototype. A Higgsfield video would lock
  the path split into baked pixels and could not provide reliable route interaction or reversible
  scroll control.
- A Blender-authored citadel or mountain set can replace the procedural groups later through glTF.
  The export must preserve building pivots, route ids, signpost anchors, and the existing camera
  coordinate system.
- Atmosphere, fog, path interaction, semantic controls, and scroll choreography remain runtime
  systems even after the production meshes are replaced.

## Verification target

- One active epilogue canvas and no remounted macro-world canvas during Open Paths, Dawn, or the
  footer transition.
- No horizontal overflow on the narrow mobile viewport.
- Both route controls update their physical highlight and destination.
- The final footer enters normal flow while the sticky scene exits above it.
- Reduced-motion mode resolves directly to the Dawn state and removes the long scroll travel.
