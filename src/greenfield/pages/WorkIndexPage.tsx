import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { GreenfieldPageShell } from '../components/GreenfieldPageShell';
import { MediaPlaceholder } from '../components/MediaPlaceholder';
import { ViewTransitionLink } from '../components/ViewTransitionLink';
import { PROJECTS } from '../data';
import type { ProjectFacet } from '../types';

type WorkFilter = 'all' | ProjectFacet;

const FILTERS: { id: WorkFilter; label: string }[] = [
  { id: 'all', label: 'Toate' },
  { id: 'video-games', label: 'Video games' },
  { id: 'school-software', label: 'School software' },
  { id: 'machine-learning', label: 'Machine learning' },
  { id: 'research-paper', label: 'Research papers' },
];

function matchesFilter(facets: ProjectFacet[], filter: WorkFilter) {
  return filter === 'all' || facets.includes(filter);
}

export function WorkIndexPage() {
  const [filter, setFilter] = useState<WorkFilter>('all');
  const [activeId, setActiveId] = useState(PROJECTS[0].id);
  const visibleProjects = useMemo(
    () => PROJECTS.filter((project) => matchesFilter(project.facets, filter)),
    [filter],
  );
  const activeProject = visibleProjects.find((project) => project.id === activeId) ?? visibleProjects[0];

  return (
    <GreenfieldPageShell
      title="Work"
      description="Șapte proiecte Transylvanian Bears grupate în jocuri, software școlar, machine learning și cercetare aplicată."
    >
      <header className="gf-page-hero gf-page-hero--work" data-gf-motion>
        <p className="gf-page-kicker">Work / 2025—2026</p>
        <h1>Sisteme, lumi și cercetare care pot fi inspectate.</h1>
        <p>
          Nu grupăm proiectele după cât de spectaculoasă este imaginea lor. Le grupăm după problema tratată,
          metoda folosită și dovada pe care o putem publica.
        </p>
      </header>

      <section className="gf-work-index" aria-labelledby="work-index-title">
        <div className="gf-section-heading">
          <p>Selected work</p>
          <h2 id="work-index-title">{String(visibleProjects.length).padStart(2, '0')} proiecte</h2>
        </div>

        <div className="gf-segmented" role="group" aria-label="Filtrează proiectele">
          {FILTERS.map((item) => {
            const count = PROJECTS.filter((project) => matchesFilter(project.facets, item.id)).length;
            return (
              <button
                key={item.id}
                type="button"
                data-active={filter === item.id || undefined}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                <span>{item.label}</span>
                <small>{String(count).padStart(2, '0')}</small>
              </button>
            );
          })}
        </div>

        <div className="gf-work-ledger">
          <ol className="gf-work-list">
            {visibleProjects.map((project) => (
              <li key={project.id} data-gf-motion>
                <ViewTransitionLink
                  to={`/work/${project.slug}`}
                  transitionKind="project"
                  data-active={activeProject.id === project.id || undefined}
                  onMouseEnter={() => setActiveId(project.id)}
                  onFocus={() => setActiveId(project.id)}
                >
                  <span className="gf-work-list__index">{project.index}</span>
                  <span className="gf-work-list__body">
                    <small>{project.disciplineLabel}</small>
                    <strong>{project.title}</strong>
                    <span>{project.summary}</span>
                  </span>
                  <span className="gf-work-list__year">{project.year}</span>
                  <ArrowRight aria-hidden="true" />
                </ViewTransitionLink>
              </li>
            ))}
          </ol>

          <aside className="gf-work-preview" aria-live="polite">
            <MediaPlaceholder asset={activeProject.heroAsset} tone={activeProject.accent} compact />
            <div className="gf-work-preview__meta">
              <p>{activeProject.thesis}</p>
              <span>{activeProject.tags.join(' / ')}</span>
            </div>
          </aside>
        </div>
      </section>
    </GreenfieldPageShell>
  );
}
