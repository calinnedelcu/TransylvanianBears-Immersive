import { useEffect, useRef } from 'react';

/**
 * Fires `onTrigger` when the user double-taps the Space bar (two presses
 * within 400ms). Ignores presses inside form inputs / textareas / editable
 * regions so users can still type normally. Suppresses the page-scroll that
 * Space normally produces only when the second tap actually completes the
 * double-tap, so the page still scrolls on a regular single Space press.
 */
export function useDoubleSpace(onTrigger: () => void, windowMs = 400) {
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    let lastSpaceAt = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'BUTTON' ||
          target.isContentEditable)
      ) {
        return;
      }
      const now = performance.now();
      if (now - lastSpaceAt <= windowMs) {
        e.preventDefault();
        lastSpaceAt = 0;
        onTriggerRef.current();
        return;
      }
      lastSpaceAt = now;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [windowMs]);
}
