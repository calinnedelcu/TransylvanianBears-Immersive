# Matrice de producție vizuală și tehnică

Status: decizie provizorie pentru vertical slice; nicio bibliotecă nouă nu este
obligatorie până nu trece prototipul măsurat

## Întrebarea corectă

Nu alegem între „site 3D” și „site normal”. Pentru fiecare beat alegem mediul care
oferă simultan:

1. control reversibil și precis la scroll;
2. fidelitatea necesară poveștii;
3. lizibilitatea dovezii reale;
4. cost acceptabil de download, CPU, GPU și memorie;
5. un fallback mobil și reduced-motion echivalent;
6. un pipeline pe care îl putem reproduce și corecta.

## Research tehnic

- [React Three Fiber: Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
  documentează render-on-demand, asset-uri low/high quality și adaptarea DPR și a
  efectelor la performanța dispozitivului.
- [Three.js: disposal](https://threejs.org/manual/en/how-to-dispose-of-objects.html)
  arată că geometria, materialele și texturile nu sunt eliberate automat. Scenele
  noastre au ownership și teardown explicit.
- [Khronos KTX 2.0](https://www.khronos.org/ktx/) și
  [glTF Transform](https://gltf-transform.dev/) oferă baza pentru texturi comprimate
  pe GPU, Meshopt / Draco și optimizarea asset-urilor glTF.
- [Blender glTF 2.0](https://docs.blender.org/manual/en/3.3/addons/import_export/scene_gltf2.html)
  suportă mesh, PBR, camere, transform animations și shape keys, dar nu exportă direct
  animația materialelor, luminilor sau fizicii. Aceste limite intră în design.
- [Theatre.js cu React Three Fiber](https://www.theatrejs.com/docs/latest/getting-started/with-react-three-fiber)
  oferă authoring vizual pentru proprietăți și keyframes. Îl evaluăm ca instrument de
  lookdev și export, nu îl impunem ca runtime.
- [HTMLVideoElement.requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)
  sincronizează lucrul cu frame-urile compuse, dar nu garantează seeking arbitrar
  instantaneu. Video este bun pentru playback și bucle, nu automat pentru scrub dur.
- [WebCodecs](https://www.w3.org/TR/webcodecs/) oferă control low-level asupra
  decodării, cu prețul unui demuxer, al managementului de frame-uri și al unei căi de
  fallback. Îl folosim numai dacă profilarea dovedește nevoia.
- [Rive state machines](https://rive.app/docs/runtimes/state-machines) pot opri calculul
  când starea s-a stabilizat. Sunt potrivite pentru motion vectorial izolat, nu pentru
  întreaga lume.
- [Lenis](https://github.com/darkroomengineering/lenis) rulează peste scroll nativ și
  se poate sincroniza cu ScrollTrigger, dar are limitări Safari, low-power și touch.
  Se activează doar după test A/B față de scroll nativ.
- [Core Web Vitals](https://web.dev/articles/vitals) fixează ținte de produs, nu doar
  de SEO: LCP sub 2,5 s, INP sub 200 ms și CLS sub 0,1 la percentila 75, separat pe
  desktop și mobil.

## Opțiuni comparate

| Mediu | Punct forte | Limită critică | Decizie |
| --- | --- | --- | --- |
| DOM + CSS | semantică, accesibilitate, text perfect | profunzime și particule limitate | toate textele, controalele și studiile de caz |
| SVG | marcă, diagrame, linii precise, scalează perfect | multe noduri animate pot costa | identitate, planuri, grafice și fallback |
| Canvas 2D | mii de puncte și desen data-driven ieftin | accesibilitatea trebuie dublată în DOM | vizualizări de date unde SVG devine greu |
| Rive | motion vectorial compact și stateful | runtime suplimentar, slab pentru lumea 3D | numai dacă marca cere state machine complexă |
| Realtime 3D | cameră, lumină și transformări reversibile | GPU, memorie, producție și QA | scheletul lumii, nu fiecare bucată de conținut |
| 2.5D / projection | fidelitate mare cu geometrie redusă | unghi mic al camerei și occlusion limitat | exterior, matte-uri și versiunea mobilă |
| Shader procedural | tranziții continue și semnal data-driven | debugging și cost GPU | un singur vocabular funcțional, fără efecte gratuite |
| Video pre-randat | realism și motion complex comprimat | reverse / seek imprecis și conținut fix | ambient, gameplay și tranziții fără scrub critic |
| Image sequence | frame determinist la orice progres | multe request-uri, memorie și transfer | maximum o secvență scurtă dacă video nu trece testul |
| AI image | styleframe, matte, relief, textură rapidă | geometrie și continuitate imperfecte | preproducție și fundal nondocumentar controlat |
| AI video | explorare cinematică și motion plate | artefacte temporale, reversibilitate slabă | concept și cel mult bucle ambientale aprobate |
| Blender offline | formă, UV, bake, LOD, animație deterministă | timp de producție și export disciplinat | numai pentru geometria care justifică realtime 3D |

## Arhitectura provizorie

Vertical slice-ul testează următoarea combinație:

- React + TypeScript pentru structură și conținut semantic;
- un singur canvas Three.js prin React Three Fiber pentru lumea persistentă;
- GSAP / ScrollTrigger ca master timeline între scroll, DOM și proprietățile scenei;
- SVG și Canvas 2D pentru marcă, hărți și date;
- glTF / GLB pentru geometrie, cu Meshopt sau Draco și KTX2 după profilare;
- postere AVIF / WebP și video MP4 + WebM pentru fallback și media reală;
- JSON tipizat pentru capitole, trigger-e, credite, dovezi și asset manifests;
- Lenis numai pe desktop, numai dacă testele arată un câștig și motion/reduced-motion,
  anchor navigation și touch rămân corecte.

Nu pornim cu WebGPU ca cerință. WebGL 2 este baseline-ul pentru vertical slice;
WebGPU poate deveni progressive enhancement după ce compatibilitatea și shader-ele
sunt stabile. Nu construim două renderere înainte să avem o problemă măsurată.

## Master timeline și ownership

Există o singură valoare normalizată de progres global și progres local per capitol.
Aceasta conduce:

- camera și transformările 3D;
- stările shaderelor;
- vizibilitatea și ordinea UI;
- frame-ul media când secvența este scrubbable;
- prefetch / activate / dispose;
- audio reactiv, numai după opt-in.

Scenele nu citesc direct `window.scrollY`. Primesc progres și context. Fiecare scenă
declară:

- `prepare()` — metadata, poster și asset-uri minime;
- `activate()` — resurse GPU și listeners;
- `update(progress, velocity)` — stare pură sau predictibilă;
- `deactivate()` — oprește loops și audio;
- `dispose()` — eliberează geometrie, materiale, texturi și bitmap-uri;
- `fallback` — poster, copy și variantă reduced-motion.

## Matrice pe scene

### 00. First light

**Alegere desktop:** exterior 2.5D într-un canvas comun: matte painting separat în 5-8
planuri, depth map controlat și geometrie simplă pentru curte / marcă. Cerul și lumina
sunt realtime; arhitectura nu trebuie modelată integral pentru un push-in scurt.

**De ce:** obținem fidelitate cinematică la first paint și păstrăm suficientă
profunzime pentru tranziția spre poartă fără milioane de poligoane.

**Pipeline:** GPT Image pentru explorare și matte de bază; paintover / mască / depth
corectate manual; Three.js pentru camere și lumină; poster static exportat din același
cadru.

**Mobil:** compoziție verticală 2.5D cu maximum trei planuri și fără cameră laterală.

**Fallback:** poster responsive și undă SVG.

### 01. The signal

**Alegere desktop:** spline sau topografie simplificată în realtime, cu shader de
reveal și un overlay SVG pentru detaliile care trebuie să rămână foarte clare.

**De ce:** semnalul trebuie să răspundă reversibil la scroll și să se oprească exact;
video-ul ar introduce seeking inutil.

**Mobil:** aceeași curbă ca SVG animat pe stroke, fără mesh volumetric.

**Fallback:** două stări SVG, înainte / după.

### 02. Gate și marca

**Alegere desktop:** geometrie vectorială extrudată și inele 3D cu puține piese,
modelate procedural sau în Blender. Transformarea se bazează pe poziții și rotații,
nu pe simulare.

**De ce:** este obiectul persistent și trebuie să poată deveni poartă, masă, lentilă
și astrolab fără tăieturi.

**Pipeline:** logo vectorial aprobat -> forme parametrice -> GLB sau geometrie Three;
camera poate fi keyframed în Theatre.js și exportată ca JSON, apoi condusă de GSAP.

**Mobil:** animație SVG / CSS în două-trei stări, cu aceeași siluetă.

### 03. Workshop

**Alegere desktop:** cameră și masă realtime 3D; șase props cu geometrie modestă;
portretele, numele și rolurile rămân DOM / imagini reale. Props-urile sunt instanțiate
unde materialele se repetă.

**De ce:** selecția stațiilor și transformarea nucleului cer parallax și occlusion
reală, dar persoanele și creditele cer lizibilitate semantică.

**Pipeline:** graybox procedural mai întâi. Blender se justifică numai după aprobarea
silhouette-ului și a camerei. Nu modelăm detalii invizibile din traseu.

**Mobil:** un poster vertical al camerei plus șase close-up-uri succesive; nu
randăm întreaga cameră în timp real dacă profilarea nu trece.

### 04. Project Nexus

**Alegere desktop:** lentila și tranziția rămân 3D; mediul Unreal, imaginile datasetului
și rezultatele modelului sunt media reale pe plane; box-urile și explicațiile sunt SVG
/ DOM. Un clip scurt poate rula normal sau poate fi scrubbable doar după test de seek.

**De ce:** o reconstrucție fictivă ar arăta spectaculos, dar ar slăbi dovada. Scena
trebuie să prezinte proiectul, nu să îl înlocuiască.

**Mobil:** capturi reale compuse vertical, lentilă SVG și un clip playsinline pornit
explicit.

### 05. Aegis / SchoolMate

**Alegere desktop:** plan SVG data-driven, UI real în DOM / imagini, cu o cantitate
mică de geometrie 3D care leagă planul de lumea observatorului.

**De ce:** fluxul și interfața sunt informația. Full 3D ar reduce lizibilitatea și ar
face produsul să pară un concept, nu un build.

**Mobil:** plan vertical simplificat și ecrane reale la lățime completă.

### 06. The Buried Hands

**Alegere desktop:** gameplay real într-un plane mare; câteva fragmente de environment
realtime numai dacă provin din asset-urile proiectului și se pot exporta. Pentru un
moment exact de gameplay comparăm video cu o image sequence de maximum 60-90 cadre.

**De ce:** gameplay-ul este dovada. O secvență pre-randată este acceptată numai dacă
fiecare cadru provine din build și costul total trece bugetul.

**Mobil:** poster / gameplay vertical-safe, video playsinline; fără secvență completă
dacă depășește bugetul.

### Interludiu Infect.exe

**Alegere:** Canvas 2D sau shader nearest-neighbor care reduce cadrul la 1-bit și îl
recompune în puncte. Asset-urile jocului rămân autentice. Durata maximă este scurtă și
se poate elimina fără a rupe povestea.

**De ce:** limbajul 1-bit justifică o transformare tehnică ieftină și recognoscibilă;
nu justifică încă un capitol 3D greu.

### 07. Research chamber

**Alegere desktop:** SVG pentru axe și adnotări, Canvas 2D sau InstancedMesh pentru
cele 2.449 de evenimente. Alegerea se face după benchmark cu datasetul real.

**De ce:** vizualizarea trebuie să fie exactă și inspectabilă. Un astrolab 3D poate
încadra datele, dar nu le deformează și nu înlocuiește scara / legenda.

**Mobil:** agregări și small multiples, nu 2.449 de puncte minuscule. Datele complete
rămân în studiul de caz.

### 08. Archive

**Alegere desktop:** inelele de continuitate în 3D sau shader simplu; fișele, filtrele
și lista sunt DOM. Maximum evenimentele selectate sunt prezente în homepage.

**De ce:** lumea oferă relația spațială, DOM-ul oferă dovezile, focusul și linkurile.

**Mobil:** un singur inel sincronizat cu o listă cronologică; fără constellation drag.

### 09-10. Open paths și dawn

**Alegere:** reutilizăm exteriorul și marca încărcate deja, schimbând camera, lumina și
starea traseelor. Nicio scenă nouă grea.

**De ce:** rezoluția trebuie să demonstreze că sistemul a rămas coerent și să reducă
payload-ul la final.

## Rolul instrumentelor generative

### GPT Image

Util pentru:

- explorări de compoziție și lumină;
- matte paintings fără pretenție documentară;
- cer, relief, piatră, hârtie, gravuri și variații mobile;
- paintover și iterații pornind de la styleframe-ul aprobat.

Nu este utilizat pentru:

- logo final;
- portrete ale membrilor;
- capturi de produs, gameplay, rezultate AI, grafice sau diplome;
- text integrat în imagine;
- arhitectură finală care trebuie să se alinieze exact între cadre fără corecție.

### Higgsfield / Seedance

Ambele sunt potrivite pentru explorarea mișcării cinematice dintr-un first frame;
Higgsfield pune accent pe preseturi și control de cameră, iar Seedance pe generare
multi-shot din text și imagine. Nu sunt pipeline-ul critic pentru Guided Journey.

Le folosim numai pentru:

- previsualizare de cameră;
- atmosferă fără subiect documentar;
- o buclă scurtă, nondiegetică, dacă trece review-ul cadru-cu-cadru și licența.

Nu bazăm pe ele o tranziție care trebuie să fie perfect reversibilă, o dovadă de
proiect sau continuitatea logo-ului. Nu promptăm stiluri, personaje sau proprietăți
intelectuale identificabile ale altora.

## Trei niveluri de experiență

Nu detectăm „telefon = slab”. Pornim conservator și adaptăm după capabilități și
performanță observată.

### Tier A — cinematic

- ecran suficient, pointer precis și fără reduced motion;
- canvas realtime, 2.5D complet, lumină și shader funcțional;
- DPR adaptiv între 1 și 1,5 în timpul mișcării;
- țintă 60 fps pe dispozitivul desktop de referință.

### Tier B — composed

- touch, ecran îngust, low-power sau performanță sub prag;
- postere verticale, 2.5D redus, SVG / Canvas și mai puține efecte;
- DPR 1; țintă stabilă de minimum 30 fps, preferabil 60;
- aceeași poveste și aceleași dovezi.

### Tier C — editorial

- reduced motion, lipsă WebGL, eroare de context sau preferință manuală;
- flow normal, postere statice, DOM și SVG;
- fără loader și fără canvas necesar;
- toate rutele și acțiunile rămân disponibile.

Scăderea de tier se poate produce în timpul sesiunii. Revenirea la un tier superior se
face numai la următorul capitol, pentru a evita schimbări vizibile de calitate.

## Bugete provizorii

Aceste praguri sunt gate-uri de vertical slice, nu estimări optimiste.

### Critical path

- LCP <= 2,5 s pe profil mobil mid-range / 4G simulat;
- INP <= 200 ms și CLS <= 0,1;
- HTML + CSS + fonturi critice + poster LCP <= 550 KB comprimat;
- codul 3D nu blochează afișarea numelui, descriptorului și navigației;
- first viewport este complet inteligibil cu JavaScript oprit.

### Runtime desktop

- payload pentru prima scenă animată <= 2,5 MB comprimat după first paint;
- capitol următor <= 2 MB, încărcat progresiv;
- total Guided Journey consumat <= 14 MB fără media pornită explicit;
- maximum 128 MB memorie estimată pentru texturi active;
- maximum 100 draw calls și 500k triunghiuri în scena activă;
- p95 frame time <= 25 ms în timpul scrub-ului pe dispozitivul de referință;
- zero render loop când scena, scroll-ul și ambientul sunt complet staționare.

### Runtime mobil

- payload animat inițial <= 1 MB după poster;
- total Guided Journey <= 6 MB fără video la cerere;
- maximum 64 MB texturi active, 60 draw calls și 150k triunghiuri;
- niciun long task > 100 ms provocat de inițializarea scenei;
- Tier B este default; Tier A se acordă numai după măsurare.

Numerele pentru GPU sunt proxy-uri și se validează pe iPhone Safari, Android Chrome,
Mac Safari și Windows Chrome, nu numai în Lighthouse.

## Pipeline de asset-uri

1. graybox și cameră înainte de modelare finală;
2. denumiri și pivoturi stabile pentru obiectele animate;
3. high-poly numai unde contribuie la bake;
4. low-poly, UV și atlas pe grupuri reutilizabile;
5. PBR simplu: base color, roughness / metallic, normal, AO și emissive rar;
6. export GLB separat pe capitol sau pachet de ownership;
7. optimize cu glTF Transform; comparăm Meshopt și Draco, nu le aplicăm simultan fără
   măsurare;
8. KTX2 cu mipmaps și niveluri potrivite tipului de textură;
9. validare vizuală desktop / mobil și capturi de diferență;
10. manifest cu dimensiune comprimată, memorie estimată, autor, licență și scene.

## Decizii amânate până la vertical slice

- Three.js direct versus React Three Fiber;
- Theatre.js runtime versus export de keyframes în JSON;
- Lenis versus scroll nativ cu scrub interpolat;
- Canvas 2D versus instancing WebGL pentru research;
- video cu seeking versus image sequence pentru un singur beat de gameplay;
- WebGLRenderer versus un experiment separat WebGPURenderer;
- Rive versus SVG + GSAP pentru transformarea mărcii.

## Vertical slice propus

Slice-ul nu încearcă să demonstreze tot site-ul. Include:

1. first paint static și hidratare progresivă;
2. First light -> Signal -> Gate;
3. intrarea în Workshop și activarea a două din șase stații;
4. transformarea nucleului în lentila Nexus;
5. un panel cu media reală și date semantice;
6. Fast Access, Tier C și o compoziție mobilă proprie;
7. load / dispose între exterior, workshop și Nexus;
8. instrumentare pentru frame time, memorie, payload și Core Web Vitals.

### Gate de aprobare

Producția tuturor scenelor începe numai dacă slice-ul:

- arată ca o singură lume, nu trei demo-uri lipite;
- este reversibil la scroll și stabil la scroll rapid;
- trece bugetele de mai sus sau justifică numeric orice excepție;
- păstrează conținutul complet fără canvas;
- demonstrează aceeași identitate în cadru wide și vertical;
- poate fi regizat și corectat fără refacerea pipeline-ului;
- face Project Nexus mai credibil, nu doar mai spectaculos.
