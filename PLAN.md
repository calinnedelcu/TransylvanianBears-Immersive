# TransylvanianBears Website — Build Plan

Document de planning pentru website-ul echipei **TransylvanianBears** (Colegiul Național de Informatică Tudor Vianu). Specificație completă de execuție pentru Claude Code.

> Sursa originală: [`docs/PLAN-original.docx`](docs/PLAN-original.docx). Versiunea decisă cu user (extras + extras aprobate) trăiește aici.

---

## 1. Context & obiective

Site-ul prezintă echipa, membrii, premiile/concursurile și proiectele.

- **Audiența:** organizatori de concursuri, sponsori potențiali, elevi care vor să aplice la echipă, vizitatori curioși.
- **Tonul:** serios-jucăuș, încrezător, distinct (nu corporate, nu cringe). Trebuie să transmită că echipa câștigă lucruri serioase dar nu se ia prea în serios — exact ca mascota (vampire bear cu garlic friend).
- **Domeniu:** `transylvanianbears.ro` — deploy Vercel cu domain custom.
- **Format:** single-page bilingv RO/EN, scroll cinematic, design bold cu accente urs/Transilvania.

---

## 2. Tech stack

- **React 18 + Vite + TypeScript** — base
- **Tailwind CSS** — styling, cu config custom pt paleta brand
- **Framer Motion** — animații componente, gesturi, scroll reveals, AnimatePresence
- **GSAP + ScrollTrigger** — parallax cinematic în Hero, scroll-driven scenes
- **react-i18next** — bilingv RO/EN
- **Lenis** — smooth scroll global (cinematic feel)
- **lucide-react** — iconițe
- **@fontsource/...** — self-hosted fonts (GDPR-friendly)
- **clsx + tailwind-merge** — `cn()` helper

Node 20+. Package manager: `pnpm` (preferință) sau `npm`. *(Faza 1 a folosit npm — pnpm nu era instalat global.)*

---

## 3. Design system

### 3.1 Paletă (în `tailwind.config.js`)

| Token | Hex | Folosit pt |
|---|---|---|
| `bear-night` | `#1A0509` | background deepest |
| `bear-wine` | `#2A0810` | background section alternat |
| `bear-deep` | `#4A0E1F` | munți depărtare |
| `bear-burgundy` | `#6B1A2A` | primary accent (pelerina) |
| `bear-crimson` | `#8B1E2F` | hover, munți aproape |
| `bear-fur` | `#A0623A` | warm fur tone |
| `bear-gold` | `#E8B547` | CTAs, medalion, lună |
| `bear-goldlight` | `#F5D78A` | hover gold |
| `bear-cream` | `#F8E8D0` | text light alt |
| `bear-bone` | `#E8DFD0` | text body pe dark |

### 3.2 Tipografie

- **Display** (titluri mari, hero, section headers): **Cinzel** — serif gothic/medieval, perfect pt vibe vampir/castel
- **Body**: **Manrope** — sans-serif modern, lizibil
- **Mono** (cod inline, GitHub handles, tech chips): **JetBrains Mono**

Self-hosted via `@fontsource/cinzel`, `@fontsource/manrope`, `@fontsource/jetbrains-mono`.

### 3.3 Tokens

- Border radius default: `rounded-2xl` pe carduri (16px), `rounded-full` pe pill buttons
- Signature shadow: `shadow-burgundy` = `0 8px 30px rgba(107,26,42,0.3)`
- Container max width: `.container-tb` = `max-w-7xl mx-auto px-6`
- Section padding vertical: `.section-y` = `py-24 md:py-32`

---

## 4. Assets (livrate de user în `public/assets/`)

