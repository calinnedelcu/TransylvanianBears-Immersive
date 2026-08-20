import { JOURNEY_CHAPTERS, type JourneyChapter } from '../../experience/chapters';
import type { ProjectId } from '../../types';

/**
 * The story, read as places rather than as a reel.
 *
 * The chapters were authored to be walked through in order, and they still are,
 * but the citadel is the index: a system on the ring is a door into the part of
 * the story that is about that system. So the chapters group into acts, each act
 * belongs to one or more systems, and each act has a way in and a way out.
 *
 * Every grouping below is taken from what the chapters actually contain, not
 * from the names lining up. The research crossing covers two systems because it
 * genuinely covers both; splitting it to make the table symmetrical would be a
 * lie about where the work lives.
 */
export type Act = {
  /** The address this act lives at, under /story. */
  slug: string;
  systems: ProjectId[];
  /**
   * Everything the act contains, in order.
   *
   * An act is a destination rather than a stretch of one long document: the
   * reader chose this system, and scrolling out of either end of it into a
   * neighbour they did not choose makes the choice meaningless. Only these
   * chapters are on the page, so there is nothing to fall into.
   */
  chapters: JourneyChapter[];
};

export const ACTS: Act[] = [
  { slug: 'project-nexus', systems: ['project-nexus'], chapters: ['field', 'lens', 'proof'] },
  { slug: 'aegis', systems: ['aegis'], chapters: ['passage', 'access'] },
  { slug: 'schoolmate', systems: ['schoolmate'], chapters: ['schoolmate'] },
  { slug: 'the-buried-hands', systems: ['the-buried-hands'], chapters: ['descent', 'lamp', 'build'] },
  { slug: 'infect-exe', systems: ['infect-exe'], chapters: ['infect'] },
  { slug: 'research', systems: ['economy-news', 'automation-risk'], chapters: ['research'] },
];

/**
 * The closing is not about one system, so it is not on the ring. It is where the
 * last act hands over: what the story says once the work has been seen.
 */
export const CLOSING: Act = {
  slug: 'final',
  systems: [],
  chapters: ['evidence-weave', 'final-return', 'open-paths', 'dawn'],
};

export const ALL_ACTS = [...ACTS, CLOSING];

export function actBySlug(slug: string | undefined): Act | undefined {
  return slug ? ALL_ACTS.find((act) => act.slug === slug) : undefined;
}

export const entryOf = (act: Act) => act.chapters[0];
export const exitOf = (act: Act) => act.chapters[act.chapters.length - 1];

export function actFor(project: ProjectId): Act | undefined {
  return ACTS.find((act) => act.systems.includes(project));
}

export function actByExit(chapter: JourneyChapter): Act | undefined {
  return ALL_ACTS.find((act) => exitOf(act) === chapter);
}

/** What follows this act on the road. The closing is last and follows nothing. */
export function nextAct(act: Act): Act | undefined {
  const index = ACTS.indexOf(act);
  if (index < 0) return undefined;
  return ACTS[index + 1] ?? CLOSING;
}

/** Where an act lives. */
export function actHref(act: Act): string {
  return `/story/${act.slug}`;
}

export function chapterAnchor(chapter: JourneyChapter): string {
  return `#mf-${chapter}`;
}

/** The chapter named the way the story names it, so a promise is checkable. */
export function chapterTitle(chapter: JourneyChapter): { index: string; label: string } {
  const entry = JOURNEY_CHAPTERS.find((candidate) => candidate.id === chapter);
  return { index: entry?.index ?? '', label: entry?.label ?? chapter };
}

/**
 * Where the citadel stands, as a scroll offset.
 *
 * The opening is scroll driven end to end, so the citadel is not a place in the
 * document, it is a moment inside the threshold beat: at the top of that section
 * there is only the drawing. Anything aiming for the ring has to aim at the
 * moment, or it lands on the plan and makes the reader build it all again.
 */
export const CITADEL_MOMENT = 1;

export function citadelScrollTarget(): number | null {
  const beat = document.querySelector<HTMLElement>('#mf-threshold');
  if (!beat) return null;
  // The beat's progress completes a screen before its end, so the citadel stands
  // for that last screen. Aim at the start of it rather than at the very bottom,
  // where the next chapter is already pulling the frame away.
  const span = beat.offsetHeight - window.innerHeight;
  return beat.getBoundingClientRect().top + window.scrollY + span * CITADEL_MOMENT;
}
