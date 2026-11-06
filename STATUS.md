# Transylvanian Bears — Status

Last updated: 6 November 2026

## Current state

The home page is a walk through one 3D world (three.js / react-three-fiber, toon shading
with ink outlines). The page scrolls normally; the camera follows the scroll from station
to station (`src/world/`):

- Hero on a gold sky → the four manifesto verbs as monoliths with their symbols
- Each of the seven projects as a billboard along a dashed road, its card beside it
- Results under a night sky: podium and a spinning medal per result, behind a glass panel
- The team as die-cut standees in a half-circle, each member's card beside them
- Contact: the camera rises over the paw monument
- On phones the object sits above and the card below; the world loads lazily (≈220 kB
  gzipped) after first paint
- With "reduce motion" on or without WebGL the page stays flat: the same sections as a grid
- Project filters were removed: every project is a stop on the road
- Seven case-study pages (unchanged), old URLs still redirect, 404 page in the same style

## Verified

- `npm run lint`, `npm run build`
- `npm run qa`: 246 checks (all routes at 390 / 820 / 1440 px, no console errors, no horizontal
  overflow, every image loads, menu, lightbox, back/forward, legacy redirects, 404, and the 3D
  world: starts, all 23 stations present, clean scroll from top to bottom on phone and desktop)
- axe-core (WCAG 2.2 AA + best practices): no violations on the home page, five case studies and the 404

## Content that still needs the team's confirmation

These are carried over from the previous site and are marked honestly on the page:

- Member roles (`discipline` in `src/data/team.ts`) were never confirmed by each member
- Project credits exist only for Project Nexus and Aegis
- Automation Risk "Locul 1": competition name and proof missing
- Hardcore Entrepreneur 6 (SchoolMate) and Deutsche Bank internship: official wording and participants
- EconomyNews "Mențiune": the photographed diploma is a participation diploma dated 29 May 2026;
  it does not state the mention, so the entry is shown as "confirmat de echipă", not "verificat"
- Chronos CTF: no public write-up or official page yet
- Parahouse and No Other Choice are not listed (they were never classified as team projects)

## Production

- Repository: `calinnedelcu/TransylvanianBears-Immersive`
- Domain: `https://www.transylvanianbears.com`
- Hosting: Vercel

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run qa
npm run build:portraits
npm run generate:favicons
npm run generate:og
```