| Filename | Conținut | Folosit în |
|---|---|---|
| `logo.png` | Logo app icon (urs cu cape, castel, lună) | Navbar, favicon source, OG image |
| `bear-mascot.png` | Urs vampir full-body cu cape | Hero centerpiece |
| `sky-moon.png` | Cer burgundy + lună + stele + nori | Hero parallax layer 1 (back) |
| `mountains-far.png` | Munți mov închis | Hero parallax layer 2 |
| `mountains-near.png` | Munți roșu vibrant | Hero parallax layer 3 |
| `castle.png` | Castel pe vârf | Hero parallax layer 4 (drepta) |
| `forest.png` | Pădure de brazi | Hero parallax layer 5 (front) |
| `fog.png` | Ceață roz/mov diafană | Mid + foreground fog overlay (folosit 2x) |
| `bear-coding.png` | Urs cu laptop (bat-logo) | About section |
| `bear-trophy.png` | Urs ridicând trofeu TB | Achievements + bear scroll reaction |
| `bear-waving.png` | Urs face cu laba | JoinUs + bear scroll reaction |
| `bear-thinking.png` | Urs cu degetul la barbă | Projects |
| `bear-sleeping.png` | Urs cu nightcap în cape | 404 page |
| `bats.png` | Sprite sheet 4 lilieci silhouette | Hero atmosphere (apariții rare) |
| `tb-medallion.png` | Medalion gold "TB" filigree | Section dividers (decorativ) |

### 4.1 Favicon & meta

Generate din `logo.png`: `favicon.ico`, `apple-touch-icon.png` (180×180), `favicon-32.png`, `favicon-16.png`, OG image 1200×630. Toate în `public/`.

### 4.2 Optimizare

**Critical:** convertește toate Hero layers la **WebP** cu fallback PNG (script de build cu `sharp` sau `vite-imagetools`). Total payload Hero < **1.5MB**. Verifică cu Lighthouse.

---

## 5. Arhitectură site

Single-page, scroll smooth, anchor navigation. Secțiuni în ordine:

1. **Hero** — parallax cinematic + bear mascot + tagline + CTA scroll
2. **About** — cine suntem, când format, ce facem, mini-stats
3. **Members** — grid carduri tarot cu flip pe hover
4. **Achievements** — stats strip + constelație + timeline cronologic
5. **Projects** — grid 2-3 col cu proiecte reprezentative
6. **Join Us / Contact** — CTA recrutare + email + social
7. **Footer** — copyright, made by, social

Navbar fix sus (sticky, blur background pe scroll), links anchor + language toggle pe dreapta. Mobile: hamburger drawer.

---

## 6. Spec section-by-section

> Detaliile complete sunt în `docs/PLAN-original.docx` §6. Rezumat aici.

### 6.1 Navbar (`<Navbar />`)
Sticky top. Transparent înainte de scroll, `backdrop-blur-md bg-bear-night/70` după scroll > 50px. Logo mic (40px) stânga + wordmark "TransylvanianBears" în Cinzel. Centru/dreapta: links `About | Members | Achievements | Projects | Join`. Extreme dreapta: `RO | EN` toggle.

Mobile: collapse la icon hamburger, drawer slide-in din dreapta cu Framer Motion `AnimatePresence`. Background drawer `bg-bear-night/95 backdrop-blur-lg`.

### 6.2 Hero (`<Hero />`) — STAR OF THE SHOW

`min-h-dvh`. Compus din **8 layere absolut poziționate** + content overlay.

Stack de layere (back → front):

```
z-0   sky-moon.png        (full width, top-anchored)
z-10  mountains-far.png   (parallax slow)
z-20  mountains-near.png  (parallax medium)
z-25  castle.png          (right-aligned, parallax slow-medium)
z-30  fog.png             (mid, opacity 0.5, drift L→R)
z-40  forest.png          (parallax fast, anchored bottom)
z-45  bear-mascot.png     (centered, intro + breathing loop)
z-50  fog.png             (foreground, opacity 0.3, drift R→L)
z-60  content overlay     (titlu + tagline + CTA)
```

