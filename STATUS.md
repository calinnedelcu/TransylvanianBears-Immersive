# Transylvanian Bears - Project Status

Last updated: 16 July 2026

## Current state

The greenfield experience is the production website. The old illustrated website and
the `/next` laboratory shell have been removed from the shipped application.

- 16-chapter immersive home experience
- Seven project case studies across four overlapping domains
- Six team profiles with honest placeholders for unconfirmed personal work
- Evidence archive for awards, competitions and internships
- Final public URLs, dynamic metadata, sitemap, robots and standalone SPA fallback
- Responsive desktop/mobile layouts and keyboard-accessible quick navigation
- Lazy 3D runtime, optimized project media and viewport-paused canvas animation

## Verified locally

- `npm run lint`
- `npm run build`
- `npm run qa:immersive`
- Direct refresh on project routes
- Redirects from old `/next/*` URLs
- Desktop and 390x844 mobile layouts
- Full story traversal from opening to final call to action
- Menu focus trap, Escape close and background inert state
- Work filters and source links
- No browser console warnings or errors during QA

## Content still needed

The remaining placeholders are intentional. Replace them only with source material
confirmed by the team:

- Final project stills, process frames and diagrams at the dimensions listed in each slot
- Individual member roles, bios, links and personal projects
- Exact credits by role for each team project
- Any award wording or result that needs stronger public-source attribution

## Deferred by product decision

Dedicated Join and Partners pages are not a current priority. Their calls to action use
prefilled email links, so contact remains functional without adding two shallow pages.

## Production

- Repository: `calinnedelcu/TransylvanianBears-Immersive`
- Domain: `https://www.transylvanianbears.com`
- Hosting: Vercel

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run qa:immersive
npm run preview
npm run optimize:images
npm run generate:og
npm run generate:favicons
```
