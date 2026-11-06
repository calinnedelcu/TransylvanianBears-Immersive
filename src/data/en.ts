import type { Evidence, ProjectId, ProjectState } from './types';

/**
 * English text for the site. Only words live here: images, numbers, links and the
 * structure come from the Romanian data (projects.ts, results.ts, team.ts, site.ts),
 * and src/i18n/content.ts lays these strings over it, item by item.
 */

export type FigureText = { alt: string; caption: string };

export type ChapterText = {
  label: string;
  title: string;
  body: string;
  note?: string;
  figure?: FigureText;
  figures?: FigureText[];
  compare?: { label: string; before: FigureText; after: FigureText };
  steps?: { label: string; detail: string }[];
  chips?: { label: string; items: string[] };
};

export type ProjectText = {
  title?: string;
  shortTitle?: string;
  discipline: string;
  summary: string;
  thesis: string;
  tags?: string[];
  cover: FigureText;
  /** Metric labels, in order. */
  metrics?: string[];
  chapters: ChapterText[];
  /** Link labels, in order. */
  links: string[];
};

export const SITE_EN = {
  defaultDescription:
    'Transylvanian Bears builds software products, games and applied research at C.N.I. Tudor Vianu in Bucharest.',
  city: 'Bucharest',
};

export const NAV_EN: Record<string, string> = {
  proiecte: 'Projects',
  rezultate: 'Results',
  echipa: 'Team',
  contact: 'Contact',
};

export const EVIDENCE_LABEL_EN: Record<Evidence, string> = {
  verified: 'Verified source',
  'team-confirmed': 'Confirmed by the team',
  pending: 'Being confirmed',
};

export const STATE_LABEL_EN: Record<ProjectState, string> = {
  active: 'In development',
  shipped: 'Released',
  research: 'Research',
};

export const COPY_EN = {
  hero: {
    kicker: 'C.N.I. Tudor Vianu / Bucharest',
    lede: 'A computer science team that builds products, games and research. Every project starts from a real problem and ends with something that can be tested.',
  },
  pillars: {
    title: 'We observe. We protect. We imagine. We measure.',
    body: 'No single technology defines us. What defines us is how we turn unclear signals into systems that can be demonstrated.',
  },
  projects: {
    title: 'From idea to the real world.',
    body: 'Worlds you play in. Software you use. Research you can follow all the way to the data.',
  },
  results: {
    title: 'Results come with context, a date and proof.',
    body: 'Every entry keeps the status of its proof and a link to the project behind it.',
  },
  team: {
    title: 'A team is explained by contributions, not adjectives.',
    body: 'The six members of Transylvanian Bears and their confirmed contributions to the team’s projects.',
  },
  contact: {
    title: 'The next signal could come from you.',
    body: 'Collaborations, competitions, mentoring and new members. Tell us what you want to build and what you can bring to the table.',
  },
};

export const PILLARS_EN = [
  {
    verb: 'We observe',
    line: 'Trained in virtual worlds. Tested on real data.',
    body: 'Project Nexus uses synthetic environments built in Unreal Engine 5 and AirSim to generate training data for aerial detection with YOLOv8.',
  },
  {
    verb: 'We protect',
    line: 'Two products for the same school.',
    body: 'Aegis secures access with a short, dynamic, single-use QR token. SchoolMate separately handles communication and operations between students, parents, teachers, the school office and the gate.',
  },
  {
    verb: 'We imagine',
    line: 'You learn a world through its rules.',
    body: 'A stealth puzzle set in the mausoleum of Qin Shi Huang. The player survives through tools, limited light and understanding the mechanisms, not through force.',
  },
  {
    verb: 'We measure',
    line: 'We don’t dress up conclusions. We show the method.',
    body: 'EconomyNews studies the link between unexpected financial news, LLM sentiment and intraday reactions. A second project estimates how exposed occupations are to automation using machine learning.',
  },
];