**GSAP ScrollTrigger** (declanșat la scroll în Hero, scrub: 1):
- `mountains-far`: `yPercent -10`
- `mountains-near`: `yPercent -25`
- `castle`: `yPercent -20` + drift orizontal subtil
- `forest`: `yPercent -50`
- `bear-mascot`: `yPercent -15` + slight fade-out

**Mouse parallax** (doar desktop, `pointer: fine`): la mouse move, layerele se deplasează subtil în direcția opusă cursorului (max 15px translate). `useMotionValue` + `useSpring` Framer. Layerele aproape (forest) se mișcă mai mult decât cele departe (sky).

**Bear intro animation** (la mount): `opacity 0→1`, `scale 0.85→1`, `translateY 30→0`, durată 1.2s ease-out, delay 0.3s. După mount: **breathing loop** subtil `scale 1 ↔ 1.02` la 4s infinite.

**Fog drift**: două instanțe `fog.png`, animație CSS `@keyframes` infinite linear:
- mid layer: drift L→R în 30s, opacity 0.4
- foreground: drift R→L în 45s, opacity 0.25

**Stars twinkle** (peste sky): 6-8 stele SVG poziționate absolut, `opacity 0.3 ↔ 1` cu offset random per stea.

**Content overlay** (z-60, vertical centrat, max-w-4xl):
- "TransylvanianBears" — Cinzel text-7xl/8xl, gradient gold→cream
- Tagline: "We code. We compete. We win." / "Codăm. Concurăm. Câștigăm." (typewriter, swap RO/EN)
- CTA: "Discover the team ↓" / "Cunoaște echipa ↓" — gold pill button, scroll smooth la #about

Scroll indicator jos-centru (chevron animat bouncing).

**Reduced motion fallback**: dacă `prefers-reduced-motion: reduce`, dezactivează parallax + intro + breathing + drift; păstrează doar layout static + fade simplu pe content.

### 6.3 About (`<About />`)
Background `bg-bear-night`. Layout 2 coloane desktop (text stânga, `bear-coding.png` dreapta). Mobile: stack vertical, ilustrație sus.

Conținut: paragraf intro 3-4 fraze + 3 mini-stats inline. Subtle border accent gold pe stânga textului. Animație: text fade-up cu stagger 0.1s la `whileInView`.

### 6.4 Members (`<Members />`)
Grid responsive: 1 col mobile, 2 col tablet, 3-4 col desktop. Fiecare `<MemberCard />` = **carte de tarot** cu frame art deco (motive românești: rune, lup dacic stilizat) + flip pe hover (skills + bio pe spate).

Card border `border-bear-burgundy/30`, hover `border-bear-gold/60` + lift `-translate-y-1` + shadow burgundy. Poză `aspect-[3/4]`.

Fallback fără poză: gradient burgundy→deep cu inițiale Cinzel huge centrate.

### 6.5 Achievements (`<Achievements />`)

**Top: Stats strip** — 4 stats mari pe 1 rând (desktop), 2×2 grid (mobile). Count-up animation la `whileInView`:
- 25+ Medalii Naționale
- 12+ Medalii Internaționale
- 40+ Concursuri
- 2018 Anul fondării

Numerele Cinzel `text-7xl` gold gradient.

**Middle: Constelație** — fundal noapte, stele/medalii care se conectează în constelații pe scroll (achievement-urile ca stele, liniile între ele se desenează cronologic).

**Bottom: Timeline cronologic** — vertical timeline (desktop): linie centrală gold subtilă cu dots la fiecare event, cards alternativ stânga/dreapta. Mobile: cards stacked, linie pe stânga.

Slide-in din lateral la `whileInView`. Filter chips opțional sus: `Toate / Naționale / Internaționale / Hackathons`.

### 6.6 Projects (`<Projects />`)
Grid 2 coloane desktop, 1 mobile. Fiecare `<ProjectCard />`: thumbnail 16:9, titlu Cinzel, tagline scurt, tech stack chips (mono small), iconițe Demo/GitHub jos. Hover: thumbnail subtle zoom + border gold + lift.

