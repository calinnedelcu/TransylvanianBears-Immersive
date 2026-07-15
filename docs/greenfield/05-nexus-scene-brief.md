# Project Nexus: scene brief

Status: preproducție factuală. Scena este primul test în care lumea de brand trebuie
să se transforme într-un proiect real fără să devină un dashboard generic.

## Ideea într-o propoziție

O lentilă construită în workshop deschide o lume aeriană sintetică, o desface în
imagine, mască și adnotare, apoi dovedește transferul pe date reale.

Verbul capitolului este `Observe`. Dramaturgia este:

`world -> labels -> learning -> proof`.

## Adevărul editorial

### Autori confirmați

- Nedelcu Călin;
- Cheroiu Andrei;
- Buloi Cristian;
- Colan Vlad.

### Afirmații permise

- inteligență artificială antrenată în lumi virtuale;
- 11 scenarii sintetice;
- aproximativ 9.500 de imagini;
- peste 140.000 de adnotări automate;
- Unreal Engine 5 și AirSim pentru generarea datelor;
- YOLOv8 pentru bounding boxes și segmentare;
- validare inclusiv pe Stanford Drone Dataset.

### Afirmații blocate până la dovadă

- procent exact de acuratețe sau îmbunătățire;
- cost exact economisit;
- numele oficial complet al concursului;
- identitatea celei de-a cincea persoane din fotografia premiului;
- orice rol individual în afara listei de autori.

Estimarea de 1.366 de ore pentru etichetare manuală poate apărea numai cu explicația
ipotezelor din deck: 34,5 secunde per bounding box, 9.500 imagini și o medie de 15
obiecte pe imagine. Nu va fi prezentată drept timp măsurat în proiect.

## Materiale autentice

| Asset | Tip | Rol în scenă | Tratament permis |
| --- | --- | --- | --- |
| `research/nexus/source/ue5-industrial-aerial.png` | captură UE5 originală | intrarea în mediul sintetic | crop, color grade, depth map derivat |
| `research/nexus/source/synthetic-segmentation.png` | rezultat original | strat pixel-level | crop, mască animată, comparație |
| `research/nexus/source/synthetic-boxes.png` | rezultat original | strat bounding-box | crop, separarea cutiilor ca vectori |
| Drive video `1rBvNGFNbwKpaCQN66b_9PEKAT1BGEWVU` | MP4 original, ~135 MB | validare pe date reale | transcodare web și cadre poster |
| `public/assets/achievements/project-nexus-2026.webp` | fotografie de la eveniment | dovada rezultatului | crop editorial, caption factual |

Imaginile originale nu sunt regenerate cu AI. Orice mediu suplimentar creat cu AI
este decor declarat și nu poate semăna cu o captură de experiment sau cu o dovadă.

## Timeline desktop

Capitolul ocupă aproximativ 180-220vh și funcționează bidirecțional. Scroll-ul este
nativ; scena rămâne full-bleed și persistentă în spatele conținutului semantic.

### 0.00-0.12: preluarea instrumentului

- camera se apropie de stația `vision` din workshop;
- deschiderea hexagonală a nucleului se aliniază cu centrul viewportului;
- pivotul vermilion rămâne singurul accent de culoare;
- eticheta DOM: `01 / OBSERVE` și titlul `Project Nexus`;
- celelalte cinci stații se retrag prin parallax, nu dispar prin fade.

### 0.12-0.28: lumea sintetică

- aperture-ul se deschide și umple ecranul cu captura UE5;
- piatra din jur devine o ramă foarte subțire, apoi iese în afara viewportului;
- camera coboară ortogonal peste teren, păstrând orientarea imaginii reale;
- un counter discret parcurge `01 -> 11 scenarios`, fără carusel de unsprezece carduri;
- schimbările de vreme și oră sunt sugerate prin lumină și atmosferă, nu prin cadre
  inventate care par rezultate ale proiectului.

### 0.28-0.46: desfacerea datelor

- primul cadru UE5 demonstrează varietatea lumii, apoi face loc perechii autentice
  segmentation / bounding-box din același scenariu;
- cele două rezultate se separă în plane cu 8-20 px între ele;
- nu afirmăm că imaginea industrială și perechea din campus sunt același sample;
- versiunea finală poate folosi trei plane perfect aliniate `RGB / segmentation /
  labels` numai după ce obținem RGB-ul neadnotat al perechii;
- cutiile sunt reconstruite ca overlay vectorial numai după o extracție verificată;
- text DOM provizoriu: `A world becomes training data.`

### 0.46-0.62: scara

