import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GreenfieldPageShell } from '../components/GreenfieldPageShell';
import { PROJECTS, TEAM } from '../data';

export function TeamIndexPage() {
  return (
    <GreenfieldPageShell title="Echipa">
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
              <div className="gf-team-row__portrait" aria-label={`Placeholder portret pentru ${member.name}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{member.name.split(' ').map((part) => part[0]).join('')}</strong>
                <small>Portrait / 4:5 / min. 1600x2000</small>
              </div>
              <div className="gf-team-row__copy">
                <p>{member.discipline}</p>
                <h2>{member.name}</h2>
                <div className="gf-team-row__credits">
                  <span>Verified team credits</span>
                  {credits.length > 0 ? (
                    credits.map((project) => (
                      <Link key={project.id} to={`/next/work/${project.slug}`}>{project.shortTitle}</Link>
                    ))
                  ) : (
                    <small>Credite în validare</small>
                  )}
                </div>
              </div>
              <Link className="gf-team-row__open" to={`/next/team/${member.id}`} aria-label={`Deschide profilul lui ${member.name}`}>
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </section>
    </GreenfieldPageShell>
  );
}