export const PROJECTS_EN: Record<ProjectId, ProjectText> = {
  'project-nexus': {
    discipline: 'Machine learning / Computer vision',
    summary:
      'A pipeline that generates synthetic aerial data in Unreal Engine 5 and uses it to detect people with YOLOv8.',
    thesis:
      'A controlled world can become a lab for situations that are rare, expensive or hard to annotate in reality.',
    cover: {
      alt: 'Aerial view of the synthetic city built in Unreal Engine 5 for Project Nexus.',
      caption: 'Synthetic environment / Unreal Engine 5',
    },
    metrics: ['synthetic scenarios', 'images in total', 'automatic annotations'],
    chapters: [
      {
        label: 'Context',
        title: 'The data is the problem before the model is the solution.',
        body: 'The project treats building the dataset as part of the system, not as a hidden step. Scenes, weather, time of day and the drone’s position can be controlled and repeated.',
      },
      {
        label: 'Pipeline',
        title: 'Capture, segmentation and annotation in one loop.',
        body: 'AirSim drives the aerial capture, and the pipeline produces the images and masks needed for training. The dataset is split 90% train and 10% validation.',
        compare: {
          label: 'Compare segmentation with detection',
          before: {
            alt: 'Synthetic Nexus frame with people highlighted in green.',
            caption: 'Segmentation — people are highlighted in the synthetic frame.',
          },
          after: {
            alt: 'Synthetic Nexus frame with blue detection boxes.',
            caption: 'Detection — the boxes show the output of the detection stage.',
          },
        },
      },
      {
        label: 'Validation',
        title: 'A synthetic world has to face a real one.',
        body: 'The YOLOv8 model is tested on synthetic data and on the Stanford Drone Dataset. Results for the two kinds of data must be read separately.',
        note: 'The capture illustrates the detections; it is not an aggregate accuracy measure. The experiment details are in the project presentation.',
        figure: {
          alt: 'Detections highlighted on a real aerial image from the Project Nexus validation.',
          caption: 'Validation / real aerial frame',
        },
      },
    ],
    links: ['Project presentation'],
  },
  aegis: {
    discipline: 'School software / Secure access',
    summary: 'A school access system built on a short, dynamic, single-use QR token.',
    thesis: 'A few seconds at the gate can stay simple for the user without being shallow in the infrastructure.',
    cover: {
      alt: 'The Aegis mobile app showing the QR token for entering campus.',
      caption: 'Interface / campus access',
    },
    metrics: ['token expiry', 'atomic redeem', 'roles in Aegis'],
    chapters: [
      {
        label: 'Core flow',
        title: 'One short code, one path through the system.',
        body: 'Aegis generates a temporary cryptographic token, shows it as a QR code and validates it according to the user’s role. Once used or expired, the token can no longer open the gate.',
        steps: [
          { label: 'Issue', detail: 'A temporary cryptographic token.' },
          { label: 'QR scan', detail: 'The token is shown as a QR code.' },
          { label: 'Validation', detail: 'Checked against the user’s role.' },
          { label: 'Single use', detail: 'Once used or expired, it no longer opens the gate.' },
        ],
      },
      {
        label: 'System',
        title: 'Security depends on the role, not just the code.',
        body: 'The Aegis core separates students, parents, teachers, administrators and access devices. Token validation takes the user’s role into account.',
        chips: {
          label: 'The five roles in the Aegis core',
          items: ['Students', 'Parents', 'Teachers', 'Administrators', 'Access devices'],
        },
      },
      {
        label: 'Result',
        title: 'The product and the result stay in the same case.',
        body: 'Aegis won 2nd place at Skills for the Future. The project’s code is available in its public repository.',
        note: 'Full credits for the competition phase are still being confirmed.',
      },
    ],
    links: ['Aegis repository'],
  },
  schoolmate: {
    discipline: 'School software / Operations',
    summary: 'A platform for announcements, requests, timetables and workflows between students, parents, teachers and the school office.',
    thesis: 'School software becomes useful when it connects roles and daily workflows without adding another layer of friction.',
    cover: {
      alt: 'The SchoolMate interface for the school office, with announcements and requests.',
      caption: 'Interface / school administration',
    },
    chapters: [
      {
        label: 'Context',
        title: 'A school is neither a single workflow nor a single user.',
        body: 'SchoolMate brings together announcements, requests and timetables for students, parents, teachers and the administration. Each role starts from different tasks in the same school.',
      },
      {
        label: 'Product',
        title: 'Announcements, requests and timetables in one shared system.',
        body: 'The school office interface groups announcements and requests. How the workflows are implemented can be followed in the project repository.',
      },
      {
        label: 'Continuity',
        title: 'Access and school operations.',
        body: 'Aegis handles campus access with a temporary QR token. SchoolMate focuses on communication and school operations. They are presented separately; the exact technical link between them is not documented here.',
      },
    ],
    links: ['SchoolMate repository'],
  },
  'the-buried-hands': {
    discipline: 'Video game / Stealth puzzle',
    summary:
      'A stealth puzzle in the mausoleum of Qin Shi Huang, where a craftsman survives through light, tools and understanding the mechanisms.',
    thesis: 'The player doesn’t need to get stronger; they need to understand the world they are trapped in.',
    cover: {
      alt: 'Screenshot from The Buried Hands: exploring the mausoleum by lamplight.',
      caption: 'Gameplay / stealth & puzzle',
    },
    chapters: [
      {
        label: 'Premise',
        title: 'A craftsman, not a warrior.',
        body: 'The character is trapped inside the mausoleum as it is being sealed. With no armour and no strength, the design shifts towards observation, avoidance and using objects the character built himself.',
        figure: {
          alt: 'The player watches the guards from behind a column in The Buried Hands.',
          caption: 'Gameplay / observation and avoidance',
        },
      },
      {
        label: 'Systems',
        title: 'Light, footsteps and mechanisms become one problem.',
        body: 'The lamp has limited fuel, the guards hear footsteps, and traps and mercury vapour create distinct dangers. These mechanics ask the player to read the environment and choose a route carefully.',
        figures: [
          {
            alt: 'The royal hall in The Buried Hands, with lit statues in alcoves and a circular ceiling.',
            caption: 'The royal hall',
          },
          {
            alt: 'A mechanism with a balance and chains in The Buried Hands, seen from the player’s point of view.',
            caption: 'The mechanism',
          },
          {
            alt: 'From a wooden walkway, the player looks into a deep hall filled with vapour in The Buried Hands.',
            caption: 'Mercury vapour',
          },
        ],
      },
      {
        label: 'Build',
        title: 'A public game should be playable, not just described.',
        body: 'The public build is available on itch.io. The game page gives access to the experience and to the information published by the authors.',
      },
    ],
    links: ['Play on itch.io'],
  },
  'economy-news': {
    discipline: 'Economic research / Machine learning',
    summary:
      'Research on unexpected financial news, sentiment extracted with language models, and the intraday reaction of markets.',
    thesis: 'A conclusion about the market is only worth something if the event, the time window and the method can be traced back to the source.',
    cover: {
      alt: 'Chart of the daily number of analysed events, by category, between April 2025 and May 2026 (N = 2,449).',
      caption: 'From the study / the analysed events',
    },
    metrics: ['events analysed', 'data window', 'assets tracked'],
    chapters: [
      {
        label: 'The question',
        title: 'What happens after a truly unexpected piece of news?',
        body: 'The project links financial events, sentiment and intraday moves. The paper describes the hypothesis, the data universe and the definition of surprise used in the analysis.',
      },
      {
        label: 'The method',
        title: 'The method has to stay visible next to the result.',
        body: 'The analysis follows event collection, sentiment and the market reaction. The figure compares absolute returns before and after the event; the paper and the code give the methodological context.',
        figure: {
          alt: 'Chart of absolute returns before and after events, for EUR/USD and the Nasdaq-100.',
          caption: 'From the study / reaction to the event',
        },
      },
      {
        label: 'Limits',
        title: 'Magnitude, direction and latency.',
        body: 'The study separates the size of the move from the directional value of sentiment, and keeps the latency of the public feed in view.',
        note: 'The results should be read together with the methodology, the baseline and the limitations described in the paper.',
      },
    ],
    links: ['Research paper', 'Repository and reproduction'],
  },
  'automation-risk': {
    title: 'Automation risk of occupations',
    discipline: 'Labour research / Machine learning',
    summary: 'A project that estimates the automation risk of occupations using machine learning methods.',
    thesis: 'A score about the future of work has to be explained through data, variables and limits, not presented as a verdict.',
    cover: {
      alt: 'SHAP chart showing how each variable contributes to the automation risk model.',
      caption: 'From the study / variable contributions',
    },
    metrics: ['ESCO occupations', 'COR occupations mapped', 'COR coverage'],
    chapters: [
      {
        label: 'Framing',
        title: 'An estimated risk is not a sentence.',
        body: 'The project estimates automation risk from occupational data. The score has to be read together with the variables, the data coverage and the model’s limits.',
      },
      {
        label: 'The model',
        title: 'What drives the model’s estimate.',
        body: 'The SHAP figure shows how each variable contributes to the model’s output. The repository gives access to the implementation and the analysis materials.',
      },
      {
        label: 'Context',
        title: 'Data coverage limits the interpretation.',
        body: 'The mapping reported by the team covers 654 COR occupations, a coverage of 14.7%. The results do not describe every occupation in that classification.',
      },
    ],
    links: ['Repository'],
  },
  'infect-exe': {
    discipline: 'Video game / 1-bit action',
    summary:
      'A 1-bit game built for 1-BIT JAM 7, in which the player infiltrates a system as a virus and attacks its subsystems.',
    thesis: 'A strict visual limit can become a rule of the world, feedback and identity at the same time.',
    cover: {
      alt: 'Screenshot from Infect.exe, a black-and-white game with platforms and obstacles.',
      caption: 'Gameplay / 1-BIT JAM 7',
    },
    metrics: ['overall / 56', 'theme', 'art'],
    chapters: [
      {
        label: 'The constraint',
        title: 'One bit for the world and for the feedback.',
        body: 'The 1-bit palette is not treated as a filter. The interface, silhouettes, attacks and readability all have to work within the same limit.',
      },
      {
        label: 'Game loop',
        title: 'Infiltrate. Dodge. Destroy the subsystem.',
        body: 'The player infiltrates the system as a virus, avoids obstacles and attacks its subsystems. The screenshots show the CPU and GPU zones of the game.',
        figures: [
          {
            alt: 'Screenshot from Infect.exe: a wiring puzzle inside a system window, with 30 seconds on the clock.',
            caption: 'CPU zone',
          },
          {
            alt: 'Screenshot from Infect.exe: platforms and the message “Find the firewall destroyer and the CPU key”.',
            caption: 'GPU zone',
          },
        ],
      },
      {
        label: 'Result',
        title: 'The ranking stays linked to the official page.',
        body: 'The game placed 19th overall, 8th for theme and 14th for art out of 56 entries at 1-BIT JAM 7.',
      },
    ],
    links: ['Play on itch.io', 'Jam results'],
  },
};

