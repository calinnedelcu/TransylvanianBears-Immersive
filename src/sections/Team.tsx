import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { COPY, PROJECTS, TEAM, type Member } from '../data';
import { Reveal } from '../components/Reveal';
import './team.css';

function creditsOf(member: Member) {
  return PROJECTS.filter((project) => project.credits.some((credit) => credit.memberId === member.id));
}

export function Team() {
  return (
    <section id="echipa" className="team section" aria-labelledby="team-title">
      <div className="wrap">
        <Reveal className="section-head section-head--split section-head--long">
          <p className="section-head__index eyebrow">03 / Echipa</p>
          <h2 id="team-title" className="display">
            {COPY.team.title}
          </h2>
          <p>{COPY.team.body}</p>
        </Reveal>

        <ul className="roster">
          {TEAM.map((member, index) => {
            const credits = creditsOf(member);
            return (
              <Reveal
                as="li"
                key={member.id}
                className="mcard"
                delay={(index % 3) * 80}
                style={{ '--tilt': index % 2 === 0 ? '-1.2deg' : '1.2deg' } as CSSProperties}
              >
                <article id={member.id} data-accent={member.accent}>
                  <div className="mcard__frame">
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
                      <ul className="mcard__credits" aria-label={`Proiecte la care a contribuit ${member.name}`}>
                        {credits.map((project) => (
                          <li key={project.id}>
                            <Link to={`/work/${project.slug}`} data-accent={project.accent}>
                              <span aria-hidden="true">{project.index}</span>
                              {project.shortTitle}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mcard__pending">Credite în validare</p>
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
