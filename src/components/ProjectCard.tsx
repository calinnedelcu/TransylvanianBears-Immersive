import type { CSSProperties } from 'react';
import { Link, useHref, useViewTransitionState } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Project } from '../data';
import { useContent } from '../i18n/useContent';
import { Reveal } from './Reveal';
import { useTilt } from '../hooks/useTilt';
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
  /** Position in the 3D walk (see world/journey.ts); the card becomes a stop on it. */
  station?: number;
};

export function ProjectCard({ project, span, spanMd, morphing, eager, delay = 0, station }: ProjectCardProps) {
  const { STATE_LABEL, UI, path } = useContent();
  const to = path(`/work/${project.slug}`);
  const href = useHref(to);
  const navigating = useViewTransitionState(href);
  const { cover } = project;
  const fit = cover.fit ?? 'cover';
  const tilt = useTilt(6);

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
    <Reveal
      as="li"
      className="pcard"
      delay={delay}
      style={itemStyle}
      data-station={station === undefined ? undefined : 'project'}
      data-index={station}
    >
      <article className="pcard__inner" data-accent={project.accent} {...tilt}>
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
              <ul className="tag-list" aria-label={UI.techAndThemes}>
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