export const METRIC_VALUES_EN: Record<string, string> = {
  '~9.500': '~9,500',
  '>140.000': '>140,000',
  '2.449': '2,449',
  '13 luni': '13 months',
  '3.037': '3,037',
  '14,7%': '14.7%',
};

export const RESULTS_EN: Record<string, { title?: string; result: string; note?: string; alt?: string; short?: string }> = {
  'nexus-first-place': {
    result: '1st place',
    alt: 'The Project Nexus team holding the winners’ diploma in front of the event board.',
  },
  'automation-risk-first-place': {
    short: 'Automation risk',
    title: 'Assessing the automation risk of occupations',
    result: '1st place',
    note: 'The competition and its official proof will be added.',
  },
  'aegis-skills-future': {
    result: '2nd place',
    alt: 'The Skills for the Future 2026 finalists at the national event.',
  },
  'buried-hands-game-jam': {
    result: '2nd place',
    note: 'Ranking confirmed in the event’s official RGDA video.',
  },
  'schoolmate-hardcore-entrepreneur': {
    result: 'Honourable mention',
  },
  'economy-news-siat': {
    title: 'Joseph Schumpeter, 2nd edition / EconomyNews',
    result: 'Honourable mention',
    note: 'A competition for scientific papers in economics.',
    alt: 'EconomyNews’ participation diploma from the Joseph Schumpeter competition.',
  },
  'deutsche-bank-internship': {
    result: 'Internship',
    note: 'The details of the participation are still to be confirmed.',
  },
  'chronos-ctf-juniors': {
    result: '3rd place',
    note: 'International Cybersecurity CTF Competition, online, 7–9 November 2025.',
    alt: 'Third-place certificate in the Juniors category of the Chronos Security CTF 2025.',
  },
  'infect-exe-one-bit-jam': {
    result: '19th overall',
    note: '8th for theme and 14th for art, out of 56 entries.',
    alt: 'The Infect.exe ranking table at 1-BIT JAM 7.',
  },
};