### 6.7 JoinUs (`<JoinUs />`)
Full-width section. Background: gradient burgundy→night. `bear-waving.png` lateral. Centered:
- Titlu mare Cinzel: "Join the bears" / "Vino în haită"
- 1-2 fraze: pe cine căutăm, când e recrutarea
- CTA pill gold mare → mailto sau formular Tally/Formspree
- Sub CTA: linkuri mici la regulament/info

### 6.8 Footer (`<Footer />`)
3 coloane desktop, stack mobile:
- **Stânga**: logo small + tagline 1 rând
- **Mijloc**: sitemap (anchor links repeat)
- **Dreapta**: social icons (GitHub, Instagram, Discord etc)

Bottom strip centered: `© 2025 TransylvanianBears • CN Tudor Vianu • Made with 🦇 by the team`

---

## 7. i18n

Folder `src/i18n/` cu `index.ts` (config) + `ro.json` + `en.json`. Structură keys nested:

```json
{
  "nav": { "about": "...", "members": "...", "achievements": "...", "projects": "...", "join": "..." },
  "hero": { "tagline": "...", "cta": "..." },
  "about": { "title": "...", "body": "...", "stats": { ... } },
  "members": { "title": "...", "subtitle": "..." },
  "achievements": { "title": "...", "stats": { ... }, "filters": { ... } },
  "projects": { "title": "...", "viewDemo": "...", "viewCode": "..." },
  "join": { "title": "...", "body": "...", "cta": "..." },
  "footer": { "tagline": "...", "credit": "..." }
}
```

**Default locale:** `ro`. **Detectare:** `navigator.language` la prima vizită; salvat în `localStorage` cu key `tb-lang`. Toggle în navbar comută instant cu `i18n.changeLanguage()`. La schimbare, `<html lang="">` se updatează (SEO + a11y).

**Conținut bilingv în data files:** câmpurile cu text sunt obiecte `{ ro: string, en: string }` (vezi §11).

---

## 8. Animații & interacțiuni

- **Scroll reveals** universal: `initial={{opacity:0, y:30}}` → `whileInView={{opacity:1, y:0}}`, viewport `{ once: true, margin: "-100px" }`, durată 0.6s ease-out
- **Stagger** pe liste: `staggerChildren: 0.08`
- **Smooth scroll global** cu **Lenis**
- **Reduced motion**: hook `usePrefersReducedMotion()` care întoarce bool; toate animațiile complex citesc bool-ul

---

## 9. Performance & a11y

- Hero PNG-uri → WebP, total payload < 1.5MB
- `loading="lazy"` pe tot ce nu e Hero
- `prefers-reduced-motion: reduce` respectat
- Alt text descriptiv la toate `<img>`-urile (multilingue prin `t()`)
- Focus rings vizibile (gold outline)
- Color contrast min 4.5:1
- Semantic HTML: `<nav>`, `<main>`, `<section aria-label="...">`, `<article>` pe carduri
- Meta tags complete: title, description, OG, Twitter card, theme-color
- **Lighthouse target: 95+** pe Performance, Accessibility, Best Practices, SEO

---

## 10. Folder structure

```
websiteTransylvanianBears/
├── public/
│   ├── assets/        (toate PNG-urile livrate)
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── og-image.png
├── src/
│   ├── components/
│   │   ├── layout/     (Navbar, Footer, LanguageToggle)
│   │   ├── sections/   (Hero, About, Members, Achievements, Projects, JoinUs)
│   │   ├── ui/         (Button, Container, SectionTitle, CountUp, Chip)
│   │   └── hero/       (ParallaxLayer, BearMascot, FogDrift, Stars, Bats)
│   ├── data/           (members.ts, achievements.ts, projects.ts)
│   ├── i18n/           (index.ts, ro.json, en.json)
│   ├── hooks/          (useScrollProgress, usePrefersReducedMotion, useLenis)
│   ├── lib/            (utils.ts — cn() helper)
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── docs/
│   └── PLAN-original.docx
├── index.html
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 11. Data schemas (TypeScript)

```ts
// src/data/members.ts
export type Member = {
  id: string;
  name: string;
  handle?: string;
  role: { ro: string; en: string };
  photo?: string;
  initials?: string;
  skills: string[];
  github?: string;
  linkedin?: string;
  funFact?: { ro: string; en: string };
};

