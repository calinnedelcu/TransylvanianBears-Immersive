import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Member, Project } from '../data';
import { useContent } from '../i18n/useContent';
import { Reveal } from '../components/Reveal';
import { useTilt } from '../hooks/useTilt';
import './team.css';

function creditsOf(member: Member, PROJECTS: Project[]) {
  return PROJECTS.filter((project) => project.credits.some((credit) => credit.memberId === member.id));
}

export function Team() {
  const { COPY, PROJECTS, TEAM, UI, path } = useContent();
  const tilt = useTilt(8);
  return (
    <section id="echipa" className="team section" aria-labelledby="team-title">
      <div className="wrap">
        <Reveal className="section-head section-head--split section-head--long" data-station="team">
          <p className="section-head__index eyebrow">{UI.teamIndex}</p>
          <h2 id="team-title" className="display">
            {COPY.team.title}
          </h2>
          <p>{COPY.team.body}</p>
        </Reveal>

        <ul className="roster">
          {TEAM.map((member, index) => {
            const credits = creditsOf(member, PROJECTS);
            return (
              <Reveal
                as="li"
                key={member.id}
                className="mcard"
                delay={(index % 3) * 80}
                data-station="member"
                data-index={index}
                style={{ '--tilt': index % 2 === 0 ? '-1.2deg' : '1.2deg' } as CSSProperties}
              >
                <article id={member.id} data-accent={member.accent}>
                  <div className="mcard__frame" {...tilt}>
                    <span className="mcard__no eyebrow" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')} / {String(TEAM.length).padStart(2, '0')}
                    </span>
                    <span className="mcard__ghost display" aria-hidden="true">
                      {member.firstName.replace('.', '')}
                    </span>
                    <div className="mcard__stage">
                      <img
                        className="mcard__portrait"
                        src={member.portrait.src}
                        width={member.portrait.width}
                        height={member.portrait.height}
                        alt={member.portrait.alt}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  </div>
                  <div className="mcard__body">
                    <h3 className="display">{member.name}</h3>
                    <p className="eyebrow">{member.discipline}</p>
                    {credits.length > 0 ? (
                      <ul className="mcard__credits" aria-label={UI.contributedTo(member.name)}>
                        {credits.map((project) => (
                          <li key={project.id}>
                            <Link to={path(`/work/${project.slug}`)} data-accent={project.accent}>
                              <span aria-hidden="true">{project.index}</span>
                              {project.shortTitle}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mcard__pending">{UI.creditsPending}</p>
                    )}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