- planele se compactează într-o bandă de date care trece prin aperture;
- apar pe rând, nu simultan: `11`, `~9,500`, `>140,000`;
- unitățile sunt mereu prezente: `scenarios`, `images`, `automatic annotations`;
- numerele sunt DOM, accesibile și selectabile, nu text randat în WebGL;
- nu folosim grafice false, terminale decorative sau fluxuri de cod fără sursă.

### 0.62-0.78: învățarea

- banda de date se transformă într-o secțiune geometrică a modelului, nu într-un
  creier sau o rețea neuronală generică;
- pierderea se contractă ca distanță între două contururi, iar validarea rămâne un
  plan separat pentru a comunica 90/10;
- graficele reale apar numai după ce primim seriile numerice; până atunci această
  secvență rămâne abstractă și fără valori de performanță;
- bounding boxes și segmentation sunt două ieșiri paralele, nu două proiecte.

### 0.78-0.92: transferul în real

- textura sintetică alunecă pe aceeași geometrie și dezvăluie clipul Stanford Drone;
- nu folosim dissolve complet: punctele de detecție păstrează continuitatea spațială;
- clipul rulează numai când scena este activă și respectă direcția scrollului prin
  frame stepping sau o secvență predecodată;
- caption DOM: `Trained in simulation. Tested on real aerial data.`

### 0.92-1.00: dovada și ieșirea

- scena încetinește și lasă rezultatul real lizibil fără overlay greu;
- fotografia premiului intră ca plan fizic prins de marginea workshopului, nu ca
  trofeu 3D inventat;
- apar autorii confirmați și linkul către prezentare;
- numele oficial al concursului rămâne ascuns până la confirmare;
- liniile de detecție se prelungesc în podeaua capitolului Aegis, realizând tranziția
  `aerial boxes -> protected floor plan`.

## Compoziția ecranului

### Desktop landscape

- focusul media ocupă 65-78% din suprafață;
- textul stă într-o coloană de maximum 32rem și se mută între colțurile opuse
  punctului de interes;
- zona de sus rămâne liberă pentru navigația globală;
- niciun panel nu încadrează experiența ca pe un video într-un card.

### Mobile portrait

- capitol de aproximativ 120-150dvh, nu o copie comprimată a desktopului;
- media rămâne full-bleed într-un crop vertical controlat;
- comparația RGB / segmentation / labels devine o singură fereastră cu scrub în trei
  stări, nu trei plane înguste;
- valorile apar pe rând în partea de jos și nu acoperă detecțiile;
- clipul real folosește poster + secvență scurtă optimizată, fără autoplay costisitor.

### Reduced motion și Tier C

- cinci cadre statice: synthetic world, segmentation, boxes, scale, real proof;
- tranziții crossfade de maximum 200 ms numai dacă utilizatorul nu cere eliminarea
  completă a animației;
- toate afirmațiile și linkurile rămân disponibile în document flow;
- fotografia și prezentarea pot fi deschise fără WebGL sau JavaScript.

## Implementare propusă

- Three.js/R3F doar pentru aperture, camera, plane și continuitatea cu workshopul;
- imagini autentice ca texturi comprimate KTX2 sau AVIF/WebP după test de calitate;
- DOM pentru titlu, autori, metrici, surse și CTA;
- GSAP ScrollTrigger pentru timeline reversibil;
- video controlat prin `requestVideoFrameCallback` unde este disponibil;
- fallback poster și secvență de cadre pentru dispozitivele care nu pot scruba fluid;
- resursele capitolului se preîncarcă în workshop și se eliberează după Aegis.

## Cerințe de producție

1. Obținem MP4-ul original și îl transcoding în 1080p/720p AV1 sau VP9 plus H.264.
2. Extragem 2-3 secvențe de maximum 4 secunde din intervalul relevant, nu încărcăm
   toate cele 135 MB.
3. Verificăm sursa Stanford și condițiile de atribuire înainte de publicare.
4. Cerem seriile sau exporturile originale pentru graficele de training.
5. Cerem RGB-ul neadnotat care corespunde perechii segmentation / bounding-box.
6. Cerem formularea oficială a premiului și rolul persoanei suplimentare din fotografie.
7. Construim un frame-by-frame animatic înainte de WebGL final.

## Criterii de aprobare

- un privitor înțelege în 8-12 secunde că datele sintetice antrenează un model testat
  apoi pe imagini reale;
- cele trei valori sunt corecte și au unități;
- nicio imagine AI nu poate fi confundată cu output de proiect;
- revenirea cu scroll reconstruiește workshopul fără jump sau fade-to-black;
- mobile păstrează aceeași idee, nu doar un poster;
- pagina rămâne completă și navigabilă cu reduced motion, Tier C și fără WebGL;
- cadrul real și autorii sunt mai importanți decât efectul vizual.
