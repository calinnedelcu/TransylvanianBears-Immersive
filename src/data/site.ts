import type { Evidence, Facet, ProjectId, ProjectState } from './types';

export const SITE = {
  name: 'Transylvanian Bears',
  url: 'https://www.transylvanianbears.com',
  school: 'C.N.I. Tudor Vianu',
  city: 'București',
  email: 'calin.nedelcu08@gmail.com',
  defaultDescription:
    'Transylvanian Bears construiește produse software, jocuri și cercetare aplicată la C.N.I. Tudor Vianu din București.',
} as const;

export const NAV = [
  { id: 'proiecte', label: 'Proiecte' },
  { id: 'rezultate', label: 'Rezultate' },
  { id: 'echipa', label: 'Echipa' },
  { id: 'contact', label: 'Contact' },
] as const;

export const mailto = (subject = 'Transylvanian Bears') =>
  `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}`;

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  verified: 'Sursă verificată',
  'team-confirmed': 'Confirmat de echipă',
  pending: 'În validare',
};

export const STATE_LABEL: Record<ProjectState, string> = {
  active: 'În dezvoltare',
  shipped: 'Publicat',
  research: 'Cercetare',
};

export const FACET_FILTERS: { id: 'all' | Facet; label: string }[] = [
  { id: 'all', label: 'Toate' },
  { id: 'video-games', label: 'Jocuri' },
  { id: 'school-software', label: 'Software școlar' },
  { id: 'machine-learning', label: 'Machine learning' },
  { id: 'research-paper', label: 'Cercetare' },
];

/** Page copy lives here so it can be edited without touching the layout. */
export const COPY = {
  hero: {
    kicker: 'C.N.I. Tudor Vianu / București',
    lede: 'O echipă de informatică ce construiește produse, jocuri și cercetare. Fiecare proiect pornește dintr-o problemă reală și se termină cu ceva care poate fi testat.',
  },
  pillars: {
    title: 'Observăm. Protejăm. Imaginăm. Măsurăm.',
    body: 'Nu ne definește o singură tehnologie. Ne definește felul în care transformăm semnale neclare în sisteme care pot fi demonstrate.',
  },
  projects: {
    title: 'Din idee, în lumea reală.',
    body: 'Lumi în care te joci. Software pe care îl folosești. Cercetare pe care o poți urmări până la date.',
  },
  results: {
    title: 'Rezultatele au context, dată și dovadă.',
    body: 'Fiecare intrare păstrează starea dovezii și legătura cu proiectul care a produs-o.',
  },
  team: {
    title: 'O echipă se explică prin contribuții, nu prin adjective.',
    body: 'Cei șase membri Transylvanian Bears și contribuțiile lor confirmate în proiectele echipei.',
  },
  contact: {
    title: 'Următorul semnal poate veni de la tine.',
    body: 'Colaborări, competiții, mentorat și membri noi. Spune-ne ce vrei să construiești și ce poți aduce la masă.',
  },
} as const;

export type Pillar = {
  verb: string;
  line: string;
  body: string;
  projectIds: ProjectId[];
};

/** The four verbs of the manifesto, each pointing at the work that proves it. */
export const PILLARS: Pillar[] = [
  {
    verb: 'Observăm',
    line: 'Antrenat în lumi virtuale. Testat pe date reale.',
    body: 'Project Nexus folosește medii sintetice din Unreal Engine 5 și AirSim pentru a genera date de antrenare destinate detecției aeriene cu YOLOv8.',
    projectIds: ['project-nexus'],
  },
  {
    verb: 'Protejăm',
    line: 'Două produse pentru același context școlar.',
    body: 'Aegis securizează accesul printr-un token QR dinamic, scurt și de unică folosință. SchoolMate tratează separat comunicarea și operațiunile dintre elevi, părinți, profesori, secretariat și poartă.',
    projectIds: ['aegis', 'schoolmate'],
  },
  {
    verb: 'Imaginăm',
    line: 'O lume se învață prin regulile ei.',
    body: 'Un stealth-puzzle plasat în mausoleul lui Qin Shi Huang. Jucătorul supraviețuiește prin unelte, lumină limitată și înțelegerea mecanismelor, nu prin forță.',
    projectIds: ['the-buried-hands', 'infect-exe'],
  },
  {
    verb: 'Măsurăm',
    line: 'Nu decorăm concluziile. Arătăm metoda.',
    body: 'EconomyNews cercetează relația dintre știri financiare neașteptate, sentiment LLM și reacții intraday. Al doilea proiect evaluează riscul de automatizare al ocupațiilor prin metode de învățare automată.',
    projectIds: ['economy-news', 'automation-risk'],
  },
];
