import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { COPY, PILLARS, projectById } from '../data';
import { Reveal } from '../components/Reveal';
import './pillars.css';

export function Pillars() {
  return (
    <section id="despre" className="pillars section" aria-labelledby="pillars-title">
      <div className="wrap">
        <Reveal className="pillars__intro">
          <p className="eyebrow">Ce ne definește</p>
          <p className="lead">{COPY.pillars.body}</p>
        </Reveal>

        <h2 id="pillars-title" className="sr-only">
          {COPY.pillars.title}
        </h2>

        <ol className="pillars__list">
          {PILLARS.map((pillar, index) => {
            const projects = pillar.projectIds.map((id) => projectById[id]);
            return (
              <Reveal as="li" key={pillar.verb} className="pillar" delay={index * 60}>
                <div
                  className="pillar__row"
                  data-accent={projects[0].accent === 'ink' ? 'gold' : projects[0].accent}
                  style={{ '--i': index } as CSSProperties}
                >
                  <span className="pillar__no eyebrow">{String(index + 1).padStart(2, '0')}</span>
                  <h3 className="pillar__verb display">{pillar.verb}</h3>
                  <div className="pillar__aside">
                    <p className="pillar__line">{pillar.line}</p>
                    <p className="pillar__body">{pillar.body}</p>
                    <ul className="pillar__projects">
                      {projects.map((project) => (
                        <li key={project.id}>
                          <Link className="pill-link" to={`/work/${project.slug}`} data-accent={project.accent}>
                            <span className="pill-link__dot" aria-hidden="true">
                              {project.index}
                            </span>
                            {project.shortTitle}
                            <ArrowUpRight aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
