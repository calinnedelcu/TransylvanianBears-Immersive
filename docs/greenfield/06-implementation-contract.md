# Contract de implementare greenfield

Status: shell funcțional, rute editoriale funcționale, asset-uri finale în așteptare.

## Rute

| Rută | Rol | Sursă de date |
| --- | --- | --- |
| `/next` | poveste scroll-driven în nouă capitole | `SCENES` |
| `/next/work` | index filtrabil al proiectelor | `PROJECTS` |
| `/next/work/:slug` | studiu de caz | `PROJECTS.chapters` |
| `/next/team` | indexul celor șase membri | `TEAM` + credite din `PROJECTS` |
| `/next/team/:memberId` | profil și sloturi personale | `TEAM` + credite din `PROJECTS` |
| `/next/archive` | premii, clasări și milestones | `ARCHIVE` |

Toate datele greenfield publicabile sunt centralizate în `src/greenfield/data.ts` și
validate de tipurile din `src/greenfield/types.ts`. Nicio pagină nu menține o copie
separată a unui proiect, rezultat sau credit.

## Reguli editoriale

- `verified`: există o sursă primară sau un rezultat public verificabil.
- `team-confirmed`: informația vine de la echipă, dar dovada publică nu este încă
  atașată.
- `pending`: informația nu poate fi publicată ca fapt final.
- Creditele fără rol confirmat afișează starea de validare; nu primesc roluri deduse.
- Proiectele personale au exact două sloturi per membru și nu primesc titlu, rezultat
  sau descriere până la răspunsul persoanei.

## Contract de mișcare

- Homepage-ul folosește o singură lume fixă și scroll nativ. `ScrollTrigger` calculează
  scena activă și progresul local; componentele nu citesc direct `window.scrollY`.
- Paginile editoriale folosesc `useEditorialDirector`. Mișcarea modifică numai
  straturile interne și nu schimbă dimensiunile layout-ului.
- Anchor navigation între rute sare direct la capitol, fără traversarea lentă a întregii
  povești.
- `prefers-reduced-motion` elimină scrubbing-ul, tranzițiile și deplasările decorative,
  dar păstrează tot conținutul și ordinea lui.
- Pe mobil, scenele lungi `workshop` și `archive` revin în document flow pentru ca toate
  rândurile să fie accesibile; lumea rămâne fixă în fundal.

## Contract de asset

Fiecare slot declară:

- identificator stabil;
- tipul media;
- raportul de aspect și rezoluția minimă;
- subiectul și compoziția;
- rolul în mișcare;
- tratamentul separat pentru mobil;
- textul alternativ.

Până la handoff, `MediaPlaceholder` redă geometrie abstractă și metadatele slotului.
Un asset final va înlocui suprafața din interiorul aceluiași raport; nu trebuie să
schimbe structura, textul sau ritmul paginii.

## Încărcare și compatibilitate

Greenfield și legacy sunt două lazy chunks independente. Intrarea pe `/next` nu mai
descarcă paginile și secțiunile vechi. Vechiul site rămâne disponibil pe rutele lui
până la migrarea finală.

Fallback-urile obligatorii sunt:

- conținut semantic fără JavaScript de animație;
- imagini statice pentru video scrubbable;
- DOM și CSS pentru text, metrici și diagrame explicative;
- navigație cu tastatura și meniu inert pe fundal când este deschis;
- layout separat sub `720px`, fără overflow orizontal al documentului.

## Porți înainte de publicare

1. Confirmarea rolurilor celor șase membri.
2. Creditele complete pentru Aegis, The Buried Hands, EconomyNews, Automation Risk și
   Infect.exe.
3. Numele oficial și dovada pentru rezultatele marcate `pending`.
4. Media originală conform shot list-ului final.
5. Testarea producției pe ruta reală de GitHub Pages, inclusiv refresh pe rute interne.
