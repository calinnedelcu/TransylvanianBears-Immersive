export type Evidence = 'verified' | 'team-confirmed' | 'pending';
export type Facet = 'machine-learning' | 'research-paper' | 'school-software' | 'video-games';
export type ProjectState = 'active' | 'shipped' | 'research';
export type Accent = 'cobalt' | 'mint' | 'sky' | 'gold' | 'bone' | 'coral' | 'ink' | 'lilac';

export type ProjectId =
  | 'project-nexus'
  | 'aegis'
  | 'schoolmate'
  | 'the-buried-hands'
  | 'economy-news'
  | 'automation-risk'
  | 'infect-exe';

export type Picture = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Optional responsive candidates, e.g. "/a-1024.webp 1024w, /a.webp 1912w". */
  srcSet?: string;
};

export type Figure = Picture & {
  caption: string;
  /** `contain` keeps charts and interfaces uncropped on a paper backdrop. */
  fit?: 'cover' | 'contain';
};

export type Metric = { value: string; label: string; evidence: Evidence };

export type ChapterMedia =
  | { kind: 'figure'; figure: Figure }
  | { kind: 'gallery'; figures: Figure[] }
  | { kind: 'compare'; before: Figure; after: Figure; label: string }
  | { kind: 'steps'; steps: { label: string; detail: string }[] }
  | { kind: 'chips'; label: string; items: string[] };

export type Chapter = {
  id: string;
  index: string;
  label: string;
  title: string;
  body: string;
  note?: string;
  media?: ChapterMedia;
};

export type ProjectLink = {
  label: string;
  href: string;
  kind: 'repository' | 'build' | 'paper' | 'presentation';
};

export type Project = {
  id: ProjectId;
  slug: string;
  index: string;
  title: string;
  shortTitle: string;
  facets: Facet[];
  discipline: string;
  year: number;
  state: ProjectState;
  evidence: Evidence;
  summary: string;
  thesis: string;
  tags: string[];
  accent: Accent;
  cover: Figure;
  metrics?: Metric[];
  chapters: Chapter[];
  links: ProjectLink[];
  credits: { memberId: string; role?: string }[];
};

export type Member = {
  id: string;
  name: string;
  firstName: string;
  discipline: string;
  accent: Accent;
  portrait: Picture;
};

export type ResultKind = 'award' | 'ranking' | 'milestone';

export type ResultEntry = {
  id: string;
  year: number;
  /** Short label used in tickers, e.g. "Project Nexus". */
  short: string;
  title: string;
  result: string;
  /** Placement shown on the medal; entries without a numeric placement leave it out. */
  place?: number;
  evidence: Evidence;
  kind: ResultKind;
  projectId?: ProjectId;
  note?: string;
  href?: string;
  /** Photographs fill their frame; certificates and tables stay uncropped. */
  image?: Picture & { fit?: 'cover' | 'contain' };
};
