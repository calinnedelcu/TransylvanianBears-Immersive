import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { GreenfieldPageShell } from '../components/GreenfieldPageShell';
import { ViewTransitionLink } from '../components/ViewTransitionLink';
import { PROJECTS, TEAM } from '../data';

export function MemberProfilePage() {
  const { memberId } = useParams();
  const member = TEAM.find((candidate) => candidate.id === memberId);

  if (!member) return <Navigate to="/team" replace />;

  const credits = PROJECTS.filter((project) => project.credits.some((credit) => credit.memberId === member.id));

  return (
    <GreenfieldPageShell
      title={member.name}
      description={`${member.name}: ${member.discipline} în echipa Transylvanian Bears și contribuții confirmate în proiectele comune.`}
    >
      <article className="gf-member-profile">
        <header className="gf-member-hero" data-gf-motion>
          <div className="gf-member-hero__copy">
            <ViewTransitionLink className="gf-back-link" to="/team">
              <ArrowLeft aria-hidden="true" />
              Echipa
            </ViewTransitionLink>
            <p className="gf-page-kicker">Member / Contribution profile</p>
            <h1>{member.name}</h1>
            <p>{member.discipline}</p>
          </div>
          <div className="gf-member-portrait">
            <img src={member.portraitSrc} alt={`Portret ${member.name}`} width="500" height="700" decoding="async" />
            <span>Team portrait / 2026</span>
            <strong>{member.name.split(' ').map((part) => part[0]).join('')}</strong>
            <small>{member.discipline}</small>
          </div>
        </header>

        <section className="gf-member-statement" data-gf-motion>
          <p>Profil editorial</p>
          <h2>Profilul personal va fi publicat în vocea membrului.</h2>
          <p>
            Până la interviul editorial păstrăm aici numai disciplina și contribuțiile confirmate, fără o biografie
            reconstruită din presupuneri.
          </p>
        </section>

        <section className="gf-member-credits">
          <div className="gf-section-heading">
            <p>Team work</p>
            <h2>Contribuții confirmate</h2>
          </div>
          {credits.length > 0 ? (
            <ol>
              {credits.map((project) => (
                <li key={project.id} data-gf-motion>
                  <span>{project.index}</span>
                  <div><small>{project.disciplineLabel}</small><strong>{project.title}</strong></div>
                  <ViewTransitionLink to={`/work/${project.slug}`} transitionKind="project" aria-label={`Deschide ${project.title}`}><ArrowUpRight aria-hidden="true" /></ViewTransitionLink>
                </li>
              ))}
            </ol>
          ) : (
            <p className="gf-pending-copy">Creditele proiectelor de echipă sunt încă în validare.</p>
          )}
        </section>

        <section className="gf-personal-slots">
          <div className="gf-section-heading">
            <p>Personal work</p>
            <h2>Proiecte personale rezervate pentru selecția membrului.</h2>
          </div>
          <div className="gf-personal-slots__grid">
            {[1, 2].map((slot) => (
              <article key={slot} data-gf-motion>
                <span>{String(slot).padStart(2, '0')}</span>
                <div aria-hidden="true"><i /><i /><i /></div>
                <h3>Selecție în curs</h3>
                <p>Titlul, rolul, descrierea și media vor fi furnizate direct de membru.</p>
              </article>
            ))}
          </div>
        </section>
      </article>
    </GreenfieldPageShell>
  );
}