/** Words used by the interface itself (buttons, labels, headings). */
export const UI_EN = {
  skipToContent: 'Skip to content',
  homeLabel: 'home page',
  mainNav: 'Main navigation',
  mainMenu: 'Main menu',
  menu: 'Menu',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  writeToUs: 'Write to us',
  language: 'Language',
  switchTo: 'Română',
  switchToShort: 'RO',
  footerTagline: 'Products, games and applied research.',
  secondaryNav: 'Secondary navigation',
  onSite: 'On this site',
  backToTop: 'Back to top',
  homeTitle: 'Products, games and applied research',
  seeProjects: 'See the projects',
  meetTeam: 'Meet the team',
  teamLineup: 'The team',
  seal: (projects: number, builders: number, results: number) =>
    `${projects} projects • ${builders} builders • ${results} results • `,
  whatDefinesUs: 'What defines us',
  projectsIndex: '01 / Projects',
  resultsIndex: '02 / Results',
  teamIndex: '03 / Team',
  contactIndex: '04 / Contact',
  techAndThemes: 'Technologies and themes',
  kind: { award: 'Award', ranking: 'Ranking', milestone: 'Milestone' },
  place1: '1st place',
  place2: '2nd place',
  place3: '3rd place',
  mentions: 'Mentions',
  proofPreview: 'Proof preview',
  enlarge: 'Enlarge image',
  resultsOf: (year: number) => `Results ${year}`,
  officialSource: 'Official source',
  viewProof: 'View proof',
  contributedTo: (name: string) => `Projects ${name} contributed to`,
  creditsPending: 'Credits being confirmed',
  topics: ['Collaborations', 'Competitions', 'Mentoring', 'New members'],
  copied: 'Address copied',
  copyAddress: 'Copy address',
  copiedStatus: 'The e-mail address was copied.',
  emailPrompt: 'E-mail address:',
  whatToTalkAbout: 'What we can talk about',
  allProjects: 'All projects',
  projectFigures: 'Project results and figures',
  inThisProject: 'In this project',
  sourcesAndTeam: 'Sources & team',
  projectIdea: 'The idea behind the project',
  idea: 'The idea',
  sources: 'Sources',
  exploreFurther: 'Explore further.',
  team: 'Team',
  contributors: 'Contributors.',
  contributorsPending: 'Credits by role for this project are still to be confirmed.',
  moreProjects: 'More projects',
  previousProject: 'Previous project',
  nextProject: 'Next project',
  caseStudy: 'Case study',
  notFoundTitle: 'Page not found',
  error404: 'Error 404',
  notFoundHeading: 'This road is not part of the system.',
  notFoundLead: 'The page you asked for does not exist. Head back to the home page or go straight to the projects.',
  backHome: 'Back home',
  enlargedImage: 'Enlarged image',
  closeImage: 'Close image',
  segmentation: 'Segmentation',
  detection: 'Detection',
};
