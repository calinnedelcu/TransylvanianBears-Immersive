import { createPortal } from 'react-dom';
import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PROJECTS } from '../data';
import { PROJECT_EXPERIENCE_ORDER, projectExperienceUrl } from '../projectExperience';
import { ViewTransitionLink } from './ViewTransitionLink';
import './experience-navigation.css';

export function ExperienceNavigation() {
  const details = useRef<HTMLDetailsElement>(null);
  const { search } = useLocation();
  const slug = new URLSearchParams(search).get('project');
  const project = PROJECTS.find((item) => item.slug === slug);
  const nextSlug = project ? PROJECT_EXPERIENCE_ORDER[PROJECT_EXPERIENCE_ORDER.indexOf(project.slug) + 1] : undefined;
  const nextProject = PROJECTS.find((item) => item.slug === nextSlug);
  const close = () => { if (details.current) details.current.open = false; };
  return (
    <>
    {project && <ViewTransitionLink className="experience-return" to={`/work/${project.slug}`}>
      ← Prezentarea proiectului: {project.shortTitle}
    </ViewTransitionLink>}
    {project && createPortal(<nav className="experience-end" aria-label="Continuă după proiect">
      <p>Ai ajuns la finalul secțiunii {project.shortTitle}.</p>
      {nextProject ? <ViewTransitionLink to={projectExperienceUrl(nextProject.slug)!}>
        Continuă cu {nextProject.shortTitle} →
      </ViewTransitionLink> : <ViewTransitionLink to="/work">Ai explorat ultimul proiect · Vezi toate proiectele →</ViewTransitionLink>}
      <ViewTransitionLink to={`/work/${project.slug}`}>Înapoi la prezentare</ViewTransitionLink>
    </nav>, document.body)}
    <details ref={details} className="experience-nav" onBlur={(event) => {
      // Touch browsers often report a null relatedTarget while moving from the
      // summary to a menu link. Closing here cancels the link's click event.
      const relatedTarget = event.relatedTarget as Node | null;
      if (relatedTarget && !event.currentTarget.contains(relatedTarget)) close();
    }} onKeyDown={(event) => {
      if (event.key === 'Escape') { close(); details.current?.querySelector('summary')?.focus(); }
    }}>
      <summary aria-label="Sari la un proiect">Proiecte <span aria-hidden="true">⌄</span></summary>
      <nav aria-label="Navigare între proiecte">
        {project && <ViewTransitionLink to={`/work/${project.slug}`} onClick={close}>← Înapoi la prezentarea: {project.shortTitle}</ViewTransitionLink>}
        <ViewTransitionLink to="/work" onClick={close}>Vezi proiectele direct →</ViewTransitionLink>
        {project && <ViewTransitionLink to="/" onClick={close}>Deschide experiența 3D completă →</ViewTransitionLink>}
        {!project && <p>Sari la un proiect în experiență</p>}
        {!project && PROJECTS.map((item) => {
          const to = projectExperienceUrl(item.slug);
          return to && <ViewTransitionLink key={item.id} to={to} onClick={close}>{item.shortTitle}</ViewTransitionLink>;
        })}
      </nav>
    </details>
    </>
  );
}
