import type { MouseEvent } from 'react';
import { scrollSmoothTo } from '../../components/smoothScroll';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { GreenfieldPageShell } from '../components/GreenfieldPageShell';
import { NexusOutputs, ProjectFigure } from '../components/ProjectFigure';
import { ViewTransitionLink } from '../components/ViewTransitionLink';
import { PROJECTS, TEAM, projectBySlug } from '../data';
import { PROJECT_COVERS, type ProjectMedia } from '../projectMedia';
import './case-study.css';

const EVIDENCE_LABEL = { verified: 'Sursă verificată', 'team-confirmed': 'Confirmat de echipă', pending: 'În validare' } as const;
const STATE_LABEL = { active: 'În dezvoltare', shipped: 'Publicat', archived: 'Arhivat', research: 'Cercetare' } as const;
// Captions describe the available capture, rather than the production brief for a future asset.
const CHAPTER_MEDIA: Record<string, ProjectMedia> = {
  'project-nexus/validation': { src: '/assets/projects/project-nexus.webp', alt: 'Detecții evidențiate pe o imagine aeriană reală din validarea Project Nexus.', label: 'Validare / cadru aerian real', contain: true },
  'the-buried-hands/premise': { src: '/assets/projects/buried-hands/guards.webp', alt: 'Jucătorul urmărește gărzile din spatele unei coloane în The Buried Hands.', label: 'Gameplay / observație și evitare' },
  'infect-exe/loop': { src: '/assets/projects/infect-exe/gpu.png', alt: 'Captură a subsistemului GPU din Infect.exe.', label: 'Gameplay / subsistemul GPU', contain: true },
};

function followSection(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const hash = event.currentTarget.hash;
  const section = document.getElementById(hash.slice(1));
  if (!section) return;
  event.preventDefault();
  // This link supplies its own header offset; do not let Lenis schedule it again.
  event.stopPropagation();
  window.history.replaceState(window.history.state, '', hash);
  scrollSmoothTo(window.scrollY + section.getBoundingClientRect().top - 105);
  section.focus({ preventScroll: true });
}

export function ProjectCaseStudyPage() {
  const { slug } = useParams();
  const project = slug ? projectBySlug[slug] : undefined;
  if (!project) return <Navigate to="/work" replace />;
  const related = PROJECTS.filter((candidate) => candidate.id !== project.id && candidate.facets.some((facet) => project.facets.includes(facet)))
    .sort((a, b) => b.facets.filter((facet) => project.facets.includes(facet)).length - a.facets.filter((facet) => project.facets.includes(facet)).length).slice(0, 2);
  const credits = project.credits.filter((credit) => credit.evidence !== 'pending')
    .flatMap((credit) => { const member = TEAM.find((item) => item.id === credit.memberId); return member ? [{ credit, member }] : []; });
  const metrics = project.metrics?.filter((metric) => metric.evidence !== 'pending');
  return (
    <GreenfieldPageShell title={project.title} description={`${project.summary} Studiu de caz Transylvanian Bears.`} tone={project.accent === 'paper' ? 'paper' : 'dark'}>
      <article className="cs-page" data-tone={project.accent}>
        <ViewTransitionLink className="cs-back" to="/work" transitionKind="project"><ArrowLeft aria-hidden="true" /> Toate proiectele</ViewTransitionLink>
        <header className="cs-hero">
          <div className="cs-hero__copy">
            <p className="cs-kicker">{project.index} / {project.disciplineLabel} / {project.year}</p>
            <h1>{project.title}</h1>
            <p className="cs-summary">{project.summary}</p>
            <ul className="cs-tags" aria-label="Tehnologii și teme">{project.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
            <div className="cs-actions">{project.links.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight aria-hidden="true" /></a>)}</div>
            <p className="cs-state"><span>{STATE_LABEL[project.state]}</span> / {EVIDENCE_LABEL[project.evidence]}</p>
          </div>
          <ProjectFigure media={PROJECT_COVERS[project.id]} eager />
        </header>
        {metrics && metrics.length > 0 && <dl className="cs-metrics" aria-label="Rezultate și date ale proiectului">{metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd><small>{EVIDENCE_LABEL[metric.evidence]}</small></div>)}</dl>}
        <div className="cs-body">
          <nav className="cs-contents" aria-label="În acest proiect"><p>În acest proiect</p>{project.chapters.map((chapter) => <a key={chapter.id} href={`#${chapter.id}`} onClick={followSection}><span>{chapter.index}</span>{chapter.label}</a>)}<a href="#sources" onClick={followSection}><span>↗</span>Surse & echipă</a></nav>
          <div className="cs-story">
            <p className="cs-thesis">{project.thesis}</p>
            {project.chapters.map((chapter) => (
              <section key={chapter.id} id={chapter.id} tabIndex={-1} className="cs-chapter">
                <p className="cs-kicker">{chapter.index} / {chapter.label}</p>
                <h2>{chapter.title}</h2><p>{chapter.body}</p>
                {chapter.note && <p className="cs-note">{chapter.note}</p>}
                {project.id === 'project-nexus' && chapter.id === 'pipeline' && <NexusOutputs />}
                {project.id === 'aegis' && chapter.id === 'gate-flow' && <ol className="cs-flow" aria-label="Fluxul tokenului"><li><b>01</b>Emitere</li><li><b>02</b>Scanare QR</li><li><b>03</b>Validare</li><li><b>04</b>Utilizare unică</li></ol>}
                {CHAPTER_MEDIA[`${project.id}/${chapter.id}`] && <ProjectFigure media={CHAPTER_MEDIA[`${project.id}/${chapter.id}`]} />}
              </section>
            ))}
            <section id="sources" tabIndex={-1} className="cs-sources">
              <p className="cs-kicker">Surse & echipă</p><h2>Explorează mai departe.</h2>
              <div className="cs-source-list">{project.links.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer"><span>{link.label}</span><ArrowUpRight aria-hidden="true" /></a>)}</div>
              {credits.length > 0 && <div className="cs-credits"><h3>Contribuitori</h3><ul>{credits.map(({ credit, member }) => <li key={member.id}><ViewTransitionLink to={`/team/${member.id}`}>{member.name}</ViewTransitionLink>{credit.role && <span>{credit.role}</span>}</li>)}</ul></div>}
            </section>
          </div>
        </div>
        {related.length > 0 && <nav className="cs-related" aria-label="Proiecte conexe"><p className="cs-kicker">Continuă explorarea</p><div>{related.map((candidate) => <ViewTransitionLink key={candidate.id} to={`/work/${candidate.slug}`} transitionKind="project"><img src={PROJECT_COVERS[candidate.id].src} alt="" loading="lazy" /><span><small>{candidate.disciplineLabel}</small><strong>{candidate.shortTitle}</strong></span><ArrowUpRight aria-hidden="true" /></ViewTransitionLink>)}</div></nav>}
      </article>
    </GreenfieldPageShell>
  );
}
