import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import {
  ACHIEVEMENTS,
  RANKING_COLOR,
  RANKING_LABEL,
  type AchievementCategory,
  type AchievementRanking,
} from '../data/achievements';
import { Chip } from '../components/ui/Chip';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { SectionFogReveal } from '../components/layout/SectionFogReveal';
import { CapeSweepProvider } from '../components/layout/CapeSweepProvider';
import { useLenis } from '../hooks/useLenis';

type FilterValue = 'all' | AchievementCategory | AchievementRanking;

const CATEGORY_LABEL: Record<AchievementCategory, { ro: string; en: string }> = {
  national: { ro: 'Național', en: 'National' },
  international: { ro: 'Internațional', en: 'International' },
  hackathon: { ro: 'Hackathon', en: 'Hackathon' },
};

const RANKING_LABEL_LOCAL: Record<AchievementRanking, { ro: string; en: string }> = {
  gold: { ro: 'Aur', en: 'Gold' },
  silver: { ro: 'Argint', en: 'Silver' },
  bronze: { ro: 'Bronz', en: 'Bronze' },
  finalist: { ro: 'Finalist', en: 'Finalist' },
};

const FILTERS: { value: FilterValue; label: { ro: string; en: string } }[] = [
  { value: 'all', label: { ro: 'Toate', en: 'All' } },
  { value: 'national', label: CATEGORY_LABEL.national },
  { value: 'international', label: CATEGORY_LABEL.international },
  { value: 'hackathon', label: CATEGORY_LABEL.hackathon },
  { value: 'gold', label: RANKING_LABEL_LOCAL.gold },
  { value: 'silver', label: RANKING_LABEL_LOCAL.silver },
  { value: 'bronze', label: RANKING_LABEL_LOCAL.bronze },
  { value: 'finalist', label: RANKING_LABEL_LOCAL.finalist },
];

const RANKING_CATEGORIES: AchievementRanking[] = ['gold', 'silver', 'bronze', 'finalist'];

