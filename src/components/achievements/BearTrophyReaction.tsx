import { motion, useReducedMotion } from 'framer-motion';

/**
 * Floating bear-trophy mascot reaction tucked next to the constellation.
 * Slides in from the right when in view, then idles with a slow bob + a
 * golden halo pulse so the eye keeps drifting back to it. Decorative only.
 */
export function BearTrophyReaction() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-6 right-2 md:-bottom-10 md:right-8 lg:right-12
        w-32 md:w-44 lg:w-52 z-10 select-none"
    >
      {/* halo glow behind the bear — pulses slowly, gold + crimson tint */}
      <motion.div
        className="absolute inset-0 -m-6 md:-m-10 rounded-full blur-2xl"
        style={{
          background:
            'radial-gradient(circle at 50% 55%, rgba(212,168,83,0.45) 0%, rgba(140,21,46,0.18) 45%, transparent 75%)',
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        animate={
          reduce
            ? undefined
            : {
                opacity: [0.55, 0.85, 0.55],
                scale: [1, 1.08, 1],
              }
        }
        transition={
          reduce
            ? { duration: 0.6 }
            : {
                duration: 4.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
      />

      {/* bear sliding in from the right with a tiny rotational settle */}
      <motion.div
        initial={{ opacity: 0, x: 60, y: 12, rotate: 6 }}
        whileInView={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{
          duration: 0.9,
          ease: [0.16, 1, 0.3, 1],
          delay: 0.15,
        }}
        className="relative"
      >
        <motion.img
          src="/assets/bear-trophy.webp"
          alt=""
          loading="lazy"
          decoding="async"
          className="w-full h-auto drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)]"
          animate={
            reduce
              ? undefined
              : {
                  y: [0, -6, 0],
                  rotate: [-1.2, 1.2, -1.2],
                }
          }
          transition={
            reduce
              ? undefined
              : {
                  duration: 5.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
          }
        />

        {/* tiny gold spark above the trophy — appears intermittently */}
        {!reduce && (
          <motion.span
            className="absolute -top-2 right-6 md:right-10 w-1.5 h-1.5 rounded-full bg-bear-gold
              shadow-[0_0_10px_2px_rgba(212,168,83,0.85)]"
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.4, 0.5] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              repeatDelay: 3.4,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
