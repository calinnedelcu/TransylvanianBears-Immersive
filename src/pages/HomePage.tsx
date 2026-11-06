import { usePageMeta } from '../hooks/usePageMeta';
import { useContent } from '../i18n/useContent';
import { Contact } from '../sections/Contact';
import { Hero } from '../sections/Hero';
import { Pillars } from '../sections/Pillars';
import { Projects } from '../sections/Projects';
import { Results } from '../sections/Results';
import { Team } from '../sections/Team';
import { WorldLayer } from '../world/WorldLayer';

export function HomePage() {
  const { SITE, UI } = useContent();
  usePageMeta({
    title: `${SITE.name} — ${UI.homeTitle}`,
    path: '/',
  });

  return (
    <>
      <WorldLayer />
      <Hero />
      <Pillars />
      <Projects />
      <Results />
      <Team />
      <Contact />
    </>
  );
}
