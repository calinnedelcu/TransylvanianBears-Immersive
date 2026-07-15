import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

/**
 * Sparse, randomized window-flicker overlay placed on top of the castle layer.
 * Approximates the lit windows in `castle.png` — a few warm spots flash briefly,
 * never all at once. Honors prefers-reduced-motion (renders nothing).
 */

type Window = {
  id: number;
  // position in %, anchored to castle (which is right-aligned in Hero)
  x: number;
  y: number;
  size: number; // px
};

// Approximate window positions over the castle png (right-anchored within Hero).
// Tuned by eye against the asset. Values are % within the right-side region.
const WINDOWS: Window[] = [
  { id: 1, x: 80, y: 47, size: 6 },
  { id: 2, x: 84, y: 52, size: 5 },
  { id: 3, x: 87, y: 49, size: 6 },
  { id: 4, x: 90, y: 54, size: 5 },
  { id: 5, x: 78, y: 60, size: 4 },
  { id: 6, x: 92, y: 58, size: 5 },
];

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

export function CastleFlicker() {
  const reduce = usePrefersReducedMotion();
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    if (reduce) return;
    let timer: number | undefined;

    const tick = () => {
      const w = WINDOWS[Math.floor(Math.random() * WINDOWS.length)];
      setActiveId(w.id);
      // hold flash briefly then clear
      window.setTimeout(() => setActiveId(null), 220);
      // schedule next flicker after a sparse interval (5–15s)
      timer = window.setTimeout(tick, rand(5000, 15000));
    };
    timer = window.setTimeout(tick, rand(3000, 8000));

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [reduce]);

  if (reduce) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    >
      {WINDOWS.map((w) => (
        <div
          key={w.id}
          style={{
            position: 'absolute',
            left: `${w.x}%`,
            top: `${w.y}%`,
            width: w.size,
            height: w.size * 1.6,
            borderRadius: 2,
            background:
              'radial-gradient(circle, rgba(245,215,138,0.95) 0%, rgba(232,181,71,0.6) 60%, transparent 100%)',
            opacity: activeId === w.id ? 1 : 0,
            transition: 'opacity 80ms ease-out',
            filter: 'blur(2px)',
          }}
        />
      ))}
    </div>
  );
}
