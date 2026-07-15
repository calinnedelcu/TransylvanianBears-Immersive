import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SectionTitle } from '../ui/SectionTitle';
import { Button } from '../ui/Button';
import { SectionFogReveal } from '../layout/SectionFogReveal';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { JoinForm } from './JoinForm';

const RECIPIENT_EMAIL = 'calin.nedelcu08@gmail.com';

const FIREFLY_COUNT = 14;

type Firefly = {
  id: number;
  /** Horizontal start position, % of container width. */
  x: number;
  /** Vertical start, % of container height (we ascend upward from here). */
  y: number;
  /** Travel distance in % of container height. */
  travel: number;
  /** Loop duration in seconds. */
  duration: number;
  /** Stagger before first cycle starts. */
  delay: number;
  /** Pixel size of the dot. */
  size: number;
  /** Slight horizontal sway amplitude in %. */
  sway: number;
};

/** Pseudo-random but deterministic firefly layout — keeps SSR / HMR stable. */
function generateFireflies(seed = 31): Firefly[] {
  let s = seed;
  const next = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: FIREFLY_COUNT }).map((_, i) => ({
    id: i,
    x: 8 + next() * 84,
    y: 60 + next() * 35,
    travel: 35 + next() * 35,
    duration: 4 + next() * 3.5,
    delay: next() * 5,
    size: 2 + next() * 3,
    sway: 4 + next() * 6,
  }));
}

export function JoinUs() {
  const { t } = useTranslation();
  const reduce = usePrefersReducedMotion();
  const fireflies = useMemo(() => generateFireflies(), []);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <section
      id="join"
      className="section-y bg-gradient-burgundy relative overflow-hidden"
      aria-label={t('join.title')}
    >
      {/* Soft top fade to blend with the previous section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32
          bg-gradient-to-b from-bear-wine via-bear-wine/60 to-transparent"
      />

      <SectionFogReveal />

      <div className="container-wide relative">
        <SectionTitle eyebrow={t('join.eyebrow')} chapter="05">
          {t('join.title')}
        </SectionTitle>

        {/* 12-col asymmetric grid: copy 7-col / bear 5-col, bear bleeds beyond container */}
        <div className="grid items-start gap-10 md:gap-14 md:grid-cols-12">
          {/* Copy + CTAs — wider column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="md:col-span-7 md:order-1 md:pt-6"
          >
            <p className="text-bear-bone/90 text-xl md:text-2xl leading-[1.55] mb-6 max-w-[58ch] font-light">
              {t('join.body')}
            </p>
            <p className="text-bear-bone/65 text-base leading-relaxed mb-10 max-w-[60ch]">
              {t('join.body2')}
            </p>

            {/* Perks — numbered list, no pills */}
            <ul className="mb-12 space-y-4 max-w-md">
              {(['perk1', 'perk2', 'perk3'] as const).map((k, i) => (
                <li key={k} className="flex items-baseline gap-4">
                  <span className="font-mono text-[10px] tracking-[0.3em] text-bear-gold/80 tabular shrink-0 w-8">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-sans text-bear-bone/85 text-base">
                    {t(`join.${k}`)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-4">
              <Button type="button" onClick={() => setFormOpen(true)} size="lg">
                {t('join.cta')}
              </Button>
              <Button href="#about" variant="ghost" size="lg">
                {t('join.ctaSecondary')}
              </Button>
            </div>
          </motion.div>

          {/* Bear column — bleeds past container right edge */}
          <div className="md:col-span-5 md:order-2 relative flex justify-center md:justify-end md:pr-0 md:-mr-4 lg:-mr-12">
            <BearStage reduce={reduce} fireflies={fireflies} />
          </div>
        </div>
      </div>

      <JoinForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        recipient={RECIPIENT_EMAIL}
      />
    </section>
  );
}

function BearStage({
  reduce,
  fireflies,
}: {
  reduce: boolean;
  fireflies: Firefly[];
}) {
  return (
    <div className="relative w-full max-w-[460px] aspect-square">
      {/* Halo — concentric burgundy → gold pulses behind the bear */}
      <Halo reduce={reduce} />

      {/* Fireflies layer */}
      {!reduce && (
        <div className="pointer-events-none absolute inset-0">
          {fireflies.map((f) => (
            <motion.span
              key={f.id}
              aria-hidden="true"
              className="absolute rounded-full bg-bear-goldlight"
              style={{
                left: `${f.x}%`,
                top: `${f.y}%`,
                width: f.size,
                height: f.size,
                boxShadow: `0 0 ${f.size * 3}px rgba(245, 215, 138, 0.85)`,
                willChange: 'transform, opacity',
              }}
              initial={{ opacity: 0 }}
              animate={{
                y: [`0%`, `-${f.travel * 6}px`],
                x: [`0%`, `${f.sway}px`, `-${f.sway}px`, `0%`],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: f.duration,
                delay: f.delay,
                repeat: Infinity,
                ease: 'easeInOut',
                times: [0, 0.2, 0.8, 1],
              }}
            />
          ))}
        </div>
      )}

      {/* Bear — wave bob (translateY + small rotate, alternating) */}
      <motion.img
        src="/assets/bear-waving.webp"
        alt="TransylvanianBears mascot waving"
        draggable={false}
        className="relative z-10 mx-auto w-[78%] sm:w-[68%] md:w-[88%] h-auto select-none
          drop-shadow-[0_22px_55px_rgba(74,14,31,0.5)]"
        animate={
          reduce
            ? undefined
            : {
                y: [0, -10, 0, -6, 0],
                rotate: [0, 2.5, 0, -1.5, 0],
              }
        }
        transition={{
          duration: 4.4,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      />

      {/* Ground glow — a faint pool under the bear's feet */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 bottom-0 -translate-x-1/2
          h-6 w-2/3 rounded-full
          bg-[radial-gradient(ellipse_at_center,rgba(232,181,71,0.35),transparent_70%)]
          blur-md"
      />
    </div>
  );
}

function Halo({ reduce }: { reduce: boolean }) {
  // Two stacked rings expanding outward — the "summoning circle" vibe.
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <motion.div
        className="absolute inset-[10%] rounded-full
          bg-[radial-gradient(circle,rgba(232,181,71,0.18)_0%,transparent_60%)]"
        animate={
          reduce
            ? undefined
            : {
                scale: [0.95, 1.08, 0.95],
                opacity: [0.55, 0.85, 0.55],
              }
        }
        transition={{ duration: 5.2, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className="absolute inset-[18%] rounded-full border border-bear-gold/25"
        animate={
          reduce
            ? undefined
            : {
                scale: [1, 1.12, 1],
                opacity: [0.4, 0.7, 0.4],
              }
        }
        transition={{ duration: 6.5, ease: 'easeInOut', repeat: Infinity, delay: 0.6 }}
      />
      <motion.div
        className="absolute inset-[32%] rounded-full border border-bear-gold/15"
        animate={
          reduce
            ? undefined
            : {
                scale: [1, 1.18, 1],
                opacity: [0.25, 0.55, 0.25],
              }
        }
        transition={{ duration: 7.8, ease: 'easeInOut', repeat: Infinity, delay: 1.2 }}
      />
    </div>
  );
}
