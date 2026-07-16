import { useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { GreenfieldPageShell } from '../components/GreenfieldPageShell';
import { ViewTransitionLink } from '../components/ViewTransitionLink';
import { ARCHIVE, projectById } from '../data';
import type { ArchiveEntry } from '../types';

type ArchiveFilter = 'all' | ArchiveEntry['kind'];

const FILTERS: { id: ArchiveFilter; label: string }[] = [
  { id: 'all', label: 'Tot' },
  { id: 'award', label: 'Premii' },
  { id: 'ranking', label: 'Clasări' },
  { id: 'milestone', label: 'Milestones' },
];

const EVIDENCE_LABEL = {
  verified: 'verificat',
  'team-confirmed': 'confirmat de echipă',
  pending: 'dovadă în așteptare',
} as const;

export function ArchivePage() {
  const [filter, setFilter] = useState<ArchiveFilter>('all');
  const [activeId, setActiveId] = useState(ARCHIVE[0].id);
  const entries = useMemo(
    () => ARCHIVE
      .filter((entry) => filter === 'all' || entry.kind === filter)
      .sort((a, b) => b.year - a.year),
    [filter],
  );
  const activeEntry = entries.find((entry) => entry.id === activeId) ?? entries[0];
  const activeProject = activeEntry?.projectId ? projectById[activeEntry.projectId] : undefined;
  const activeImage = activeEntry?.imageSrc ?? activeProject?.heroAsset.previewSrc;
  const activeAlt = activeEntry?.imageAlt ?? activeProject?.heroAsset.alt ?? '';

  return (
    <GreenfieldPageShell
      title="Arhivă"
      description="Premii, clasări și milestone-uri Transylvanian Bears, legate de proiectele și dovezile care le susțin."
      tone="paper"
    >
      <header className="gf-page-hero gf-page-hero--archive" data-gf-motion>
        <p className="gf-page-kicker">Archive / Evidence ledger</p>
        <h1>Un rezultat fără context este doar o cifră.</h1>
        <p>
          Arhiva separă premiile, clasările și milestone-urile. Fiecare intrare păstrează starea dovezii și legătura
          cu proiectul care a produs-o.
        </p>
      </header>

      <section className="gf-archive-page" aria-labelledby="archive-ledger-title">
        <div className="gf-section-heading">
          <p>2025—2026</p>
          <h2 id="archive-ledger-title">Evidence ledger</h2>
        </div>

        <div className="gf-segmented" role="group" aria-label="Filtrează arhiva">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              data-active={filter === item.id || undefined}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              <span>{item.label}</span>
              <small>{String(item.id === 'all' ? ARCHIVE.length : ARCHIVE.filter((entry) => entry.kind === item.id).length).padStart(2, '0')}</small>
            </button>
          ))}
        </div>

        <div className="gf-archive-layout">
          {activeEntry ? (
            <aside className="gf-archive-preview" aria-live="polite">
              <figure>
                <div className="gf-archive-preview__media">
                  {activeImage ? (
                    <img src={activeImage} alt={activeAlt} width="900" height="675" decoding="async" />
                  ) : (
                    <div className="gf-archive-preview__signal" aria-hidden="true"><i /><i /><i /></div>
                  )}
                </div>
                <figcaption>
                  <span>{activeEntry.year} / {activeEntry.kind}</span>
                  <strong>{activeEntry.result}</strong>
                  <small>{activeEntry.title}</small>
                </figcaption>
              </figure>
            </aside>
          ) : null}

          <ol className="gf-archive-ledger">
            {entries.map((entry, index) => {
              const project = entry.projectId ? projectById[entry.projectId] : undefined;
              const content = (
                <>
                  <span className="gf-archive-ledger__number">{String(index + 1).padStart(2, '0')}</span>
                  <time>{entry.year}</time>
                  <div>
                    <small>{entry.kind}</small>
                    <strong>{entry.title}</strong>
                    {entry.note && <p>{entry.note}</p>}
                  </div>
                  <b>{entry.result}</b>
                  <span className="gf-evidence" data-status={entry.evidence}>{EVIDENCE_LABEL[entry.evidence]}</span>
                  {(project || entry.href) && <ArrowUpRight aria-hidden="true" />}
                </>
              );

              return (
                <li
                  key={entry.id}
                  data-gf-motion
                  data-active={activeEntry.id === entry.id || undefined}
                  onMouseEnter={() => setActiveId(entry.id)}
                  onFocus={() => setActiveId(entry.id)}
                >
                  {project ? (
                    <ViewTransitionLink to={`/work/${project.slug}`} transitionKind="project">{content}</ViewTransitionLink>
                  ) : entry.href ? (
                    <a href={entry.href} target="_blank" rel="noreferrer">{content}</a>
                  ) : (
                    <div>{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </GreenfieldPageShell>
  );
}
