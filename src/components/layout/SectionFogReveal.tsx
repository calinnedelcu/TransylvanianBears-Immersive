import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

type Props = {
  /** Vertical extent of the fog veil as a fraction of the section height. */
  height?: string;
  /** Max fog opacity at section entrance (1 = solid). */
  maxOpacity?: number;
};

// Soft fade on every edge so the fog texture's hard borders never show as
// visible bars when the section background isn't a perfect match.
const FADE_MASK = `
  linear-gradient(to bottom, transparent 0%, black 12%, black 60%, rgba(0,0,0,0.7) 80%, transparent 100%),
  linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)
`.trim();

/**
 * Single fog layer with brightness/contrast pumped so the asset (originally
 * tuned as a subtle helper for the Hero) reads as a thick veil over any
 * section. The asset is intentionally over-sized and feathered on every
 * edge so its borders never align with section edges as visible bars.
 *
 * Holds full opacity for the first 45% of the section's entrance window,
 * then linearly clears as the section reaches the top. Reduced-motion users
 * see no fog.
 */
export function SectionFogReveal({
  height = '60%',
  maxOpacity = 0.6,
}: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Window spans from "section top hits viewport bottom" all the way to
  // "section center hits viewport top" — roughly 1.5× viewport heights of
  // scroll. Long enough that the fog is still visible while the user reads
  // the upper half of the section, instead of clearing the moment the
  // section reaches the top of the viewport.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center start'],
  });

  // Full opacity for the first 70% of that window, then a smoother 30% fade.
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.7, 1],
    [maxOpacity, maxOpacity, 0],
  );
  const x = useTransform(scrollYProgress, [0, 1], ['-3%', '5%']);

  if (reduce) return null;

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-30"
      style={{ height, opacity }}
    >
      {/* Fog texture warmed to a cream / parchment haze — sits between the
          wine sections and the gold palette without echoing either. Reads as
          candle-lit Carpathian mist, not pink smoke or hospital gray. */}
      <motion.div
        className="absolute inset-0"
        style={{
          x,
          backgroundImage: 'url(/assets/fog.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          filter:
            'brightness(1.45) contrast(1.3) grayscale(1) sepia(1) saturate(2.6) hue-rotate(-6deg)',
          maskImage: FADE_MASK,
          WebkitMaskImage: FADE_MASK,
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      />
    </motion.div>
  );
}
