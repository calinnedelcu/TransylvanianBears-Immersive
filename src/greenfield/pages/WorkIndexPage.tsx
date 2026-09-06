import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { GreenfieldPageShell } from '../components/GreenfieldPageShell';
import { ViewTransitionLink } from '../components/ViewTransitionLink';
import { PROJECTS } from '../data';
import type { ProjectDefinition, ProjectFacet } from '../types';
import './work-index.css';
import { PROJECT_COVERS } from '../projectMedia';

type WorkFilter = 'all' | ProjectFacet;
const FILTERS: { id: WorkFilter; label: string }[] = [
  { id: 'all', label: 'Toate' },
  { id: 'video-games', label: 'Jocuri' },
  { id: 'school-software', label: 'Software școlar' },
  { id: 'machine-learning', label: 'Machine learning' },
  { id: 'research-paper', label: 'Cercetare' },
];


function matches(project: ProjectDefinition, filter: WorkFilter) {
  return filter === 'all' || project.facets.includes(filter);
}

function ProjectCard({ project, featured }: { project: ProjectDefinition; featured: boolean }) {
  const cover = PROJECT_COVERS[project.id];
  const metrics = project.metrics?.filter((metric) => metric.evidence !== 'pending').slice(0, featured ? 3 : 2);
  return (
    <li className="wi-card" data-featured={featured || undefined} data-project={project.id}>
      <ViewTransitionLink to={`/work/${project.slug}`} transitionKind="project" className="wi-card__link">
        <figure className="wi-card__visual" data-contain={cover.contain || undefined}>
          <img src={cover.src} alt={cover.alt} loading={featured ? 'eager' : 'lazy'} decoding="async" />
          <figcaption><span>{cover.label}</span><ArrowUpRight aria-hidden="true" /></figcaption>
        </figure>
        <div className="wi-card__content">
          <div className="wi-card__eyebrow"><span>{project.index} / {project.disciplineLabel}</span><span>{project.year}</span></div>
          <h2>{project.shortTitle}</h2>
          <p>{project.summary}</p>
          <ul className="wi-card__tags" aria-label="Tehnologii și teme">{project.tags.slice(0, 3).map((tag) => <li key={tag}>{tag}</li>)}</ul>
          {metrics && metrics.length > 0 && <dl className="wi-card__metrics">{metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl>}
          <span className="wi-card__action">Explorează proiectul <ArrowUpRight aria-hidden="true" /></span>
        </div>
      </ViewTransitionLink>
    </li>
  );
}

export function WorkIndexPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('type');
  const filter = FILTERS.find((item) => item.id === requested)?.id ?? 'all';
  const visibleProjects = PROJECTS.filter((project) => matches(project, filter));
  return (
    <GreenfieldPageShell title="Proiecte" description="Explorează cele șapte proiecte Transylvanian Bears: jocuri, software școlar, machine learning și cercetare.">
      <div className="wi-page">
        <header className="wi-intro">
          <div><p className="wi-kicker">Transylvanian Bears / Work / 2025—2026</p><h1>Din idee,<br /><em>în lumea reală.</em></h1></div>
          <div className="wi-intro__note"><span className="wi-intro__count">07<span>proiecte, patru direcții</span></span><p>Lumi în care te joci. Software pe care îl folosești. Cercetare pe care o poți urmări până la date.</p><ArrowDown aria-hidden="true" /></div>
        </header>
        <section className="wi-collection" aria-label="Proiectele echipei">
          <div className="wi-toolbar">
            <div className="wi-filters" role="group" aria-label="Filtrează proiectele">
              {FILTERS.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setParams((previous) => {
                const next = new URLSearchParams(previous);
                if (item.id === 'all') next.delete('type'); else next.set('type', item.id);
                return next;
              }, { preventScrollReset: true })}>{item.label}<span>{PROJECTS.filter((project) => matches(project, item.id)).length}</span></button>)}
            </div>
            <p className="wi-count" role="status">{visibleProjects.length} din {PROJECTS.length} proiecte</p>
          </div>
          <ol className="wi-grid">{visibleProjects.map((project, index) => <ProjectCard key={project.id} project={project} featured={index === 0} />)}</ol>
        </section>
        <div className="wi-outro"><p>Șapte proiecte.<br /><span>Aceiași șase constructori.</span></p><ViewTransitionLink to="/team">Cunoaște echipa <ArrowUpRight aria-hidden="true" /></ViewTransitionLink></div>
      </div>
    </GreenfieldPageShell>
  );
}
