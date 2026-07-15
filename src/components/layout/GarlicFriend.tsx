import { motion, useReducedMotion } from 'framer-motion';

/**
 * The painted angry-garlic charm hanging in the Footer gutter, swinging on
 * its gold hook. Bobs and tilts as if dangling from the medallion above.
 * Same illustrator style as the bears so it visually belongs to the brand.
 */
export function GarlicFriend() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-[7%] top-[calc(50%-130px)]
        md:right-[5%] md:top-[calc(50%-150px)]
        w-16 md:w-24 z-10 select-none"
      style={{
        // Pivot at the top so the garlic swings from its gold hook like a
        // pendulum, not from its center.
        transformOrigin: '50% 0%',
      }}
    >
      {/* Halo glow that pulses — faint warm aura behind the bulb */}
      <motion.div
        className="absolute inset-0 -m-4 rounded-full blur-xl"
        style={{
          background:
            'radial-gradient(circle, rgba(232,181,71,0.28) 0%, rgba(140,21,46,0.12) 55%, transparent 80%)',
        }}
        animate={
          reduce
            ? undefined
            : { opacity: [0.3, 0.65, 0.3], scale: [1, 1.12, 1] }
        }
        transition={
          reduce
            ? undefined
            : { duration: 4.4, repeat: Infinity, ease: 'easeInOut' }
        }
      />

      {/* Pendulum swing — small angle on the hook so the whole charm sways */}
      <motion.div
        className="relative"
        style={{
          transformOrigin: '50% 6%',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
        }}
        animate={
          reduce
            ? undefined
            : {
                rotate: [-5, 6, -3, 5, -5],
                y: [0, -2, 0, -2, 0],
              }
        }
        transition={
          reduce
            ? undefined
            : {
                duration: 6.2,
                repeat: Infinity,
                ease: 'easeInOut',
                times: [0, 0.25, 0.5, 0.75, 1],
              }
        }
      >
        <img
          src="/assets/angrygarlic.webp"
          alt=""
          draggable={false}
          className="w-full h-auto"
        />
      </motion.div>

      {/* Subtle twinkle on a long offbeat */}
      {!reduce && (
        <motion.span
          className="absolute top-2 right-3 w-1 h-1 rounded-full bg-bear-cream
            shadow-[0_0_6px_2px_rgba(248,232,208,0.85)]"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.4, 0.5] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            repeatDelay: 5.6,
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  );
}
