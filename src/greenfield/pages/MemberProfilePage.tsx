import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { GreenfieldPageShell } from '../components/GreenfieldPageShell';
import { PROJECTS, TEAM } from '../data';

export function MemberProfilePage() {
  const { memberId } = useParams();
  const member = TEAM.find((candidate) => candidate.id === memberId);

  if (!member) return <Navigate to="/next/team" replace />;

  const credits = PROJECTS.filter((project) => project.credits.some((credit) => credit.memberId === member.id));

  return (
    <GreenfieldPageShell title={member.name}>
      <article className="gf-member-profile">
        <header className="gf-member-hero" data-gf-motion>
          <div className="gf-member-hero__copy">
            <Link className="gf-back-link" to="/next/team">
              <ArrowLeft aria-hidden="true" />
              Echipa
            </Link>
            <p className="gf-page-kicker">Member / Profile in review</p>
            <h1>{member.name}</h1>
            <p>{member.discipline}</p>
          </div>
          <div className="gf-member-portrait" aria-label={`Placeholder portret pentru ${member.name}`}>
            <span>Portrait asset</span>
            <strong>4:5</strong>
            <p>Cadru environmental, lumină naturală, mâinile și spațiul de lucru vizibile.</p>
            <small>Minimum 1600x2000 / variantă mobilă din același cadru</small>
          </div>
        </header>

        <section className="gf-member-statement" data-gf-motion>
          <p>Profil editorial</p>
          <h2>Bio-ul, rolul exact și perspectiva personală vor veni direct de la membru.</h2>
          <p>
            Layout-ul este terminat intenționat fără text generic. Când răspunsurile sunt validate, ele intră aici fără
            să schimbe structura paginii.
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
                  <Link to={`/next/work/${project.slug}`} aria-label={`Deschide ${project.title}`}><ArrowUpRight aria-hidden="true" /></Link>
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
            <h2>Două sloturi, zero proiecte inventate.</h2>
          </div>
          <div className="gf-personal-slots__grid">
            {[1, 2].map((slot) => (
              <article key={slot} data-gf-motion>
                <span>{String(slot).padStart(2, '0')}</span>
                <div aria-hidden="true"><i /><i /><i /></div>
                <h3>Proiect personal în așteptare</h3>
                <p>Titlu, rol, descriere, link și media furnizate de membru.</p>
              </article>
            ))}
          </div>
        </section>
      </article>
    </GreenfieldPageShell>
  );
}
