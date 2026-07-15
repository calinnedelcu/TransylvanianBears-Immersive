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
