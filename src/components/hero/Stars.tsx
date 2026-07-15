import { useMemo } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

type StarsProps = {
  count?: number;
  className?: string;
};

type Star = {
  id: number;
  cx: number; // % of viewbox
  cy: number;
  r: number;
  delay: number;
  duration: number;
};

// Deterministic pseudo-random so the layout is stable across re-renders.
const seededStars = (count: number): Star[] => {
  // simple xorshift seeded with constant
  let s = 0x9e3779b9;
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return Math.abs(s) / 0xffffffff;
  };
  return Array.from({ length: count }, (_, id) => ({
    id,
    cx: 8 + next() * 84,
    cy: 5 + next() * 35, // top portion of sky
    r: 0.6 + next() * 1.2,
    delay: next() * 3,
    duration: 2 + next() * 2,
  }));
};

export function Stars({ count = 18, className }: StarsProps) {
  const reduce = usePrefersReducedMotion();
  const stars = useMemo(() => seededStars(count), [count]);

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 w-full h-full ${className ?? ''}`}
    >
      {stars.map((s) => (
        <circle
          key={s.id}
          cx={s.cx}
          cy={s.cy}
          r={s.r * 0.4}
          fill="#F5D78A"
          style={
            reduce
              ? { opacity: 0.7 }
              : {
                  animation: `tbStarTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
                }
          }
        />
      ))}
      <style>{`
        @keyframes tbStarTwinkle {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}
