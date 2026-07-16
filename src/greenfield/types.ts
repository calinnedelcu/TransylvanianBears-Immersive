export type SceneId =
  | 'signal'
  | 'gate'
  | 'workshop'
  | 'nexus'
  | 'aegis'
  | 'buried-hands'
  | 'research'
  | 'archive'
  | 'join';

export type SceneAlign = 'left' | 'right' | 'center';
export type SceneTone = 'mineral' | 'cyan' | 'moss' | 'mercury' | 'paper' | 'brass';
export type AssetKind = 'environment' | 'project' | 'portrait' | 'evidence' | 'video';
export type AssetStatus = 'placeholder' | 'research' | 'approved';
export type EvidenceStatus = 'verified' | 'team-confirmed' | 'pending';
export type ProjectId =
  | 'project-nexus'
  | 'aegis'
  | 'schoolmate'
  | 'the-buried-hands'
  | 'economy-news'
  | 'automation-risk'
  | 'infect-exe';
export type ProjectFacet = 'machine-learning' | 'research-paper' | 'school-software' | 'video-games';
export type ProjectState = 'active' | 'shipped' | 'archived' | 'research';

export type AssetSlot = {
  id: string;
  kind: AssetKind;
  status: AssetStatus;
  aspectRatio: `${number}:${number}`;
  minimumSize: `${number}x${number}`;
  subject: string;
  composition: string;
  motionRole: string;
  mobileTreatment: string;
  alt: string;
  previewSrc?: string;
};

export type Metric = {
  value: string;
  label: string;
  evidence: EvidenceStatus;
};

export type SceneDefinition = {
  id: SceneId;
  index: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  align: SceneAlign;
  tone: SceneTone;
  scrollVh: number;
  asset: AssetSlot;
  metrics?: Metric[];
  tags?: string[];
  projectIds?: ProjectId[];
  href?: string;
  hrefLabel?: string;
};

export type TeamMember = {
  id: string;
  name: string;
  discipline: string;
  portraitSrc: string;
  status: 'confirmed' | 'needs-review';
};

export type ArchiveEntry = {
  id: string;
  year: number;
  title: string;
  result: string;
  evidence: EvidenceStatus;
  kind: 'award' | 'ranking' | 'milestone';
  projectId?: ProjectId;
  note?: string;
  href?: string;
  imageSrc?: string;
  imageAlt?: string;
};

export type ProjectLink = {
  label: string;
  href: string;
  kind: 'repository' | 'build' | 'paper' | 'presentation';
};

export type ProjectCredit = {
  memberId: TeamMember['id'];
  role?: string;
  evidence: EvidenceStatus;
};

export type CaseStudyChapter = {
  id: string;
  index: string;
  label: string;
  title: string;
  body: string;
  note?: string;
  asset?: AssetSlot;
};

export type ProjectDefinition = {
  id: ProjectId;
  slug: string;
  index: string;
  title: string;
  shortTitle: string;
  facets: ProjectFacet[];
  disciplineLabel: string;
  year: number;
  state: ProjectState;
  evidence: EvidenceStatus;
  featured: boolean;
  summary: string;
  thesis: string;
  tags: string[];
  accent: SceneTone;
  heroAsset: AssetSlot;
  metrics?: Metric[];
  chapters: CaseStudyChapter[];
  links: ProjectLink[];
  credits: ProjectCredit[];
};
