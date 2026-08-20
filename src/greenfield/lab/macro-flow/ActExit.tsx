import { Link } from 'react-router-dom';
import type { JourneyChapter } from '../../experience/chapters';
import { projectById } from '../../data';
import { actByExit, actHref, chapterTitle, entryOf, nextAct } from '../hero-plan/acts';

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

  // The closing has nothing after it, but the reader still has to be able to
  // leave: an act with no way back out is a trap, not a destination.
  const following = nextAct(act);
  // Named by the system rather than the chapter where there is one: the reader
  // chose a system on the ring, so that is the vocabulary they are holding.
  const onward = following
    ? {
        href: actHref(following),
        chapter: entryOf(following),
        label: following.systems.length
          ? following.systems.map((id) => projectById[id].shortTitle).join(' · ')
          : chapterTitle(entryOf(following)).label,
      }
    : null;

  return (
    <nav className="mf-act-exit" aria-label="Ieșire din capitol">
      {/* A real navigation, because the citadel is a place now and not a moment
          inside this page: the ring lives on the front page and the story is
          somewhere it sends you. */}
      <Link className="mf-act-exit__back" to="/">
        <span aria-hidden="true">&larr;</span>
        Înapoi la cetate
      </Link>
      {onward ? (
        <Link className="mf-act-exit__on" to={onward.href}>
          Mai departe
          <b>{chapterTitle(onward.chapter).index} {onward.label}</b>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : null}
    </nav>
  );
}
