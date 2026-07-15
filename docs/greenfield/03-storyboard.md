# Storyboard narativ: The Signal Becomes a System

Status: lanț narativ de referință; timeline-ul de scroll și structura pe secțiuni sunt
înlocuite de arhitectura hibridă.

> **Notă de continuitate, 15 iulie 2026:** lanțul de transformări dintre proiecte din
> acest storyboard rămâne material de bază. Procentele de scroll și organizarea într-o
> succesiune de secțiuni nu mai reprezintă arhitectura finală. Blueprint-ul curent este
> [`09-hybrid-world-architecture.md`](./09-hybrid-world-architecture.md).

Acest document descrie comportamentul experienței, nu tehnologia cu care va fi
produsă. Procentele sunt repere pentru prototip și vor fi calibrate prin teste de
ritm, performanță și înțelegere.

## Research și concluzii

- [The Spark](https://tympanus.net/codrops/2026/01/09/the-spark-engineering-an-immersive-story-first-web-experience/)
  folosește un container de scroll comun, intervale diferite pentru beat-uri scurte și
  lungi, o singură scenă grea activă și aceeași sursă de progres pentru WebGL și UI.
  Adoptăm principiul, nu stack-ul lor.
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) confirmă modelul
  cu timeline etichetat, pin controlat, scrub, callback-uri, viteză de scroll și setup
  responsive. Nu folosim snap obligatoriu și nu interceptăm rotița sau gestul tactil.
