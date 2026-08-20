import type { ProjectId } from '../../types';
import { actFor, actHref, chapterTitle, entryOf } from './acts';

/**
 * Where a system on the ring sends the reader.
 *
 * The citadel is the index, so a node opens the part of the story that is about
 * that system. An act is a destination of its own rather than an anchor inside a
 * longer document, because a reader who chose one system should not be able to
 * scroll out of either end of it into a neighbour they never asked for.
 */
export function chapterHref(project: ProjectId): string {
  const act = actFor(project);
  // Which system was chosen, not just which act it lives in: the research
  // crossing covers two, and the act has to open on the line the citadel said.
  return act ? `${actHref(act)}?from=${project}` : '/story';
}

/** The destination named the way the story names it, so the promise is checkable. */
export function chapterLabel(project: ProjectId): { index: string; label: string } {
  const act = actFor(project);
  return act ? chapterTitle(entryOf(act)) : { index: '', label: '' };
}
