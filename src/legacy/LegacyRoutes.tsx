import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import { About } from '../components/sections/About';
import { Achievements } from '../components/sections/Achievements';
import { Hero } from '../components/sections/Hero';
import { JoinUs } from '../components/sections/JoinUs';
import { Members } from '../components/sections/Members';
import { Projects } from '../components/sections/Projects';
import { KonamiEasterEgg } from '../components/easter/KonamiEasterEgg';
import { LogoTripleClickEgg } from '../components/easter/LogoTripleClickEgg';
import { CapeSweepProvider } from '../components/layout/CapeSweepProvider';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { useLenis } from '../hooks/useLenis';
import { AboutPage } from '../pages/AboutPage';
import { AchievementsPage } from '../pages/AchievementsPage';
import { JoinPage } from '../pages/JoinPage';
import { MemberPage } from '../pages/MemberPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { TeamPage } from '../pages/TeamPage';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: 'easeIn' } },
};

function HomePage() {
  useLenis();
  const location = useLocation();

  useEffect(() => {
    const sectionId = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (!sectionId) return;

    const attempt = (tries: number) => {
      const element = document.getElementById(sectionId);
      if (element) {
        const top = element.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      } else if (tries > 0) {
        window.setTimeout(() => attempt(tries - 1), 80);
      }
    };

    window.setTimeout(() => attempt(5), 100);
  }, [location.state]);

  return (
    <motion.div key="home" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <CapeSweepProvider>
        <Navbar />
        <main>
          <Hero />
          <About />
          <Members />
          <Achievements />
          <Projects />
          <JoinUs />
        </main>
        <Footer />
        <KonamiEasterEgg />
        <LogoTripleClickEgg />
      </CapeSweepProvider>
    </motion.div>
  );
}

export default function LegacyRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/echipa/:id" element={<MemberPage />} />
        <Route path="/proiecte" element={<ProjectsPage />} />
        <Route path="/premii" element={<AchievementsPage />} />
        <Route path="/echipa" element={<TeamPage />} />
        <Route path="/despre" element={<AboutPage />} />
        <Route path="/aplica" element={<JoinPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </AnimatePresence>
  );
}
