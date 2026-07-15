export type EvidenceArtifact = {
  id: 'nexus' | 'aegis' | 'infect';
  index: string;
  year: string;
  title: string;
  result: string;
  status: 'verified' | 'team-confirmed';
  image: string;
  color: string;
};

export const EVIDENCE_ARTIFACTS: EvidenceArtifact[] = [
  {
    id: 'nexus',
    index: '01',
    year: '2026',
    title: 'PROJECT NEXUS',
    result: 'LOCUL 1',
    status: 'team-confirmed',
    image: '/assets/achievements/project-nexus-2026.webp',
    color: '#79ddd5',
  },
  {
    id: 'aegis',
    index: '02',
    year: '2026',
    title: 'AEGIS / SKILLS FOR THE FUTURE',
    result: 'LOCUL 2',
    status: 'team-confirmed',
    image: '/assets/achievements/aegis-skills-future-2026.webp',
    color: '#e0b868',
  },
  {
    id: 'infect',
    index: '03',
    year: '2025',
    title: 'INFECT.EXE / 1-BIT JAM 7',
    result: '#19 / 56',
    status: 'verified',
    image: '/assets/achievements/1bit-jam-7-2025.webp',
    color: '#ef6b57',
  },
];

export type CitadelRoute = {
  id: 'work' | 'team' | 'archive';
  index: string;
  label: string;
  detail: string;
  href: string;
  color: string;
  position: [number, number, number];
};

export const CITADEL_ROUTES: CitadelRoute[] = [
  {
    id: 'work',
    index: 'A',
    label: 'WORK',
    detail: '7 proiecte / 4 domenii',
    href: '/next/work',
    color: '#72d9d6',
    position: [-7.15, 0, 0],
  },
  {
    id: 'team',
    index: 'B',
    label: 'TEAM',
    detail: '6 oameni / contribuții',
    href: '/next/team',
    color: '#d7b468',
    position: [3.65, 6.25, 0],
  },
  {
    id: 'archive',
    index: 'C',
    label: 'ARCHIVE',
    detail: 'rezultate / surse',
    href: '/next/archive',
    color: '#e76c58',
    position: [3.65, -6.25, 0],
  },
];

export const CITADEL_PROJECTS = [
  { id: 'nexus', label: 'NEXUS', group: 'ML', position: [-2.75, 2.1, 0.72], color: '#72d9d6' },
  { id: 'aegis', label: 'AEGIS', group: 'SCHOOL', position: [0.15, 3.55, 1.05], color: '#d7b468' },
  { id: 'schoolmate', label: 'SCHOOLMATE', group: 'SCHOOL', position: [2.65, 2.15, 0.7], color: '#d7b468' },
  { id: 'buried', label: 'BURIED HANDS', group: 'GAMES', position: [-3.55, -0.6, 1.25], color: '#9b8a69' },
  { id: 'infect', label: 'INFECT.EXE', group: 'GAMES', position: [-2.1, -2.85, 0.58], color: '#e76c58' },
  { id: 'economy', label: 'ECONOMYNEWS', group: 'RESEARCH', position: [0.95, -3.55, 0.88], color: '#c4a65f' },
  { id: 'automation', label: 'AUTOMATION RISK', group: 'RESEARCH', position: [3.45, -1.35, 1.08], color: '#c4a65f' },
] as const;

export type OpenPath = {
  id: 'join' | 'partner';
  index: string;
  label: string;
  detail: string;
  href: string;
  color: string;
};

export const OPEN_PATHS: OpenPath[] = [
  {
    id: 'join',
    index: '01',
    label: 'JOIN THE TEAM',
    detail: 'roluri, standard și contribuții',
    href: '/next#join',
    color: '#72d9d6',
  },
  {
    id: 'partner',
    index: '02',
    label: 'WORK WITH US',
    detail: 'mentorat, parteneriate și contact',
    href: 'mailto:calin.nedelcu08@gmail.com?subject=Transylvanian%20Bears%20collaboration',
    color: '#d7b468',
  },
];
