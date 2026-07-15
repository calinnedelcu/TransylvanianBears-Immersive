# Interaction thesis 02: Directed agency

Status: contract local validat; structura globală a prototipului este înlocuită.

> **Amendament după testul uman din 15 iulie 2026:** bucla validată aici devine o
> mecanică locală pentru momentele de investigație, nu structura întregului site.
> `Hub -> misiune -> hub` și cele patru aripi din graybox nu vor fi reproduse în
> produsul final. Traseul global și raportul dintre experiență și website sunt
> înlocuite de [`09-hybrid-world-architecture.md`](./09-hybrid-world-architecture.md).

Acest pas răspunde la două întrebări și numai la ele:

1. Ce repetă jucătorul suficient de des încât acel gest să fie jocul?
2. Cum controlează lumea fără ca browserul, mobilul sau camera să devină obstacole?

## Concluzia

Modelul local ales este **directed traversal + local free-look + one-button Lens**.

Vizitatorul alege ce investighează în nodurile interactive. Camera parcurge trasee
scurte, regizate, între stări. La fiecare destinație, vizitatorul poate privi liber,
poate activa Lens-ul, poate selecta o ipoteză și poate vedea consecința. Alegerea
globală a conținutului aparține traseului continuu și Indexului web, nu unui hub cu
aripi.

Formula buclei este:

> **Orient -> Choose -> Traverse -> Reveal -> Decide -> Verify -> Return changed**

## Alternative comparate

| Model | Agency | Cadru regizat | Mobil | Accesibilitate | Risc principal | Decizie |
| --- | --- | --- | --- | --- | --- | --- |
| FPS liber, WASD + mouse lock | foarte mare | redus | slab | slab | input friction, rătăcire, motion sickness | respins ca default |
| Third-person cu avatar | mare | mediu | mediu | mediu | avatar și cameră scumpe, mascota concurează cu echipa | respins |
| Hotspot / node navigation pur | redusă | foarte mare | foarte bun | bun | devine muzeu cu modale | respins ca sistem complet |
| Film controlat prin scroll | redusă | foarte mare | bun | mediu | timeline pasiv, nu joc | folosit doar cinematic |
| Directed traversal hibrid | mare acolo unde contează | foarte mare | foarte bun | bun | cere coregrafie și state machine riguroase | ales |

### De ce nu FPS liber

[Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)
este potrivit pentru first-person games, dar nu este Baseline, ascunde cursorul,
necesită un engagement gesture și are o stare explicită de lock/unlock. Pentru o
experiență accesată dintr-un link, nu trebuie să fie condiția de intrare.

Mișcarea liberă mai creează un cost editorial: dacă a merge este activitatea dominantă,
jucătorul învață să traverseze spațiul, nu să înțeleagă proiectele. Oferim libertate
locală unde explorarea adaugă sens și regizăm distanțele fără conținut.

### De ce nu third-person

