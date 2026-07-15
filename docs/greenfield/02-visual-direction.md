# Direcție vizuală: Living Observatory

Status: direcție de lucru, nu art direction final aprobat

## Teza

Un semnal trezește un observator-fortăreață ascuns în peisajul transilvănean. Clădirea
nu este decor: fiecare încăpere reprezintă o disciplină, fiecare mecanism leagă un
proiect, iar transformarea nopții în zori urmărește maturizarea echipei.

Formula de control este:

> Fortăreață, nu horror. Observator, nu steampunk. Urs, nu mascotă. Tehnologie, nu neon.

## Research folosit

### Storytelling digital

- [The Spark](https://tympanus.net/codrops/2026/01/09/the-spark-engineering-an-immersive-story-first-web-experience/):
  povestea și arcul emoțional au fost definite înaintea tehnologiei; scenele dețin
  felii clare de scroll, iar o singură scenă este activă.
- [Joseph Santamaria](https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/):
  o lume persistentă, cameră regizată și tranziții care păstrează continuitatea între
  experiență și proiecte.
- [Podium](https://tympanus.net/codrops/2026/06/23/podium-building-a-website-where-running-becomes-storytelling/):
  ritmul și eliminarea efectelor inutile sunt la fel de importante ca tehnologia.
- [INK Games](https://tympanus.net/codrops/2025/11/21/one-canvas-to-rule-them-all-how-ink-games-new-site-handles-complex-3d/):
  un singur canvas persistent reduce costul și păstrează coerența între scene.

### Sisteme de identitate

- [Chiba Tech](https://www.pentagram.com/work/chiba-tech): un simbol cultural
  modernizat devine logo, grilă, tipografie, mascotă și sistem reactiv.
- [Stereolabs](https://www.pentagram.com/work/stereolabs): simbolul central conectează
  hardware-ul, software-ul, diagramele și expresia 3D.
- [Sister](https://www.pentagram.com/work/sister): patrimoniul tehnologic local este
  transformat într-o linie și un sistem contemporan, nu copiat literal.

### Fundament cultural

[Satele cu biserici fortificate din Transilvania](https://whc.unesco.org/en/list/596)
oferă vocabularul arhitectural: incinte defensive, turnuri compacte, clădire centrală,
organizare comunitară și adaptarea formei la peisaj. Nu copiem un monument anume și nu
folosim patrimoniul ca decor exotic.

### Corecție arhitecturală după lookdev v1

Nu amestecăm liber toate fortificațiile într-un "castel transilvănean". Folosim trei
principii structurale documentate:

- **Prejmer:** biserica rămâne liberă în centrul unei incinte-inel puternice, iar
  încăperile repetate sunt integrate în zid. Acesta este modelul pentru nucleul comun
  și stațiile echipei, nu pentru ornament medieval.
- **Viscri:** curte la scară umană, tencuială albă, lemn vizibil, piatră simplă și
  acoperișuri fără monumentalitate de palat. Acesta este modelul de materialitate și
  lumină.
- **Biertan:** incinte succesive și traseu de la exterior spre nucleu. Acesta este
  modelul pentru progresia narativă și gate-uri.

[Evaluarea ICOMOS / UNESCO](https://whc.unesco.org/document/153840) descrie cele trei
tipuri regionale — biserică într-o incintă, biserică fortificată și biserică-fortăreață
— și echilibrul dintre funcția comunitară și cea defensivă. Nu copiem un monument și
nu reconstruim un interior sacru. Sintetizăm planul comunitar într-un atelier laic,
contemporan.

Consecințe pentru imagini și modele:

- clădire centrală simplă și zid locuit, nu castel cu multe turnulețe;
- acoperișuri compacte, goluri mici, galerii din lemn și tencuială minerală;
- centrul rămâne vizibil și orientativ din orice cadru important;
- simetria este imperfectă și rezultă din folosire, nu dintr-un palat axial;
- mecanismele apar numai la punctele de lucru și folosesc aceeași geometrie a mărcii;
- nicio iconografie religioasă nu este folosită drept recuzită de brand.

## Nucleul identității

### Simbol

Marca trebuie construită geometric din trei citiri simultane:

1. cap de urs redus la o siluetă puternică;
2. plan concentric de fortificație, cu poartă și incintă;
3. astrolab sau traseu de circuit care sugerează măsurare și construcție.

Nu generăm logo-ul final ca bitmap. Styleframe-urile pot explora ideea, dar marca va fi
desenată și testată vectorial la favicon, avatar, print, emboss și obiect 3D.

### Obiect persistent

Același simbol devine:

- sigiliu și indicator de încărcare;
- mecanism care deschide poarta;
- nucleu al mesei echipei;
- lentilă pentru intrarea în proiecte;
- astrolab al arhivei;
- cheie pentru poarta finală.

Transformarea lui este coloana vertebrală a mișcării.

## Lume vizuală

### Materiale

- calcar și tencuială minerală cu imperfecțiuni reale;
- lemn închis și fier forjat simplificat;
- alamă îmbătrânită doar pe mecanisme importante;
- sticlă fumurie pentru lentile și instrumente;
- hârtie, gravură și planuri tehnice în paginile editoriale;
- lumină digitală rece folosită rar, ca semnal funcțional.

### Paletă de pornire

| Rol | Culoare | Utilizare |
| --- | --- | --- |
| Mineral black | `#090B0C` | fundal și umbre |
| Limestone | `#D7D0C3` | text principal, piatră și suprafețe editoriale |
| Oxidized brass | `#A98546` | mecanism, premii, puncte de control |
| Signal cyan | `#69CED0` | date active și traseu narativ |
| Vermilion | `#E04B36` | alertă, selecție și momente decisive |
| Moss green | `#60735C` | natură, stări secundare și contrast organic |

Paleta este temporală. Exteriorul pornește nocturn, proiectele introduc culori proprii,
iar finalul trece în lumină naturală. Cyan-ul nu devine rețea neon decorativă.

### Tipografie

Direcția cere trei roluri, nu trei fonturi decorative:

- wordmark desenat special, cu structură compactă și tăieturi controlate;
- display editorial cu autoritate, fără clișeul medieval Cinzel/Trajan;
- sans sau mono foarte lizibil pentru navigație, coordonate, date și credite.

Fonturile finale se aleg numai după teste cu diacritice românești, text lung, mobil,
variable axes și licență web. Nu folosim font-size dependent direct de viewport.

## Limbaj de imagine

### Documentar

Fotografiile reale, capturile proiectelor și diplomele rămân dovezi. Nu sunt înlocuite
de imagini AI.

### Generativ

Image generation poate produce styleframe-uri, matte paintings, texturi, cer,
reliefuri, gravuri și elemente atmosferice care nu pretind că documentează realitatea.

### Realtime sau pre-randat

Nu există o alegere globală. Pentru fiecare cadru comparăm:

- realtime 3D;
- 2.5D cu depth și straturi;
- shader procedural;
- secvență video sau image sequence;
- DOM, SVG și canvas 2D;
- fotografie și motion graphics.

Alegem după controlul la scroll, fidelitate, greutate, compatibilitate mobilă și rol
narativ. Niciun instrument nu este obligatoriu dinainte.

## Evaluarea styleframe-ului exterior v1

Fișier: `styleframes/observatory-hero-v1.png`

### Funcționează

- scară cinematică și siluetă lizibilă;
- spațiu bun pentru titlu;
- mecanism central ușor de urmărit;
- adâncime suficientă pentru parallax și cameră;
- contrast util între lumină minerală, alamă și semnal.

### Nu funcționează încă

- arhitectura citește prea generic drept castel central-european;
- liniile cyan din peisaj sunt prea apropiate de un clișeu sci-fi;
- simbolul ursului nu este recognoscibil;
- lumea este prea întunecată pentru un sistem vizual complet;
- observatorul pare adăugat în curte, nu derivat din aceeași geometrie cu fortăreața;
- imaginea nu explică încă faptul că aceasta este o echipă de creatori.

### Următoarea iterație

- folosim planuri reale de biserici fortificate ca bază de masare;
- facem incinta și mecanismul să derive din aceeași geometrie de brand;
- înlocuim rețeaua luminoasă cu un singur semnal topografic clar;
- introducem o citire discretă de urs în traseul curții și în negative space;
- testăm o variantă la blue hour, cu mai multă informație în piatră și peisaj;
- testăm cadrul interior al echipei înainte să aprobăm exteriorul.

## Brief pentru styleframe-ul workshop v1

Scopul cadrului este să testeze dacă lumea poate reprezenta o echipă reală, nu doar un
peisaj spectaculos.

- cameră ridicată ușor, dinspre intrare, cu nucleul și toate cele șase stații lizibile;
- volum inspirat de o incintă locuită: tencuială albă, piatră, grinzi, goluri compacte;
- lumină de dimineață, suficientă informație în umbre și fără ceață de ascundere;
- masă-instrument centrală derivată din urs + fortificație + astrolab;
- șase instrumente abstracte pentru discipline, fără proiecte personale inventate;
- portretele, numele și ecranele reale vor fi DOM / media, deci nu sunt generate;
- fără oameni, text, logo fals, holograme, neon, setup gamer, steampunk sau laborator
  fantasy.

Cadrele de desktop și mobil trebuie să poată selecta fiecare stație fără ca alte props
să o acopere. Styleframe-ul este aprobat numai dacă nucleul și cele șase contribuții se
citesc înaintea decorului.

## Evaluarea construcției de marcă v1

Fișiere:

- `styleframes/identity-construction-v1.svg`
- `styleframes/identity-construction-v1.png`

### Funcționează

- ursul se citește înaintea explicației;
- inelul ocupat și deschiderea inferioară pot reprezenta incinta și poarta;
- pivotul central oferă un punct real pentru transformări;
- forma supraviețuiește în one-color și până la aproximativ 28 px;
- sistemul poate deriva stări pentru workshop și archive fără alt logo.

### Nu funcționează încă

- urechile circulare împing marca prea aproape de o mascotă prietenoasă;
- silueta mare poate semăna cu un ceas deșteptător dacă poarta nu este clară;
- starea de poartă nu păstrează suficient forma mărcii primare;
- lentila literală seamănă cu un ochi generic folosit frecvent în identități AI;
- starea de astrolab are prea multe ticks pentru dimensiuni mici;
- testul minim trebuie continuat la 16 px, nu oprit la 28 px.

### Direcția v2

- înlocuim urechile circulare cu bastioane unghiulare integrate în inel;
- facem poarta o tăietură structurală recognoscibilă și în animație;
- lentila devine diafragmă / aperture din aceleași segmente, fără contur de ochi;
- reducem astrolabul la două inele, șase repere și pivot;
- separăm primary mark de motion apparatus: marca rămâne simplă, aparatul poate avea
  detaliu numai la scară mare;
- testăm 16, 24, 32, 64, emboss, favicon și siluetă blurată înainte de wordmark.

## Evaluarea construcției de marcă v2

Fișiere:

- `styleframes/identity-construction-v2.svg`
- `styleframes/identity-construction-v2.png`

V2 rezolvă cele două probleme majore: bastioanele unghiulare elimină expresia de
mascotă, iar aperture-ul nu mai folosește simbolul generic de ochi. Poarta și
astrolabul derivă mai credibil din aceeași familie geometrică.

Rămâne direcția preferată pentru graybox, nu logo final. Înainte de wordmark trebuie:

- redus numărul de colțuri din obraji și urechi pentru o siluetă mai calmă;
- lărgită tăietura porții la 16 px;
- verificat dacă forma nu citește ca mască sau cap de robot fără context;
- aliniate stările `gate`, `workshop`, `aperture` și `archive` pe aceeași grilă exactă;
- construită varianta fără pivot roșu pentru reproducere strict monocromă;
- testată o animație reversibilă de 2-3 secunde înainte de modelare 3D.

## Evaluarea styleframe-ului workshop v1

Fișier: `styleframes/workshop-v1.png`

### Funcționează

- incinta locuită, galeria din lemn și turnul citesc mult mai aproape de referințele
  Prejmer / Viscri decât exteriorul v1;
- camera ridicată oferă un centru clar, profunzime și suficiente planuri pentru 2.5D;
- lumina dimineții și ieșirea spre peisaj fac lumea mai respirabilă;
- stațiile pot fi selectate vizual, iar cadrul lasă zone stabile pentru UI;
- nu există oameni, text, ecrane false sau iconografie religioasă.

### Nu funcționează

- sunt șapte stații în jurul nucleului, nu exact șase;
- masa centrală este un mecanism circular generic și prea apropiat de steampunk;
- props-urile sunt mici, numeroase și greu de asociat disciplinelor;
- stația backend seamănă cu o orgă mecanică, iar mai multe obiecte par instrumente de
  alchimie;
- alama și lemnul închis domină prea mult; calcarul, tencuiala și lumina naturală nu
  au încă suficientă greutate;
- geometria angulară din marca v2 nu se regăsește în nucleu;
- compoziția este credibilă ca decor, dar încă nu comunică imediat o echipă de
  creatori contemporani.

### Brief de corecție workshop v2

- exact șase nișe arhitecturale egale, fiecare cu o singură masă-instrument;
- nucleu hexagonal / fațetat derivat din marca v2, fără roți dințate vizibile;
- șase conexiuni structurale, nu șapte și nu rețea decorativă;
- fiecare instrument are o siluetă mare și unică: traseu, compute, vision, bridge,
  grid și simulation;
- mutăm raportul materialelor spre tencuială minerală și calcar deschis, cu alamă doar
  pe muchii și pivoturi;
- eliminăm obiectele mici de laborator, țevile, cadranele și mecanica victoriană;
- păstrăm camera și arhitectura, dar ridicăm lumina cu aproximativ un stop;
- introducem un accent moss green în exterior și un singur pivot vermilion;
- verificăm separat un crop vertical înainte de aprobare.

## Evaluarea tranziției Project Nexus v1

Fișiere:

- `styleframes/nexus-transition-desktop-v1.svg` și `.png`;
- `styleframes/nexus-transition-mobile-v1.svg` și `.png`;
- surse autentice în `research/nexus/source/`.

### Funcționează

- proiectul este subiectul cadrului, nu un ecran mic așezat peste lumea 3D;
- perechea segmentation / bounding-box este autentică și se citește imediat;
- planele suprapuse explică transformarea fără dashboard, terminal sau holograme;
- cele trei valori au ierarhie și unități, iar textul rămâne DOM-feasible;
- fundalul UE5 păstrează ideea de lume sintetică fără să concureze cu rezultatele;
- reinterpretarea verticală păstrează aceeași comparație printr-un wipe central;
- mobile nu încearcă să comprime planele 3D de desktop în trei fâșii ilizibile.

### Nu funcționează încă

- rama octogonală este prea plată și poate aparține oricărui produs tech;
- materialele workshopului lipsesc, deci intrarea pare momentan o schimbare de layout,
  nu transformarea aceluiași obiect;
- verdele și albastrul din rezultatele autentice intră în competiție cu signal cyan;
- wipe-ul vermilion de pe mobil poate fi citit drept slider de comparație dacă nu are
  o mișcare clară de aperture;
- titlul și statisticile sunt încă mai aproape de un portfolio editorial foarte bun
  decât de o lume cu adevărat proprie;
- cadrul static testează mijlocul tranziției, dar nu demonstrează încă reversibilitatea
  completă workshop -> Nexus -> Aegis.

### Brief de corecție Nexus v2

- rama devine volum mineral provenit direct din nucleul fațetat al workshopului;
- cele șase segmente ale aperture-ului rămân vizibile în mișcare, nu doar conturul;
- pivotul vermilion deplasează mecanic wipe-ul și revine în centrul mărcii la reverse;
- signal cyan este redus la un singur traseu și la metrici; nu colorează rama întreagă;
- media autentică își păstrează culorile, dar fundalul și UI-ul sunt coborâte ca
  saturație pentru a evita concurența;
- etapa `synthetic world` precede explicit perechea output, fără să sugereze că sunt
  același sample;
- ultimul contur bounding-box devine traseul planului Aegis, testat în același animatic;
- testăm aperture-ul la 1440 x 900, 390 x 844 și reduced motion înainte de 3D final.

## No-go vizual

- fantasy castle, steampunk, cyberpunk sau dark academia generic;
- sigiliu heraldic hiperornamentat;
- ochi roșii, gheare, blană și agresivitate esports;
- UI holografic fără funcție;
- ceață care ascunde subiectul;
- postprocesare grea, chromatic aberration permanentă și bloom excesiv;
- text integrat în imagini generate;
- premii prezentate ca trofee fără context și dovadă.

## Criteriu de aprobare

Direcția vizuală trece în storyboard final când trei cadre consistente demonstrează:

1. exteriorul și identitatea;
2. camera echipei și sistemul de obiecte personale;
3. o tranziție într-un proiect real;
4. aceeași lume pe desktop și o reinterpretare fezabilă pe mobil;
5. o diferență clară față de site-urile fantasy și tech generice.
