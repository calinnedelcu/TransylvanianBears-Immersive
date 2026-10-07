# Transylvanian Bears

The team website: seven projects, six builders and the results behind them, in one
fast, easy-to-navigate page. Live at <https://www.transylvanianbears.com>.

Built with Vite, React 18, TypeScript and React Router. No 3D runtime, no scroll
hijacking: it is a normal page with a header that is always visible.

## Pages

| URL | What it is |
| --- | --- |
| `/` | Home: hero, manifesto, projects (filterable), results, team, contact |
| `/work/:slug` | One case study per project (`project-nexus`, `aegis`, `schoolmate`, `the-buried-hands`, `economy-news`, `automation-risk`, `infect-exe`) |

Older addresses still work and land on the matching section of the home page:
`/work`, `/team`, `/team/:id`, `/archive`, `/proiecte`, `/echipa`, `/premii`, `/aplica`.

## Where things live

```
src/
  data/            all text and facts  ← edit content here
    projects.ts      the seven case studies (summary, chapters, metrics, links, credits)
    results.ts       awards and rankings, with the state of the evidence
    team.ts          the six members and their portraits
    site.ts          contact e-mail, navigation and the headline copy of each section
  sections/        the home page, one file per section (+ its .css)
  pages/           HomePage, ProjectPage, NotFoundPage
  components/      header, footer, project card, lightbox, before/after slider, marquee …
  styles/          design tokens (colours, type), reset, buttons/stickers/chips
public/assets/
  projects/ achievements/   screenshots, charts, certificates
  team/                     die-cut portraits (generated, see below)
  membrii/                  the original portraits
scripts/           image, favicon, social-card and QA tooling
```

### Common edits

- **Change a headline or paragraph on the home page** → `COPY` in `src/data/site.ts`.
- **Edit a project** → its entry in `src/data/projects.ts`. A chapter can carry one
  `media` block: a `figure`, a `gallery`, a before/after `compare`, a list of `steps`
  or a row of `chips`.
- **Add a result** → add an entry to `RESULTS` in `src/data/results.ts`
  (`evidence: 'verified'` only when a public source confirms it).
- **Change a member's role** → `discipline` in `src/data/team.ts`.
- **Add images** → drop them in `public/assets/…` and reference them from the data
  files with their real `width` and `height` (this prevents layout shift).
- **New portraits** → replace the file in `public/assets/membrii/`, then
  `npm run build:portraits` regenerates the cut-out versions in `public/assets/team/`.

## Development

```bash
npm install
npm run dev          # http://localhost:5173
```

Checks before shipping:

```bash
npm run lint
npm run build        # type-check + production build into dist/
npm run qa           # smoke test of the build: every route at phone, tablet and desktop width,
                     # console errors, overflow, images, menu, filters, lightbox, redirects
```

Other scripts:

| Script | Purpose |
| --- | --- |
| `npm run build:portraits` | Trim the member portraits and bake in the sticker outline |
| `npm run generate:favicons` | Render the PNG favicons from `public/favicon.svg` |
| `npm run generate:og` | Rebuild `public/og-image.jpg` from the real hero (run after `npm run build`) |
| `npm run optimize:images` | Convert PNGs under `public/assets` to WebP |

## Design notes

- Palette and type scale are CSS variables in `src/styles/tokens.css`. Project and member
  colours come from `data-accent` (see the bottom of that file).
- Fonts are self-hosted through Fontsource: Big Shoulders (display), Bricolage Grotesque
  (text) and JetBrains Mono (labels).
- Motion is progressive: content is readable without it, everything respects
  `prefers-reduced-motion`, and page transitions use the View Transitions API where the
  browser has it.
- Accessibility baseline: skip link, one `h1` per page, keyboard-operable menu, filters,
  lightbox and comparison slider, visible focus rings, WCAG 2.2 AA contrast. The pages
  were audited with axe-core with no violations.

## Deployment

Vercel builds `dist/` (`vercel.json` rewrites every non-asset path to `index.html`).
`docs/` and `PLAN.md` describe the previous 3D version of the site and are kept for
reference only.
