import type { JourneyChapter } from '../../experience/chapters';
import type { ProjectId } from '../../types';
import { actFor, chapterTitle } from './acts';

/**
 * Where a system on the ring sends the reader.
 *
 * The citadel is the index, so a node is a door into the part of the story that
 * is about that system rather than a link out to a case study page. The grouping
 * itself lives in the act model; this is only the way in.
 */
export function chapterFor(project: ProjectId): JourneyChapter | null {
  return actFor(project)?.entry ?? null;
}

/**
 * The ring sends the reader out of the citadel and into the story, at the chapter
 * that is about the system they chose. The journey director restores the anchor
 * on load, so the reader arrives already inside that part of the road.
 */
export function chapterHref(project: ProjectId): string {
  const chapter = chapterFor(project);
  return chapter ? `/story#mf-${chapter}` : '/story';
}

/** The destination named the way the story names it, so the promise is checkable. */
export function chapterLabel(project: ProjectId): { index: string; label: string } {
  const chapter = chapterFor(project);
  return chapter ? chapterTitle(chapter) : { index: '', label: '' };
}
