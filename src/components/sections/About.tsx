import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { SectionTitle } from '../ui/SectionTitle';
import { CountUp } from '../ui/CountUp';
import { SectionFogReveal } from '../layout/SectionFogReveal';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const FOUNDED_YEAR = 2025;

const STATS = [
  { end: 6, suffix: '', labelKey: 'about.stats.members', grouping: false },
  {
    end: Math.max(1, new Date().getFullYear() - FOUNDED_YEAR),
    suffix: '',
    labelKey: 'about.stats.years',
    grouping: false,
  },
  { end: 5, suffix: '', labelKey: 'about.stats.medals', grouping: false },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function About() {
  const { t } = useTranslation();
  const reduce = usePrefersReducedMotion();

  return (
    <section
      id="about"
      className="section-y bg-bear-night relative overflow-hidden"
      aria-label={t('about.title')}
    >
      {/* faint radial glow upper-right — anchors the asymmetric layout */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full
          bg-[radial-gradient(circle,rgba(232,181,71,0.07),transparent_70%)] blur-2xl"
      />

      <SectionFogReveal />

      <div className="container-wide relative">
        <SectionTitle eyebrow={t('about.eyebrow')} chapter="01">
          {t('about.title')}
        </SectionTitle>

        {/* Asymmetric 12-col grid: copy 7-col / illustration 5-col, offset rows. */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 items-start">
          {/* Copy column — pushes wider, reads first on mobile */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            transition={{ staggerChildren: 0.12 }}
            className="md:col-span-7 md:pt-8"
          >
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="text-bear-bone/90 text-xl md:text-2xl leading-[1.55] mb-6 max-w-[60ch] font-light"
            >
              {t('about.body')}
            </motion.p>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="text-bear-bone/65 text-base leading-relaxed max-w-[62ch]"
            >
              {t('about.body2')}
            </motion.p>
          </motion.div>

          {/* Illustration — bear-coding floats in a tilted frame, offset down */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="md:col-span-5 md:pt-0 lg:-mt-6 relative"
          >
            <div className="relative mx-auto md:mx-0 max-w-[440px]">
              {/* offset gold rule frame — editorial quote-mark vibe */}
              <div
                aria-hidden="true"
                className="absolute -top-3 -left-3 md:-top-4 md:-left-4 right-6 bottom-6
                  border border-bear-gold/30 rounded-sm"
              />
              <motion.img
                src="/assets/bear-coding.webp"
                alt=""
                aria-hidden="true"
                draggable={false}
                className="relative w-full h-auto select-none drop-shadow-[0_22px_55px_rgba(74,14,31,0.55)]"
                animate={
                  reduce
                    ? undefined
                    : {
                        y: [0, -10, 0],
                        rotate: [0, 1.2, 0],
                      }
                }
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Stats — full-width row underneath, NOT in the same grid as copy.
            Massive display numerals with vertical rules between them. */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          transition={{ staggerChildren: 0.14, delayChildren: 0.1 }}
          className="mt-20 md:mt-28 grid grid-cols-3 gap-px bg-bear-burgundy/30
            border-y border-bear-burgundy/30"
        >
          {STATS.map((s, i) => (
            <motion.div
              key={s.labelKey}
              variants={fadeUp}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="bg-bear-night px-4 md:px-8 py-8 md:py-10 flex flex-col gap-2"
            >
              <div className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-bear-gold/70 tabular">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="font-display font-semibold text-bear-bone text-5xl md:text-7xl lg:text-8xl leading-none tracking-tightest tabular">
                <CountUp
                  end={s.end}
                  suffix={s.suffix}
                  duration={1600}
                  grouping={s.grouping}
                />
              </div>
              <div className="font-sans text-bear-bone/55 text-sm md:text-base mt-1">
                {t(s.labelKey)}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
