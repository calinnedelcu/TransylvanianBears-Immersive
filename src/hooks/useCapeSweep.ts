import { useCallback, useRef, useState } from 'react';

const ENTER_MS = 300;
const HOLD_MS = 60;
const TOTAL_MS = 700;

/**
 * Orchestrates the cape-sweep timing.
 *
 * Returns:
 *  - `active`: pass to <CapeSweep />
 *  - `trigger(midAction)`: starts the sweep; runs `midAction` at peak coverage
 *    so the swap (e.g. i18n.changeLanguage) happens while the cape masks it.
 */
export function useCapeSweep() {
  const [active, setActive] = useState(false);
  const lockRef = useRef(false);

  const trigger = useCallback((midAction?: () => void) => {
    if (lockRef.current) return; // ignore re-triggers mid-sweep
    lockRef.current = true;
    setActive(true);

    const tMid = window.setTimeout(() => {
      midAction?.();
    }, ENTER_MS + HOLD_MS / 2);

    const tEnd = window.setTimeout(() => {
      setActive(false);
      lockRef.current = false;
    }, TOTAL_MS);

    return () => {
      window.clearTimeout(tMid);
      window.clearTimeout(tEnd);
    };
  }, []);

  return { active, trigger };
}
