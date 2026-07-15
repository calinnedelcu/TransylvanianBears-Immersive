export type MemberContact = {
  email?: string;
  github?: string;
  instagram?: string;
  linkedin?: string;
  discord?: string;
  website?: string;
};

export type Member = {
  id: string;
  name: string;
  role: string;
  numeral: string;
  skills: string[];
  bio: string | { ro: string; en: string };
  bioExtended?: string | { ro: string; en: string };
  /** Full skill list shown only on the dedicated member page. Falls back to skills if absent. */
  skillsExtended?: string[];
  portrait?: string;
  contact?: MemberContact;
  vacant?: boolean;
};

export const MEMBERS: Member[] = [
  {
    id: 'calin-nedelcu',
    name: 'Calin Nedelcu',
    role: 'Project Manager',
    numeral: 'I',
    skills: ['Flutter', 'Python', 'Unity', 'CTF', 'Project Management'],
    bio: {
      ro: 'Project manager-ul haitei. Scrie cod oriunde — Flutter pentru mobile (SchoolMate), Python pentru hack & data, Unity când avem nevoie de un joc.',
      en: 'Project manager of the pack. Writes code everywhere — Flutter for mobile (SchoolMate), Python for hacks and data, Unity when a game is on the table.',
    },
    bioExtended: {
      ro: 'Calin e creierul organizatoric al echipei — dar nu tipul care face doar spreadsheet-uri. Scrie Flutter pentru SchoolMate (aplicația mobilă a echipei), Python când e nevoie de scripting rapid sau analiză de date, și Unity când proiectul cere un joc. Participă activ la CTF-uri și știe să prioritizeze livrabilele în haosul competițional. Dacă echipa funcționează ca un mecanism bine uns, e în mare parte meritul lui.',
      en: "Calin is the team's organizational brain — but not the spreadsheet-only type. He writes Flutter for SchoolMate (the team's mobile app), Python when quick scripting or data analysis is needed, and Unity when a game is on the table. He actively participates in CTFs and knows how to prioritize deliverables in competitive chaos. If the team runs like a well-oiled machine, it's largely his doing.",
    },
    portrait: '/assets/membrii/CalinNedelcu.webp',
    contact: {
      github: 'https://github.com/calinnedelcu',
    },
  },
  {
    id: 'vlad-bostina',
    name: 'Vlad Bostina',
    role: 'Backend & Game Dev',
    numeral: 'II',
    skills: ['Firebase', 'Blender', 'Unreal Engine', 'Node.js', 'AI / LLM'],
    bio: {
      ro: 'Construiește back-end-ul (Aegis e al lui) și modelează 3D când proiectul cere asta. Firebase și Blender, ambele pe limba lui.',
      en: 'Builds back-ends (Aegis is his) and models in 3D when the brief calls for it. Firebase and Blender, both fluent.',
    },
    bioExtended: `Abilități tehnice

Software Developer — backend development, logică aplicație, integrare API
Unreal Engine — dezvoltare jocuri, generare dataseturi sintetice pentru LLM-uri
Blender — 3D modelling low-poly (personaje, environment, props)
DaVinci Resolve — video editing & post-producție
AI — lucrat cu modele de limbaj, integrare API (Anthropic, ElevenLabs, Ollama)
GitHub — version control & colaborare
Fusion 360 / CAD — modelare piese, imprimare 3D

Proiecte notabile

Parahouse — joc solo dezvoltat în Unreal Engine, publicat pe itch.io; toate assets-urile 3D modelate în Blender (low-poly)
Dataset sintetic pentru LLM — generare de date sintetice în Unreal Engine pentru antrenarea modelelor de limbaj
Aegis — aplicație de echipă; responsabil backend, logică aplicație și parțial frontend
SchoolMate — aplicație de echipă; responsabil backend și logică aplicație

„Stau la PC și 16 ore pe zi dacă este nevoie."`,
    portrait: '/assets/membrii/VladBostina.webp',
    contact: {
      github: 'https://github.com/BosRegele',
      email: 'vladfromstars@gmail.com',
    },
  },
  {
    id: 'andrei-cheroiu',
    name: 'Andrei Cheroiu',
    role: 'AI & 3D',
    numeral: 'III',
    skills: ['Python', 'PyTorch', 'AI/ML', 'Unity', 'Computer Vision'],
    bio: {
      ro: 'Antrenează modele AI și construiește back-end-uri solide. A făcut și un detour în game dev cu Infect.exe.',
      en: 'Trains AI models and builds solid back-ends. Took a detour through game dev on Infect.exe.',
    },
    bioExtended: {
      ro: 'Andrei trăiește la intersecția dintre intelligence artificială și lumile 3D. Antrenează modele cu PyTorch, construiește arhitecturi de computer vision și știe cum să pună un model AI să funcționeze la capacitate maximă în producție. Game dev-ul nu e un hobby pentru el — Infect.exe e dovada că poate livra și pe acea direcție. Back-end solid, modele bine antrenate, zero compromisuri.',
      en: "Andrei lives at the intersection of artificial intelligence and 3D worlds. He trains models with PyTorch, builds computer vision architectures, and knows how to push an AI model to its full capacity in production. Game dev isn't a hobby for him — Infect.exe is proof he can deliver on that front too. Solid back-end, well-trained models, zero compromises.",
    },
    portrait: '/assets/membrii/AndreiCheroiu.webp',
    contact: {
      github: 'https://github.com/andrei-cheroiu',
    },
  },
  {
    id: 'alex-istrate',
    name: 'Alex Istrate',
    role: 'Full-Stack',
    numeral: 'IV',
    skills: ['JS/TS', 'Flutter', 'C#', 'React', 'Node.js'],
    bio: {
      ro: 'Dev versatil — web, mobile sau jocuri, depinde ce cere proiectul. Trece de la TypeScript la C# fără să clipească.',
      en: 'Versatile dev — web, mobile, or games, whichever the project demands. Switches from TypeScript to C# without blinking.',
    },
    bioExtended: {
      ro: 'Alex este coloana vertebrală full-stack a echipei. Dacă proiectul are nevoie de un front-end curat în React, un API rapid în Node.js sau o aplicație mobilă în Flutter, Alex livrează. Tranzițiile lui între TypeScript și C# sunt atât de naturale că nici compilatorul nu clipește. A contribuit la mai multe proiecte ale echipei, de la interfețe web până la sisteme mobile complete.',
      en: "Alex is the team's full-stack backbone. If the project needs a clean React front-end, a fast Node.js API, or a Flutter mobile app, Alex delivers. His transitions between TypeScript and C# are so natural that even the compiler doesn't blink. He has contributed to multiple team projects, from web interfaces to complete mobile systems.",
    },
    portrait: '/assets/membrii/AlexIstrate.webp',
    contact: {
      github: 'https://github.com/alex-istrate',
    },
  },
  {
    id: 'cristian-buloi',
    name: 'Cristian Buloi',
    role: 'Design',
    numeral: 'V',
    skills: ['Figma', 'UI Design', 'React', 'Tailwind', 'Branding'],
    bio: {
      ro: 'Ochiul echipei pentru design. Figma → React, de la wireframe la interfață finală fără pierderi în traducere.',
      en: "The team's eye for design. Figma → React, from wireframe to final interface with nothing lost in translation.",
    },
    bioExtended: {
      ro: 'Cristian este designerul care nu se oprește la Figma. Duce un concept de la wireframe până la componentă React fără să piardă nimic în traducere — nici spațierea, nici ierarhia vizuală, nici feel-ul animației. Ochiul lui pentru detalii vizuale ridică standardul întregii echipe. Dacă ceva arată bine în proiectele noastre, există o șansă mare că Cristian a pus mâna pe el.',
      en: "Cristian is the designer who doesn't stop at Figma. He takes a concept from wireframe to React component without losing anything in translation — not the spacing, not the visual hierarchy, not the feel of the animation. His eye for visual details raises the standard for the entire team. If something looks good in our projects, there's a good chance Cristian touched it.",
    },
    portrait: '/assets/membrii/CristianBuloi.webp',
    contact: {
      github: 'https://github.com/cristian-buloi',
    },
  },
  {
    id: 'vlad-colan',
    name: 'Vlad Colan',
    role: 'Game Dev',
    numeral: 'VI',
    skills: ['Unity', 'Blender', 'CTF', 'C#', '3D Modeling'],
    bio: {
      ro: 'Face jocuri ("No Other Choice" la Vianu Jam), modelează 3D și sparge CTF-uri. Trei lumi, un singur dev.',
      en: 'Builds games ("No Other Choice" at Vianu Jam), models in 3D, and cracks CTFs. Three worlds, one dev.',
    },
    bioExtended: {
      ro: 'Vlad Colan trăiește în trei lumi simultan: Unity pentru jocuri, Blender pentru modele 3D, și terminalul pentru CTF-uri. "No Other Choice", jocul lui de la Vianu Jam, e dovada că poate livra un produs complet — de la mecanici de gameplay până la assets 3D proprii. În CTF-uri aduce același spirit analitic: dacă există o vulnerabilitate, o găsește. Un singur dev, trei specializări, zero jumătăți de măsură.',
      en: 'Vlad Colan lives in three worlds simultaneously: Unity for games, Blender for 3D models, and the terminal for CTFs. "No Other Choice", his game from Vianu Jam, is proof he can deliver a complete product — from gameplay mechanics to his own 3D assets. In CTFs he brings the same analytical spirit: if there\'s a vulnerability, he finds it. One dev, three specializations, zero half-measures.',
    },
    portrait: '/assets/membrii/VladColan.webp',
    contact: {
      github: 'https://github.com/vlad-colan',
    },
  },
  {
    id: 'vacant-vii',
    name: '',
    role: '',
    numeral: 'VII',
    skills: [],
    bio: '',
    vacant: true,
  },
  {
    id: 'vacant-viii',
    name: '',
    role: '',
    numeral: 'VIII',
    skills: [],
    bio: '',
    vacant: true,
  },
];
