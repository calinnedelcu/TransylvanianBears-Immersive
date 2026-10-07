# Transylvanian Bears — Status

Last updated: 7 October 2026

## Current state

The site was rebuilt from scratch as a clear, fast, single-page portfolio with a case
study per project. It replaces the earlier scroll-driven 3D experience (that version is
still available in git history and in the `main` / `codex/citadel-first-pass` branches).

- Home page with a sticky header, hero, manifesto, filterable projects, results, team and contact
- Seven case-study pages with chapters, metrics, sources, contributors and previous/next navigation
- Interactive extras: segmentation ↔ detection slider (Nexus), zoomable proof images, copy-the-e-mail button
- Old URLs (`/work`, `/team`, `/archive`, …) redirect to the right section
- Social card, favicons, sitemap and 404 page rebuilt in the new style
- Initial page weight ≈ 1 MB, first paint ≈ 0.25 s on a fast connection, layout shift ≈ 0.04

## Verified

- `npm run lint`, `npm run build`
- `npm run qa`: 241 checks (all routes at 390 / 820 / 1440 px, no console errors, no horizontal
  overflow, every image loads, menu, filters, lightbox, back/forward, legacy redirects, 404)
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
