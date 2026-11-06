import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Code2,
  FileText,
  Info,
  Play,
  Presentation,
} from 'lucide-react';
import type { Chapter, ChapterMedia, Project, ProjectLink } from '../data';
import { useContent } from '../i18n/useContent';
import { CompareSlider } from '../components/CompareSlider';
import { useLightbox, type LightboxItem } from '../components/Lightbox';
import { ProjectFigure } from '../components/ProjectFigure';
import { Reveal } from '../components/Reveal';
import { useActiveSection } from '../hooks/useActiveSection';
import { usePageMeta } from '../hooks/usePageMeta';
import './project.css';

const LINK_ICON: Record<ProjectLink['kind'], typeof Code2> = {
  repository: Code2,
  build: Play,
  paper: FileText,
  presentation: Presentation,
};

function ChapterMediaView({ media, onOpen }: { media: ChapterMedia; onOpen: (item: LightboxItem) => void }) {
  switch (media.kind) {
    case 'figure':
      return <ProjectFigure figure={media.figure} onOpen={onOpen} />;
    case 'gallery':
      return (
        <div className="gallery" data-count={media.figures.length}>
          {media.figures.map((figure) => (
            <ProjectFigure key={figure.src} figure={figure} onOpen={onOpen} sizes="(min-width: 900px) 34vw, 100vw" />
          ))}
        </div>
      );
    case 'compare':
      return <CompareSlider before={media.before} after={media.after} label={media.label} />;
    case 'steps':
      return (
        <ol className="steps">
          {media.steps.map((step, index) => (
            <li key={step.label}>
              <span className="steps__no display" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <strong>{step.label}</strong>
              <span>{step.detail}</span>
            </li>
          ))}
        </ol>
      );
    case 'chips':
      return (
        <div className="role-chips">
          <p className="eyebrow">{media.label}</p>
          <ul>
            {media.items.map((item, index) => (
              <li key={item}>
                <span aria-hidden="true">{index + 1}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      );
  }
}

function ChapterView({ chapter, onOpen }: { chapter: Chapter; onOpen: (item: LightboxItem) => void }) {
  return (
    <section id={chapter.id} className="chapter" tabIndex={-1} aria-labelledby={`${chapter.id}-title`}>
      <Reveal className="chapter__head">
        <span className="chapter__no display" aria-hidden="true">
          {chapter.index}
        </span>
        <p className="eyebrow">{chapter.label}</p>
      </Reveal>
      <Reveal className="chapter__main" delay={80}>
        <h2 id={`${chapter.id}-title`}>{chapter.title}</h2>
        <p className="chapter__body">{chapter.body}</p>
        {chapter.note && (
          <aside className="note">
            <Info aria-hidden="true" />
            <p>{chapter.note}</p>
          </aside>
        )}
        {chapter.media && <ChapterMediaView media={chapter.media} onOpen={onOpen} />}
      </Reveal>
    </section>
  );
}

function Cover({ project, onOpen }: { project: Project; onOpen: (item: LightboxItem) => void }) {
  const { UI } = useContent();
  const { cover } = project;
  const contain = cover.fit === 'contain';

  const image = (
    <img
      src={cover.src}
      srcSet={cover.srcSet}
      width={cover.width}
      height={cover.height}
      alt={cover.alt}
      decoding="async"
      style={{ viewTransitionName: 'project-cover' }}
    />
  );

  return (
    <figure className="proj__cover" data-fit={contain ? 'contain' : 'cover'}>
      <button
        type="button"
        className="proj__coverbtn"
        aria-label={`${UI.enlarge}: ${cover.caption}`}
        onClick={() => onOpen({ ...cover, caption: cover.caption })}
      >
        {contain ? <span className="proj__panel">{image}</span> : image}
      </button>
      <figcaption className="eyebrow">{cover.caption}</figcaption>
    </figure>
  );
}

export function ProjectPage() {
  const { EVIDENCE_LABEL, PROJECTS, SITE, STATE_LABEL, UI, memberById, path, projectBySlug } = useContent();
  const { slug } = useParams();
  const project = slug ? projectBySlug[slug] : undefined;
  const lightbox = useLightbox();
  const chapterIds = project ? [...project.chapters.map((chapter) => chapter.id), 'surse'] : [];
  const active = useActiveSection(chapterIds, Boolean(project));

  usePageMeta({
    title: project ? `${project.title} — ${SITE.name}` : SITE.name,
    description: project ? `${project.summary} ${UI.caseStudy} ${SITE.name}.` : undefined,
    path: project ? `/work/${project.slug}` : '/',
  });

  if (!project) return <Navigate to={{ pathname: path('/'), hash: '#proiecte' }} replace />;

  const position = PROJECTS.findIndex((candidate) => candidate.id === project.id);
  const previous = PROJECTS[(position - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(position + 1) % PROJECTS.length];
  const contributors = project.credits.flatMap((credit) => {
    const member = memberById[credit.memberId];
    return member ? [{ member, role: credit.role }] : [];
  });
  const [primaryLink, ...otherLinks] = project.links;

  return (
    <article className="proj" data-accent={project.accent}>
      <header className="proj__hero">
        <div className="wrap proj__heroinner">
          <div className="proj__intro">
            <p className="proj__kicker eyebrow">
              <Link to={{ pathname: path('/'), hash: '#proiecte' }}>
                <ArrowLeft aria-hidden="true" />
                {UI.allProjects}
              </Link>
              <span aria-hidden="true">
                {project.index} / {String(PROJECTS.length).padStart(2, '0')}
              </span>
            </p>

            <p className="eyebrow">
              {project.discipline} · {project.year}
            </p>
            <h1 className={`display${project.title.length > 18 ? ' is-long' : ''}`}>{project.title}</h1>
            <p className="lead">{project.summary}</p>

            <div className="proj__stickers">
              <span className="sticker">{STATE_LABEL[project.state]}</span>
              <span className="sticker">
                {project.evidence === 'verified' ? <Check aria-hidden="true" /> : <Clock aria-hidden="true" />}
                {EVIDENCE_LABEL[project.evidence]}
              </span>
            </div>

            <ul className="tag-list" aria-label={UI.techAndThemes}>
              {project.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>

            {primaryLink && (
              <div className="proj__actions">
                <a className="btn btn--ink" href={primaryLink.href} target="_blank" rel="noreferrer">
                  {primaryLink.label}
                  <ArrowUpRight aria-hidden="true" />
                </a>
                {otherLinks.map((link) => (
                  <a key={link.href} className="btn btn--bone" href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <Cover project={project} onOpen={lightbox.open} />
        </div>
      </header>

      {project.metrics && project.metrics.length > 0 && (
        <dl className="wrap proj__metrics" aria-label={UI.projectFigures}>
          {project.metrics.map((metric) => (
            <div key={metric.label} className="metric">
              <dt className="eyebrow">{metric.label}</dt>
              <dd>
                <strong className="display">{metric.value}</strong>
                <small>{EVIDENCE_LABEL[metric.evidence]}</small>
              </dd>
            </div>
          ))}
        </dl>
      )}

      <nav className="proj__subnav" aria-label={UI.inThisProject}>
        <div className="wrap proj__subnavinner">
          <span className="eyebrow">{UI.inThisProject}</span>
          <ul>
            {project.chapters.map((chapter) => (
              <li key={chapter.id}>
                <a href={`#${chapter.id}`} aria-current={active === chapter.id ? 'location' : undefined}>
                  <span aria-hidden="true">{chapter.index}</span>
                  {chapter.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#surse" aria-current={active === 'surse' ? 'location' : undefined}>
                <span aria-hidden="true">↗</span>
                {UI.sourcesAndTeam}
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <section className="proj__thesis surface-ink" aria-label={UI.projectIdea}>
        <Reveal className="wrap">
          <p className="eyebrow">{UI.idea}</p>
          <blockquote className="display">{project.thesis}</blockquote>
        </Reveal>
      </section>

      <div className="wrap proj__chapters">
        {project.chapters.map((chapter) => (
          <ChapterView key={chapter.id} chapter={chapter} onOpen={lightbox.open} />
        ))}
      </div>

      <section id="surse" className="proj__sources" tabIndex={-1} aria-labelledby="sources-title">
        <div className="wrap proj__sourcesgrid">
          <Reveal>
            <p className="eyebrow">{UI.sources}</p>
            <h2 id="sources-title" className="display">
              {UI.exploreFurther}
            </h2>
            <ul className="source-list">
              {project.links.map((link) => {
                const Icon = LINK_ICON[link.kind];
                return (
                  <li key={link.href}>
                    <a href={link.href} target="_blank" rel="noreferrer">
                      <Icon aria-hidden="true" />
                      <span>{link.label}</span>
                      <ArrowUpRight aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </Reveal>

          <Reveal delay={100}>
            <p className="eyebrow">{UI.team}</p>
            <h2 className="display">{UI.contributors}</h2>
            {contributors.length > 0 ? (
              <ul className="contributors">
                {contributors.map(({ member, role }) => (
                  <li key={member.id}>
                    <Link to={{ pathname: path('/'), hash: `#${member.id}` }} data-accent={member.accent}>
                      <span className="contributors__avatar">
                        <img src={member.portrait.src} alt="" width={member.portrait.width} height={member.portrait.height} loading="lazy" />
                      </span>
                      <span>
                        <strong>{member.name}</strong>
                        <small>{role ?? member.discipline}</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="contributors__pending">{UI.contributorsPending}</p>
            )}
          </Reveal>
        </div>
      </section>

      <nav className="proj__more" aria-label={UI.moreProjects}>
        <div className="proj__morelist">
          {[
            { project: previous, label: UI.previousProject, direction: 'prev' as const },
            { project: next, label: UI.nextProject, direction: 'next' as const },
          ].map(({ project: target, label, direction }) => (
            <Link key={direction} className="proj__next" to={path(`/work/${target.slug}`)} data-accent={target.accent} data-direction={direction}>
              <span className="eyebrow">
                {direction === 'prev' && <ArrowLeft aria-hidden="true" />}
                {label}
                {direction === 'next' && <ArrowRight aria-hidden="true" />}
              </span>
              <strong className="display">{target.shortTitle}</strong>
              <small>{target.discipline}</small>
            </Link>
          ))}
        </div>
      </nav>

      {lightbox.element}
    </article>
  );
}
