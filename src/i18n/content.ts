import {
  COPY,
  EVIDENCE_LABEL,
  NAV,
  PILLARS,
  PROJECTS,
  RESULTS,
  SITE,
  STATE_LABEL,
  TEAM,
  resultStats,
  type ChapterMedia,
  type Figure,
  type Member,
  type Project,
  type ResultEntry,
} from '../data';
import {
  COPY_EN,
  EVIDENCE_LABEL_EN,
  METRIC_VALUES_EN,
  NAV_EN,
  PILLARS_EN,
  PROJECTS_EN,
  RESULTS_EN,
  SITE_EN,
  STATE_LABEL_EN,
  UI_EN,
  type ChapterText,
  type FigureText,
} from '../data/en';
import { UI_RO } from '../data/ui';

export type Lang = 'ro' | 'en';
export const LANGS: Lang[] = ['ro', 'en'];

/** URL prefix of each language: Romanian lives at the root, English under /en. */
export const PREFIX: Record<Lang, string> = { ro: '', en: '/en' };

const withText = <T extends Figure | (Figure & { fit?: string })>(figure: T, text?: FigureText): T =>
  text ? { ...figure, alt: text.alt, caption: text.caption } : figure;

function localizeMedia(media: ChapterMedia | undefined, text: ChapterText): ChapterMedia | undefined {
  if (!media) return media;
  switch (media.kind) {
    case 'figure':
      return { ...media, figure: withText(media.figure, text.figure) };
    case 'gallery':
      return { ...media, figures: media.figures.map((figure, index) => withText(figure, text.figures?.[index])) };
    case 'compare':
      return text.compare
        ? {
            ...media,
            label: text.compare.label,
            before: withText(media.before, text.compare.before),
            after: withText(media.after, text.compare.after),
          }
        : media;
    case 'steps':
      return text.steps ? { ...media, steps: text.steps } : media;
    case 'chips':
      return text.chips ? { ...media, label: text.chips.label, items: text.chips.items } : media;
  }
}

function localizeProject(project: Project): Project {
  const text = PROJECTS_EN[project.id];
  return {
    ...project,
    title: text.title ?? project.title,
    shortTitle: text.shortTitle ?? project.shortTitle,
    discipline: text.discipline,
    summary: text.summary,
    thesis: text.thesis,
    tags: text.tags ?? project.tags,
    cover: withText(project.cover, text.cover),
    metrics: project.metrics?.map((metric, index) => ({
      ...metric,
      value: METRIC_VALUES_EN[metric.value] ?? metric.value,
      label: text.metrics?.[index] ?? metric.label,
    })),
    chapters: project.chapters.map((chapter, index) => {
      const chapterText = text.chapters[index];
      if (!chapterText) return chapter;
      return {
        ...chapter,
        label: chapterText.label,
        title: chapterText.title,
        body: chapterText.body,
        note: chapterText.note ?? (chapter.note ? undefined : chapter.note),
        media: localizeMedia(chapter.media, chapterText),
      };
    }),
    links: project.links.map((link, index) => ({ ...link, label: text.links[index] ?? link.label })),
  };
}

function localizeResult(entry: ResultEntry): ResultEntry {
  const text = RESULTS_EN[entry.id];
  if (!text) return entry;
  return {
    ...entry,
    short: text.short ?? entry.short,
    title: text.title ?? entry.title,
    result: text.result,
    note: text.note ?? (entry.note ? undefined : entry.note),
    image: entry.image && text.alt ? { ...entry.image, alt: text.alt } : entry.image,
  };
}

const localizeMember = (member: Member): Member => ({
  ...member,
  portrait: { ...member.portrait, alt: `Portrait of ${member.name}` },
});

function build(lang: Lang) {
  const en = lang === 'en';
  const projects = en ? PROJECTS.map(localizeProject) : PROJECTS;
  const team = en ? TEAM.map(localizeMember) : TEAM;
  const site = en ? { ...SITE, ...SITE_EN } : SITE;

  return {
    lang,
    prefix: PREFIX[lang],
    /** Path of `path` (written for the Romanian site) in this language. */
    path: (path: string) => (en ? (path === '/' ? '/en' : `/en${path}`) : path),
    SITE: site,
    NAV: en ? NAV.map((item) => ({ ...item, label: NAV_EN[item.id] ?? item.label })) : NAV,
    COPY: en ? COPY_EN : COPY,
    PILLARS: en ? PILLARS.map((pillar, index) => ({ ...pillar, ...PILLARS_EN[index] })) : PILLARS,
    PROJECTS: projects,
    projectBySlug: Object.fromEntries(projects.map((project) => [project.slug, project])) as Record<string, Project>,
    projectById: Object.fromEntries(projects.map((project) => [project.id, project])) as Record<Project['id'], Project>,
    RESULTS: en ? RESULTS.map(localizeResult) : RESULTS,
    resultStats,
    TEAM: team,
    memberById: Object.fromEntries(team.map((member) => [member.id, member])) as Record<string, Member>,
    EVIDENCE_LABEL: en ? EVIDENCE_LABEL_EN : EVIDENCE_LABEL,
    STATE_LABEL: en ? STATE_LABEL_EN : STATE_LABEL,
    UI: en ? UI_EN : UI_RO,
  };
}

export type Content = ReturnType<typeof build>;

export const CONTENT: Record<Lang, Content> = { ro: build('ro'), en: build('en') };