Third-person rezolvă orientarea, dar introduce un personaj care trebuie să merite
centrul imaginii, animație de locomotion, collision și o cameră care nu poate fi lăsată
la întâmplare. Cercetarea clasică despre real-time cameras recomandă ca jucătorul să
nu fie obligat să repare camera ca să poată juca și subliniază costul occlusion-ului,
reorientării și control reference frames
([GDC, Fundamentals of Real-Time Camera Design](https://media.gdcvault.com/gdc05/slides/GD_Haigh-Hutchinson_FundamentalsReal-TimeCameraDesign2.pdf)).

Pentru Transylvanian Bears, un avatar vizibil ar deveni inevitabil mascotă, protagonist
sau substitut pentru echipă. Nu avem nevoie de el ca să obținem agency.

### De ce nu hotspot navigation pur

Hotspot-urile sunt bune pentru selectarea unei destinații, dar insuficiente pentru
investigație. Dacă toate acțiunile sunt `click -> modal`, lumea devine fundal pentru
un meniu. Le folosim numai ca affordance spațial, apoi interacțiunea are stare,
feedback și consecință în 3D.

## Bucla pe trei scări

### Moment-to-moment: 5-20 secunde

1. Jucătorul observă o anomalie sau o relație.
2. Comută un strat al Lens-ului.
3. Compară cel puțin două interpretări.
4. Selectează una.
5. Lumea răspunde imediat și vizibil.

O alegere este validă numai dacă jucătorul poate anticipa două rezultate diferite și
poate vedea ce a schimbat. Altfel este un buton Next deghizat.

### Mission loop: 45-90 secunde în prototip

1. **Orient:** nucleul arată ce sistem cere atenție.
2. **Choose:** jucătorul selectează misiunea din spațiu sau din hartă.
3. **Traverse:** o deplasare scurtă prezintă geografia și obiectivul.
4. **Reveal:** Lens-ul descoperă stratul relevant.
5. **Decide:** jucătorul verifică o țintă, rută sau ipoteză.
6. **Verify:** sistemul explică rezultatul prin transformare, nu prin toast generic.
7. **Receive proof:** Field Journal primește artefactul factual.
8. **Return changed:** hub-ul păstrează noua stare.

### Experience loop: 8-15 minute

Hub -> misiune -> dovadă -> hub schimbat se repetă de patru ori. Fiecare repetare
adaugă o capacitate Lens-ului, un strat în atelier și o parte din contribution graph.
Finalul apare numai când relațiile sunt vizibile, nu când un progress bar ajunge la
100%.

Research-ul despre core loops recomandă prototiparea activităților repetate înaintea
restului producției; dacă bucla nu funcționează minute-to-minute, povestea și grafica
nu o pot salva
([Game Developer](https://www.gamedeveloper.com/design/how-supporting-core-loops-and-early-prototyping-are-key-to-your-game-s-success)).

## Contractul camerei

### Hub

- Perspectivă first-person fără corp sau mâini false.
- Jucătorul privește liber într-un yaw limitat, suficient pentru a compara aripile.
- Destinațiile sunt landmarks fizice distincte, vizibile din nucleu.
- Selectarea unei aripi nu teleportează instant; o traiectorie de 2-4 secunde arată
  relația spațială și se poate sări.
- Întoarcerea folosește aceeași axă, dar compoziția scoate în față schimbarea produsă.

### Misiune

- Camera se oprește în anchor points compuse pentru acțiunea curentă.
- Free-look-ul nu poate ascunde informația critică în afara unui unghi imposibil de
  recuperat.
- Lens-ul poate recentra subtil focal point-ul, dar nu smulge controlul camerei.
- Nu folosim head bob, camera shake, roll sau motion blur ca feedback obligatoriu.
- Orice camera transition poate fi sărită și are stare finală deterministă.

### Reduced motion

- Traiectoriile devin cut/crossfade între anchor points.
- Ambient motion se oprește.
- Lens-ul schimbă starea prin contrast/material, nu prin distorsiune amplă.
- Toate deciziile și dovezile rămân identice.

Xbox Accessibility Guideline 117 recomandă control asupra FOV, sensibilității și
mișcării camerei, precum și posibilitatea de a opri mișcarea persistentă
([Microsoft](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117)).

## Contractul de input

Nu proiectăm separat mouse, tastatură, gamepad și touch. Definim acțiuni semantice,
apoi le mapăm:

| Acțiune | Mouse | Tastatură | Gamepad | Touch |
| --- | --- | --- | --- | --- |
| Look | drag | săgeți | right stick | drag |
| Select / interact | click / release | Enter sau Space | south button | tap / release |
| Lens | buton UI / secondary | Q | west button | buton Lens |
| Journal / map | buton UI | J | menu/view | buton Journal |
| Back / pause | Esc / UI | Esc | east button | back UI |
| Recenter | buton UI | R | right-stick press opțional | double tap nu este cerut |

Reguli obligatorii:

- nicio acțiune critică nu cere două input-uri simultane;
- nicio acțiune critică nu cere hold, rapid tapping, swipe precis sau gesture cu două
  degete;
- activarea se produce la pointer/touch release, astfel încât gestul poate fi anulat;
- analog look are și alternativă digitală;
- sensibilitatea poate fi redusă sau mărită;
- toate meniurile sunt operabile cu tastatura;
- schimbarea dispozitivului actualizează prompturile fără a reseta starea;
- gamepad este progressive enhancement, nu condiție de acces.

Aceste reguli urmează recomandările Xbox pentru input alternativ, single-stick,
keyboard-only și touch simplificat
([XAG 107](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107)).

## Wayfinding fără quest arrow permanent

Ordinea semnalelor este:

1. **Landmark:** fiecare aripă are siluetă și funcție distinctă.
2. **Composition:** arhitectura și lumina conduc privirea.
3. **Motion:** numai sistemul activ se mișcă discret.
4. **Lens trace:** când jucătorul cere ajutor, Lens-ul arată relația dintre nucleu și
   destinație.
5. **Journal map:** harta 2D simplificată este fallback explicit.

Nu folosim compass strip sau marker care traversează pereții permanent. Navigational
research recomandă landmarks, contrast, compoziție, motion și linii integrate în lume,
iar harta trebuie simplificată suficient pentru a fi înțeleasă rapid
([No More Wrong Turns](https://www.gamedeveloper.com/design/no-more-wrong-turns)).

## Recovery contract

Jucătorul nu poate pierde progresul pentru că a privit în direcția greșită sau a ales
o ipoteză incorectă.

- Lens hint apare la cerere, nu automat.
- Recenter readuce camera la focal point.
- Back revine la ultimul anchor stabil.
- Retry reface numai decizia, nu traversarea.
- Skip mission deschide aceeași dovadă factuală și marchează misiunea `viewed`, nu
  `verified by player`.
- Journal oferă resume și fast travel către orice spațiu deja vizitat.
- Progress-ul sesiunii se salvează local și poate fi resetat explicit.

## Vertical slice pentru acest pas

Prototipul conține exact o buclă completă și nimic mai mult:

1. un hub graybox cu patru aripi, dintre care una activă;
2. alegerea Project Nexus;
3. o traiectorie regizată spre camera Observe;
4. free-look local;
5. Lens cu trei straturi: raw, segmentation, detection;
6. o singură decizie de verificare între minimum două ținte;
7. feedback fără fail state;
8. un artefact factual în Field Journal;
9. întoarcere în hub, unde aripa Observe și nucleul rămân schimbate;
10. reset, skip, keyboard, touch și reduced motion.

Modelele, materialele, lumina, logo-ul, sunetul și copywriting-ul sunt deliberat
graybox. Prototipul testează ritmul și controlul, nu aspectul final.

## Criterii de acceptare

Pasul 2 este închis numai dacă:

1. o persoană poate completa bucla fără instrucțiuni text lungi;
2. nicio porțiune de mers pasiv nu depășește patru secunde;
3. alegerea din misiune modifică vizibil sistemul;
4. revenirea în hub arată schimbarea în mai puțin de două secunde;
5. aceeași buclă funcționează cu mouse, tastatură și touch;
6. reduced motion nu elimină nicio decizie;
7. Esc/Back/Journal pot recupera orice stare;
8. factual, utilizatorul poate deschide dovada Nexus în maximum două acțiuni;
9. canvas-ul rămâne full-screen, fără document scroll;
10. testatorul descrie experiența ca `joc` sau `explorare`, nu ca `site cu animații`.

## Vertical slice implementat

Data verificării: **15 iulie 2026**.

Ruta izolată este `/next/lab/control-loop`. Pagina `/next` și prototipul editorial
existent nu au fost înlocuite. Modulul Three/R3F este încărcat lazy numai când se
intră în laborator.

Bucla implementată este:

`entry -> hub -> Nexus -> Lens -> decizie -> dovadă -> hub transformat`

Rezultatele verificării tehnice:

| Contract | Rezultat observat |
| --- | --- |
| Traiectorie regizată | 3,15 s în modul normal; 275 ms până la starea stabilă în reduced motion |
| Lens | Raw, Segmentation și Detection produc trei stări 3D distincte |
| Decizie greșită | feedback și retry local, fără restart sau fail screen |
| Decizie corectă | ținta Human se recentrează și se aprinde înaintea dovezii |
| Dovadă | 11 scenarii, ~9.500 imagini și >140.000 adnotări, cu link la sursă |
| Consecință | nucleul și aripa Observe rămân schimbate după întoarcere și reload |
| Recovery | Recenter, Esc/Back, Journal, Skip și Reset verificate |
| Tastatură | Q schimbă Lens-ul, J deschide Journal, Esc recuperează starea |
| Mouse/touch | drag-look funcțional; Recenter întoarce exact cadrul inițial |
| Responsive | 1440x900 și 390x844 fără document scroll sau suprapuneri |
| Touch targets | controalele principale mobile au minimum 44x44 px |
| Canvas | pixeli non-background măsurați pe desktop și mobil; scena nu este blank |
| Runtime | browser nou fără warning-uri sau erori în consolă |
| Build | TypeScript și Vite build reușite |
| Lint | zero erori; două warning-uri preexistente în componente legacy |
| Security | `npm audit --omit=dev`: zero vulnerabilități de producție |

Three este fixat la `0.182.0`, împreună cu tipurile, pentru compatibilitate curată cu
React 18 și `@react-three/fiber@8.18.0`. O versiune mai nouă genera warning-ul
`THREE.Clock` din internals R3F fără să aducă valoare acestui graybox.

Chunk-ul laboratorului are aproximativ 883 kB minificat / 239 kB gzip. Este separat
de restul aplicației prin lazy loading. Nu îl optimizăm prematur înainte să alegem
engine-ul și arhitectura lumii finale.

## Starea gate-ului

**Ready for human test, nu acceptat automat.** Criteriile tehnice sunt îndeplinite.
Două criterii nu pot fi validate onest de implementator:

1. poate un utilizator să termine bucla fără explicații suplimentare;
2. descrie experiența ca joc/explorare, nu ca site cu animații.

După acest test ne oprim și decidem dacă păstrăm modelul de control. World
architecture și level blockout nu încep automat.
