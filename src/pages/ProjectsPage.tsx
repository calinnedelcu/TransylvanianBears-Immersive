import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PROJECTS, CATEGORY_LABEL, type ProjectCategory } from '../data/projects';
import { ProjectCard } from '../components/projects/ProjectCard';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { SectionFogReveal } from '../components/layout/SectionFogReveal';
import { CapeSweepProvider } from '../components/layout/CapeSweepProvider';
import { useLenis } from '../hooks/useLenis';

const ALL_CATEGORIES = ['all', ...([...new Set(PROJECTS.map((p) => p.category))] as ProjectCategory[])] as const;
type FilterValue = 'all' | ProjectCategory;

const FILTER_LABEL: Record<FilterValue, { ro: string; en: string }> = {
  all: { ro: 'Toate', en: 'All' },
  ...CATEGORY_LABEL,
};

export function ProjectsPage() {
  useLenis();
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? 'ro') as 'ro' | 'en';
  const [active, setActive] = useState<FilterValue>('all');

  const filtered = active === 'all' ? PROJECTS : PROJECTS.filter((p) => p.category === active);

  return (
    <CapeSweepProvider>
      <motion.div
        key="projects-page"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.25, ease: 'easeIn' } }}
      >
        <div className="bg-bear-night min-h-dvh">
          <Navbar memberSlug="proiecte" memberName="Proiecte" />

          <main>
            <section className="relative pt-32 md:pt-40 pb-24 overflow-hidden">
              {/* Atmospheric blobs */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse 70% 50% at 70% 10%, rgba(74,14,31,0.5) 0%, transparent 70%)',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-40 -left-20 w-[600px] h-[600px]"
                style={{
                  background: 'radial-gradient(circle, rgba(232,181,71,0.03) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                }}
              />

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
                    proiecte
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
                    04
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
                        {lang === 'ro' ? 'Proiecte' : 'Projects'}
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
                      {lang === 'ro' ? 'Ce construim' : 'What we build'}
                    </motion.h1>

                    <motion.p
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.22 }}
                      className="mt-5 max-w-2xl text-bear-bone/70 text-base md:text-lg leading-relaxed"
                    >
                      {lang === 'ro'
                        ? 'Tool-uri, jocuri, platforme și modele AI construite de echipă. Unele pentru noi, altele pentru competitori care vin după noi.'
                        : 'Tools, games, platforms, and AI models built by the team. Some for us, some for the competitors coming after us.'}
                    </motion.p>
                  </div>
                </div>

                {/* Category filters */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex flex-wrap gap-2 mb-12"
                  role="group"
                  aria-label={lang === 'ro' ? 'Filtrează după categorie' : 'Filter by category'}
                >
                  {ALL_CATEGORIES.map((cat) => {
                    const label = FILTER_LABEL[cat as FilterValue][lang];
                    const isActive = active === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActive(cat as FilterValue)}
                        className={`
                          font-mono text-[10px] uppercase tracking-[0.28em] tabular
                          px-4 py-2 rounded-full border transition-all duration-200
                          ${isActive
                            ? 'bg-bear-gold/15 border-bear-gold/60 text-bear-gold'
                            : 'bg-transparent border-bear-burgundy/40 text-bear-bone/60 hover:border-bear-gold/35 hover:text-bear-bone/90'
                          }
                        `}
                      >
                        {label}
                        {isActive && cat !== 'all' && (
                          <span className="ml-2 text-bear-gold/55">
                            {filtered.length}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.28em] text-bear-bone/35 tabular self-center">
                    {filtered.length} {lang === 'ro' ? 'proiecte' : 'projects'}
                  </span>
                </motion.div>

                {/* Projects list */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="border-y border-bear-burgundy/40"
                  >
                    {filtered.length > 0 ? (
                      filtered.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)
                    ) : (
                      <div className="py-24 text-center">
                        <p className="font-display text-2xl text-bear-bone/40">
                          {lang === 'ro' ? 'Niciun proiect în categoria asta... încă.' : 'No projects in this category… yet.'}
                        </p>
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
