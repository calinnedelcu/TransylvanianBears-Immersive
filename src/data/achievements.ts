export type AchievementCategory = 'national' | 'international' | 'hackathon';
export type AchievementRanking = 'gold' | 'silver' | 'bronze' | 'finalist';

export type Achievement = {
  id: string;
  year: number;
  /** Optional month (1-12) — used for ordering within a year. */
  month?: number;
  category: AchievementCategory;
  title: string;
  /** Short context — competition, location, etc. Bilingual; falls back to ro. */
  detail: string | { ro: string; en: string };
  ranking: AchievementRanking;
  /** Optional external link (presentation, project page, news article…). */
  link?: string;
  /** Optional label shown for the link; defaults to "Open" when absent. Bilingual. */
  linkLabel?: string | { ro: string; en: string };
  /**
   * Optional image revealed on card hover/focus in the timeline.
   * Path relative to `public/`, e.g. `/assets/achievements/<id>.webp`.
   */
  image?: string;
};

/**
 * Real achievement timeline. The team formed in 2025; each entry below is a
 * placement we can prove with a public link or article. The constellation in
 * §Achievements draws lines between consecutive entries in chronological
 * order, so order matters — keep ascending by (year, month).
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'vianu-game-jam-2025',
    year: 2025,
    month: 5,
    category: 'national',
    title: 'Vianu Game Jam 2025',
    detail: {
      ro: 'Locul 5 național la Game Development Month cu „No Other Choice" — un horror narativ choice-based unde joci un călător blocat într-o casă bântuită de un fantom manipulator. Multiple finaluri în funcție de deciziile tale.',
      en: '5th place nationally at Game Development Month with "No Other Choice" — a choice-based horror narrative where you play a traveler trapped in a haunted house with a manipulative ghost. Multiple endings driven by your decisions.',
    },
    ranking: 'finalist',
    link: 'https://arkrall.itch.io/no-other-choices',
    linkLabel: { ro: 'Joacă pe itch.io', en: 'Play on itch.io' },
    image: '/assets/achievements/vianu-game-jam-2025.webp',
  },
  {
    id: 'chronos-ctf-2025',
    year: 2025,
    month: 11,
    category: 'international',
    title: 'Chronos Security CTF',
    detail: {
      ro: 'Locul 3 la categoria Juniors — challenge-uri din web security, criptografie, reverse engineering și forensics.',
      en: '3rd place in the Juniors category — challenges across web security, cryptography, reverse engineering, and forensics.',
    },
    ranking: 'bronze',
    image: '/assets/achievements/chronos-ctf-2025.webp',
  },
  {
    id: '1bit-jam-7-2025',
    year: 2025,
    month: 11,
    category: 'international',
    title: '1-BIT JAM 7',
    detail: {
      ro: 'Locul 19 la game jam-ul internațional 1-BIT JAM 7 — joc complet în Unity, grafică și sunet originale, livrat în 7 zile.',
      en: '19th place at the international 1-BIT JAM 7 — full Unity game, original art and sound, shipped in 7 days.',
    },
    ranking: 'finalist',
    link: 'https://shieldsentinel.itch.io/infectexe',
    linkLabel: { ro: 'Joacă pe itch.io', en: 'Play on itch.io' },
    image: '/assets/achievements/1bit-jam-7-2025.webp',
  },
  {
    id: 'project-nexus-2026',
    year: 2026,
    month: 3,
    category: 'national',
    title: 'Project Nexus — htechrobotics',
    detail: {
      ro: 'Locul 1 la competiția națională Project Nexus cu o soluție AI: dataset-uri sintetice de drone generate în Unreal Engine 5 și modele YOLOv8 antrenate pentru detectarea persoanelor din aer.',
      en: '1st place at the national Project Nexus competition with an AI pipeline: synthetic drone datasets generated in Unreal Engine 5 and YOLOv8 models trained for aerial person detection.',
    },
    ranking: 'gold',
    link: 'https://docs.google.com/presentation/d/1IFLpSXYsgB3ro6IvawuXEFcsHJaB_8aAPX1dooPD5Xg/edit?usp=sharing',
    linkLabel: { ro: 'Prezentare proiect', en: 'Project deck' },
    image: '/assets/achievements/project-nexus-2026.webp',
  },
  {
    id: 'aegis-skills-future-2026',
    year: 2026,
    month: 4,
    category: 'national',
    title: 'Skills for the Future — Agile IRL',
    detail: {
      ro: 'Locul 2 național cu Aegis, aplicație pentru securizarea și digitalizarea accesului în școli. Program DB Global Technology × Junior Achievement România.',
      en: '2nd place nationally with Aegis, an app that secures and digitizes school access. Program by DB Global Technology × Junior Achievement Romania.',
    },
    ranking: 'silver',
    link: 'https://www.jaromania.org/noutati/articole/news/o-noua-editie-a-programului-skills-for-the-future-se-deruleaza-in-bucuresti',
    linkLabel: { ro: 'Articol JA România', en: 'JA Romania article' },
    image: '/assets/achievements/aegis-skills-future-2026.webp',
  },
  {
    id: 'vianu-game-jam-2026',
    year: 2026,
    month: 5,
    category: 'national',
    title: 'Vianu Game Jam 2026',
    detail: {
      ro: 'Locul 2 național cu „The Buried Hands" — joc stealth-puzzle în Mausoleul lui Qin Shi Huang (210 î.Hr.). Joci un meșteșugar prins la sigilarea complexului, supraviețuind cu lampă cu ulei, curse mecanice și vapori de mercur.',
      en: '2nd place nationally with "The Buried Hands" — stealth-puzzle game set in the Mausoleum of Qin Shi Huang (210 BC). You play a craftsman trapped during the sealing, surviving with an oil lamp, mechanical traps, and mercury vapors.',
    },
    ranking: 'silver',
    link: 'https://juggypuggy.itch.io/the-buried-hands',
    linkLabel: { ro: 'Joacă pe itch.io', en: 'Play on itch.io' },
    image: '/assets/projects/the-buried-hands.webp',
  },
  {
    id: 'siat-schumpeter-2026',
    year: 2026,
    month: 5,
    category: 'national',
    title: 'SIAT — Concursul Joseph Schumpeter, ed. II',
    detail: {
      ro: 'Mențiune la Concursul de Comunicări Științifice în domeniul economiei Joseph Schumpeter, ediția a II-a. Lucrare: „Unexpected Financial News, LLM-Based Sentiment, and Intraday Price Reactions — Evidence from EUR/USD and Nasdaq-100". Autori: Andrei Nedelcu & Andrei Cheroiu, C.N.I. Tudor Vianu.',
      en: 'Mention at the Joseph Schumpeter Scientific Communications Contest in Economics, 2nd edition. Paper: "Unexpected Financial News, LLM-Based Sentiment, and Intraday Price Reactions — Evidence from EUR/USD and Nasdaq-100". Authors: Andrei Nedelcu & Andrei Cheroiu, C.N.I. Tudor Vianu.',
    },
    ranking: 'finalist',
    link: '/assets/projects/siat-financial-news.docx',
    linkLabel: { ro: 'Citește lucrarea', en: 'Read the paper' },
    image: '/assets/projects/siat-diploma.webp',
  },
];

export const RANKING_COLOR: Record<AchievementRanking, string> = {
  gold: '#E8B547',
  silver: '#D6D6CF',
  bronze: '#C68642',
  finalist: '#9C7CD1',
};

export const RANKING_LABEL: Record<AchievementRanking, { ro: string; en: string }> = {
  gold: { ro: 'Aur', en: 'Gold' },
  silver: { ro: 'Argint', en: 'Silver' },
  bronze: { ro: 'Bronz', en: 'Bronze' },
  finalist: { ro: 'Finalist', en: 'Finalist' },
};
