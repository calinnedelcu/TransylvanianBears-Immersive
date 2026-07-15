import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { About } from '../components/sections/About';
import { CapeSweepProvider } from '../components/layout/CapeSweepProvider';
import { SectionFogReveal } from '../components/layout/SectionFogReveal';
import { useLenis } from '../hooks/useLenis';

export function AboutPage() {
  useLenis();

  return (
    <CapeSweepProvider>
      <motion.div
        key="about-page"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.25, ease: 'easeIn' } }}
      >
        <div className="bg-bear-night min-h-dvh">
          <Navbar memberSlug="despre" memberName="Despre" />

          <main>
            <div className="relative pt-28 md:pt-36">
              <SectionFogReveal />
              {/* Breadcrumb */}
              <div className="container-wide relative">
                <motion.nav
                  aria-label="Breadcrumb"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-2 mb-6"
                >
                  <Link
                    to="/"
                    className="font-mono text-[11px] uppercase tracking-[0.32em] text-bear-bone/55 hover:text-bear-gold transition-colors"
                  >
                    transylvanianbears
                  </Link>
                  <ChevronRight size={12} className="text-bear-gold/40" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-bear-gold/90">
                    despre
                  </span>
                </motion.nav>
              </div>

              {/* Reuse exact About section */}
              <About />
            </div>
          </main>

          <Footer />
        </div>
      </motion.div>
    </CapeSweepProvider>
  );
}
