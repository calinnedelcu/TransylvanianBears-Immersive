import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ExternalLink, Mail, ScanSearch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import {
  CITADEL_ROUTES,
  EVIDENCE_ARTIFACTS,
  OPEN_PATHS,
  type CitadelRoute,
  type EvidenceArtifact,
  type OpenPath,
} from './evidenceData';
import './evidence-weave.css';

const EvidenceWeaveScene = lazy(() => import('./EvidenceWeaveScene'));

export default function EvidenceWeave() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  const [activeId, setActiveId] = useState<EvidenceArtifact['id']>('nexus');
  const [activeRoute, setActiveRoute] = useState<CitadelRoute['id']>('work');
  const [activeOpenPath, setActiveOpenPath] = useState<OpenPath['id']>('join');
  const [planReady, setPlanReady] = useState(false);
  const [openReady, setOpenReady] = useState(false);
  const [dawnReady, setDawnReady] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);

  const updateProgress = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const travel = Math.max(1, rect.height - window.innerHeight);
    const measuredProgress = Math.max(0, Math.min(1, -rect.top / travel));
    const progress = reducedMotion ? 1 : measuredProgress;
    const focusLine = window.innerHeight * 0.46;
    progressRef.current = progress;
    section.style.setProperty('--ew-progress', progress.toFixed(4));
    section.style.setProperty('--ew-final-start', `${(travel * 0.66 + focusLine).toFixed(1)}px`);
    section.style.setProperty('--ew-open-start', `${(travel * 0.82 + focusLine).toFixed(1)}px`);
    section.style.setProperty('--ew-dawn-start', `${(travel * 0.92 + focusLine).toFixed(1)}px`);
    section.style.setProperty('--ew-travel', `${travel.toFixed(1)}px`);
    const nextId: EvidenceArtifact['id'] = progress < 0.29 ? 'nexus' : progress < 0.5 ? 'aegis' : 'infect';
    setActiveId((current) => current === nextId ? current : nextId);
    const nextPlanReady = progress >= 0.66;
    setPlanReady((current) => current === nextPlanReady ? current : nextPlanReady);
    const nextOpenReady = progress >= 0.82;
    setOpenReady((current) => current === nextOpenReady ? current : nextOpenReady);
    const nextDawnReady = progress >= 0.92;
    setDawnReady((current) => current === nextDawnReady ? current : nextDawnReady);
  }, [reducedMotion]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setNearViewport(entry.isIntersecting), {
      rootMargin: '120% 0px',
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
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
  }, [updateProgress]);

  const active = EVIDENCE_ARTIFACTS.find((item) => item.id === activeId) ?? EVIDENCE_ARTIFACTS[0];
  const activePath = CITADEL_ROUTES.find((route) => route.id === activeRoute) ?? CITADEL_ROUTES[0];
  const activeOpen = OPEN_PATHS.find((path) => path.id === activeOpenPath) ?? OPEN_PATHS[0];

  return (
    <>
      <section
        id="mf-evidence-weave"
        ref={sectionRef}
        className="ew-section"
        data-plan-ready={planReady || undefined}
        data-open-ready={openReady || undefined}
        data-dawn-ready={dawnReady || undefined}
      >
        <div className="ew-chapter-sentinel ew-chapter-sentinel--evidence" data-chapter="evidence-weave" aria-hidden="true" />
        <div id="mf-final-return" className="ew-chapter-sentinel ew-chapter-sentinel--return" data-chapter="final-return" aria-hidden="true" />
        <div id="mf-open-paths" className="ew-chapter-sentinel ew-chapter-sentinel--open" data-chapter="open-paths" aria-hidden="true" />
        <div id="mf-dawn" className="ew-chapter-sentinel ew-chapter-sentinel--dawn" data-chapter="dawn" aria-hidden="true" />
        <div className="ew-stage">
          <div className="ew-stage__canvas" aria-hidden="true">
            {nearViewport ? (
              <Suspense fallback={<div className="ew-fallback">Binding evidence...</div>}>
                <EvidenceWeaveScene
                  progressRef={progressRef}
                  activeId={activeId}
                  onSelect={setActiveId}
                  activeRoute={activeRoute}
                  onSelectRoute={setActiveRoute}
                  activeOpenPath={activeOpenPath}
                  onSelectOpenPath={setActiveOpenPath}
                  reducedMotion={reducedMotion}
                />
              </Suspense>
            ) : <div className="ew-fallback" />}
          </div>

        <div className="ew-stage__grade" />

        <header className="ew-heading">
          <p>{dawnReady ? '16 / Dawn' : openReady ? '15 / Open paths' : planReady ? '14 / Final return' : '13 / Evidence weave'}</p>
          <h2>{dawnReady ? <>Sistemul<br />rămâne.</> : openReady ? <>Două drumuri.<br />Nicio poartă.</> : planReady ? <>Acum vezi<br />sistemul.</> : <>Dovada nu stă<br />pe un raft.</>}</h2>
          <span>{dawnReady ? 'Observe. Protect. Imagine. Measure. Build together.' : openReady ? 'Următorul semnal poate veni din afara citadelei.' : planReady ? 'Șapte proiecte. Patru domenii. O singură echipă.' : 'Este legată de proiect, timp și sursă.'}</span>
        </header>

        <div className="ew-readout" aria-live="polite">
          <span>{active.index} / {active.year}</span>
          <strong>{active.title}</strong>
          <p>{active.result} <i /> {active.status}</p>
        </div>

        <nav className="ew-selector" aria-label="Selectează dovada">
          {EVIDENCE_ARTIFACTS.map((artifact) => (
            <button
              key={artifact.id}
              type="button"
              aria-label={`${artifact.index} ${artifact.title}`}
              aria-pressed={activeId === artifact.id}
              onClick={() => setActiveId(artifact.id)}
            >
              <span>{artifact.index}</span>
              <i />
              <strong>{artifact.title.split(' / ')[0]}</strong>
            </button>
          ))}
        </nav>

        <div className="ew-scroll-state" aria-hidden="true">
          <span>Traverse evidence</span>
          <i><b /></i>
        </div>

        <a className="ew-archive-link" href="/next/archive">
          <ScanSearch aria-hidden="true" /> Open full archive <ExternalLink aria-hidden="true" />
        </a>

        <div className="ew-map-interface">
          <div>
            <span>{activePath.index} / Open route</span>
            <strong>{activePath.label}</strong>
            <p>{activePath.detail}</p>
          </div>
          <nav aria-label="Rutele citadelei">
            {CITADEL_ROUTES.map((route) => (
              <button
                key={route.id}
                type="button"
                aria-label={`${route.index} ${route.label}`}
                aria-pressed={activeRoute === route.id}
                onClick={() => setActiveRoute(route.id)}
              >
                <span>{route.index}</span><strong>{route.label}</strong>
              </button>
            ))}
          </nav>
          <Link to={activePath.href}>Enter {activePath.label} <ArrowUpRight aria-hidden="true" /></Link>
        </div>

        <div className="ew-open-interface">
          <div>
            <span>{activeOpen.index} / Open path</span>
            <strong>{activeOpen.label}</strong>
            <p>{activeOpen.detail}</p>
          </div>
          <nav aria-label="Drumuri deschise">
            {OPEN_PATHS.map((path) => (
              <button
                key={path.id}
                type="button"
                aria-label={`${path.index} ${path.label}`}
                aria-pressed={activeOpenPath === path.id}
                onClick={() => setActiveOpenPath(path.id)}
              >
                <span>{path.index}</span><strong>{path.label}</strong>
              </button>
            ))}
          </nav>
          {activeOpen.href.startsWith('/') ? (
            <Link to={activeOpen.href}>Follow path <ArrowUpRight aria-hidden="true" /></Link>
          ) : (
            <a href={activeOpen.href}>Open channel <Mail aria-hidden="true" /></a>
          )}
        </div>

        <div className="ew-dawn-interface">
          <p>Expedition complete / the website stays open</p>
          <nav aria-label="Continuă explorarea">
            <Link to="/next/work">Work</Link>
            <Link to="/next/team">Team</Link>
            <Link to="/next/archive">Archive</Link>
            <a href="mailto:calin.nedelcu08@gmail.com">Contact</a>
          </nav>
        </div>
      </div>

      <div className="ew-accessible-records">
        <h3>Evidence records</h3>
        {EVIDENCE_ARTIFACTS.map((artifact) => (
          <article key={artifact.id}>
            <span>{artifact.year} / {artifact.status}</span>
            <h4>{artifact.title}</h4>
            <p>{artifact.result}</p>
          </article>
        ))}
      </div>
      </section>

      <footer className="ew-footer">
        <div><span>Transylvanian Bears</span><strong>Build together.</strong></div>
        <nav aria-label="Footer">
          <Link to="/next/work">Work</Link>
          <Link to="/next/team">Team</Link>
          <Link to="/next/archive">Archive</Link>
          <a href="mailto:calin.nedelcu08@gmail.com">calin.nedelcu08@gmail.com</a>
        </nav>
        <p>Romania / 2026</p>
      </footer>
    </>
  );
}
