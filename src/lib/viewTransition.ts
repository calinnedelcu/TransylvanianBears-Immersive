import { flushSync } from 'react-dom';

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

export function supportsViewTransitions() {
  return (
    typeof document !== 'undefined' &&
    typeof (document as TransitionDocument).startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Runs a synchronous React state update inside a view transition so that
 * elements sharing a `view-transition-name` animate to their new positions.
 * `prepare` runs first (and is flushed) so the old snapshot already carries the names.
 */
export async function withViewTransition(update: () => void, prepare?: () => void, cleanup?: () => void) {
  if (!supportsViewTransitions()) {
    update();
    return;
  }

  if (prepare) flushSync(prepare);
  const transition = (document as TransitionDocument).startViewTransition!(() => {
    flushSync(update);
  });

  try {
    await transition.finished;
  } catch {
    // An interrupted transition is harmless; the state change has already been applied.
  } finally {
    cleanup?.();
  }
}