export function AchievementsPage() {
  useLenis();
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? 'ro') as 'ro' | 'en';
  const [active, setActive] = useState<FilterValue>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sorted = [...ACHIEVEMENTS].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return (b.month ?? 0) - (a.month ?? 0);
  });

  const filtered = sorted.filter((a) => {
    if (active === 'all') return true;
    if (RANKING_CATEGORIES.includes(active as AchievementRanking)) return a.ranking === active;
    return a.category === active;
  });

  return (
    <CapeSweepProvider>
      <motion.div
        key="achievements-page"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.25, ease: 'easeIn' } }}
      >
        <div className="bg-bear-night min-h-dvh">
          <Navbar memberSlug="premii" memberName="Premii" />

          <main>
            <section className="relative pt-32 md:pt-40 pb-24 overflow-hidden">
              {/* Astrolabe watermark */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-32 -right-32 w-[640px] h-[640px] opacity-[0.05]"
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
                  {Array.from({ length: 12 }).map((_, i) => {
                    const a = (i * 30 * Math.PI) / 180;
                    return (
                      <line
                        key={i}
                        x1={50 + Math.cos(a) * 22} y1={50 + Math.sin(a) * 22}
                        x2={50 + Math.cos(a) * 48} y2={50 + Math.sin(a) * 48}
                        stroke="currentColor" strokeWidth="0.18"
                        opacity={i % 3 === 0 ? 0.9 : 0.45}
                      />
                    );
                  })}
                </svg>
              </div>

              <SectionFogReveal />

              <div className="container-wide relative">
                {/* Breadcrumb */}
                <motion.nav
                  aria-label="Breadcrumb"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-2 mb-12"
                >
                  <Link
                    to="/"
                    className="font-mono text-[11px] uppercase tracking-[0.32em] text-bear-bone/55 hover:text-bear-gold transition-colors"
                  >
                    transylvanianbears
                  </Link>
                  <ChevronRight size={12} className="text-bear-gold/40" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-bear-gold/90">
                    premii
                  </span>
                </motion.nav>

                {/* Header */}
                <div className="relative mb-16">
                  <motion.span
                    aria-hidden="true"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="chapter-numeral pointer-events-none absolute -left-1 -top-10 md:-left-3 md:-top-16
                      text-[7rem] md:text-[12rem] lg:text-[14rem] leading-none select-none opacity-70"
                  >
                    03
                  </motion.span>

                  <div className="relative md:pl-4">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="flex items-center gap-3 mb-5"
                    >
                      <span className="h-px w-8 bg-bear-gold/60" />
                      <span className="font-mono text-[10px] md:text-xs uppercase tracking-[0.32em] text-bear-gold/95 tabular">
                        {lang === 'ro' ? 'Premii & concursuri' : 'Awards & contests'}
                      </span>
                      <span className="h-px w-8 bg-bear-gold/60" />
                    </motion.div>

                    <motion.h1
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
                      className="font-display font-medium text-bear-bone
                        text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem]
                        leading-[0.9] tracking-tightest"
                    >
                      {lang === 'ro' ? 'Ce am câștigat' : "What we've won"}
                    </motion.h1>

                    <motion.p
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.22 }}
                      className="mt-5 max-w-2xl text-bear-bone/70 text-base md:text-lg leading-relaxed"
                    >
                      {lang === 'ro'
                        ? 'Competiții naționale și internaționale, hackathons, game jam-uri. Fiecare premiu e o dovadă că codul pe care îl scriem noaptea funcționează ziua în competiție.'
                        : 'National and international competitions, hackathons, game jams. Every award is proof that the code we write at night works in competition by day.'}
                    </motion.p>
                  </div>
                </div>

                {/* Filters */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex flex-wrap gap-2 mb-12"
                  role="group"
                  aria-label={lang === 'ro' ? 'Filtrează' : 'Filter'}
                >
                  {FILTERS.map(({ value, label }) => {
                    const isActive = active === value;
                    const isRanking = RANKING_CATEGORIES.includes(value as AchievementRanking);
                    const rankColor = isRanking ? RANKING_COLOR[value as AchievementRanking] : null;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setActive(value)}
                        className={`
                          inline-flex items-center gap-2
                          font-mono text-[10px] uppercase tracking-[0.28em] tabular
                          px-4 py-2 rounded-full border transition-all duration-200
                          ${isActive
                            ? 'bg-bear-gold/15 border-bear-gold/60 text-bear-gold'
                            : 'bg-transparent border-bear-burgundy/40 text-bear-bone/60 hover:border-bear-gold/35 hover:text-bear-bone/90'
                          }
                        `}
                      >
                        {rankColor && (
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ background: rankColor }}
                            aria-hidden="true"
                          />
                        )}
                        {label[lang]}
                      </button>
                    );
                  })}

                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.28em] text-bear-bone/35 tabular self-center">
                    {filtered.length} {lang === 'ro' ? 'premii' : 'awards'}
                  </span>
                </motion.div>

                {/* Timeline */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                  >
                    {filtered.length === 0 ? (
                      <div className="py-24 text-center">
                        <p className="font-display text-2xl text-bear-bone/40">
                          {lang === 'ro' ? 'Niciun premiu în categoria asta... încă.' : 'No awards in this category… yet.'}
                        </p>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Vertical spine */}
                        <div
                          aria-hidden="true"
                          className="absolute top-0 bottom-0 left-4 md:left-1/2 md:-translate-x-1/2
                            w-px bg-gradient-to-b from-transparent via-bear-burgundy/60 to-transparent"
                        />

                        <ul className="space-y-10 md:space-y-14">
                          {filtered.map((it, idx) => {
                            const onLeft = idx % 2 === 0;
                            const detail = typeof it.detail === 'string' ? it.detail : (it.detail[lang] ?? it.detail.ro);
                            const linkLabel = it.linkLabel
                              ? typeof it.linkLabel === 'string' ? it.linkLabel : (it.linkLabel[lang] ?? it.linkLabel.ro)
                              : (lang === 'ro' ? 'Deschide' : 'Open');

                            return (
                              <li key={it.id} className="relative">
                                <div className="md:grid md:grid-cols-2 md:gap-12 items-center">
                                  <motion.div
                                    initial={{ opacity: 0, x: onLeft ? -30 : 30 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, margin: '-60px' }}
                                    transition={{ duration: 0.55, ease: 'easeOut' }}
                                    className={
                                      'pl-12 md:pl-0 ' +
                                      (onLeft ? 'md:col-start-1 md:pr-10 md:text-right' : 'md:col-start-2 md:pl-10')
                                    }
                                  >
                                    <article
                                      onMouseEnter={() => setHoveredId(it.id)}
                                      onMouseLeave={() => setHoveredId((c) => c === it.id ? null : c)}
                                      onFocus={() => setHoveredId(it.id)}
                                      onBlur={() => setHoveredId((c) => c === it.id ? null : c)}
                                      tabIndex={it.image ? 0 : -1}
                                      className="rounded-md border border-bear-burgundy/40 bg-bear-night/70 backdrop-blur-sm p-5 shadow-burgundy
                                        transition-colors hover:border-bear-burgundy/70 focus:outline-none focus-visible:border-bear-gold/70"
                                    >
                                      <div className={`flex items-center gap-3 mb-2 ${onLeft ? 'md:justify-end' : 'md:justify-start'}`}>
                                        <span className="font-mono text-xs tracking-widest text-bear-gold/85 tabular">
                                          {it.year}{it.month ? ` · ${String(it.month).padStart(2, '0')}` : ''}
                                        </span>
                                        <Chip variant="outline" size="sm">
                                          {CATEGORY_LABEL[it.category][lang]}
                                        </Chip>
                                      </div>

                                      <h3 className="font-display text-xl md:text-2xl text-bear-bone leading-tight mb-1">
                                        {it.title}
                                      </h3>
                                      <p className="text-sm text-bear-bone/70 leading-relaxed">{detail}</p>

                                      {it.link && (
                                        <div className={`mt-3 ${onLeft ? 'md:text-right' : 'md:text-left'}`}>
                                          <a
                                            href={it.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase
                                              tracking-[0.22em] text-bear-gold/85 hover:text-bear-gold
                                              border-b border-bear-gold/40 hover:border-bear-gold pb-0.5 transition-colors"
                                          >
                                            {linkLabel}
                                            <ArrowUpRight size={12} aria-hidden="true" />
                                          </a>
                                        </div>
                                      )}

                                      {/* Image reveal on hover */}
                                      <AnimatePresence initial={false}>
                                        {it.image && hoveredId === it.id && (
                                          <motion.div
                                            key="img"
                                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                            animate={{ height: 'auto', opacity: 1, marginTop: 14 }}
                                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                            transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
                                            className="overflow-hidden"
                                          >
                                            <div className="relative rounded-sm overflow-hidden border border-bear-burgundy/40 ring-1 ring-bear-gold/15">
                                              <img
                                                src={it.image}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                draggable={false}
                                                className="block w-full h-auto select-none"
                                                onError={(e) => {
                                                  (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                                                }}
                                              />
                                              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bear-night/55 via-transparent to-transparent" />
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>

                                      <div className={`mt-3 flex items-center gap-2 ${onLeft ? 'md:justify-end' : 'md:justify-start'}`}>
                                        <span
                                          className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-bear-night"
                                          style={{ background: RANKING_COLOR[it.ranking] }}
                                          aria-hidden="true"
                                        />
                                        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bear-bone/70">
                                          {RANKING_LABEL[it.ranking][lang]}
                                        </span>
                                      </div>
                                    </article>
                                  </motion.div>
                                </div>

                                {/* Dot on spine */}
                                <span
                                  aria-hidden="true"
                                  className="absolute top-6 left-4 md:left-1/2 md:-translate-x-1/2
                                    inline-block h-3.5 w-3.5 rounded-full ring-4 ring-bear-night"
                                  style={{ background: RANKING_COLOR[it.ranking] }}
                                />
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </section>
          </main>

          <Footer />
        </div>
      </motion.div>
    </CapeSweepProvider>
  );
}
