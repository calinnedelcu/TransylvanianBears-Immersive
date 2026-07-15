import { useEffect, useRef } from 'react';

type Options = {
  /** Min direction flips in `windowMs` to count as a shake. Default 5. */
  flipsRequired?: number;
  /** Time window for counting flips. Default 700ms. */
  windowMs?: number;
  /** Minimum X distance per segment to count as a real movement. Default 35px. */
  minSegmentPx?: number;
  /** Cooldown after firing before another trigger is possible. Default 4500ms. */
  cooldownMs?: number;
};

/**
 * Detects when the user "shakes" their cursor — rapid horizontal direction
 * reversals that suggest playful wiggling or hunting for the pointer.
 *
 * Algorithm: track each mousemove. Whenever the X direction flips (left↔right),
 * if the previous segment was at least `minSegmentPx` long, count a flip and
 * record the timestamp. If `flipsRequired` flips fall inside `windowMs`, fire.
 */
export function useMouseShake(onShake: () => void, opts: Options = {}) {
  const {
    flipsRequired = 5,
    windowMs = 700,
    minSegmentPx = 35,
    cooldownMs = 4500,
  } = opts;

  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let lastX: number | null = null;
    let lastDir: 1 | -1 | 0 = 0;
    let segmentStartX = 0;
    let flipTimes: number[] = [];
    let lastFiredAt = -Infinity;

    const onMove = (e: MouseEvent) => {
      const x = e.clientX;
      if (lastX === null) {
        lastX = x;
        segmentStartX = x;
        return;
      }
      const dx = x - lastX;
      lastX = x;
      if (dx === 0) return;
      const dir: 1 | -1 = dx > 0 ? 1 : -1;
      if (lastDir === 0) {
        lastDir = dir;
        segmentStartX = x;
        return;
      }
      if (dir !== lastDir) {
        const segmentLen = Math.abs(x - segmentStartX);
        if (segmentLen >= minSegmentPx) {
          const now = performance.now();
          flipTimes = flipTimes.filter((t) => now - t <= windowMs);
          flipTimes.push(now);
          if (flipTimes.length >= flipsRequired && now - lastFiredAt > cooldownMs) {
            lastFiredAt = now;
            flipTimes = [];
            onShakeRef.current();
          }
        }
        lastDir = dir;
        segmentStartX = x;
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [flipsRequired, windowMs, minSegmentPx, cooldownMs]);
}
