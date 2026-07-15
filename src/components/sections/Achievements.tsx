import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';
import { CountUp } from '../ui/CountUp';
import { Constellation } from '../achievements/Constellation';
import { Timeline } from '../achievements/Timeline';
import { BearTrophyReaction } from '../achievements/BearTrophyReaction';
import { SectionFogReveal } from '../layout/SectionFogReveal';

const STATS = [
  { end: 3, suffix: '', labelKey: 'achievements.stats.national', grouping: false },
  { end: 2, suffix: '', labelKey: 'achievements.stats.international', grouping: false },
  { end: 5, suffix: '', labelKey: 'achievements.stats.competitions', grouping: false },
  { end: 2025, suffix: '', labelKey: 'achievements.stats.founded', grouping: false },
] as const;

export function Achievements() {
  const { t } = useTranslation();

  return (
    <section
      id="achievements"
      className="section-y bg-bear-night relative overflow-hidden"
      aria-label={t('achievements.title')}
    >
      {/* slow rotating astrolabe behind the title */}
      <Astrolabe />

      <SectionFogReveal />

      <div className="container-wide relative">
        <SectionTitle eyebrow={t('achievements.eyebrow')} chapter="03">
          {t('achievements.title')}
        </SectionTitle>

        {/* Stats — editorial row with vertical separators, no boxed cards */}
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-y-10 md:gap-0 mb-16 md:mb-24
          md:divide-x md:divide-bear-burgundy/30">
          {STATS.map((s, i) => (
            <motion.li
              key={s.labelKey}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.08 }}
              className="md:px-8 first:md:pl-0"
            >
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-bear-gold/65 mb-3 tabular">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="font-display font-medium text-bear-bone text-5xl md:text-6xl lg:text-7xl leading-none tracking-tightest tabular">
                <CountUp
                  end={s.end}
                  suffix={s.suffix}
                  duration={1600}
                  grouping={s.grouping}
                />
              </div>
              <div className="font-sans text-bear-bone/55 text-sm mt-3">
                {t(s.labelKey)}
              </div>
            </motion.li>
          ))}
        </ul>

        {/* Constellation */}
        <div className="relative mb-20 md:mb-24">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="h-px w-10 bg-bear-gold/55" />
            <h3 className="font-mono text-[10px] md:text-xs uppercase tracking-[0.32em] text-bear-gold/85 tabular">
              {t('achievements.constellation')}
            </h3>
          </div>
          <Constellation />
          <BearTrophyReaction />
        </div>

        {/* Timeline */}
        <div>
          <div className="flex items-baseline gap-3 mb-8">
            <span className="h-px w-10 bg-bear-gold/55" />
            <h3 className="font-mono text-[10px] md:text-xs uppercase tracking-[0.32em] text-bear-gold/85 tabular">
              {t('achievements.timeline')}
            </h3>
          </div>
          <Timeline />
        </div>

        {/* CTA */}
        <div className="mt-14 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-bear-bone/35 tabular">
            {t('achievements.eyebrow')}
          </span>
          <Link
            to="/premii"
            className="group inline-flex items-center gap-2
              font-mono text-[11px] uppercase tracking-[0.32em] tabular
              text-bear-gold/70 hover:text-bear-gold
              border border-bear-gold/25 hover:border-bear-gold/55
              px-5 py-2.5 rounded-full transition-all duration-200"
          >
            {t('achievements.viewAll') as string || 'Vezi toate premiile'}
            <ArrowUpRight
              size={13}
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Slow-rotating astrolabe disc behind the section title — gives the page a
 * cartographic / medieval-instrument feel without competing with content.
 */
function Astrolabe() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -top-32 -right-32 md:-top-40 md:-right-20 w-[640px] h-[640px] opacity-[0.07]"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full text-bear-gold"
        style={{ animation: 'medallionTurn 240s linear infinite' }}
      >
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.25" />
        <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="0.2" />
        <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="0.18" />
        {/* radial spokes — every 30 degrees */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const x1 = 50 + Math.cos(a) * 22;
          const y1 = 50 + Math.sin(a) * 22;
          const x2 = 50 + Math.cos(a) * 48;
          const y2 = 50 + Math.sin(a) * 48;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="0.18"
              opacity={i % 3 === 0 ? 0.9 : 0.45}
            />
          );
        })}
        {/* zodiac-ish tick marks on outer ring */}
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i * 6 * Math.PI) / 180;
          const x1 = 50 + Math.cos(a) * 47;
          const y1 = 50 + Math.sin(a) * 47;
          const x2 = 50 + Math.cos(a) * 48.5;
          const y2 = 50 + Math.sin(a) * 48.5;
          return (
            <line key={`t${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="0.18" />
          );
        })}
      </svg>
    </div>
  );
}
