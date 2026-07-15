import { ArrowUpRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ARCHIVE, TEAM, projectById } from '../data';
import type { SceneDefinition } from '../types';

type StoryChapterProps = {
  scene: SceneDefinition;
};

function WorkshopRoster() {
  return (
    <ol className="gf-roster" aria-label="Membrii echipei">
      {TEAM.map((member, index) => (
        <li key={member.id}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <Link to={`/next/team/${member.id}`}>{member.name}</Link>
          <small>{member.discipline}</small>
        </li>
      ))}
    </ol>
  );
}

function ArchiveList() {
  return (
    <ol className="gf-archive-list" aria-label="Selecție din arhivă">
      {ARCHIVE.map((entry) => (
        <li key={`${entry.year}-${entry.title}`}>
          <time>{entry.year}</time>
          {entry.projectId ? (
            <Link to={`/next/work/${projectById[entry.projectId].slug}`}>{entry.title}</Link>
          ) : (
            <strong>{entry.title}</strong>
          )}
          <span>{entry.result}</span>
        </li>
      ))}
    </ol>
  );
}

export function StoryChapter({ scene }: StoryChapterProps) {
  const Heading = scene.id === 'signal' ? 'h1' : 'h2';

  return (
    <section
      id={scene.id}
      className={`gf-chapter gf-chapter--${scene.align}`}
      data-gf-scene={scene.id}
      style={{ '--chapter-height': `${scene.scrollVh}vh` } as CSSProperties}
    >
      <div className="gf-chapter__sticky">
        <div className="gf-chapter__content">
          <div className="gf-chapter__index" aria-hidden="true">
            {scene.index}
          </div>
          <p className="gf-chapter__eyebrow">{scene.eyebrow}</p>
          <Heading>{scene.title}</Heading>
          <p className="gf-chapter__body">{scene.body}</p>

          {scene.metrics && (
            <dl className="gf-metrics">
              {scene.metrics.map((metric) => (
                <div key={`${metric.value}-${metric.label}`}>
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {scene.tags && (
            <p className="gf-tags" aria-label="Tehnologii și teme">
              {scene.tags.join(' / ')}
            </p>
          )}

          {scene.projectIds && (
            <nav className="gf-scene-cases" aria-label="Studii de caz conexe">
              {scene.projectIds.map((projectId) => {
                const project = projectById[projectId];
                return (
                  <Link key={project.id} to={`/next/work/${project.slug}`}>
                    <span>Case study</span>
                    <strong>{project.shortTitle}</strong>
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                );
              })}
            </nav>
          )}

          {scene.id === 'workshop' && <WorkshopRoster />}
          {scene.id === 'archive' && <ArchiveList />}

          {scene.href && scene.hrefLabel && (
            <a className="gf-text-link" href={scene.href} target={scene.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
              {scene.hrefLabel}
              <ArrowUpRight aria-hidden="true" />
            </a>
          )}

          {scene.id === 'signal' && (
            <a className="gf-next-chapter" href="#gate">
              <span>01</span>
              <strong>Manifest</strong>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
