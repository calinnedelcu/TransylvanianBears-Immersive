import type Lenis from 'lenis';

/**
 * The running smooth scroll, reachable without React context.
 *
 * Lenis owns the scroll position, so window.scrollTo is animated straight back to
 * wherever Lenis thinks the page should be: anything that wants to move the page
 * has to ask Lenis. The context hook works inside the provider's own file and did
 * not reach callers in a lazily loaded chunk, and a scroll that silently does
 * nothing is worse than one that jumps, so the instance is published here.
 */
let running: Lenis | null = null;

export function setSmoothScroll(instance: Lenis | null) {
  running = instance;
}

/** Travel to an absolute document offset. Falls back to a jump if Lenis is down. */
export function scrollSmoothTo(target: number, duration = 1.6) {
  if (running) running.scrollTo(target, { duration });
  else window.scrollTo({ top: target, behavior: 'smooth' });
}

/**
 * Tell the smooth scroll where the page actually is.
 *
 * Anything that moves the page natively - a hash restore, a browser action -
 * leaves Lenis believing the reader is still wherever it last put them. Nothing
 * looks wrong until they touch the wheel, and then the page is animated back to
 * that stale position, which reads as being thrown to the start for no reason.
 */
export function syncSmoothScroll(position: number) {
  running?.scrollTo(position, { immediate: true, force: true });
}
