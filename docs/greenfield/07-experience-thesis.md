# Experience thesis 01: The Living Proof

Status: document istoric; controlul și lumea reactivă rămân input, iar arhitectura
hub-and-spoke este înlocuită.

> **Amendament după testul uman din 15 iulie 2026:** controlul local și ideea unei
> lumi care reacționează rămân valide, însă modelul global `hub + patru misiuni` este
> retras. Nu vom reveni într-un selector central după fiecare proiect și nu vom trata
> proiectele ca patru lumi separate. Arhitectura macro aprobată este definită în
> [`09-hybrid-world-architecture.md`](./09-hybrid-world-architecture.md): un traseu
> continuu împletit cu opriri editoriale și acces web direct.

Acest document răspunde unei singure întrebări:

> Ce fel de experiență construim?

Nu este storyboard final, listă de tool-uri sau plan de producție. Prototipul actual
rămâne infrastructură și nu reprezintă standardul vizual ori experiența finală.

## Concluzia într-o propoziție

**Transylvanian Bears devine un narrative adventure browser-native de 12-15 minute,
plasat într-o citadelă-laborator transilvăneană vie, în care vizitatorul operează patru
sisteme inspirate din proiecte reale, adună dovezi verificabile și transformă permanent
lumea centrală până când vede cum oamenii, disciplinele și rezultatele formează un
singur sistem.**

Nu construim un website care arată ca un joc. Construim un joc narativ scurt care
funcționează și drept cea mai credibilă prezentare a echipei.

## Ce am comparat

### 1. Film interactiv controlat prin scroll

