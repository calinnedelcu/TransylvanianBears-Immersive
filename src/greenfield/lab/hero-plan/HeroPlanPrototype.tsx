// Display face pentru wordmark. Cinzel iese: direcția vizuală îl numește explicit
// drept clișeu de evitat. Fraunces e variabilă, are latin-ext, deci și ș / ț.
import '@fontsource-variable/fraunces';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { useGreenfieldMode } from '../../hooks/useGreenfieldMode';
import { CitadelPlan, CitadelPlanShell } from './CitadelPlan';
import { ARCHIVE, PROJECTS, TEAM } from '../../data';
import { CitadelScene } from './CitadelScene';
import { NodePreview } from './NodePreview';
import { PLAN_NODES } from './planNodes';
import './hero-plan.css';

/**
 * Extrudarea e făcută din felii stivuite pe Z. Zidul are pas mic și rămâne jos;
 * nucleul are pas mare, ca să se citească drept clădirea centrală.
 */
const EXTRUSIONS = [
  { part: 'wall', layers: 8, step: '16px', taperFrom: 99 },
  { part: 'core', layers: 12, step: '26px', taperFrom: 8 },
] as const;

/** Ultimele felii ale nucleului se strâng, ca volumul să capete acoperiș, nu capac plat. */
function layerScale(index: number, taperFrom: number): string {
  if (index < taperFrom) return '1';
  return (1 - (index - taperFrom + 1) * 0.15).toFixed(3);
}

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
  const planRef = useRef<HTMLDivElement>(null);
  // Unde sta desenul pe ecran. Scena 3D isi deriva pozitia camerei din asta,
  // ca modelul sa aterizeze exact peste plan la orice latime.
  const planFrameRef = useRef<{ cx: number; cy: number; radius: number } | null>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>('plan');
  /**
   * Hover and choice are two different things, and merging them made the labels
   * unusable.
   *
   * The camera walks to whichever system is chosen, and the labels are projected
   * from that camera. With hover doing the choosing, moving the cursor onto a
   * label sent the camera towards it, which slid the label out from under the
   * cursor, which ended the hover, which walked the camera back. The label
   * oscillated and could never be clicked.
   *
   * Hover now only lights a system up and names it in the panel. Travelling to
   * one takes a click, which is also the better behaviour: brushing past a label
   * no longer throws the reader across the courtyard.
   */
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const [focusSlug, setFocusSlug] = useState<string | null>(null);
  const activeSlug = focusSlug ?? hoverSlug;
  // Sistemele deschise raman aprinse: pleci dintr-o cetate diferita de cea in care ai intrat.
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set());

  const selectNode = useCallback((slug: string) => {
    setFocusSlug((current) => (current === slug ? null : slug));
    setVisited((current) => {
      if (current.has(slug)) return current;
      const next = new Set(current);
      next.add(slug);
      return next;
    });
  }, []);

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
    const measure = () => {
      const node = planRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      planFrameRef.current = {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        // Inelul are raza 300 intr-un viewBox de 920.
        radius: (300 / 920) * rect.width,
      };
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, []);

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
              planFrameRef={planFrameRef}
              reducedMotion={reducedMotion}
              activeSlug={activeSlug}
              focusSlug={focusSlug}
              visited={visited}
              onHover={setHoverSlug}
              onSelect={selectNode}
              tagsRef={tagsRef}
            />
          </div>

          <div className="hp-stage">
            <div className="hp-tilt" ref={planRef}>
              <div className="hp-ground-shadow" aria-hidden="true" />
              {/* Straturile CSS raman doar ca schita in timpul desenului; de la
                pragul de inclinare preia geometria reala din shared/citadel.json. */}
            {EXTRUSIONS.map((extrusion) => (
                <div
                  key={extrusion.part}
                  className="hp-extrude"
                  aria-hidden="true"
                  style={{ '--step': extrusion.step } as CSSProperties}
                >
                  {Array.from({ length: extrusion.layers }, (_, i) => (
                    <div
                      key={`${extrusion.part}-${i}`}
                      className="hp-extrude__layer"
                      data-crown={i === extrusion.layers - 1 || undefined}
                      style={{
                        '--layer': String(i + 1),
                        '--scale': layerScale(i, extrusion.taperFrom),
                      } as CSSProperties}
                    >
                      <CitadelPlanShell part={extrusion.part} />
                    </div>
                  ))}
                </div>
              ))}
              <CitadelPlan
                activeSlug={activeSlug}
                onNodeFocus={setHoverSlug}
                interactive={phase === 'plan'}
              />
            </div>
          </div>

        {/* Etichetele lumii. Pozitiile le scrie bucla de randare; aici stau doar
            continutul si comportamentul, ca sa ramana link-uri reale. */}
        <div className="hp-tags" ref={tagsRef} aria-label="Sistemele cetatii">
          {PLAN_NODES.map(({ project }) => (
            <Link
              key={project.slug}
              className="hp-tag"
              to={`/next/work/${project.slug}`}
              data-active={activeSlug === project.slug || undefined}
              data-visited={visited.has(project.slug) || undefined}
              onMouseEnter={() => setHoverSlug(project.slug)}
              onMouseLeave={() => setHoverSlug(null)}
              onFocus={() => setHoverSlug(project.slug)}
              onBlur={() => setHoverSlug(null)}
              onClick={(event) => {
                event.preventDefault();
                selectNode(project.slug);
              }}
            >
              <span>{project.index}</span>
              {project.shortTitle}
            </Link>
          ))}
        </div>

        <NodePreview activeSlug={activeSlug} />

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
