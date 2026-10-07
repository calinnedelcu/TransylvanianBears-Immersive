import { usePageMeta } from '../hooks/usePageMeta';
import { SITE } from '../data';
import { Contact } from '../sections/Contact';
import { Hero } from '../sections/Hero';
import { Pillars } from '../sections/Pillars';
import { Projects } from '../sections/Projects';
import { Results } from '../sections/Results';
import { Team } from '../sections/Team';

export function HomePage() {
  usePageMeta({
    title: `${SITE.name} — Produse, jocuri și cercetare aplicată`,
    path: '/',
  });

  return (
    <>
      <Hero />
      <Pillars />
      <Projects />
      <Results />
      <Team />
      <Contact />
    </>
  );
}
