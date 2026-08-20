import { JOURNEY_CHAPTERS, type JourneyChapter } from '../../experience/chapters';
import type { ProjectId } from '../../types';

/**
 * Which chapter of the story each system on the ring opens into.
 *
 * The citadel is not an illustration of the work: every node is a real project,
 * and the story already walks through those projects in 3D. Without this the
 * ring is a menu that leads out of the experience to a case study page, which
 * is exactly the handover the opening was built to avoid.
 *
 * Every pairing below is taken from what the chapter actually says, not from
 * the names lining up:
 *
 *   field       kicker reads "Project Nexus / synthetic field"
 *   passage     the chapter is titled "Aegis passage"
 *   schoolmate  the chapter is titled "School products"
 *   descent     kicker reads "Continuity rule / SchoolMate -> The Buried Hands"
 *   research    both remaining projects appear in ResearchCrossing.tsx
 *   infect      the chapter is titled "1-bit breach"
 *
 * The Buried Hands enters at the descent rather than at the build proof: the
 * descent is where the buried act begins and carries the whole mausoleum, while
 * the build is one gameplay panel from inside it.
 *
 * Two systems share the research crossing. That is the truth of the material
 * rather than a gap: the crossing covers both, and sending one of them somewhere
 * lonelier to keep the table tidy would be a lie about where the work lives.
 */
export const NODE_CHAPTER: Record<ProjectId, JourneyChapter> = {
  'project-nexus': 'field',
  aegis: 'passage',
  schoolmate: 'schoolmate',
  'the-buried-hands': 'descent',
  'economy-news': 'research',
  'automation-risk': 'research',
  'infect-exe': 'infect',
};

/**
 * Where a node sends the reader.
 *
 * The same anchor works from either side, which is what makes it testable before
 * the opening is mounted in the story: from the lab page it is a cross document
 * link the journey director restores on load, and once the sequence lives on the
 * front page it is a same page anchor that the smooth scroll takes over.
 */
export function chapterHref(project: ProjectId): string {
  return `/#mf-${NODE_CHAPTER[project]}`;
}

/** The destination named the way the story names it, so the promise is checkable. */
export function chapterLabel(project: ProjectId): { index: string; label: string } {
  const chapter = NODE_CHAPTER[project];
  const entry = JOURNEY_CHAPTERS.find((candidate) => candidate.id === chapter);
  return { index: entry?.index ?? '', label: entry?.label ?? chapter };
}
