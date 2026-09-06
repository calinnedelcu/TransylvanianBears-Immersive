import type { ProjectId } from './types';

export type ProjectMedia = { src: string; alt: string; label: string; contain?: boolean };

// Existing project captures and research exports; keep charts and interfaces uncropped.
export const PROJECT_COVERS: Record<ProjectId, ProjectMedia> = {
  'project-nexus': { src: '/assets/projects/nexus-ue5-aerial.webp', alt: 'Vedere aeriană a orașului sintetic construit în Unreal Engine 5 pentru Project Nexus.', label: 'Mediu sintetic / Unreal Engine 5' },
  aegis: { src: '/assets/projects/aegis.webp', alt: 'Interfața mobilă Aegis cu tokenul QR pentru accesul în campus.', label: 'Interfață / acces în campus', contain: true },
  schoolmate: { src: '/assets/projects/schoolmate.webp', alt: 'Interfața SchoolMate pentru secretariat, cu anunțuri și cereri.', label: 'Interfață / administrație școlară', contain: true },
  'the-buried-hands': { src: '/assets/projects/the-buried-hands.webp', alt: 'Captură din The Buried Hands: explorarea mausoleului la lumina unei lămpi.', label: 'Gameplay / stealth & puzzle' },
  'economy-news': { src: '/assets/projects/research-crossing/economy-pre-post-drift.webp', alt: 'Graficul randamentelor absolute înainte și după evenimente, pentru EUR/USD și Nasdaq-100.', label: 'Din studiu / reacția la eveniment', contain: true },
  'automation-risk': { src: '/assets/projects/research-crossing/automation-shap.webp', alt: 'Grafic SHAP al contribuției variabilelor la modelul riscului de automatizare.', label: 'Din studiu / contribuția variabilelor', contain: true },
  'infect-exe': { src: '/assets/projects/infectexe.webp', alt: 'Captură din Infect.exe, un joc cu platforme și obstacole în alb și negru.', label: 'Gameplay / 1-BIT JAM 7' },
};

