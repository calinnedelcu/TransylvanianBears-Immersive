# TransylvanianBears — Status & Next Steps

> Live notes pentru reluat lucru. Pair cu [PLAN.md](PLAN.md) (full spec) și `~/.claude/projects/.../memory/` (decizii cross-session).

---

## TL;DR — unde suntem (29 Apr 2026, sesiune 3 fin)

**Site funcțional + design premium + content real parțial.** Fazele 1-11 done aproape complet. Faza 12 (deploy) nedone. Wow factors din PLAN §16-17: **toate done** în afară de câteva polish-uri.

Dev server: `cd C:\PersonalProjects\websiteTransylvanianBears && npm run dev` → http://localhost:5173.

---

## Sesiunea 29 Apr 2026 — quick wins, easter eggs, content real, optimizări

### Easter eggs & wow factors (toate done)
- ✅ **Bear-trophy reaction** în Achievements lângă Constellation (`BearTrophyReaction.tsx`) — slide-in din dreapta + halo pulse + spark twinkle.
- ✅ **Typewriter** pe Hero tagline (`Typewriter.tsx`) — retypes la toggle RO/EN, caret blink, reduced-motion fallback.
- ✅ **Garlic swarm easter egg** (`KonamiEasterEgg.tsx`) cu 2 trigger-uri: **double-tap Space** (< 400ms, deliberat) + **cursor shake** (5 schimbări direcție în 700ms, accidental). Banner "USTUROI ACTIVAT" + 9 angry-garlic painted cad/se rotesc.
- ✅ **Triple-click logo** (`LogoTripleClickEgg.tsx`) — bear-waving cameo cu speech bubble "Salut!"/"Hi!" (i18n-aware).
- ✅ **Garlic friend permanent** lângă medalionul din Footer (`GarlicFriend.tsx`) — pendulum swing din cârligul auriu, halo pulse.
- ✅ **404 page** la `public/404.html` — bear-sleeping cu pelerina ca pătură + 3 Z-uri animate (zRise keyframe) + button "Înapoi acasă". Standalone HTML, Vercel îl servește automat.
- ✅ **Fog reveal** pe section enter (`SectionFogReveal.tsx`) — aplicat la About / Members / Achievements / Projects / JoinUs. Plateau 70% full, fade 30%, window 1.5× viewport. Filter `grayscale(1) sepia(1) saturate(2.6) hue-rotate(-6deg)` pentru gold subtle (era roz-wine din asset-ul Hero). Max opacity 0.6.

### Content real
- ✅ **6 membri reali** cu portrete în `public/assets/membrii/` (Alex Istrate, Andrei Cheroiu, Calin Nedelcu, Cristian Buloi, Vlad Bostina, Vlad Colan) — numerale I-VI. Roluri/skills/bios goale, "Profil în curs de completare." pe back face. **2 carduri "Loc liber" / "Open seat"** (numerale VII, VIII) cu "?" mare + dashed halo + link la `#join`.
- ✅ **Portrait area** redesigned — 230×307 (era 180×180), `object-cover object-top` (capul nu se taie), radial mask vignette `ellipse 65% 80% at 50% 32%` cu 6-stop ramp gradual + halo gold subtil 95px.
- ✅ **5 achievements reale** în `src/data/achievements.ts` — Vianu Game Jam (mai 2025), Chronos CTF (nov 2025), 1-BIT JAM 7 (nov 2025), Project Nexus htechrobotics (mar 2026), Aegis/Skills for Future (apr 2026). Adăugat `link?` field în Achievement type, Timeline.tsx render-uiește link-uri ↗ unde există.
- ✅ **Stats updated**: About → 6 membri / 1 an / 5 medalii. Achievements → 3 național / 2 internațional / 5 competiții / fondare 2025 (era 2018).

### Asset & build optimizations
- ✅ **angrygarlic.png** + **bear-sleeping.png** livrate de user, convertite la WebP. Angry garlic înlocuiește SVG-ul inline din Konami swarm + GarlicFriend Footer (assets pictate same-style cu urșii).
- ✅ **WebP conversion script** (`scripts/optimize-images.mjs`, `npm run optimize:images`) — convertește toate PNG-urile recursiv la WebP folosind sharp. Run rezultat: **39.93MB → 2.24MB (-94%)**.
- ✅ **Toate referințele cod** swap-uite de la `.png` la `.webp` (cu excepția favicon + 404 page bear-sleeping care folosește `<picture>` cu webp source + png fallback).
- ✅ **OG image 1200×630** (`public/og-image.jpg`) generat cu `npm run generate:og` (script `scripts/generate-og.mjs`). Compoziție: gradient wine + grain + forest silhouette + bear-mascot + title gold + ornaments. Meta tags actualizate cu og:image:width/height/type.

### Dependențe noi
- `sharp` ^0.34.5 (devDep) pentru cele 2 scripturi de mai sus.

---

## Faze terminate (PLAN §12)

- ✅ **Faza 1-10 complet** (vezi sesiunile anterioare în memorie).
- 🟡 **Faza 11 — Polish (aproape done).** Done acum: meta tags + OG image, robots.txt + sitemap, alt-texts, reduced-motion, build prod ~459KB JS / 144KB gzip + 98KB CSS / 37KB gzip, **WebP conversion -94%**. **Rămase**: favicon variants 16/32/180, Lighthouse audit Chrome real, cross-browser test.
- ❌ **Faza 12 — Deploy.** Nedone.

