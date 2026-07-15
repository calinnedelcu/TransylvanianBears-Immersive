import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const BAT_FRAMES = 4;
const SHEET_W_RATIO = BAT_FRAMES;

// IDs need to survive HMR module reloads — otherwise the counter resets while
// the persisted React state still holds old IDs, producing key collisions.
const W = (typeof window !== 'undefined' ? window : {}) as { __TB_BAT_ID__?: number };
const nextBatId = () => {
  W.__TB_BAT_ID__ = (W.__TB_BAT_ID__ ?? 0) + 1;
  return W.__TB_BAT_ID__;
};

type Flight = {
  id: number;
  size: number;
  startY: number;
  endY: number;
  startX: number;
  endX: number;
  duration: number;
  flapDuration: number;
};

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const rand = (min: number, max: number) => Math.random() * (max - min) + min;

const makeFlight = (id: number): Flight => {
  const goingRight = Math.random() < 0.5;
  return {
    id,
    size: randInt(60, 110),
    startY: rand(8, 38),
    endY: rand(5, 32),
    startX: goingRight ? -8 : 108,
    endX: goingRight ? 108 : -8,
    duration: rand(7, 11),
    // Slight randomization so a batch doesn't flap in lockstep
    flapDuration: rand(0.32, 0.55),
  };
};

type BatsProps = {
  src: string;
  minIntervalSec?: number;
  maxIntervalSec?: number;
  minPerBatch?: number;
  maxPerBatch?: number;
};

export function Bats({
  src,
  minIntervalSec = 14,
  maxIntervalSec = 26,
  minPerBatch = 2,
  maxPerBatch = 4,
}: BatsProps) {
  const reduce = usePrefersReducedMotion();
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    if (reduce) return;
    let tHandle: number | undefined;
    let cancelled = false;

    const releaseBatch = () => {
      if (cancelled) return;
      const n = randInt(minPerBatch, maxPerBatch);
      const batch: Flight[] = [];
      for (let i = 0; i < n; i++) {
        const f = makeFlight(nextBatId());
        f.startY += i * 4;
        batch.push(f);
      }
      setFlights((prev) => [...prev, ...batch]);

      const longest = Math.max(...batch.map((b) => b.duration));
      window.setTimeout(() => {
        if (cancelled) return;
        setFlights((prev) => prev.filter((p) => !batch.find((b) => b.id === p.id)));
      }, longest * 1000 + 200);

      const next = rand(minIntervalSec, maxIntervalSec) * 1000;
      tHandle = window.setTimeout(releaseBatch, next);
    };

    tHandle = window.setTimeout(releaseBatch, rand(8, 14) * 1000);

    return () => {
      cancelled = true;
      if (tHandle) window.clearTimeout(tHandle);
    };
  }, [reduce, minIntervalSec, maxIntervalSec, minPerBatch, maxPerBatch]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <AnimatePresence>
        {flights.map((f) => {
          // Trail extends OPPOSITE to flight direction (drag behind the bat).
          const dir = f.endX > f.startX ? -1 : 1;
          // Scale trail length with bat size so big bats leave longer streaks.
          const u = f.size / 100;
          const trail = [
            `drop-shadow(0 2px 3px rgba(0,0,0,0.85))`, // core weight under bat
            `drop-shadow(${dir * 6 * u}px 0 2px rgba(8,3,5,0.85))`,
            `drop-shadow(${dir * 14 * u}px 0 4px rgba(28,12,18,0.65))`,
            `drop-shadow(${dir * 24 * u}px 0 7px rgba(50,22,32,0.45))`,
            `drop-shadow(${dir * 38 * u}px 0 10px rgba(72,32,46,0.25))`,
          ].join(' ');
          return (
            <motion.div
              key={f.id}
              initial={{ left: `${f.startX}%`, top: `${f.startY}%`, opacity: 0 }}
              animate={{
                left: `${f.endX}%`,
                top: `${f.endY}%`,
                opacity: [0, 0.95, 0.95, 0],
                transition: {
                  duration: f.duration,
                  ease: 'easeInOut',
                  opacity: { times: [0, 0.15, 0.85, 1], duration: f.duration },
                },
              }}
              className="bat-flap"
              style={{
                position: 'absolute',
                width: f.size,
                height: f.size, // sprite frame is square (800x800 each)
                backgroundImage: `url(${src})`,
                backgroundSize: `${SHEET_W_RATIO * 100}% 100%`,
                backgroundRepeat: 'no-repeat',
                filter: trail,
                animationDuration: `${f.flapDuration}s`,
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
