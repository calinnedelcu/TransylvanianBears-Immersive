import { useCallback, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useDoubleSpace } from '../../hooks/useDoubleSpace';
import { useMouseShake } from '../../hooks/useMouseShake';

/**
 * Garlic swarm easter egg with two triggers:
 *   1. Double-tap the Space bar within 400ms (the deliberate path)
 *   2. Cursor shake — rapid L↔R wiggling within 700ms (the accidental path)
 * Garlic charms drop from the top, twirl, and a banner stamps "USTUROI
 * ACTIVAT". Auto-dismisses ~3.2s after activation. Reduced-motion: a single
 * static banner with no flying garlic, dismissed after 1.6s.
 */
export function KonamiEasterEgg() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);

  const onTrigger = useCallback(() => {
    setActive(true);
    const timeout = window.setTimeout(() => setActive(false), reduce ? 1600 : 3200);
    return () => window.clearTimeout(timeout);
  }, [reduce]);

  useDoubleSpace(onTrigger);
  useMouseShake(onTrigger);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="konami-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[200] pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          {/* radial flash to draw the eye */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 45%, rgba(212,168,83,0.32) 0%, rgba(140,21,46,0.22) 35%, transparent 70%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6] }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />

          {/* falling garlic swarm — painted angry-garlic charms tumbling in */}
          {!reduce &&
            GARLIC_DROPS.map((g, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${g.x}%`,
                  top: '-18vh',
                  width: g.size,
                  filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.6))',
                }}
                initial={{ y: 0, rotate: g.rotateFrom, opacity: 0 }}
                animate={{
                  y: '125vh',
                  rotate: g.rotateTo,
                  opacity: [0, 1, 1, 0.85],
                }}
                transition={{
                  duration: g.duration,
                  delay: g.delay,
                  ease: [0.32, 0.72, 0.55, 1],
                }}
              >
                <img
                  src="/assets/angrygarlic.webp"
                  alt=""
                  draggable={false}
                  className="w-full h-auto select-none"
                />
              </motion.div>
            ))}

          {/* banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: -3 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 18,
              delay: reduce ? 0 : 0.45,
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              px-8 py-5 md:px-12 md:py-7
              border-2 border-bear-gold
              bg-gradient-to-br from-bear-night/85 via-bear-deep/85 to-bear-wine/85
              backdrop-blur-md
              shadow-[0_30px_80px_rgba(0,0,0,0.6),0_0_0_8px_rgba(212,168,83,0.08)]
              text-center"
          >
            <div className="font-mono text-[10px] md:text-xs uppercase tracking-[0.45em] text-bear-gold/85 mb-2">
              [ space ] [ space ]
            </div>
            <div className="font-display text-3xl md:text-5xl text-gradient-gold tracking-tightest leading-none">
              USTUROI ACTIVAT
            </div>
            <div className="font-sans text-xs md:text-sm text-bear-bone/70 mt-3 tracking-wider">
              vampirii fug · garlic mode engaged
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const GARLIC_DROPS = [
  { x: 6, size: 88, duration: 2.6, delay: 0.05, rotateFrom: -20, rotateTo: 380 },
  { x: 16, size: 64, duration: 3.0, delay: 0.35, rotateFrom: 30, rotateTo: -290 },
  { x: 27, size: 100, duration: 2.4, delay: 0.15, rotateFrom: -40, rotateTo: 320 },
  { x: 38, size: 72, duration: 3.2, delay: 0.5, rotateFrom: 60, rotateTo: -200 },
  { x: 49, size: 110, duration: 2.2, delay: 0.0, rotateFrom: -10, rotateTo: 410 },
  { x: 60, size: 76, duration: 2.9, delay: 0.6, rotateFrom: 25, rotateTo: -340 },
  { x: 70, size: 92, duration: 2.5, delay: 0.2, rotateFrom: -55, rotateTo: 280 },
  { x: 80, size: 68, duration: 3.1, delay: 0.45, rotateFrom: 40, rotateTo: -260 },
  { x: 90, size: 84, duration: 2.7, delay: 0.1, rotateFrom: -25, rotateTo: 360 },
] as const;
