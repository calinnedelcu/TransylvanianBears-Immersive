export type ProjectCategory = 'web' | 'cli' | 'ai' | 'security' | 'library' | 'mobile' | 'game' | 'research';
export type ProjectStatus = 'active' | 'archived' | 'shipped';

export type Project = {
  id: string;
  name: string;
  tagline: { ro: string; en: string };
  /** What the project is — no awards here. */
  description: { ro: string; en: string };
  /** Short award mention, e.g. "Locul 2 — Skills for the Future 2026". */
  award?: { ro: string; en: string };
  category: ProjectCategory;
  status: ProjectStatus;
  tech: string[];
  year: number;
  repoUrl?: string;
  liveUrl?: string;
  paperUrl?: string;
  thumbnail?: string;
  monogram?: string;
};

export const PROJECTS: Project[] = [
  {
    id: 'the-buried-hands',
    name: 'The Buried Hands',
    tagline: {
      ro: 'Joc stealth în Mausoleul lui Qin Shi Huang, 210 î.Hr.',
      en: 'Stealth game inside the Mausoleum of Qin Shi Huang, 210 BC',
    },
    description: {
      ro: 'Ești un meșteșugar prins în interiorul mausoleului la sigilarea lui. Fără armură sau statut de războinic, supraviețuiești folosind unelte, cunoștințe mecanice și o lampă cu ulei limitat — eviți gărzi care detectează pașii, curse cu arbalete construite de tine și vapori toxici de mercur.',
      en: 'You are a craftsman trapped inside the mausoleum during its sealing. Without armor or warrior status, you survive using tools, mechanical knowledge, and a limited oil lamp — avoiding guards who detect footsteps, crossbow traps you built, and toxic mercury vapors.',
    },
    award: {
      ro: 'Locul 2 național — Vianu Game Jam 2026',
      en: '2nd place nationally — Vianu Game Jam 2026',
    },
    category: 'game',
    status: 'shipped',
    tech: ['Godot 4', 'GDScript', 'Blender'],
    year: 2026,
    liveUrl: 'https://juggypuggy.itch.io/the-buried-hands',
    thumbnail: '/assets/projects/the-buried-hands.webp',
    monogram: 'BH',
  },
  {
    id: 'schoolmate',
    name: 'SchoolMate',
    tagline: {
      ro: 'Comunicarea școlară, unificată într-o aplicație',
      en: 'School communication, unified into one app',
    },
    description: {
      ro: 'Aplicație mobilă care unește anunțurile școlii, cererile digitale, orarele și identificarea QR la poartă într-o singură platformă gratuită pentru elevi și părinți.',
      en: 'Mobile app that brings school announcements, digital requests, schedules, and QR gate check-in into a single free platform for students and parents.',
    },
    award: {
      ro: 'Hardcore Entrepreneur 6.0',
      en: 'Hardcore Entrepreneur 6.0',
    },
    category: 'mobile',
    status: 'shipped',
    tech: ['Flutter', 'Dart', 'Firebase', 'Material 3'],
    year: 2026,
    repoUrl: 'https://github.com/calinnedelcu/SchoolMate-final',
    thumbnail: '/assets/projects/schoolmate.webp',
    monogram: 'SM',
  },
  {
    id: 'aegis',
    name: 'Aegis',
    tagline: {
      ro: 'Control de acces în școli prin QR dinamic',
      en: 'School access control via dynamic QR',
    },
    description: {
      ro: 'Sistem de securizare a porții școlii cu QR-uri dinamice și roluri multiple — elevi, părinți, profesori, administratori și dispozitive de acces. Fiecare QR expiră după o singură utilizare.',
      en: 'School gate-security system with single-use dynamic QR codes and multiple roles — students, parents, teachers, admins, and gate devices.',
    },
    award: {
      ro: 'Locul 2 național — Skills for the Future 2026',
      en: '2nd place nationally — Skills for the Future 2026',
    },
    category: 'mobile',
    status: 'shipped',
    tech: ['Flutter', 'Dart', 'Firebase', 'QR Auth'],
    year: 2026,
    repoUrl: 'https://github.com/BosRegele/Aegis',
    thumbnail: '/assets/projects/aegis.webp',
    monogram: 'AE',
  },
  {
    id: 'project-nexus',
    name: 'Project Nexus',
    tagline: {
      ro: 'Detecție de persoane din aer cu drone sintetice',
      en: 'Aerial human detection with synthetic drones',
    },
    description: {
      ro: 'Pipeline AI care generează dataset-uri sintetice de filmări de dronă în Unreal Engine 5 și antrenează modele YOLOv8 pentru detectarea persoanelor din aer, fără a necesita date reale de antrenament.',
      en: 'AI pipeline that generates synthetic drone footage datasets in Unreal Engine 5 and trains YOLOv8 models for aerial person detection — no real training data required.',
    },
    award: {
      ro: 'Locul 1 național — Project Nexus htechrobotics 2026',
      en: '1st place nationally — Project Nexus htechrobotics 2026',
    },
    category: 'ai',
    status: 'shipped',
    tech: ['Unreal Engine 5', 'YOLOv8', 'Python', 'AI/ML'],
    year: 2026,
    liveUrl: 'https://docs.google.com/presentation/d/1IFLpSXYsgB3ro6IvawuXEFcsHJaB_8aAPX1dooPD5Xg/edit?usp=sharing',
    thumbnail: '/assets/projects/project-nexus.webp',
    monogram: 'PN',
  },
  {
    id: 'infectexe',
    name: 'Infect.exe',
    tagline: {
      ro: 'Action game în care ești virusul',
      en: 'Action game where you are the virus',
    },
    description: {
      ro: 'Joci un virus care infiltrează un sistem informatic — hack-uiești subsisteme, eviți defense-uri și distrugi firewall-uri. Grafică 1-bit, livrat în 7 zile.',
      en: 'You play a virus infiltrating a computer system — hack subsystems, dodge defenses, and tear down firewalls. 1-bit art style, shipped in 7 days.',
    },
    award: {
      ro: 'Locul 19 internațional — 1-BIT JAM 7',
      en: '19th place internationally — 1-BIT JAM 7',
    },
    category: 'game',
    status: 'shipped',
    tech: ['Unity', 'C#', 'HTML5'],
    year: 2025,
    liveUrl: 'https://shieldsentinel.itch.io/infectexe',
    thumbnail: '/assets/projects/infectexe.webp',
    monogram: 'IX',
  },
  {
    id: 'parahouse',
    name: 'Parahouse',
    tagline: {
      ro: 'Horror psihologic în care propria minte e dușmanul',
      en: 'Psychological horror where your own mind is the enemy',
    },
    description: {
      ro: 'Joc de puzzle horror psihologic în care personajul suferă de paranoia, schizofrenie și pierderi de memorie. Navighezi prin casă folosind notițe scrise de tine însuți, gestionezi sănătatea mintală prin medicamente și cauți chei pentru a evada înainte ca mintea să se destrame complet.',
      en: 'Psychological horror puzzle game where the protagonist suffers from paranoia, schizophrenia, and memory loss. Navigate your home using self-written notes as guides, manage your sanity through medication, and find keys to escape before your mind completely breaks.',
    },
    category: 'game',
    status: 'active',
    tech: ['Unreal Engine', 'Blender'],
    year: 2025,
    liveUrl: 'https://juggypuggy.itch.io/parahouse',
    thumbnail: '/assets/projects/parahouse.webp',
    monogram: 'PH',
  },
  {
    id: 'no-other-choice',
    name: 'No Other Choice',
    tagline: {
      ro: 'Horror narativ în care fiecare decizie contează',
      en: 'Narrative horror where every choice matters',
    },
    description: {
      ro: 'Joc horror choice-based în care ești un călător blocat într-o casă bântuită de un fantom manipulator. Deciziile tale duc la finaluri diferite — unele mai rele decât altele.',
      en: 'Choice-based horror game where you play a traveler trapped in a haunted house with a manipulative ghost. Your decisions lead to different endings — some worse than others.',
    },
    award: {
      ro: 'Locul 5 național — Vianu Game Jam 2025',
      en: '5th place nationally — Vianu Game Jam 2025',
    },
    category: 'game',
    status: 'shipped',
    tech: ['Unity', 'C#', 'Blender'],
    year: 2025,
    liveUrl: 'https://arkrall.itch.io/no-other-choices',
    thumbnail: '/assets/projects/no-other-choice.webp',
    monogram: 'NO',
  },
];

export const STATUS_LABEL: Record<ProjectStatus, { ro: string; en: string }> = {
  active: { ro: 'În lucru', en: 'Active' },
  shipped: { ro: 'Lansat', en: 'Shipped' },
  archived: { ro: 'Arhivat', en: 'Archived' },
};

export const STATUS_COLOR: Record<ProjectStatus, string> = {
  active: '#E8B547',
  shipped: '#F5D78A',
  archived: '#8B6A4A',
};

export const CATEGORY_LABEL: Record<ProjectCategory, { ro: string; en: string }> = {
  web: { ro: 'Web', en: 'Web' },
  cli: { ro: 'CLI', en: 'CLI' },
  ai: { ro: 'AI', en: 'AI' },
  security: { ro: 'Security', en: 'Security' },
  library: { ro: 'Bibliotecă', en: 'Library' },
  mobile: { ro: 'Mobile', en: 'Mobile' },
  game: { ro: 'Joc', en: 'Game' },
  research: { ro: 'Cercetare', en: 'Research' },
};
