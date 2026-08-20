import type { MouseEvent } from 'react';
import { scrollSmoothTo } from '../../../components/smoothScroll';
import type { JourneyChapter } from '../../experience/chapters';
import { projectById } from '../../data';
import {
  CLOSING_ENTRY,
  actByExit,
  chapterAnchor,
  chapterTitle,
  citadelScrollTarget,
  nextAct,
} from '../hero-plan/acts';

/**
 * The way out of an act.
 *
 * The citadel is the index, which only means anything if a system can be left as
 * deliberately as it was entered. Without this the story is a single reel again:
 * a reader who chose one system is carried into the next whether they meant to or
 * not, and the ring they came from is somewhere far above with no way back except
 * the scrollbar.
 *
 * Two ways out, because there are two honest intentions at the end of a project:
 * see another one, or go back and choose.
 */

export function ActExit({ chapter }: { chapter: JourneyChapter }) {
  const act = actByExit(chapter);
  if (!act) return null;

  const following = nextAct(act);
  const onward = following
    ? {
        chapter: following.entry,
        // Named by the system rather than the chapter: the reader chose a system
        // on the ring, so that is the vocabulary they are holding.
        label: following.systems.map((id) => projectById[id].shortTitle).join(' · '),
      }
    : { chapter: CLOSING_ENTRY, label: chapterTitle(CLOSING_ENTRY).label };

  const travel = (target: number | null) => (event: MouseEvent<HTMLAnchorElement>) => {
    // Plain anchors underneath, so the destinations survive a middle click, a
    // right click and a page with no javascript. This only makes the trip smooth.
    if (target === null || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    // Letting the anchor win instead would be worse than no animation: the
    // citadel is a moment inside the threshold beat, and the beat's anchor is the
    // drawing at the top of it, so the reader would land on the plan again.
    scrollSmoothTo(target);
  };

  const onwardTarget = () => {
    const section = document.querySelector<HTMLElement>(chapterAnchor(onward.chapter));
    return section ? section.getBoundingClientRect().top + window.scrollY : null;
  };

  return (
    <nav className="mf-act-exit" aria-label="Ieșire din capitol">
      <a
        className="mf-act-exit__back"
        href="#mf-threshold"
        onClick={(event) => travel(citadelScrollTarget())(event)}
      >
        <span aria-hidden="true">&larr;</span>
        Înapoi la cetate
      </a>
      <a
        className="mf-act-exit__on"
        href={chapterAnchor(onward.chapter)}
        onClick={(event) => travel(onwardTarget())(event)}
      >
        Mai departe
        <b>{chapterTitle(onward.chapter).index} {onward.label}</b>
        <span aria-hidden="true">&rarr;</span>
      </a>
    </nav>
  );
}
