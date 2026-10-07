import type { CSSProperties } from 'react';
import { Link, useHref, useViewTransitionState } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { STATE_LABEL, type Project } from '../data';
import { Reveal } from './Reveal';
import './ProjectCard.css';

type ProjectCardProps = {
  project: Project;
  /** Columns taken on the 12-column desktop grid. */
  span: number;
  /** Columns taken on the 2-column tablet grid. */
  spanMd: number;
  /** While true the card carries its own view-transition name so it can glide to a new position. */
  morphing?: boolean;
  eager?: boolean;
  delay?: number;
};

export function ProjectCard({ project, span, spanMd, morphing, eager, delay = 0 }: ProjectCardProps) {
  const to = `/work/${project.slug}`;
  const href = useHref(to);
  const navigating = useViewTransitionState(href);
  const { cover } = project;
  const fit = cover.fit ?? 'cover';

  const itemStyle = {
    '--span': span,
    '--span-md': spanMd,
    viewTransitionName: morphing ? `card-${project.id}` : undefined,
  } as CSSProperties;

  const image = (
    <img
      src={cover.src}
      srcSet={cover.srcSet}
      sizes="(min-width: 1100px) 50vw, 100vw"
      width={cover.width}
      height={cover.height}
      alt={cover.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      style={{ viewTransitionName: navigating ? 'project-cover' : undefined }}
    />
  );

  return (
    <Reveal as="li" className="pcard" delay={delay} style={itemStyle}>
      <article className="pcard__inner" data-accent={project.accent}>
        <Link className="pcard__link" to={to} viewTransition>
          <div className="pcard__media" data-fit={fit}>
            {fit === 'contain' ? <div className="pcard__frame">{image}</div> : image}
            <span className="pcard__index display" aria-hidden="true">
              {project.index}
            </span>
            <span className="pcard__state sticker">{STATE_LABEL[project.state]}</span>
          </div>

          <div className="pcard__body">
            <p className="eyebrow">
              {project.discipline} · {project.year}
            </p>
            <h3 className="pcard__title display">{project.shortTitle}</h3>
            <p className="pcard__summary">{project.summary}</p>
            <div className="pcard__foot">
              <ul className="tag-list" aria-label="Tehnologii și teme">
                {project.tags.slice(0, 3).map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
              <span className="pcard__go" aria-hidden="true">
                <ArrowUpRight />
              </span>
            </div>
          </div>
        </Link>
      </article>
    </Reveal>
  );
}
