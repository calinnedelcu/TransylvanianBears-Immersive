import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Award, Briefcase, Check, Clock, Maximize2 } from 'lucide-react';
import {
  COPY,
  EVIDENCE_LABEL,
  RESULTS,
  projectById,
  resultStats,
  type Evidence,
  type ResultEntry,
} from '../data';
import { Reveal } from '../components/Reveal';
import { useLightbox } from '../components/Lightbox';
import './results.css';

const KIND_LABEL: Record<ResultEntry['kind'], string> = {
  award: 'Premiu',
  ranking: 'Clasare',
  milestone: 'Milestone',
};

const YEARS = [...new Set(RESULTS.map((entry) => entry.year))].sort((a, b) => b - a);

function medalTone(entry: ResultEntry) {
  if (entry.place === 1) return 'gold';
  if (entry.place === 2) return 'silver';
  if (entry.place === 3) return 'bronze';
  return 'plain';
}

function Medal({ entry }: { entry: ResultEntry }) {
  return (
    <span className="medal" data-tone={medalTone(entry)} aria-hidden="true">
      {entry.place ? (
        <>
          <small>#</small>
          {entry.place}
        </>
      ) : entry.kind === 'milestone' ? (
        <Briefcase />
      ) : (
        <Award />
      )}
    </span>
  );
}

function EvidenceTag({ status }: { status: Evidence }) {
  return (
    <span className="evidence" data-status={status}>
      {status === 'verified' ? <Check aria-hidden="true" /> : <Clock aria-hidden="true" />}
      {EVIDENCE_LABEL[status]}
    </span>
  );
}

/** What the sticky preview shows for an entry: its own proof, else the project's cover, else a poster. */
function previewFor(entry: ResultEntry) {
  if (entry.image) return { ...entry.image, fit: entry.image.fit ?? 'contain' };
  const project = entry.projectId ? projectById[entry.projectId] : undefined;
  if (project) return { ...project.cover, fit: project.cover.fit ?? 'cover' };
  return null;
}

export function Results() {
  const [activeId, setActiveId] = useState(RESULTS[0].id);
  const lightbox = useLightbox();
  const active = RESULTS.find((entry) => entry.id === activeId) ?? RESULTS[0];
  const preview = previewFor(active);

  return (
    <section id="rezultate" className="results section surface-ink grain" aria-labelledby="results-title">
      <div className="wrap">
        <Reveal className="section-head section-head--split section-head--long">
          <p className="section-head__index eyebrow">02 / Rezultate</p>
          <h2 id="results-title" className="display">
            {COPY.results.title}
          </h2>
          <p>{COPY.results.body}</p>
        </Reveal>

        <Reveal as="ul" className="medal-stats" delay={80}>
          <li data-tone="gold">
            <b className="display">{resultStats.first}</b>
            <span>Locul 1</span>
          </li>
          <li data-tone="silver">
            <b className="display">{resultStats.second}</b>
            <span>Locul 2</span>
          </li>
          <li data-tone="bronze">
            <b className="display">{resultStats.third}</b>
            <span>Locul 3</span>
          </li>
          <li data-tone="plain">
            <b className="display">{resultStats.mentions}</b>
            <span>Mențiuni</span>
          </li>
        </Reveal>

        <div className="results__layout">
          <aside className="results__preview" aria-label="Previzualizare dovadă">
            <figure>
              {preview ? (
                <button
                  type="button"
                  className="results__shot"
                  data-fit={preview.fit}
                  aria-label={`Mărește imaginea: ${active.title}`}
                  onClick={() => lightbox.open({ ...preview, caption: `${active.result} — ${active.title}` })}
                >
                  <img
                    key={preview.src}
                    src={preview.src}
                    width={preview.width}
                    height={preview.height}
                    alt={preview.alt}
                    decoding="async"
                  />
                  <span className="results__zoom" aria-hidden="true">
                    <Maximize2 />
                  </span>
                </button>
              ) : (
                <div className="results__poster" data-accent="gold" aria-hidden="true">
                  <span className="display">{active.result}</span>
                </div>
              )}
              <figcaption>
                <span className="eyebrow">
                  {active.year} / {KIND_LABEL[active.kind]}
                </span>
                <strong className="display">{active.result}</strong>
                <span>{active.title}</span>
              </figcaption>
            </figure>
          </aside>

          <div className="results__ledger">
            {YEARS.map((year) => (
              <section key={year} className="ledger__year" aria-label={`Rezultate ${year}`}>
                <p className="ledger__yearlabel display" aria-hidden="true">
                  {year}
                </p>
                <ol className="ledger">
                  {RESULTS.filter((entry) => entry.year === year).map((entry) => {
                    const project = entry.projectId ? projectById[entry.projectId] : undefined;
                    const thumb = entry.image;
                    return (
                      <Reveal
                        as="li"
                        key={entry.id}
                        className="ledger__item"
                      >
                        <article
                          className="ledger__row"
                          data-active={active.id === entry.id || undefined}
                          onMouseEnter={() => setActiveId(entry.id)}
                          onFocusCapture={() => setActiveId(entry.id)}
                          onClick={() => setActiveId(entry.id)}
                        >
                          <Medal entry={entry} />
                          <div className="ledger__main">
                            <p className="eyebrow">
                              {entry.year} / {KIND_LABEL[entry.kind]}
                            </p>
                            <h3>{entry.title}</h3>
                            <p className="ledger__result display">{entry.result}</p>
                            {entry.note && <p className="ledger__note">{entry.note}</p>}
                            <div className="ledger__meta">
                              <EvidenceTag status={entry.evidence} />
                              {project && (
                                <Link className="ledger__link" to={`/work/${project.slug}`}>
                                  {project.shortTitle}
                                  <ArrowUpRight aria-hidden="true" />
                                </Link>
                              )}
                              {entry.href && (
                                <a className="ledger__link" href={entry.href} target="_blank" rel="noreferrer">
                                  Sursa oficială
                                  <ArrowUpRight aria-hidden="true" />
                                </a>
                              )}
                            </div>
                          </div>
                          {thumb && (
                            <button
                              type="button"
                              className="ledger__thumb"
                              data-fit={thumb.fit ?? 'contain'}
                              aria-label={`Vezi dovada: ${entry.title}`}
                              onClick={() => lightbox.open({ ...thumb, caption: `${entry.result} — ${entry.title}` })}
                            >
                              <img src={thumb.src} alt="" width={thumb.width} height={thumb.height} loading="lazy" decoding="async" />
                            </button>
                          )}
                        </article>
                      </Reveal>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        </div>
      </div>
      {lightbox.element}
    </section>
  );
}