- [Responsive scrollytelling, The Pudding](https://pudding.cool/process/responsive-scrollytelling/)
  recomandă planificarea mobilului de la început, păstrarea scroll-ului doar când
  tranziția transmite sens și eliminarea interacțiunilor bazate pe hover. Mobilul este
  o compoziție proprie, nu desktop decupat.
- [W3C, Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
  cere posibilitatea de a opri mișcarea neesențială și avertizează explicit asupra
  parallax-ului declanșat de scroll. Reduced motion este o rută editorială completă.
- [W3C, Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide)
  cere control pentru mișcarea automată persistentă. Sunetul și animațiile ambientale
  nu pornesc fără acțiunea utilizatorului.

## Teza poveștii

Un semnal pornește din peisaj și activează un observator-fortăreață. Vizitatorul nu
inspectează o clădire fantastică, ci urmărește cum șase discipline transformă aceeași
materie în sisteme, lumi și cercetare verificabilă.

Cele patru verbe ale călătoriei sunt:

1. **Observe** — Project Nexus transformă observația în computer vision.
2. **Protect** — Aegis / SchoolMate transformă o problemă reală într-un produs.
3. **Imagine** — The Buried Hands transformă o regulă într-o lume jucabilă.
4. **Measure** — cercetarea transformă evenimente și ocupații în rezultate analizabile.

În final, toate urmele devin un sistem comun. Mesajul nu este că echipa „poate face de
toate”, ci că știe să combine discipline diferite pentru a construi și a demonstra.

## Contractul cu utilizatorul

- Primul viewport afișează imediat `Transylvanian Bears` și descrierea literală a
  echipei. Nu există loader obligatoriu, intro cu buton de intrare sau logo enigmatic.
- Scroll-ul nativ este sursa de adevăr. Nu capturăm wheel, touch sau tastele de
  navigație și nu mutăm pagina împotriva intenției utilizatorului.
- Lumea vizuală rămâne full-bleed în spatele și printre blocurile editoriale. Nu este
  un clip blocat într-un card peste care utilizatorul trece.
- Fiecare capitol are o stare stabilă de început și una de final. La scroll rapid,
  experiența ajunge la starea finală, nu rămâne între cadre.
- Fiecare afirmație importantă are un traseu către dovadă: studiu de caz, repo, build,
  lucrare, clasament sau document.
- Meniul Fast Access, controlul de mișcare și controlul audio rămân accesibile în tot
  parcursul.

## Structura scenei persistente

Homepage-ul are două straturi sincronizate:

1. **World stage** — un strat vizual full-viewport, persistent pe durata Guided
   Journey. Poate combina 3D, imagini, video, shaders sau SVG, dar pentru utilizator
   se comportă ca o singură lume.
2. **Narrative track** — conținut semantic în document: titluri, texte scurte, date,
   credite, linkuri și ancore. Blocurile pot trece peste, printre sau în interiorul
   compoziției, fără să o reducă la un cadran.

Stage-ul nu este elementul animat de pinning. Un wrapper stabil controlează perioada
sticky/fixed, iar scena internă se transformă. La ieșirea din Guided Journey, pagina
revine la flow normal pentru footer și conținut auxiliar.

## Timeline desktop

Ținta inițială este aproximativ `1500vh`, adică 15 ecrane de scroll distribuite pe
beat-uri cu durate diferite. Nu este o promisiune de durată; prototipul decide dacă
parcursul rămâne la 2-3 minute sau justifică 3-4 minute.

### 00. First light — 0-6% / 90vh

**Cadru:** blue hour peste un relief transilvănean simplificat. Fortificația ocupă
treimea inferioară; marca și numele sunt lizibile înainte de hidratare.

**Mișcare:** numai atmosferă foarte lentă și o deplasare scurtă de profunzime la
primul scroll. Nicio rotație orbitală gratuită.

**UI:**

- `TRANSYLVANIAN BEARS` ca semnal principal;
- descriptor literal provizoriu: `A multidisciplinary student team building
  products, games, AI and research.`;
- `Scroll to follow the signal`;
- Fast Access, limbă, motion și audio în bara persistentă.

**Scop:** identitate și categorie în mai puțin de cinci secunde.

**Ieșire:** o singură undă topografică pornește din prim-plan și caută centrul
incintei.

### 01. The signal — 6-14% / 120vh

**Cadru:** camera urmărește unda la nivelul terenului. Curbele de nivel și cusăturile
minerale devin treptat geometria mărcii; nu apare o rețea neon peste peisaj.

**Mișcare:** viteza semnalului răspunde discret la viteza scroll-ului și se oprește
când utilizatorul se oprește. Audio, dacă este activat, folosește aceeași viteză.

**UI:** două propoziții scurte, nu o secțiune About completă:

- `Different disciplines. One working system.`
- `Built by six students, tested in products, games and research.`

Numărul șase rămâne provizoriu până la înghețarea roster-ului de lansare.

**Interacțiune opțională:** indicatorul de capitol deschide lista Fast Access; nu
există hotspot obligatoriu.

**Ieșire:** unda închide un circuit concentric în jurul porții.

### 02. The gate / identity reveal — 14-22% / 120vh

**Cadru:** planul fortificației, astrolabul și capul de urs se aliniază pentru prima
dată într-un singur simbol. Marca nu cade din cer; este descoperită în arhitectură.

**Mișcare:** poarta nu se deschide ca o ușă cinematică generică. Inelele se calibrează,
negative space-ul formează silueta de urs, apoi curtea se desfășoară într-un plan
interior. Tranziția trebuie să funcționeze reversibil la scroll înapoi.

**UI:** wordmark complet, un singur enunț despre metodă și link direct către About / Team.

**Dovadă:** niciun premiu aici. Momentul este despre identitate, nu autoritate
împrumutată.

**Ieșire:** cercul porții devine masa-instrument din camera echipei.

### 03. The workshop — 22-34% / 180vh

**Cadru:** o cameră luminoasă, minerală, cu șase stații în jurul unui nucleu comun.
Stațiile nu sunt birouri gamer și nu inventează proiecte personale. Fiecare conține
un instrument abstract derivat din disciplina membrului.

**Beat-uri:**

- 22-25%: camera intră; nucleul este incomplet;
- 25-31%: cele șase contribuții se conectează pe rând;
- 31-34%: masa funcționează ca un singur mecanism și deschide traseul Work.

**UI:** numele, rolul și maximum trei competențe pentru fiecare membru apar în benzi
scurte sincronizate cu stația sa. Portretul real poate apărea ca document inserat,
nu ca avatar 3D. Tastatura și tap-ul parcurg aceeași listă.

**Conținut:** Project Management / mobile, backend / 3D, AI / vision, full-stack,
design și game development / security. Formulările finale se bazează pe contribuțiile
validate, nu pe bio-urile promoționale vechi.

**Interacțiune opțională:** după stabilizarea cadrului, selectarea unei stații deschide
profilul persoanei într-un panel semantic. Scroll-ul principal nu depinde de selecție.

**Ieșire:** nucleul se închide ca o lentilă și camera intră în prima dovadă.

### 04. Observe / Project Nexus — 34-46% / 180vh

**Cadru:** lentila devine o vedere aeriană peste un mediu sintetic. Lumea reală a
proiectului — capturi Unreal, dataset și rezultate YOLO — înlocuiește gradual materia
fortificației. Nu generăm imagini AI care par rezultate ale modelului.

**Beat-uri:**

- 34-38%: problema și câmpul vizual;
- 38-42%: generarea datasetului sintetic și pipeline-ul;
- 42-45%: detecția și rezultatul;
- 45-46%: creditul echipei, premiul și accesul la cazul complet.

**UI:** verbul `OBSERVE`, problema într-o frază, trei date verificabile și CTA
`Open case study`. Datele fără sursă nu intră în styleframe.

**Dovadă:** prezentare, repo sau material tehnic, componență, numele oficial al
concursului și locul 1.

**Ieșire:** dreptunghiurile de detecție se aplatizează într-un plan de circulație și
devin arhitectura produsului Aegis.

### 05. Protect / Aegis and SchoolMate — 46-58% / 180vh

**Cadru:** un plan de școală abstract, bazat pe fluxuri și stări de siguranță, nu pe
imagini dramatice. Interfața reală a produsului apare în ferestre materiale, la scară
lizibilă. Relația Aegis-SchoolMate trebuie clarificată înainte de copy final.

**Beat-uri:**

- 46-50%: problema și actorii;
- 50-54%: traseul unui eveniment prin sistem;
- 54-57%: produsul, contribuțiile și decizia de design;
- 57-58%: locul 2 Skills for the Future și dovada.

**UI:** verbul `PROTECT`, scenariu de utilizare, arhitectură simplificată și CTA. Nu
promitem eficiență, adopție sau impact fără date.

**Dovadă:** capturi reale, demo, roluri, articolul Junior Achievement / Deutsche Bank
și formularea oficială a rezultatului.

**Ieșire:** planul se pliază ca o foaie; liniile lui devin straturi de pământ și apoi
conturul unei mâini.

### 06. Imagine / The Buried Hands — 58-70% / 180vh

**Cadru:** camera coboară într-o lume de joc inspirată strict din art direction-ul și
asset-urile reale ale proiectului. Materialele observatorului devin decor, UI și
regulă de gameplay; nu proiectăm un trailer paralel care nu există în build.

**Beat-uri:**

- 58-62%: premisa și regula centrală;
- 62-66%: procesul de construire a lumii;
- 66-69%: fragment de gameplay controlat de scroll sau video scrubbable;
- 69-70%: echipă, build public, locul 2 și CTA.

**UI:** verbul `IMAGINE`, o propoziție de premisă, rolurile și linkul către itch.io.
Captura de gameplay rămâne suficient de mare pentru a fi inspectată.

**Interacțiune opțională:** un buton explicit pornește un fragment cu sunet; scroll-ul
nu declanșează audio și nu simulează controlul jocului.

**Ieșire:** imaginea se reduce la un bit, apoi pixelii devin puncte de date. Infect.exe
poate apărea aici ca un interludiu de 1-bit de 10-15% din capitol, numai dacă nu rupe
ritmul și are asset-uri reale suficiente.

### 07. Measure / Research chamber — 70-80% / 150vh

**Cadru:** punctele se organizează într-un instrument temporal. O axă reprezintă cele
2.449 de evenimente nescheduled din EconomyNews; o a doua lentilă poate deschide
evaluarea riscului de automatizare. Vizualizarea trebuie să corespundă datelor reale.

**Beat-uri:**

- 70-74%: întrebarea de cercetare;
- 74-77%: date, metodă și limitări;
- 77-80%: rezultat, lucrare, autori și traseul către ambele cazuri.

**UI:** verbul `MEASURE`, metodă, volum de date și link către lucrare / repo. Premiul
pentru automatizare și mențiunea Joseph Schumpeter apar numai după confirmarea
formulării oficiale.

**Dovadă:** PDF / lucrare, repo, autori, dataset / metodologie și limite declarate.

**Ieșire:** axa temporală se curbează și devine astrolabul arhivei.

### 08. Archive / Proof constellation — 80-90% / 150vh

**Cadru:** rezultatele apar ca evenimente datate pe inele, conectate la proiectele și
oamenii lor. Nu există raft de cupe. Fiecare rezultat are o stare vizuală pentru
`verified`, `source pending` sau `milestone`.

**Conținut prioritar:** Project Nexus, Skills for the Future, RDGA x Tudor Vianu Game
Jam 2026, Chronos CTF, Hardcore Entrepreneur 6, 1-BIT JAM 7 și premiile de cercetare.
Internshipul Deutsche Bank este milestone și se afișează separat după clarificarea
participanților.

**UI:** anul, rezultatul, proiectul, membrii și linkul de dovadă. Filtrele complete
sunt pe `/archive`; homepage-ul arată numai un traseu selectat.

**Interacțiune:** selectarea unui punct deschide o fișă; toate punctele sunt accesibile
în listă și la tastatură. Nu există informație exclusivă în hover.

**Ieșire:** inelele se aliniază într-o hartă cu două rute înainte.

### 09. Open paths / Join and Partners — 90-96% / 90vh

**Cadru:** observatorul nu este o cetate închisă. Două trasee ies din nucleu: unul
către roluri și comunitate, altul către mentori și parteneri.

**UI:** două comenzi clare, fără carduri promoționale:

- `Join the team` — roluri, standard, proces și formular;
- `Work with us` — mentorat, sponsorizare, presă și contact.

**Conținut:** nu afișăm poziții vacante sau beneficii neverificate. Datele de contact
și timpul estimat de răspuns trebuie validate înainte de lansare.

**Ieșire:** traseele ies în relief și schimbă lumina scenei din blue hour în dimineață.

### 10. Dawn / The system remains — 96-100% / 60vh

**Cadru:** revenire la exterior, acum lizibil în lumină naturală. Semnalul nu dispare;
se vede ca infrastructură discretă între încăperi, proiecte și drumurile exterioare.

**UI:** concluzie provizorie `Observe. Protect. Imagine. Measure. Build together.`,
linkuri directe către Work și Team, plus footer semantic în flow normal.

**Scop:** rezoluție și continuitate, nu artificii finale. Nu lansăm confetti, trofee,
particule sau o animație care blochează următoarea acțiune.

## Continuitatea tranzițiilor

Tranzițiile trebuie să conserve o formă, un material sau o funcție. Fade-to-black este
fallback, nu limbaj principal.

| Din | În | Element conservat |
| --- | --- | --- |
| relief | marcă | curba topografică devine incintă și siluetă de urs |
| poartă | workshop | cercul porții devine masa-instrument |
| workshop | Nexus | nucleul devine lentilă |
| Nexus | Aegis | box-urile de detecție devin plan de circulație |
| Aegis | Buried Hands | planul se pliază în straturi și contur de mână |
| Buried Hands | research | pixelii devin observații de date |
| research | archive | axa temporală devine astrolab |
| archive | final | astrolabul devine planul întregului observator |

## Coregrafia UI

- Maximum un titlu, o propoziție și trei date simultan peste o scenă complexă.
- Textul intră în zone cu contrast controlat de compoziție, nu în carduri plutitoare.
- Blocurile ample de proces apar pe pagina studiului de caz, nu peste filmul homepage.
- Datele și creditele folosesc aceeași grilă în toate capitolele.
- Indicatorul de progres arată numele capitolului, nu un procent abstract.
- Bara persistentă se reduce la controale compacte în timpul scenelor, dar nu dispare.
- Focusul tastaturii ridică temporar UI-ul deasupra scenei și nu este mascat de motion.

## Fast Access

Fast Access este un meniu full-viewport semantic care se poate deschide din primul
cadru și din orice capitol. Conține:

- Work, Team, Archive, Field Notes, Join și Partners;
- cele patru proiecte homepage cu status și disciplină;
- comutatoare pentru limbă, motion și audio;
- progresul curent și `Resume journey`;
- link direct `Skip guided journey` către rezumatul editorial al homepage-ului.

Deschiderea lui pune pe pauză ambientul și lumea autonomă, păstrează scroll position și
nu descarcă scena. Închiderea revine la exact aceeași stare.

## Navigarea către studiile de caz

- CTA-ul unui proiect poate folosi o tranziție vizuală scurtă derivată din lentila
  scenei, dar ruta se schimbă imediat și conținutul nu așteaptă animația.
- Deschiderea directă a unui URL de proiect nu redă intro-ul homepage-ului.
- `Back to journey` restabilește capitolul și progresul anterior când istoricul
  browserului permite; altfel revine la ancora proiectului.
- Fiecare studiu de caz începe cu dovada reală dominantă: produs, gameplay, grafic sau
  lucrare. Lumea observatorului rămâne sistem de navigație, nu acoperă proiectul.

## Compoziția mobilă

Mobilul păstrează scroll-driven storytelling deoarece transformările explică legătura
dintre proiecte. Reduce însă durata la aproximativ `850-950dvh` și folosește cadre
verticale proiectate separat.

### Reguli

- First light, workshop, cele patru verbe, archive și final rămân; gate și tranzițiile
  intermediare se comprimă.
- Camera nu orbitează. Folosim push-in scurt, schimbare de focus, straturi 2.5D sau
  stări statice succesive.
- Titlurile ocupă banda superioară sau inferioară stabilă; nu traversează subiectul.
- Nu există hover, drag fin sau tilt după giroscop.
- Interacțiunile opționale devin butoane explicite cu target de minimum 44px.
- Înălțimea beat-urilor se calculează din viewport-ul stabil și se recalculează la
  resize / schimbare de orientare; nu depinde exclusiv de `100vh`.
- Imaginile desktop nu sunt doar crop-uite. Fiecare scenă are poster vertical,
  punct focal și safe areas pentru UI.
- Pe conexiuni lente, posterul și conținutul apar imediat; motion-ul se îmbunătățește
  progresiv după încărcare.

### Timeline mobil comprimat

| Interval | Conținut | Tratament |
| --- | --- | --- |
| 0-10% | identitate + semnal | poster vertical, un push-in scurt |
| 10-20% | marcă + workshop | transformare în două stări, lista celor șase membri |
| 20-35% | Observe | captură verticală / crop aprobat + trei date |
| 35-50% | Protect | plan și UI real în două straturi |
| 50-65% | Imagine | gameplay mare, fără fereastră decorativă |
| 65-76% | Measure | grafic vertical simplificat, date reale |
| 76-88% | Archive | listă cronologică sincronizată cu un singur inel |
| 88-100% | Join / Partners + dawn | două rute și footer în flow normal |

## Reduced Motion

Reduced Motion se activează automat din `prefers-reduced-motion` și poate fi ales
manual din meniu. Alegerea manuală este persistentă și are prioritate pentru sesiunea
următoare.

- Elimină parallax, orbit, zoom amplu, scrubbing video și obiecte care urmăresc
  cursorul.
- World stage devine o succesiune editorială de postere statice cu schimbări de
  opacitate scurte sau instantanee.
- Conținutul este în flow normal; sticky este folosit numai dacă nu produce mișcare
  relativă între planuri.
- Păstrează toate proiectele, toate datele, toate CTA-urile și aceeași ordine.
- Animațiile ambientale sunt oprite; audio poate rămâne opt-in, dar nu reacționează la
  viteza de scroll.
- Comanda vizibilă `Reduce motion` există și pentru utilizatorii care nu au setarea la
  nivel de sistem.

## Audio

Audio este opt-in și secundar informației. Prima activare se face printr-un buton cu
etichetă clară; starea implicită este off.

- exterior: vânt, lemn și spațiu deschis;
- workshop: mecanică discretă, fără ritm muzical continuu;
- proiecte: texturi derivate din materialul real, numai cu drepturi clare;
- archive: impulsuri scurte la evenimente, nu fanfară;
- final: deschiderea spectrului ambiental, fără crescendo obligatoriu.

Viteza de scroll poate influența intensitatea sau filtrul, nu volumul general în mod
agresiv. Oprirea scroll-ului stabilizează sunetul. Meniul, schimbarea tab-ului și
vizibilitatea documentului pun pe pauză comportamentul reactiv.

## Încărcare și stări de eroare

- HTML-ul, wordmark-ul și posterul primului cadru sunt first paint; JS-ul nu este
  necesar pentru a înțelege cine este echipa.
- Scena inițială ușoară pornește după hidratare. Următorul capitol se preîncarcă în
  idle sau înainte de limita lui, în funcție de conexiune și memorie.
- Păstrăm simultan numai resursele necesare pentru scena curentă, tranziție și scena
  următoare. Matricea de producție va stabili excepțiile.
- Nu există blank canvas. Orice eroare WebGL, video sau asset păstrează posterul,
  conținutul și navigația.
- Nicio tranziție inter-capitol nu așteaptă un procent fictiv. Dacă asset-ul nu este
  gata, se folosește starea statică și experiența continuă.
- Restaurarea tab-ului, bfcache și back navigation recalculează progresul fără salt la
  început.

## Instrumentare pentru prototip

În build-urile interne, fiecare capitol raportează:

- progres local și global;
- viteză și direcție de scroll;
- scenă curentă, pregătită și eliberată;
- FPS mediu și percentile de frame time;
- memorie aproximativă, asset-uri și timp de încărcare;
- motivul fallback-ului: reduced motion, touch, low power, WebGL indisponibil sau
  eroare de asset.

Marcajele și debug UI dispar complet din producție.

## Criterii de aprobare a storyboard-ului

Storyboard-ul trece în producție numai când:

1. un prototip graybox poate fi parcurs înainte și înapoi fără stări rupte;
2. cele patru verbe și proiectele asociate sunt înțelese fără explicație verbală;
3. first viewport, Fast Access și ruta editorială funcționează fără WebGL;
4. mobilul nu este un crop al desktop-ului și poate fi parcurs cu o singură mână;
5. Reduced Motion păstrează 100% din conținut și acțiuni;
6. fiecare rezultat afișat are sursă sau este marcat intern ca blocat;
7. tranzițiile conservă forma sau funcția și nu se bazează pe fade repetitiv;
8. ritmul nu cere mai mult scroll decât informația justifică;
9. testul cu scroll rapid, resize și back navigation nu rupe scena;
10. vertical slice-ul poate atinge bugetul de performanță stabilit în matricea tehnică.