// src/data/achievements.ts
export type Achievement = {
  id: string;
  year: number;
  date?: string;
  competition: string;
  edition?: string;
  level: 'national' | 'international' | 'hackathon' | 'other';
  result: string;
  members: string[];
  location?: string;
  link?: string;
  description?: { ro: string; en: string };
};

// src/data/projects.ts
export type Project = {
  id: string;
  title: string;
  tagline: { ro: string; en: string };
  description: { ro: string; en: string };
  tech: string[];
  thumbnail: string;
  demo?: string;
  github?: string;
  featured?: boolean;
};
```

---

## 12. Build phases (ordine de execuție)

Execută secvențial. Commit după fiecare fază cu mesaj clar.

1. **Setup proiect** ✅ *(faza curentă — Vite + deps + Tailwind + fonts + folder structure)*
2. **Layout shell** — `App.tsx` cu `<Navbar />` (markup only) + `<Footer />` + secțiuni goale ca placeholder cu id-uri pt anchor.
3. **UI primitives** — `Button` (variants: primary gold, ghost, outline), `Container`, `SectionTitle`, `CountUp`, `Chip`.
4. **i18n setup** — config react-i18next, `ro.json` + `en.json`, `<LanguageToggle />` cu localStorage + `<html lang>` update.
5. **Hero — fază critică, fă-o riguros.** 8 layere parallax GSAP + mouse parallax + bear intro/breathing + fog drift + stars + content typewriter + Lenis + reduced-motion fallback.
6. **About** — layout 2 col, mini-stats CountUp, fade-up.
7. **Members** — `MemberCard` tarot flip, grid responsive, placeholder data realistic.
8. **Achievements** — stats strip + constelație + timeline. Filter chips opțional.
9. **Projects** — `ProjectCard` grid.
10. **JoinUs + Footer** — finalizare conținut.
11. **Polish** — reduced-motion audit, Lighthouse, alt texts, meta tags, sitemap.xml + robots.txt, WebP conversion, cross-browser, mobile.
12. **Deploy** — push GitHub, conectare Vercel, configurare `transylvanianbears.ro`, SSL automat.

---

## 13. Conținut needed (open items pt user)

Aceste date trebuie completate de user în `src/data/*.ts`. Până atunci, **placeholder realistic** astfel încât site-ul să arate funcțional din v1.

- **Members:** lista nume + roluri + skills + linkuri. Placeholder: 6 membri cu nume româno-fictive și roluri tipice (Algorithms Captain, Web Lead, ML Specialist, CTF Lead, Hardware/Embedded, Designer/Frontend). Marchează cu `// TODO: replace with real data`.
- **Achievements:** lista cu cel puțin 10-15 entries răspândite pe 3-5 ani. Placeholder: ONI, InfoEducație, IIOT, RoCSE, ICPC, hackathons (HackTM, Innovation Labs etc).
- **Projects:** 4-6 proiecte. Placeholder: Jarvis Assistant, Accessibility Map, Trading Analytics, etc.
- **Texte About + JoinUs:** Claude scrie un draft RO+EN, user editează ulterior.
- **Email contact + social handles:** placeholder `team@transylvanianbears.ro`, GitHub org placeholder `github.com/transylvanian-bears`.

---

## 14. Deployment

- Repo GitHub: `transylvanianbears/website` (sau personal)
- Vercel: import repo, framework auto-detect Vite
- Build command `npm run build` (sau `pnpm build`), output `dist`
- Env vars: niciuna pt v1
- Domain custom: `transylvanianbears.ro` în Vercel settings → DNS la registrar (A `76.76.21.21` sau CNAME)
- SSL automat
- Redirect `www.transylvanianbears.ro` → apex (sau invers)

---

## 15. Critical reminders

- **Toate textele user-facing trec prin `t()`** din i18n. Niciun string hardcoded în JSX.
- **Imaginile Hero = optimizate WebP.** Total payload Hero < 1.5MB.
- **`prefers-reduced-motion`** respectat de la început, NU adăugat la final.
- **TypeScript strict mode** on. Fără `any`.
- **Nu peste-engineer:** fără state management (Zustand/Redux) — useState/Context e suficient. Fără testing setup decât dacă cerut explicit.
- **Comentarii în engleză** în cod. Text UI prin i18n files.
- **Commit-uri atomice** pe fiecare fază.
- **Mobile-first** styling în Tailwind (default = mobile, `md:` și `lg:` overrides).
- **Verifică vizual după fiecare fază** — nu construi 3 secțiuni pe orb.

---

## 16. Wow factor — extras decise (peste spec original)

Confirmat cu user. Implementează în fazele relevante.

**Mascota recurentă:**
- ❌ Cursor companion (rejected)
- ✅ **Garlic friend animat** pe medalion: bouncy + twinkle + ocazional clipește
- ✅ **Bear reactions la scroll**: cap turn spre conținut; trofeu la Achievements; wave la JoinUs (pose-uri diferite per secțiune folosind `bear-trophy.png`, `bear-waving.png` etc.)

**Hero peste 8 layere:**
- ✅ **Bats silhouettes** apar **rar** (1 batch de 2-3 lilieci la 25-40s, traiectorie Bezier scurtă, apoi pauză lungă) — NU loop infinit
- ✅ **Castle window lights flicker** — random sparse (1 fereastră la 5-15s, nu toate deodată)
- ✅ **Volumetric god rays** prin lună → fog (CSS gradient + slow drift)

**Tranziții:**
- ✅ **Cape sweep la toggle RO/EN** — pelerina mătură ecranul ca curtain wipe burgundy (~600ms)
- ✅ **Fog reveal pe section enter** — secțiunile apar prin ceață (vs fade plain)

**Secțiuni reimaginate:**
- ✅ **Achievements = constelație** — fundal noapte, stele/medalii conectate cronologic + timeline sub
- ✅ **Members = cărți de tarot** — frame art deco cu motive românești + flip pe hover

**Easter eggs:**
- ✅ **Konami code** → garlic "atacă" mascota (~3s funny)
- ✅ **Triple-click pe logo** → mascota face pas + wave
- ✅ **404 page** = `bear-sleeping.png` cu Z-uri animate

---

## 17. Wow factor checklist final (înainte de v1)

- [ ] Hero parallax smooth la scroll lent și rapid
- [ ] Bear intro fade+scale + breathing subtil
- [ ] Mouse movement în Hero deplasează layerele subtil
- [ ] Fog curge constant în direcții opuse
- [ ] Typewriter effect pe tagline funcționează în ambele limbi
- [ ] Hover pe member cards: photo dim + skills reveal smooth (sau flip tarot)
- [ ] CountUp pe stats începe doar la `inView`
- [ ] Timeline events alunecă din lateral cu stagger
- [ ] Toggle RO/EN se face instant (cape sweep)
- [ ] Bats apar **rar**, nu enervant
- [ ] Castle windows flicker **rar**
- [ ] Pe mobile totul rămâne lizibil și smooth (testează pe device real)
- [ ] Lighthouse Performance > 90
- [ ] `prefers-reduced-motion: reduce` → totul calm, dar tot frumos

---

*End of plan. Întrebări de blocking se ridică direct cu user-ul; restul, execută ce zice doc-ul.*