Exemplele precum [For Honor: Scars](https://www.makemepulse.com/news/for-honor-scars)
arată cât de puternică poate fi o secvență când acțiunea, camera, sunetul și povestea
sunt aceeași mișcare. În Scars, utilizatorul traversează chiar arma și lupta care
poartă povestea personajului, poate merge înainte și înapoi și controlează punctul de
vedere.

Modelul produce cadre foarte regizate, dar rămâne în mare parte un timeline. Folosit
singur, ne-ar întoarce la problema actuală: vizitatorul derulează un spectacol, nu
locuiește pentru câteva minute într-o lume.

**Verdict:** îl păstrăm pentru prolog, tranziții și finale; îl respingem ca structură
principală.

### 2. Open world de portofoliu

[Bruno Simon](https://bruno-simon.com/) transformă portofoliul într-o lume jucabilă
propriu-zisă: vehicul, fizică, hartă, gamepad, respawn, quality control, obiecte și
secrete. [Where Worlds Take Shape](https://paodao.fr/) merge și mai departe cu
explorare third-person, medii dinamice și mini-jocuri.

Modelul oferă agency autentică, însă are două riscuri pentru noi: proiectele pot fi
ratate sau găsite greu, iar simpla deplasare poate deveni mai memorabilă decât munca
echipei. Un juriu sau un partener nu trebuie să conducă trei minute până la dovada unui
premiu.

**Verdict:** adoptăm controlul real, harta, recovery-ul și libertatea locală; respingem
open world-ul complet ca structură principală.

### 3. Muzeu 3D cu camere și hotspot-uri

[The House of Wonders](https://www.makemepulse.com/case-study/audemars-piguet-the-house-of-wonders)
organizează 150 de ani de conținut în 20 de camere interactive, jocuri, quiz-uri,
obiecte și badge-uri. Este coerent, ușor de reexplorat și a raportat o medie de zece
minute petrecute în experiență.

Riscul este să devină un muzeu de diorame: apeși hotspot, citești, închizi, repeți.
Asta ar organiza bine proiectele, dar nu ar produce senzația de story mode cerută.

**Verdict:** adoptăm camerele distincte, progresul și obiectele de dovadă; respingem
hotspot-ul ca mecanică dominantă.

### 4. Hub narativ cu ramuri

În [The Field](https://medium.com/active-theory/the-field-bbe924426d7f), Active Theory
a înlocuit un traseu pur liniar cu un lobby explorabil din care porneau povești
ramificate; avatarul se transforma pe măsură ce experiențele erau parcurse. Cercetarea
despre hub level design arată și avantajul-cheie: spațiul revizitat poate deveni mai
real și mai memorabil dacă reacționează la acțiunile jucătorului
([Game Developer](https://www.gamedeveloper.com/design/level-design-in-a-day-your-questions-answered)).

Acesta este modelul care poate combina autoritatea unei povești regizate cu agency,
ritm și acces rapid.

**Verdict:** acesta este scheletul ales.

## Arhetipul ales

Experiența este un **directed exploration game cu hub-and-spoke structure**:

- prologul și finalul sunt cinematice și regizate;
- citadela centrală este un hub explorabil care se schimbă după fiecare misiune;
- patru aripi pot fi parcurse într-o ordine aleasă de jucător;
- fiecare aripă este un nivel scurt cu o mecanică proprie, nu o secțiune cu alt skin;
- un Field Journal diegetic oferă în orice moment hartă, progres, surse și fast access;
- experiența are un final real, nu un footer după ultimul scroll.

Default-ul este Story Mode. Work, Team, Archive și Contact rămân accesibile direct,
dar nu apar ca o bară de navigație convențională peste fiecare cadru.

## Rolul jucătorului

Vizitatorul nu „repară” proiectele și nu primește meritul echipei. Intră în citadelă
ca **external observer**, urmărind un semnal pe care sistemul îl recunoaște ca prezență
nouă.

Citadela nu își oferă conținutul prin expoziție. Îl dezvăluie numai când observatorul
repetă, într-o formă comprimată, gestul esențial al fiecărui proiect: observă,
protejează, imaginează și măsoară.

Miza nu este salvarea lumii sau repararea unei fortărețe stricate. Miza este
**înțelegerea prin participare**. La final, jucătorul nu primește o cupă fictivă; are
o hartă completă a dovezilor și vede cine a construit fiecare parte.

## Lumea

Spațiul este o **citadelă contemporană de cercetare și creație**, inspirată structural
din incintele fortificate transilvănene, fără Dracula, horror generic, castel fantasy
sau laborator neon.

Lumea respectă patru reguli:

1. Centrul este atelierul comun, nu un hol decorativ.
2. Fiecare spațiu are o funcție de lucru lizibilă și urme ale oamenilor care îl folosesc.
3. Proiectele apar ca sisteme construite în aceeași lume, nu ca portaluri arbitrare
   către patru reclame diferite.
4. Orice acțiune importantă produce o schimbare persistentă în arhitectură, lumină,
   sunet sau instrumente.

Timpul trece din blue hour spre dimineață, dar lumina nu se schimbă doar pentru efect.
Fiecare dovadă validată deschide fizic citadela, conectează o aripă la nucleu și face
vizibile noi contribuții ale membrilor.

## Mecanica-semnal

Experiența are o mecanică comună, nu patru mini-jocuri fără legătură: **The Lens**.

The Lens este un instrument fizic și digital derivat ulterior din identitatea mărcii.
Prin el, jucătorul comută între straturi ale aceleiași realități. Fiecare nivel îi
adaugă o capacitate nouă:

- **Observe / Project Nexus:** real, synthetic, segmentation și detection;
- **Protect / Aegis:** identitate, permisiune, traseu valid și anomalie;
- **Imagine / The Buried Hands:** suprafață, regulă ascunsă și consecință în lumea de joc;
- **Measure / Research:** date brute, ipoteză, rezultat și incertitudine.

Lens-ul este control, instrument narativ, UI și obiect de brand în același timp. Dacă
un efect vizual nu schimbă ce poate observa sau decide jucătorul, nu aparține acestei
mecanici.

## Bucla principală

1. **Discover:** hub-ul indică o perturbare sau un sistem încă neînțeles.
2. **Enter:** o tranziție cinematică duce jucătorul în spațiul proiectului.
3. **Learn by doing:** nivelul predă o regulă prin acțiune, nu prin paragraf.
4. **Make one meaningful decision:** jucătorul testează, selectează, compară sau
   rezolvă ceva care aparține proiectului real.
5. **Receive proof:** rezultatul este un artefact factual, cu autori și sursă.
6. **Return changed:** atelierul central se modifică și arată noua legătură cu echipa.

O cameră care oferă doar text, cameră animată sau un hotspot nu este nivel și nu trece
gate-ul de concept.

## Cele patru misiuni

Mecanicile exacte vor fi definite numai după research separat pe fiecare proiect.
Pentru această fază fixăm doar promisiunea experiențială:

| Misiune | Verb | Promisiune jucabilă | Dovada obținută |
| --- | --- | --- | --- |
| Project Nexus | Observe | controlezi o observație și înțelegi trecerea de la lume sintetică la detecție | cadru validat, pipeline, volum de date, autori |
| Aegis / SchoolMate | Protect | urmărești și verifici traseul unei acțiuni prin roluri și reguli | trace de sistem, decizie de produs, rezultat |
| The Buried Hands | Imagine | înveți o regulă spațială printr-un fragment atmosferic de gameplay | build, roluri, postmortem, premiu |
| Research | Measure | manipulezi o ipoteză și separi rezultat, limită și interpretare | grafic real, metodă, lucrare, autori |

Infect.exe poate deveni o anomalie secretă 1-bit sau side mission. Premiile nu sunt
pickup-uri aurii; Archive este un sistem de dovezi care se deschide din artefactele
reale acumulate.

## Perspectivă și control

Direcția recomandată este **first-person, authored traversal**:

- free look și libertate locală în hub și în momentele de investigație;
- trasee și camere atent regizate între beat-uri, fără coridoare goale;
- mouse + tastatură, gamepad și touch ca input-uri de prim rang;
- fără avatar-mascotă și fără automobil pus artificial peste conținut;
- wheel-ul poate controla focusul ori un mecanism după intrarea explicită în Story
  Mode, dar nu derulează secțiuni HTML.

Nu fixăm încă dacă mișcarea finală va fi complet liberă sau node-assisted. Aceasta este
o întrebare pentru primul interaction prototype, nu pentru alegerea engine-ului.

## Structura narativă

### Prolog: The Incoming Signal

Numele și natura echipei sunt vizibile imediat. Jucătorul intră voluntar în Story
Mode, iar citadela îl identifică drept observator extern. Semnalul deschide atelierul.

### Act I: The Workshop

Jucătorul înțelege spațiul, Lens-ul și cele patru direcții. Cele șase stații ale
echipei există fizic, dar identitățile nu sunt turnate într-un carousel de portrete.

### Act II: Four Proofs

Misiunile pot fi alese din hub. Fiecare adaugă o capacitate Lens-ului și schimbă
nucleul. Ordinea produce mici variații de lumină, sunet și dialog ambiental, nu patru
povești incompatibile.

### Act III: The Living System

Cele patru artefacte conectează proiectele, membrii și rezultatele într-un singur
aparat. Abia acum citadela poate fi privită în ansamblu, la lumină de dimineață.

### Epilog: Choose the Next Signal

Finalul oferă trei acțiuni diegetice clare: inspectează dovezile, întâlnește echipa sau
deschide un canal de contact/join. Nu încheiem cu un CTA generic peste un footer.

## Principii validate de research

- Povestea interactivă trebuie transformată într-o serie de decizii, nu într-un discurs
  livrat jucătorului ([Ubisoft, Narrative Design](https://news.ubisoft.com/en-gb/article/7m412GLSbfkaT0YheRYLVG/what-is-narrative-design)).
- Mediul trebuie să îl facă pe jucător să deducă și să participe, iar sistemele trebuie
  să reacționeze la agency, nu doar recuzita și lumina
  ([GDC, Environmental Storytelling](https://gdcvault.com/play/1012696/What-Happened-Here-Environmental)).
- Un hub merită refolosit numai dacă starea lui se schimbă vizibil; altfel backtracking-ul
  devine repetiție.
- Sunetul, camera și haptics au valoare când răspund la acțiune, așa cum lupta însăși
  conduce povestea în For Honor: Scars.
- Recuperarea este parte din design: hartă, obiectiv, skip, reset, quality mode și
  direct access trebuie proiectate de la început, nu adăugate după lume.

## Ce respingem explicit

- homepage lung cu un canvas fix și texte care intră la scroll;
- 3D hero urmat de cards, grid-uri și secțiuni normale;
- o fortăreață goală folosită ca meniu către pagini;
- open world mare umplut cu drumuri fără sens;
- patru portaluri care duc la patru estetici fără reguli comune;
- hotspot-uri care deschid modale ca mecanică principală;
- lore inventat care acoperă informația reală;
- shaders, particles, ceață, glitch sau cinematic video fără funcție în gameplay;
- mascotă de urs, fantasy medieval, steampunk generic sau Transilvania de parc tematic;
- premii tratate ca trofee fictive ori proiecte prezentate fără credite și surse.

## Gate-ul acestui pas

Teza trece în etapa următoare numai dacă putem răspunde „da” la toate:

1. Experiența poate fi descrisă fără cuvintele `scroll`, `landing page`, `cards` sau
   numele unei tehnologii.
2. Jucătorul are rol, scop, control, alegere și un final.
3. Fiecare proiect oferă o regulă jucabilă, o consecință și o dovadă reală.
4. Hub-ul este schimbat permanent de fiecare misiune.
5. Lens-ul leagă mecanic și vizual toate capitolele.
6. Echipa și contribuțiile sunt mai clare după joc, nu ascunse de spectacol.
7. Cine nu dorește Story Mode poate ajunge la orice dovadă în maximum două acțiuni.
8. Conceptul rămâne propriu Transylvanian Bears dacă eliminăm logo-ul și titlul.

## Ce NU decidem în acest pas

- engine-ul și librăriile;
- Blender, Houdini, Higgsfield, generare video sau pipeline-ul de asset-uri;
- stilul final de modelare, materiale și iluminare;
- durata exactă și controlul definitiv al camerei;
- storyboard-ul pe cadre;
- UI-ul final;
- implementarea.

Următorul pas începe numai după aprobarea acestei teze și va trata o singură problemă:
**core gameplay loop + control model**, demonstrat prin alternative și un interaction
prototype fără art final.
