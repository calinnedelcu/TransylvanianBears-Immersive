import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PROJECTS } from '../data';
import { projectExperienceUrl } from '../projectExperience';
import { ViewTransitionLink } from './ViewTransitionLink';
import './experience-navigation.css';

export function ExperienceNavigation() {
  const details = useRef<HTMLDetailsElement>(null);
  const { search } = useLocation();
  const slug = new URLSearchParams(search).get('project');
  const project = PROJECTS.find((item) => item.slug === slug);
  const close = () => { if (details.current) details.current.open = false; };
  return (
    <>
    {project && <ViewTransitionLink className="experience-return" to={`/work/${project.slug}`}>
      ← Prezentarea proiectului: {project.shortTitle}
    </ViewTransitionLink>}
    {project && <ViewTransitionLink className="experience-end" to={`/work/${project.slug}`}>
      Secțiune încheiată · Înapoi la {project.shortTitle} →
    </ViewTransitionLink>}
    <details ref={details} className="experience-nav" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
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
