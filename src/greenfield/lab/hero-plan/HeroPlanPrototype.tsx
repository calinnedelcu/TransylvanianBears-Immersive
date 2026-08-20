// Display face pentru wordmark. Cinzel iese: direcția vizuală îl numește explicit
// drept clișeu de evitat. Fraunces e variabilă, are latin-ext, deci și ș / ț.
import '@fontsource-variable/fraunces';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { useGreenfieldMode } from '../../hooks/useGreenfieldMode';

import { ARCHIVE, PROJECTS, TEAM } from '../../data';
import { CitadelScene } from './CitadelScene';
import { HeroPlanSheet, HeroSystemIndex } from './heroOpening';
import { PLAN_NODES } from './planNodes';
import { useHeroOpening } from './useHeroOpening';
import './hero-plan.css';

/**
 * Banda de dovezi se numără din date, nu se scrie de mână. Dacă echipa adaugă
 * un proiect, un membru sau o intrare în arhivă, primul viewport se actualizează
 * singur — și nu poate rămâne în urmă cu o cifră greșită.
 */
const pad = (n: number) => String(n).padStart(2, '0');

const EVIDENCE = [
  { value: pad(PROJECTS.length), label: 'sisteme' },
  { value: pad(TEAM.length), label: 'constructori' },
  { value: pad(ARCHIVE.length), label: 'intrări în arhivă' },
  { value: '25—26', label: 'perioadă' },
];

type Phase = 'plan' | 'threshold' | 'citadel';

function phaseForProgress(progress: number): Phase {
  if (progress < 0.08) return 'plan';
  if (progress < 0.86) return 'threshold';
  return 'citadel';
}

export default function HeroPlanPrototype() {
  const rootRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const opening = useHeroOpening();
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>('plan');

  useGreenfieldMode('Hero plan');

  // ?p=0.55 pins the transition at a fixed point. The opening only exists while
  // scrolling, which makes it impossible to look at one moment of it and talk
  // about that moment. This makes every frame addressable.
  const pinned = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('p');
    if (raw === null) return null;
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;
  }, []);

  const updateProgress = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    if (pinned !== null) {
      progressRef.current = pinned;
      root.style.setProperty('--hp-progress', pinned.toFixed(4));
      setPhase(phaseForProgress(pinned));
      return;
    }

    // Tranziția se consumă în 1.6 ecrane, dar sticky-ul ține 2. Diferența e o
    // pauză deliberată pe cadrul final: cetatea rămâne întreagă înainte să plece.
    const span = Math.max(1, window.innerHeight * 1.6);
    const progress = Math.max(0, Math.min(1, (window.scrollY - root.offsetTop) / span));

    progressRef.current = progress;
    root.style.setProperty('--hp-progress', progress.toFixed(4));
    const next = phaseForProgress(progress);
    setPhase((current) => (current === next ? current : next));
  }, [pinned]);

  useEffect(() => {
    // Safari and Chrome restore the previous scroll offset on reload. On a page
    // whose whole opening is a scroll driven transition, that drops the visitor
    // into the middle of it with no plan, no tip and no rise: the citadel just
    // appears. The opening has to start at the opening.
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  useEffect(() => {
    document.body.classList.add('hp-lab-mode');
    return () => {
      document.body.classList.remove('hp-lab-mode');
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (reducedMotion) {
      // Fără mișcare amplă: planul rămâne plan, iar conținutul rămâne lizibil.
      root.style.setProperty('--hp-progress', '0');
      setPhase('plan');
      return;
    }

    let frame = 0;
    const requestUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [reducedMotion, updateProgress]);

  return (
    <main
      ref={rootRef}
      className="hp-lab"
      data-phase={phase}
      data-reduced={reducedMotion || undefined}
    >
      <a className="hp-skip" href="#hp-systems">Sari la lista sistemelor</a>

      <header className="hp-header">
        <Link className="hp-brand" to="/next" aria-label="Transylvanian Bears, start">
          Transylvanian Bears
        </Link>
        <p>Hero plan / draft 01</p>
        <Link className="hp-index-link" to="/next/work">Index</Link>
      </header>

      <div className="hp-track">
        <div className="hp-viewport">
          <div className="hp-sky" aria-hidden="true" />
          <div className="hp-horizon" aria-hidden="true" />

          <div className="hp-copy">
            <p className="hp-kicker">Șapte sisteme. O singură cetate.</p>
            <h1 className="hp-wordmark">
              <span>Transylvanian</span>
              <span>Bears</span>
            </h1>
            <p className="hp-line">
              Software, jocuri, machine learning și cercetare — construite de șase elevi,
              într-un singur sistem.
            </p>

            <div className="hp-cta">
              <a className="hp-btn hp-btn--primary" href="#hp-systems">
                Urmează semnalul
                <i aria-hidden="true" />
              </a>
              <Link className="hp-btn" to="/next/work">
                Deschide indexul
                <i aria-hidden="true" />
              </Link>
            </div>

            <dl className="hp-evidence">
              {EVIDENCE.map((item) => (
                <div key={item.label}>
                  <dt>{item.value}</dt>
                  <dd>{item.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="hp-world" aria-hidden="true">
            <CitadelScene
              progressRef={progressRef}
              reducedMotion={reducedMotion}
              planFrameRef={opening.planFrameRef}
              activeSlug={opening.activeSlug}
              focusSlug={opening.focusSlug}
              visited={opening.visited}
              onHover={opening.setHoverSlug}
              onSelect={opening.selectNode}
              tagsRef={opening.tagsRef}
            />
          </div>

          <HeroPlanSheet opening={opening} interactive={phase === 'plan'} />

        <HeroSystemIndex opening={opening} />

        <p className="hp-scroll-cue" aria-hidden="true">
          <i /> Derulează &middot; cetatea se ridică
        </p>
        </div>
      </div>

      {/* Suprafața editorială în care aterizează tranziția. */}
      <section id="hp-systems" className="hp-systems">
        <p className="hp-eyebrow">01 / Prag — cele șapte sisteme</p>
        <h2>Planul s-a deschis. De aici încolo, fiecare nod are o pagină.</h2>
        <ol className="hp-system-list">
          {PLAN_NODES.map(({ project }) => (
            <li key={project.slug}>
              <Link to={`/next/work/${project.slug}`}>
                <span className="hp-system-list__index">{project.index}</span>
                <span className="hp-system-list__label">{project.title}</span>
                <span className="hp-system-list__tag">{project.disciplineLabel}</span>
              </Link>
            </li>
          ))}
        </ol>

        {/* Cusătura către capitolul următor, în limbajul pasajelor din restul site-ului. */}
        <div className="hp-passage">
          <p className="hp-eyebrow">02 / Passage &middot; Prag &rarr; Nexus</p>
          <p className="hp-passage__line">
            Traseul care a parcurs inelul iese pe poartă și intră în primul sistem.
          </p>
          <Link className="hp-passage__link" to="/next/work/project-nexus">
            Project Nexus &mdash; câmpul sintetic
          </Link>
        </div>
      </section>
    </main>
  );
}