---

## Wow factor checklist (PLAN §16-17) — ce LIPSEȘTE

**Done din §16:**
- ✅ Bats rare, Castle window flicker rar, God rays, Cape sweep RO/EN, Achievements constelație, Members tarot
- ✅ **Garlic friend animat pe medalion** (NOW DONE — angry garlic painted)
- ✅ **Bear reactions la scroll** (NOW DONE — bear-trophy în Achievements + bear-waving JoinUs/triple-click)
- ✅ **Fog reveal pe section enter** (NOW DONE — gold subtle filter)
- ✅ **Konami / Space×2 easter egg** (NOW DONE — double-space sau shake)
- ✅ **Triple-click logo** (NOW DONE)
- ✅ **404 page bear-sleeping** (NOW DONE)

**Lipsește din §16:**
- ❌ **Cap-turn al bear-mascot din Hero** spre conținut la scroll — nice-to-have, nu critical
- ❌ **Garlic friend bouncy + clipește** — clipește (twinkle) e DONE; "bouncy" via pendulum swing e DONE. Practic done.

**Done din §17:**
- ✅ **Typewriter pe tagline Hero**

**Lipsește din §17 (final checklist):**
- ❌ Mobile real device test
- ❌ Lighthouse > 90 verificat în Chrome real
- ❌ Cross-browser test Firefox / Safari

---

## Asseturi disponibile vs folosite (toate WebP optimizate)

| Filename | Folosit în | Status |
|---|---|---|
| `logo.png/webp` | Navbar, Footer, favicon (PNG) | ✅ |
| `bear-mascot.webp` | Hero | ✅ |
| Hero parallax (sky/mountains/castle/forest/fog/bats) | Hero | ✅ |
| `bear-coding.webp` | About | ✅ |
| `bear-waving.webp` | JoinUs + LogoTripleClickEgg | ✅ |
| `bear-thinking.webp` | Projects watermark | ✅ |
| `tb-medallion.webp` | Footer brand stamp | ✅ |
| `bear-trophy.webp` | Achievements reaction | ✅ |
| `bear-sleeping.png/webp` | 404 page | ✅ |
| `angrygarlic.webp` | Konami swarm + Footer GarlicFriend | ✅ |
| `membrii/AlexIstrate..VladColan.webp` | Members (6 carduri) | ✅ |
| `og-image.jpg` | OG meta tag | ✅ |
| `bats-original-bleed.png` | reference only (pre-fix) | unused |

---

## Open items per categorie

### Polish tehnic (5-30 min fiecare)
- **Favicon variants** 16/32/180 din `logo.png` (poate folosi sharp, scriem `scripts/generate-favicons.mjs`)
- **Lighthouse audit** Chrome real (necesită user manual)
- **Cross-browser test** Firefox / Safari + mobile real device

### Content rămas (pentru user)
- **Roluri/skills/bios** pentru cei 6 membri în `src/data/members.ts` (acum goale, arată "Profil în curs")
- **Projects reale** în `src/data/projects.ts` (acum placeholder fictiv)
- **Email + social handles reali** (acum `team@transylvanianbears.ro`, `github.com/transylvanian-bears`)
- **About body text** se referă la "Pregătim olimpici pentru ONI și InfoEducație" — nu mai matchează profilul real al echipei (game dev / AI / CTF). De rescris.
- **Cap-turn bear mascot Hero** (opțional, nu critical)

### Deploy (Faza 12)
- Push GitHub + Vercel import + DNS `transylvanianbears.ro`
- Setări Vercel: framework Vite (auto), `npm run build`, output `dist/`. 404.html servit automat ca fallback.

---

## Cheat sheet

```bash
# Dev server
npm run dev    # http://localhost:5173

# Build prod
npm run build

# Typecheck
npx tsc --noEmit

# Re-optimize images (after adding new PNGs)
npm run optimize:images

# Regenerate OG image (after editing scripts/generate-og.mjs)
npm run generate:og
```

**Stack:** React 18 + Vite 5 + TS strict + Tailwind 3 + Framer Motion 11 + react-i18next 15 + Lenis 1 + lucide-react. Sharp 0.34 pentru build scripts.

**Build prod:** 459KB JS / 144KB gzip + 98KB CSS / 37KB gzip + assets ~2.4MB WebP.

---

## Easter egg trigger reference

- **Garlic swarm**: double-tap Space (< 400ms) SAU shake mouse stânga-dreapta rapid (5 schimbări direcție / 700ms). Cooldown 4.5s.
- **Bear waving cameo**: triple-click pe logo (3 click-uri în 500ms).
- **404 sleeping bear**: navighezi la orice URL inexistent.

---

## Pentru sesiunea următoare — recomandare

1. Tu completezi `src/data/{members,projects}.ts` cu info reale.
2. Eu generez favicon variants automat din logo.
3. Deploy pe Vercel + DNS.
4. (Opțional) Lighthouse audit + tweaks bazat pe rezultat.

Memoria persistă în `~/.claude/projects/C--PersonalProjects-websiteTransylvanianBears/memory/`.
