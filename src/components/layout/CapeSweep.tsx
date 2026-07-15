import { AnimatePresence, motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

type CapeSweepProps = {
  /** When true, the cape is currently sweeping across the screen. */
  active: boolean;
};

/**
 * Full-screen burgundy "cape" that sweeps across to mask a state change
 * (e.g. language toggle). Skewed for cinematic motion.
 *
 * Pair with `useCapeSweep()` which orchestrates the timing and fires the
 * mid-sweep callback so the actual swap happens while the cape covers the screen.
 */
export function CapeSweep({ active }: CapeSweepProps) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return null;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden="true"
          className="fixed inset-0 z-[100] pointer-events-none origin-left"
          initial={{ x: '-110%', skewX: '-12deg' }}
          animate={{
            x: '0%',
            transition: { duration: 0.3, ease: [0.7, 0, 0.84, 0] },
          }}
          exit={{
            x: '110%',
            transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
          }}
          style={{
            background:
              'linear-gradient(100deg, #4A0E1F 0%, #6B1A2A 35%, #8B1E2F 55%, #6B1A2A 75%, #4A0E1F 100%)',
            boxShadow:
              'inset 60px 0 80px -40px rgba(0,0,0,0.55), inset -60px 0 80px -40px rgba(0,0,0,0.55)',
          }}
        >
          {/* Soft velvet folds — diagonal repeating gradient */}
          <div
            className="absolute inset-0 opacity-30 mix-blend-overlay"
            style={{
              backgroundImage:
                'repeating-linear-gradient(115deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 28px)',
            }}
          />
          {/* Gold trim shimmer along the leading edge */}
          <div
            className="absolute inset-y-0 right-0 w-8 opacity-80"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(232,181,71,0.0) 30%, rgba(232,181,71,0.55) 70%, rgba(245,215,138,0.9) 100%)',
              filter: 'blur(2px)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
