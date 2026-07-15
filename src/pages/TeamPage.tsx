import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { MEMBERS } from '../data/members';
import { MemberCard } from '../components/members/MemberCard';
import { SectionFogReveal } from '../components/layout/SectionFogReveal';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { CapeSweepProvider } from '../components/layout/CapeSweepProvider';
import { useLenis } from '../hooks/useLenis';

export function TeamPage() {
  useLenis();
  const { t } = useTranslation();

  return (
    <CapeSweepProvider>
      <motion.div
        key="team-page"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.25, ease: 'easeIn' } }}
      >
        <div className="bg-bear-wine min-h-dvh">
          <Navbar memberSlug="echipa" memberName="Echipa" />

          <main>
            <section className="section-y relative overflow-hidden pt-32 md:pt-40">
              {/* faint vertical wash on left edge */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 bottom-0 w-32
                  bg-gradient-to-r from-bear-night/60 to-transparent"
              />
              {/* gold spark bottom-right */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-32 -right-20 w-[480px] h-[480px] rounded-full
                  bg-[radial-gradient(circle,rgba(232,181,71,0.06),transparent_70%)] blur-2xl"
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
                    echipa
                  </span>
                </motion.nav>

                {/* Title — exact same as homepage section */}
                <div className="relative mb-14 md:mb-20">
                  <motion.span
                    aria-hidden="true"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="chapter-numeral pointer-events-none absolute -left-1 -top-10 md:-left-3 md:-top-16
                      text-[7rem] md:text-[12rem] lg:text-[14rem] leading-none select-none opacity-70"
                  >
                    02
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
                        {t('members.eyebrow')}
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
                      {t('members.title')}
                    </motion.h1>

                    <motion.p
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.22 }}
                      className="mt-5 max-w-2xl text-bear-bone/70 text-base md:text-lg leading-relaxed"
                    >
                      {t('members.subtitle')}
                    </motion.p>
                  </div>
                </div>

                {/* Same grid as homepage */}
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                  {MEMBERS.map((m, i) => (
                    <li
                      key={m.id}
                      className={i % 2 === 0 ? 'lg:translate-y-0' : 'lg:translate-y-6'}
                    >
                      <MemberCard member={m} index={i} />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </main>

          <Footer />
        </div>
      </motion.div>
    </CapeSweepProvider>
  );
}
