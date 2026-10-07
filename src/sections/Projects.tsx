import { useState } from 'react';
import { COPY, FACET_FILTERS, PROJECTS, type Facet } from '../data';
import { Reveal } from '../components/Reveal';
import { ProjectCard } from '../components/ProjectCard';
import { withViewTransition } from '../lib/viewTransition';
import './projects.css';

type Filter = 'all' | Facet;

/** Desktop column spans (out of 12) for every possible number of visible cards. */
const LAYOUTS: Record<number, number[]> = {
  1: [12],
  2: [7, 5],
  3: [4, 4, 4],
  4: [6, 6, 6, 6],
  5: [7, 5, 4, 4, 4],
  6: [4, 4, 4, 4, 4, 4],
  7: [7, 5, 4, 4, 4, 6, 6],
};

const matches = (facets: Facet[], filter: Filter) => filter === 'all' || facets.includes(filter);

export function Projects() {
  const [filter, setFilter] = useState<Filter>('all');
  const [morphing, setMorphing] = useState(false);

  const visible = PROJECTS.filter((project) => matches(project.facets, filter));
  const layout = LAYOUTS[visible.length] ?? visible.map(() => 4);

  const choose = (next: Filter) => {
    if (next === filter) return;
    void withViewTransition(
      () => setFilter(next),
      () => setMorphing(true),
      () => setMorphing(false),
    );
  };

  return (
    <section id="proiecte" className="projects section" aria-labelledby="projects-title">
      <div className="wrap">
        <Reveal className="section-head section-head--split">
          <p className="section-head__index eyebrow">01 / Proiecte</p>
          <h2 id="projects-title" className="display">
            {COPY.projects.title}
          </h2>
          <p>{COPY.projects.body}</p>
        </Reveal>

        <div className="projects__toolbar">
          <div className="projects__filters" role="group" aria-label="Filtrează proiectele">
            {FACET_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="chip"
                aria-pressed={filter === item.id}
                onClick={() => choose(item.id)}
              >
                {item.label}
                <small>{PROJECTS.filter((project) => matches(project.facets, item.id)).length}</small>
              </button>
            ))}
          </div>
          <p className="projects__count eyebrow" role="status">
            {visible.length} din {PROJECTS.length} proiecte
          </p>
        </div>

        <ul className="pgrid">
          {visible.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              span={layout[index]}
              spanMd={visible.length % 2 === 1 && index === 0 ? 2 : 1}
              morphing={morphing}
              eager={index < 2}
              delay={(index % 3) * 70}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
