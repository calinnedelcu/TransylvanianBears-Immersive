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
  systems: ProjectId[];
  /** Where a reader arrives when they choose this system. */
  entry: JourneyChapter;
  /** The last chapter of the act: where the way out belongs. */
  exit: JourneyChapter;
};

export const ACTS: Act[] = [
  { systems: ['project-nexus'], entry: 'field', exit: 'proof' },
  { systems: ['aegis'], entry: 'passage', exit: 'access' },
  { systems: ['schoolmate'], entry: 'schoolmate', exit: 'schoolmate' },
  { systems: ['the-buried-hands'], entry: 'descent', exit: 'build' },
  { systems: ['infect-exe'], entry: 'infect', exit: 'infect' },
  { systems: ['economy-news', 'automation-risk'], entry: 'research', exit: 'research' },
];

/**
 * The closing chapters belong to no single system.
 *
 * They are what the story says once every system has been seen, so they are the
 * end of the road rather than a door on the ring, and the last act hands over to
 * them instead of to another project.
 */
export const CLOSING_ENTRY: JourneyChapter = 'evidence-weave';

export function actFor(project: ProjectId): Act | undefined {
  return ACTS.find((act) => act.systems.includes(project));
}

export function actByExit(chapter: JourneyChapter): Act | undefined {
  return ACTS.find((act) => act.exit === chapter);
}

/** What follows this act on the road. Undefined once the systems run out. */
export function nextAct(act: Act): Act | undefined {
  return ACTS[ACTS.indexOf(act) + 1];
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
