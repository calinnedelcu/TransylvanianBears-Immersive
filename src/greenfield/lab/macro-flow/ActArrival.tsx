import { useSearchParams } from 'react-router-dom';
import type { ProjectId } from '../../types';
import type { Act } from '../hero-plan/acts';
import { DEPARTURES } from '../hero-plan/departures';

/**
 * The other half of the handover.
 *
 * The citadel finishes its move and hands over a dark frame with the name of what
 * is opening on it. If the act simply appeared, that dark would read as a page
 * load and the move before it as a stall. So the act opens from the same frame,
 * carrying the same line, and lifts.
 *
 * It runs on CSS rather than on animation frames on purpose: this is the first
 * thing on screen, the scene behind it is still compiling shaders, and a reveal
 * that depends on a frame loop that has not started yet is a black screen.
 */
export function ActArrival({ act }: { act: Act }) {
  const [params] = useSearchParams();
  const from = params.get('from') as ProjectId | null;
  const chosen = from && act.systems.includes(from) ? from : act.systems[0];
  const line = chosen ? DEPARTURES[chosen]?.line ?? 'Se deschide' : 'Drumul se închide';

  return (
    <div className="mf-arrival" role="presentation">
      <p>{line}</p>
    </div>
  );
}
