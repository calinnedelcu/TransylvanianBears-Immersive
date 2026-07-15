import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { GreenfieldPageShell } from '../components/GreenfieldPageShell';
import { MediaPlaceholder } from '../components/MediaPlaceholder';
import { ViewTransitionLink } from '../components/ViewTransitionLink';
import { PROJECTS, TEAM, projectBySlug } from '../data';

const EVIDENCE_LABEL = {
  verified: 'Sursă verificată',
  'team-confirmed': 'Confirmat de echipă',
  pending: 'În validare',
} as const;

const STATE_LABEL = {
  active: 'În dezvoltare',
  shipped: 'Publicat',
  archived: 'Arhivat',
  research: 'Cercetare',
} as const;

export function ProjectCaseStudyPage() {
  const { slug } = useParams();
  const project = slug ? projectBySlug[slug] : undefined;

  if (!project) return <Navigate to="/work" replace />;

  const related = PROJECTS
    .filter((candidate) => candidate.id !== project.id && candidate.facets.some((facet) => project.facets.includes(facet)))
    .sort((a, b) => {
      const overlapA = a.facets.filter((facet) => project.facets.includes(facet)).length;
      const overlapB = b.facets.filter((facet) => project.facets.includes(facet)).length;
      return overlapB - overlapA;
    })
    .slice(0, 2);
  const credits = project.credits
    .map((credit) => ({ credit, member: TEAM.find((member) => member.id === credit.memberId) }))
    .filter((item) => item.member);

  return (
    <GreenfieldPageShell
      title={project.title}
      description={`${project.summary} Studiu de caz Transylvanian Bears.`}
      tone={project.accent === 'paper' ? 'paper' : 'dark'}
    >
      <article className="gf-case" data-tone={project.accent}>
        <header className="gf-case-hero" data-gf-motion>
          <div className="gf-case-hero__copy">
            <ViewTransitionLink className="gf-back-link" to="/work" transitionKind="project">
              <ArrowLeft aria-hidden="true" />
              Toate proiectele
            </ViewTransitionLink>
            <p className="gf-page-kicker">{project.index} / {project.disciplineLabel} / {project.year}</p>
            <h1>{project.title}</h1>
            <p className="gf-case-hero__thesis">{project.thesis}</p>
          </div>
          <MediaPlaceholder asset={project.heroAsset} tone={project.accent} label="Hero asset" />
        </header>

        <section className="gf-case-facts" aria-label="Datele proiectului">
          <dl>
            <div><dt>Status</dt><dd>{STATE_LABEL[project.state]}</dd></div>
            <div><dt>An</dt><dd>{project.year}</dd></div>
            <div><dt>Domeniu</dt><dd>{project.disciplineLabel}</dd></div>
            <div><dt>Dovadă</dt><dd>{EVIDENCE_LABEL[project.evidence]}</dd></div>
          </dl>
          <p>{project.summary}</p>
        </section>

        {project.metrics && (
          <section className="gf-case-metrics" aria-label="Metrici verificate">
            {project.metrics.map((metric) => (
              <div key={`${metric.value}-${metric.label}`} data-gf-motion>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
                <small>{EVIDENCE_LABEL[metric.evidence]}</small>
              </div>
            ))}
          </section>
        )}

        <div className="gf-case-story">
          {project.chapters.map((chapter) => (
            <section key={chapter.id} id={chapter.id} className="gf-case-chapter" data-gf-motion>
              <aside>
                <span>{chapter.index}</span>
                <p>{chapter.label}</p>
              </aside>
              <div className="gf-case-chapter__content">
                <h2>{chapter.title}</h2>
                <p>{chapter.body}</p>
                {chapter.note && <p className="gf-case-note">{chapter.note}</p>}
                {chapter.asset && <MediaPlaceholder asset={chapter.asset} tone={project.accent} />}
              </div>
            </section>
          ))}
        </div>

        <section className="gf-case-credits" data-gf-motion>
          <div>
            <p className="gf-page-kicker">Credits & sources</p>
            <h2>Dovada rămâne lângă contribuție.</h2>
          </div>
          <div className="gf-case-credits__content">
            {credits.length > 0 ? (
              <ol>
                {credits.map(({ credit, member }) => (
                  <li key={credit.memberId}>
                    <ViewTransitionLink to={`/team/${member?.id}`}>{member?.name}</ViewTransitionLink>
                    <span>{credit.role ?? 'Rol detaliat în validare'}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="gf-pending-copy">Creditele pe rol sunt rezervate până când echipa le confirmă.</p>
            )}

            {project.links.length > 0 && (
              <div className="gf-source-links">
                {project.links.map((link) => (
                  <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                    <span>{link.kind}</span>
                    <strong>{link.label}</strong>
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {related.length > 0 && (
          <nav className="gf-related" aria-label="Proiecte conexe">
            <p>Proiecte conexe</p>
            {related.map((candidate) => (
              <ViewTransitionLink key={candidate.id} to={`/work/${candidate.slug}`} transitionKind="project">
                <span>{candidate.index}</span>
                <strong>{candidate.title}</strong>
                <ArrowUpRight aria-hidden="true" />
              </ViewTransitionLink>
            ))}
          </nav>
        )}
      </article>
    </GreenfieldPageShell>
  );
}
