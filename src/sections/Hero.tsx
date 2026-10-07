import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown } from 'lucide-react';
import { COPY, PROJECTS, RESULTS, TEAM } from '../data';
import { Marquee } from '../components/Marquee';
import { PawMark } from '../components/PawMark';
import './hero.css';

const TICKER = RESULTS.map((entry) => `${entry.result} · ${entry.short}`);

function Seal() {
  const text = `${PROJECTS.length} proiecte • ${TEAM.length} constructori • ${RESULTS.length} rezultate • `;
  return (
    <div className="seal" aria-hidden="true">
      <svg className="seal__ring" viewBox="0 0 200 200">
        <defs>
          <path id="seal-circle" d="M100 100m-76 0a76 76 0 1 1 152 0a76 76 0 1 1-152 0" />
        </defs>
        <text className="seal__text">
          <textPath href="#seal-circle" textLength="472" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <PawMark className="seal__paw" />
    </div>
  );
}

export function Hero() {
  return (
    <section id="start" className="hero grain" aria-labelledby="hero-title">
      <div className="hero__stage wrap">
        <p className="hero__kicker eyebrow">
          <span className="hero__dot" aria-hidden="true" />
          {COPY.hero.kicker}
        </p>

        <div className="hero__head">
          <div className="hero__titlewrap">
            <h1 id="hero-title" className="hero__title display">
              <span className="hero__word">
                <span>Transylvanian</span>
              </span>
              <span className="hero__word hero__word--bears">
                <span>Bears</span>
              </span>
            </h1>
            <Seal />
          </div>

          <div className="hero__copy">
            <p className="hero__lede">{COPY.hero.lede}</p>
            <div className="hero__actions">
              <Link className="btn btn--ink" to={{ pathname: '/', hash: '#proiecte' }}>
                Vezi proiectele
                <ArrowDown aria-hidden="true" />
              </Link>
              <Link className="btn btn--bone" to={{ pathname: '/', hash: '#echipa' }}>
                Cunoaște echipa
              </Link>
            </div>
          </div>
        </div>

        <ul className="lineup" aria-label="Echipa">
          {TEAM.map((member, index) => (
            <li
              key={member.id}
              className="lineup__item"
              style={{ '--i': index } as CSSProperties}
              data-accent={member.accent}
            >
              <Link
                className="lineup__link"
                to={{ pathname: '/', hash: '#echipa' }}
                aria-label={`${member.firstName}, ${member.name}, ${member.discipline}`}
              >
                <img
                  src={member.portrait.src}
                  width={member.portrait.width}
                  height={member.portrait.height}
                  alt=""
                  decoding="async"
                  {...{ fetchpriority: 'high' }}
                />
                <span className="lineup__tag">
                  <b>{member.firstName}</b>
                  <small>{member.discipline}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <Marquee items={TICKER} />
    </section>
  );
}
