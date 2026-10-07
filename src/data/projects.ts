import type { Figure, Project } from './types';

const P = '/assets/projects';

/** The Buried Hands captures ship with a 1024px variant for phones. */
function buriedHands(file: string, width: number, height: number, alt: string, caption: string): Figure {
  return {
    src: `${P}/buried-hands/${file}.webp`,
    srcSet: `${P}/buried-hands/mobile/${file}.webp 1024w, ${P}/buried-hands/${file}.webp ${width}w`,
    width,
    height,
    alt,
    caption,
  };
}

export const PROJECTS: Project[] = [
  {
    id: 'project-nexus',
    slug: 'project-nexus',
    index: '01',
    title: 'Project Nexus',
    shortTitle: 'Nexus',
    facets: ['machine-learning'],
    discipline: 'Machine learning / Computer vision',
    year: 2026,
    state: 'shipped',
    evidence: 'verified',
    summary:
      'Un pipeline care generează date aeriene sintetice în Unreal Engine 5 și le folosește pentru detecția persoanelor cu YOLOv8.',
    thesis:
      'Putem transforma o lume controlată într-un laborator pentru situații care sunt rare, scumpe sau greu de adnotat în realitate.',
    tags: ['Unreal Engine 5', 'AirSim', 'YOLOv8', 'Python'],
    accent: 'cobalt',
    cover: {
      src: `${P}/nexus-ue5-aerial.webp`,
      width: 1280,
      height: 960,
      alt: 'Vedere aeriană a orașului sintetic construit în Unreal Engine 5 pentru Project Nexus.',
      caption: 'Mediu sintetic / Unreal Engine 5',
    },
    metrics: [
      { value: '11', label: 'scenarii sintetice', evidence: 'verified' },
      { value: '~9.500', label: 'imagini totale', evidence: 'verified' },
      { value: '>140.000', label: 'adnotări automate', evidence: 'verified' },
    ],
    chapters: [
      {
        id: 'context',
        index: '01',
        label: 'Context',
        title: 'Datele sunt problema înainte ca modelul să fie soluția.',
        body: 'Proiectul tratează generarea datasetului ca parte a sistemului, nu ca o etapă ascunsă. Scenele, vremea, orele și poziția dronei pot fi controlate și repetate.',
      },
      {
        id: 'pipeline',
        index: '02',
        label: 'Pipeline',
        title: 'Captură, segmentare și adnotare în aceeași buclă.',
        body: 'AirSim controlează captura aeriană, iar pipeline-ul produce imaginile și măștile necesare antrenării. Datasetul este împărțit 90% train și 10% validation.',
        media: {
          kind: 'compare',
          label: 'Compară segmentarea cu detecția',
          before: {
            src: `${P}/nexus-segmentation.webp`,
            width: 904,
            height: 684,
            alt: 'Cadru sintetic din Nexus cu persoanele evidențiate în verde.',
            caption: 'Segmentare — persoanele sunt evidențiate în cadrul sintetic.',
          },
          after: {
            src: `${P}/nexus-detection.webp`,
            width: 1203,
            height: 906,
            alt: 'Cadru sintetic din Nexus cu marcaje de detecție albastre.',
            caption: 'Detecție — marcajele arată output-ul etapei de detecție.',
          },
        },
      },
      {
        id: 'validation',
        index: '03',
        label: 'Validare',
        title: 'Lumea sintetică trebuie confruntată cu una reală.',
        body: 'Modelul YOLOv8 este testat atât pe date sintetice, cât și pe Stanford Drone Dataset. Rezultatele trebuie interpretate separat pentru cele două tipuri de date.',
        note: 'Captura ilustrează detecțiile; nu reprezintă o măsură agregată a acurateței. Detaliile experimentului sunt în prezentarea proiectului.',
        media: {
          kind: 'figure',
          figure: {
            src: `${P}/project-nexus.webp`,
            width: 589,
            height: 504,
            fit: 'contain',
            alt: 'Detecții evidențiate pe o imagine aeriană reală din validarea Project Nexus.',
            caption: 'Validare / cadru aerian real',
          },
        },
      },
    ],
    links: [
      {
        label: 'Prezentarea proiectului',
        href: 'https://docs.google.com/presentation/d/1IFLpSXYsgB3ro6IvawuXEFcsHJaB_8aAPX1dooPD5Xg/edit',
        kind: 'presentation',
      },
    ],
    credits: [
      { memberId: 'calin-nedelcu' },
      { memberId: 'andrei-cheroiu' },
      { memberId: 'cristian-buloi' },
      { memberId: 'vlad-colan' },
    ],
  },
  {
    id: 'aegis',
    slug: 'aegis',
    index: '02',
    title: 'Aegis',
    shortTitle: 'Aegis',
    facets: ['school-software'],
    discipline: 'Software școlar / Acces sigur',
    year: 2026,
    state: 'shipped',
    evidence: 'verified',
    summary: 'Un sistem de acces școlar bazat pe un token QR dinamic, scurt și de unică folosință.',
    thesis:
      'O interacțiune de câteva secunde la poartă poate rămâne simplă pentru utilizator fără să fie superficială în infrastructură.',
    tags: ['Flutter', 'Firebase', 'Cloud Functions', 'QR'],
    accent: 'mint',
    cover: {
      src: `${P}/aegis.webp`,
      width: 851,
      height: 656,
      fit: 'contain',
      alt: 'Interfața mobilă Aegis cu tokenul QR pentru accesul în campus.',
      caption: 'Interfață / acces în campus',
    },
    metrics: [
      { value: '20s', label: 'expirare token', evidence: 'verified' },
      { value: 'Single-use', label: 'redeem atomic', evidence: 'verified' },
      { value: '5', label: 'roluri în Aegis', evidence: 'verified' },
    ],
    chapters: [
      {
        id: 'gate-flow',
        index: '01',
        label: 'Fluxul de bază',
        title: 'Un cod scurt, un singur drum prin sistem.',
        body: 'Aegis generează un token criptografic temporar, îl prezintă ca QR și îl validează în funcție de rol. După folosire sau expirare, tokenul nu mai poate deschide accesul.',
        media: {
          kind: 'steps',
          steps: [
            { label: 'Emitere', detail: 'Un token criptografic temporar.' },
            { label: 'Scanare QR', detail: 'Tokenul este prezentat ca QR.' },
            { label: 'Validare', detail: 'Verificat în funcție de rol.' },
            { label: 'Utilizare unică', detail: 'După folosire sau expirare nu mai deschide accesul.' },
          ],
        },
      },
      {
        id: 'roles',
        index: '02',
        label: 'Sistem',
        title: 'Securitatea depinde de rol, nu doar de cod.',
        body: 'Nucleul Aegis separă elevii, părinții, profesorii, administratorii și dispozitivele de acces. Validarea tokenului ține cont de rolul utilizatorului.',
        media: {
          kind: 'chips',
          label: 'Cele cinci roluri din nucleul Aegis',
          items: ['Elevi', 'Părinți', 'Profesori', 'Administratori', 'Dispozitive de acces'],
        },
      },
      {
        id: 'result',
        index: '03',
        label: 'Rezultat',
        title: 'Produsul și rezultatul rămân în același caz.',
        body: 'Aegis a obținut locul 2 la Skills for the Future. Codul proiectului poate fi consultat în repository-ul public.',
        note: 'Creditele complete pentru faza de concurs sunt încă în validare.',
      },
    ],
    links: [{ label: 'Repository Aegis', href: 'https://github.com/BosRegele/Aegis', kind: 'repository' }],
    credits: [
      { memberId: 'calin-nedelcu' },
      { memberId: 'cristian-buloi' },
      { memberId: 'vlad-bostina' },
      { memberId: 'andrei-cheroiu' },
    ],
  },
  {
    id: 'schoolmate',
    slug: 'schoolmate',
    index: '03',
    title: 'SchoolMate',
    shortTitle: 'SchoolMate',
    facets: ['school-software'],
    discipline: 'Software școlar / Operațiuni',
    year: 2026,
    state: 'active',
    evidence: 'team-confirmed',
    summary:
      'O platformă pentru anunțuri, cereri, orare și fluxuri între elevi, părinți, profesori și administrație.',
    thesis:
      'Software-ul școlar devine util când leagă rolurile și fluxurile zilnice fără să adauge încă un strat de fricțiune.',
    tags: ['Flutter', 'Firebase', 'Education software'],
    accent: 'sky',
    cover: {
      src: `${P}/schoolmate.webp`,
      width: 1519,
      height: 890,
      fit: 'contain',
      alt: 'Interfața SchoolMate pentru secretariat, cu anunțuri și cereri.',
      caption: 'Interfață / administrație școlară',
    },
    chapters: [
      {
        id: 'problem',
        index: '01',
        label: 'Context',
        title: 'Școala nu este un singur flux și nici un singur utilizator.',
        body: 'SchoolMate reunește anunțuri, cereri și orare pentru elevi, părinți, profesori și administrație. Rolurile diferite pornesc de la sarcini diferite în aceeași școală.',
      },
      {
        id: 'product-map',
        index: '02',
        label: 'Produs',
        title: 'Anunțuri, cereri și orare într-un sistem comun.',
        body: 'Interfața de secretariat grupează anunțurile și cererile. Implementarea fluxurilor poate fi urmărită în repository-ul proiectului.',
      },
      {
        id: 'continuity',
        index: '03',
        label: 'Continuitate',
        title: 'Accesul și operațiunile școlare.',
        body: 'Aegis tratează accesul în campus printr-un token QR temporar. SchoolMate se concentrează pe comunicare și operațiuni școlare. Sunt prezentate separat; relația tehnică exactă dintre ele nu este documentată aici.',
      },
    ],
    links: [
      { label: 'Repository SchoolMate', href: 'https://github.com/calinnedelcu/SchoolMate-final', kind: 'repository' },
    ],
    credits: [],
  },
  {
    id: 'the-buried-hands',
    slug: 'the-buried-hands',
    index: '04',
    title: 'The Buried Hands',
    shortTitle: 'Buried Hands',
    facets: ['video-games'],
    discipline: 'Joc video / Stealth puzzle',
    year: 2026,
    state: 'shipped',
    evidence: 'team-confirmed',
    summary:
      'Un stealth-puzzle în mausoleul lui Qin Shi Huang, în care un meșteșugar supraviețuiește prin lumină, unelte și înțelegerea mecanismelor.',
    thesis: 'Jucătorul nu trebuie să devină mai puternic; trebuie să înțeleagă mai bine lumea în care a fost prins.',
    tags: ['Godot 4', 'GDScript', 'Blender'],
    accent: 'gold',
    cover: {
      src: `${P}/the-buried-hands.webp`,
      width: 1912,
      height: 1003,
      alt: 'Captură din The Buried Hands: explorarea mausoleului la lumina unei lămpi.',
      caption: 'Gameplay / stealth & puzzle',
    },
    chapters: [
      {
        id: 'premise',
        index: '01',
        label: 'Premisă',
        title: 'Un meșteșugar, nu un războinic.',
        body: 'Personajul este prins în mausoleu în timpul sigilării lui. Lipsa armurii sau a forței mută designul spre observație, evitare și folosirea obiectelor construite chiar de el.',
        media: {
          kind: 'figure',
          figure: buriedHands(
            'guards',
            1914,
            995,
            'Jucătorul urmărește gărzile din spatele unei coloane în The Buried Hands.',
            'Gameplay / observație și evitare',
          ),
        },
      },
      {
        id: 'systems',
        index: '02',
        label: 'Sisteme',
        title: 'Lumina, pașii și mecanismele devin aceeași problemă.',
        body: 'Lampa are resurse limitate, gărzile aud pașii, iar capcanele și vaporii de mercur definesc pericole distincte. Aceste mecanici cer observarea mediului și alegerea atentă a traseului.',
        media: {
          kind: 'gallery',
          figures: [
            buriedHands(
              'royal-hall',
              1913,
              1001,
              'Sala regală din The Buried Hands, cu statui luminate în nișe și un plafon circular.',
              'Sala regală',
            ),
            buriedHands(
              'mechanism',
              1916,
              1004,
              'Un mecanism cu balanță și lanțuri în The Buried Hands, văzut din perspectiva jucătorului.',
              'Mecanismul',
            ),
            buriedHands(
              'mercury',
              1911,
              1006,
              'Jucătorul privește de pe o pasarelă de lemn o sală adâncă, învăluită în vapori, în The Buried Hands.',
              'Vaporii de mercur',
            ),
          ],
        },
      },
      {
        id: 'build',
        index: '03',
        label: 'Build',
        title: 'Un joc public trebuie să poată fi jucat, nu doar descris.',
        body: 'Build-ul public este disponibil pe itch.io. Pagina jocului oferă acces la experiență și la informațiile publicate de autori.',
      },
    ],
    links: [{ label: 'Joacă pe itch.io', href: 'https://juggypuggy.itch.io/the-buried-hands', kind: 'build' }],
    credits: [],
  },
  {
    id: 'economy-news',
    slug: 'economy-news',
    index: '05',
    title: 'EconomyNews Research',
    shortTitle: 'EconomyNews',
    facets: ['research-paper', 'machine-learning'],
    discipline: 'Cercetare economică / Machine learning',
    year: 2026,
    state: 'research',
    evidence: 'team-confirmed',
    summary:
      'O cercetare despre știri financiare neașteptate, sentiment extras cu modele lingvistice și reacția intraday a piețelor.',
    thesis:
      'O concluzie despre piață are valoare numai dacă evenimentul, fereastra de timp și metoda pot fi urmărite până la sursă.',
    tags: ['LLM sentiment', 'Intraday analysis', 'Python'],
    accent: 'bone',
    cover: {
      src: `${P}/research-crossing/economy-event-timeline.webp`,
      width: 2374,
      height: 1091,
      fit: 'contain',
      alt: 'Grafic cu numărul zilnic de evenimente analizate, pe categorii, între aprilie 2025 și mai 2026 (N = 2.449).',
      caption: 'Din studiu / evenimentele analizate',
    },
    metrics: [
      { value: '2.449', label: 'evenimente analizate', evidence: 'team-confirmed' },
      { value: '13 luni', label: 'fereastră de date', evidence: 'team-confirmed' },
      { value: '2', label: 'active urmărite', evidence: 'team-confirmed' },
    ],
    chapters: [
      {
        id: 'question',
        index: '01',
        label: 'Întrebarea',
        title: 'Ce se întâmplă după o știre cu adevărat neașteptată?',
        body: 'Proiectul leagă evenimente financiare, sentiment și mișcări intraday. Lucrarea descrie ipoteza, universul de date și definiția surprizei folosită în analiză.',
      },
      {
        id: 'method',
        index: '02',
        label: 'Metoda',
        title: 'Metoda trebuie să rămână vizibilă lângă rezultat.',
        body: 'Analiza urmărește colectarea evenimentelor, sentimentul și reacția pieței. Figura compară randamentele absolute înainte și după eveniment; lucrarea și codul oferă contextul metodologic.',
        media: {
          kind: 'figure',
          figure: {
            src: `${P}/research-crossing/economy-pre-post-drift.webp`,
            width: 2462,
            height: 1136,
            fit: 'contain',
            alt: 'Graficul randamentelor absolute înainte și după evenimente, pentru EUR/USD și Nasdaq-100.',
            caption: 'Din studiu / reacția la eveniment',
          },
        },
      },
      {
        id: 'limits',
        index: '03',
        label: 'Limite',
        title: 'Magnitudine, direcție și latență.',
        body: 'Studiul separă magnitudinea mișcării de valoarea direcțională a sentimentului și păstrează vizibilă problema latenței feed-ului public.',
        note: 'Rezultatele trebuie citite împreună cu metodologia, baseline-ul și limitările descrise în lucrare.',
      },
    ],
    links: [
      {
        label: 'Lucrarea de cercetare',
        href: 'https://github.com/calinnedelcu/economynewsresearch/blob/main/paper/main.pdf',
        kind: 'paper',
      },
      {
        label: 'Repository și reproducere',
        href: 'https://github.com/calinnedelcu/economynewsresearch',
        kind: 'repository',
      },
    ],
    credits: [],
  },
  {
    id: 'automation-risk',
    slug: 'automation-risk',
    index: '06',
    title: 'Riscul de automatizare al ocupațiilor',
    shortTitle: 'Automation Risk',
    facets: ['research-paper', 'machine-learning'],
    discipline: 'Cercetare în muncă / Machine learning',
    year: 2026,
    state: 'research',
    evidence: 'team-confirmed',
    summary:
      'Un proiect de evaluare a riscului de automatizare a ocupațiilor folosind metode de învățare automată.',
    thesis:
      'Un scor despre viitorul muncii trebuie explicat prin date, variabile și limite, nu prezentat ca verdict.',
    tags: ['Machine learning', 'Data analysis', 'Python'],
    accent: 'coral',
    cover: {
      src: `${P}/research-crossing/automation-shap.webp`,
      width: 1130,
      height: 509,
      fit: 'contain',
      alt: 'Grafic SHAP al contribuției variabilelor la modelul riscului de automatizare.',
      caption: 'Din studiu / contribuția variabilelor',
    },
    metrics: [
      { value: '3.037', label: 'ocupații ESCO', evidence: 'team-confirmed' },
      { value: '654', label: 'ocupații COR mapate', evidence: 'team-confirmed' },
      { value: '14,7%', label: 'acoperire COR', evidence: 'team-confirmed' },
    ],
    chapters: [
      {
        id: 'framing',
        index: '01',
        label: 'Încadrare',
        title: 'Riscul estimat nu este o sentință.',
        body: 'Proiectul estimează riscul de automatizare folosind date despre ocupații. Scorul trebuie interpretat împreună cu variabilele, acoperirea datelor și limitele modelului.',
      },
      {
        id: 'model',
        index: '02',
        label: 'Modelul',
        title: 'Ce contribuie la estimarea modelului.',
        body: 'Figura SHAP arată contribuția variabilelor la output-ul modelului. Repository-ul oferă acces la implementare și la materialele de analiză.',
      },
      {
        id: 'coverage',
        index: '03',
        label: 'Context',
        title: 'Acoperirea datelor limitează interpretarea.',
        body: 'Maparea raportată de echipă cuprinde 654 de ocupații COR, cu o acoperire de 14,7%. Rezultatele nu descriu integral toate ocupațiile din această clasificare.',
      },
    ],
    links: [
      {
        label: 'Repository',
        href: 'https://github.com/BalaurulBondoc771/Evaluarea-riscului-de-automatizare-a-ocupa-iilor-utiliz-nd-metode-de-nv-are-automat-',
        kind: 'repository',
      },
    ],
    credits: [],
  },
  {
    id: 'infect-exe',
    slug: 'infect-exe',
    index: '07',
    title: 'Infect.exe',
    shortTitle: 'Infect.exe',
    facets: ['video-games'],
    discipline: 'Joc video / Acțiune 1-bit',
    year: 2025,
    state: 'shipped',
    evidence: 'verified',
    summary:
      'Un joc 1-bit construit pentru 1-BIT JAM 7, în care jucătorul infiltrează un sistem ca virus și atacă subsistemele lui.',
    thesis:
      'O limitare vizuală strictă poate deveni regulă de lume, feedback și identitate în același timp.',
    tags: ['Unity', 'C#', '1-bit'],
    accent: 'ink',
    cover: {
      src: `${P}/infectexe.webp`,
      width: 1261,
      height: 706,
      alt: 'Captură din Infect.exe, un joc cu platforme și obstacole în alb și negru.',
      caption: 'Gameplay / 1-BIT JAM 7',
    },
    metrics: [
      { value: '19', label: 'general / 56', evidence: 'verified' },
      { value: '8', label: 'temă', evidence: 'verified' },
      { value: '14', label: 'artă', evidence: 'verified' },
    ],
    chapters: [
      {
        id: 'constraint',
        index: '01',
        label: 'Constrângerea',
        title: 'Un bit pentru lume și pentru feedback.',
        body: 'Paleta 1-bit nu este tratată ca filtru. Interfața, siluetele, atacurile și lizibilitatea trebuie să funcționeze în aceeași limitare.',
      },
      {
        id: 'loop',
        index: '02',
        label: 'Bucla de joc',
        title: 'Infiltrează. Evită. Distruge subsistemul.',
        body: 'Jucătorul infiltrează sistemul ca virus, evită obstacolele și atacă subsistemele lui. Capturile prezintă zonele CPU și GPU din joc.',
        media: {
          kind: 'gallery',
          figures: [
            {
              src: `${P}/infect-exe/cpu.png`,
              width: 1194,
              height: 663,
              fit: 'contain',
              alt: 'Captură din Infect.exe: un puzzle cu cabluri într-o fereastră de sistem, cu 30 de secunde la dispoziție.',
              caption: 'Zona CPU',
            },
            {
              src: `${P}/infect-exe/gpu.png`,
              width: 1193,
              height: 667,
              fit: 'contain',
              alt: 'Captură din Infect.exe: platforme și mesajul „Find the firewall destroyer and the CPU key”.',
              caption: 'Zona GPU',
            },
          ],
        },
      },
      {
        id: 'result',
        index: '03',
        label: 'Rezultat',
        title: 'Clasarea rămâne legată de pagina oficială.',
        body: 'Jocul a ocupat locul 19 general, locul 8 la temă și locul 14 la artă din 56 de înscrieri la 1-BIT JAM 7.',
      },
    ],
    links: [
      { label: 'Joacă pe itch.io', href: 'https://shieldsentinel.itch.io/infectexe', kind: 'build' },
      { label: 'Rezultatele jam-ului', href: 'https://itch.io/jam/1-bit-jam-7/rate/4068020', kind: 'paper' },
    ],
    credits: [],
  },
];

export const projectBySlug = Object.fromEntries(PROJECTS.map((project) => [project.slug, project])) as Record<
  string,
  Project
>;

export const projectById = Object.fromEntries(PROJECTS.map((project) => [project.id, project])) as Record<
  Project['id'],
  Project
>;
