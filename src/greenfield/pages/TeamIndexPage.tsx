import { ArrowUpRight } from 'lucide-react';
import { GreenfieldPageShell } from '../components/GreenfieldPageShell';
import { ViewTransitionLink } from '../components/ViewTransitionLink';
import { PROJECTS, TEAM } from '../data';

export function TeamIndexPage() {
  return (
    <GreenfieldPageShell
      title="Echipa"
      description="Cei șase membri Transylvanian Bears și contribuțiile lor confirmate în proiectele echipei."
    >
      <header className="gf-page-hero gf-page-hero--team" data-gf-motion>
        <p className="gf-page-kicker">Team / Six disciplines</p>
        <h1>O echipă se explică prin contribuții, nu prin adjective.</h1>
        <p>
          Rolurile sunt încă în validare cu fiecare membru. Până atunci publicăm doar proiectele pentru care există
          credit confirmat și păstrăm munca personală ca slot, nu ca poveste inventată.
        </p>
      </header>

      <section className="gf-team-index" aria-label="Membrii echipei">
        {TEAM.map((member, index) => {
          const credits = PROJECTS.filter((project) => project.credits.some((credit) => credit.memberId === member.id));

          return (
            <article key={member.id} className="gf-team-row" data-gf-motion>
              <div className="gf-team-row__portrait">
                <img src={member.portraitSrc} alt={`Portret ${member.name}`} width="500" height="700" loading={index > 1 ? 'lazy' : 'eager'} decoding="async" />
                <span>Member / {String(index + 1).padStart(2, '0')}</span>
                <strong>{member.name.split(' ').map((part) => part[0]).join('')}</strong>
                <small>Transylvanian Bears / 2026</small>
              </div>
              <div className="gf-team-row__copy">
                <p>{member.discipline}</p>
                <h2>{member.name}</h2>
                <div className="gf-team-row__credits">
                  <span>Verified team credits</span>
                  {credits.length > 0 ? (
                    credits.map((project) => (
                      <ViewTransitionLink key={project.id} to={`/work/${project.slug}`} transitionKind="project">{project.shortTitle}</ViewTransitionLink>
                    ))
                  ) : (
                    <small>Credite în validare</small>
                  )}
                </div>
              </div>
              <ViewTransitionLink className="gf-team-row__open" to={`/team/${member.id}`} aria-label={`Deschide profilul lui ${member.name}`}>
                <ArrowUpRight aria-hidden="true" />
              </ViewTransitionLink>
            </article>
          );
        })}
      </section>
    </GreenfieldPageShell>
  );
}
