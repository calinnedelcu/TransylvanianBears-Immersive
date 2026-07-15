# Final Return: citadel map

## Purpose

The return is earned after the evidence journey. It does not reopen a hub with four worlds and
does not introduce another canvas. The Evidence Weave astrolabe becomes the plan of the same
system, so the visitor can finally understand all seven projects at once.

## Spatial model

- Seven project buildings remain individual: Nexus, Aegis, SchoolMate, The Buried Hands,
  Infect.exe, EconomyNews, and Automation Risk.
- Color and proximity reveal four disciplines without collapsing the projects into four portals.
- The astrolabe rings flatten into circulation paths while the old evidence screens contract.
- Three outer gates connect the immersive story to real website routes: Work, Team, and Archive.
- The next milestone extends two of those paths into Join and Work with us before dawn.

## Interaction contract

- Scroll controls the reversible astrolabe-to-map transformation.
- Selecting a physical route gate or its semantic control updates the active path.
- The action uses a normal internal link, so the experience remains a website and supports
  keyboard navigation.
- Evidence Weave and Final Return are separate chapters in the progress rail but share one
  WebGL lifecycle.

## Runtime choices

- Transform choreography is used instead of runtime geometry morph mutation. Three.js locks
  morph attributes after first render, while transforms remain reversible and cheap.
- The scene uses Drei PerformanceMonitor to lower DPR when the measured frame rate declines.
- The procedural map is a layout prototype. A Blender-authored citadel can replace the building
  groups later while preserving pivots, route ids, camera choreography, and semantic controls.
