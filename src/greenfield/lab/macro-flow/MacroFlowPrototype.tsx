import { Boxes, ChevronDown, Eye, ScanLine, Waypoints } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { useGreenfieldMode } from '../../hooks/useGreenfieldMode';
import { MacroFlowScene, type MacroLensMode } from './MacroFlowScene';
import './macro-flow.css';

type MacroChapter = 'threshold' | 'field' | 'lens' | 'proof' | 'passage';

const CHAPTERS: Array<{ id: MacroChapter; index: string; label: string }> = [
  { id: 'threshold', index: '01', label: 'Threshold' },
  { id: 'field', index: '02', label: 'Synthetic field' },
  { id: 'lens', index: '03', label: 'Lens knot' },
  { id: 'proof', index: '04', label: 'Evidence' },
  { id: 'passage', index: '05', label: 'Aegis passage' },
];

const LENS_OPTIONS: Array<{
  id: MacroLensMode;
  label: string;
  description: string;
  icon: typeof Eye;
}> = [
  { id: 'raw', label: 'Raw', description: 'Sursa vizuală', icon: Eye },
  { id: 'segmentation', label: 'Segmentation', description: 'Clasele devin suprafețe', icon: Boxes },
  { id: 'detection', label: 'Detection', description: 'Semnalele devin limite', icon: ScanLine },
];

function chapterForProgress(progress: number): MacroChapter {
  if (progress < 0.2) return 'threshold';
  if (progress < 0.39) return 'field';
  if (progress < 0.57) return 'lens';
  if (progress < 0.76) return 'proof';
  return 'passage';
}

export default function MacroFlowPrototype() {
  const rootRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  const [activeChapter, setActiveChapter] = useState<MacroChapter>('threshold');
  const [lensMode, setLensMode] = useState<MacroLensMode>('raw');

  useGreenfieldMode('Macro Flow Lab');

  const updateProgress = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootTop = root.offsetTop;
    const max = Math.max(1, root.scrollHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, (window.scrollY - rootTop) / max));
    progressRef.current = progress;
    root.style.setProperty('--mf-progress', progress.toFixed(4));
    const nextChapter = chapterForProgress(progress);
    setActiveChapter((current) => (current === nextChapter ? current : nextChapter));
  }, []);

  useEffect(() => {
    document.body.classList.add('mf-lab-mode');
    let frame = 0;
    const requestUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      document.body.classList.remove('mf-lab-mode');
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [updateProgress]);

  return (
    <main ref={rootRef} className="mf-lab" data-active-chapter={activeChapter} data-lens={lensMode}>
      <a className="mf-skip" href="#mf-proof">Sari la dovada proiectului</a>

      <div className="mf-world" aria-hidden="true">
        <MacroFlowScene progressRef={progressRef} lensMode={lensMode} reducedMotion={reducedMotion} />
        <div className="mf-world__grade" />
      </div>

      <header className="mf-header">
        <Link className="mf-brand" to="/next" aria-label="Transylvanian Bears, start">
          <span className="mf-brand__mark" aria-hidden="true"><i /></span>
          <span>Transylvanian Bears</span>
        </Link>
        <p>Macro flow / spatial draft 01</p>
        <Link className="mf-index-link" to="/next/work">
          Open index <Waypoints aria-hidden="true" />
        </Link>
      </header>

      <nav className="mf-rail" aria-label="Macro flow chapters">
        {CHAPTERS.map((chapter) => (
          <a
            key={chapter.id}
            href={`#mf-${chapter.id}`}
            data-active={activeChapter === chapter.id || undefined}
            aria-label={`${chapter.index}. ${chapter.label}`}
          >
            <span>{chapter.index}</span>
            <i />
          </a>
        ))}
      </nav>

      <section id="mf-threshold" className="mf-beat mf-beat--threshold" data-chapter="threshold">
        <div className="mf-copy mf-copy--hero">
          <p className="mf-kicker">Braided expedition / 01</p>
          <h1>Un sistem.<br />Nu șapte insule.</h1>
          <p>
            Atelierul nu devine meniu. Se deschide o singură dată, apoi contribuțiile lui se
            transformă în drumul către primul proiect.
          </p>
          <ChevronDown className="mf-scroll-cue" aria-hidden="true" />
        </div>
      </section>

      <section id="mf-field" className="mf-beat mf-beat--field" data-chapter="field">
        <div className="mf-copy mf-copy--side">
          <p className="mf-kicker">Project Nexus / synthetic field</p>
          <h2>Camera intră în problemă, nu într-o galerie.</h2>
          <p>
            Strada, clădirile și semnalele devin materia datasetului. Același traseu va continua
            după proiect; nu există portal de întoarcere.
          </p>
        </div>
      </section>

      <section id="mf-lens" className="mf-beat mf-beat--lens" data-chapter="lens">
        <div className="mf-lens-knot">
          <div className="mf-lens-knot__heading">
            <p className="mf-kicker">Agency knot / Lens</p>
            <h2>Aceeași scenă. Trei moduri de a o înțelege.</h2>
          </div>
          <div className="mf-lens-control" aria-label="Lens mode">
            {LENS_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  data-active={lensMode === option.id || undefined}
                  aria-pressed={lensMode === option.id}
                  onClick={() => setLensMode(option.id)}
                >
                  <Icon aria-hidden="true" />
                  <span><strong>{option.label}</strong><small>{option.description}</small></span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section id="mf-proof" className="mf-clearing" data-chapter="proof">
        <div className="mf-clearing__inner">
          <header className="mf-clearing__head">
            <p className="mf-kicker">Editorial clearing / NX-01</p>
            <p>Applied machine learning</p>
          </header>

          <div className="mf-clearing__title">
            <span>Project</span>
            <h2>Nexus</h2>
            <p>
              Medii sintetice construite în Unreal Engine 5 și AirSim pentru antrenarea detecției
              aeriene, urmate de verificare pe date reale.
            </p>
          </div>

          <figure className="mf-proof-media">
            <img src="/assets/projects/project-nexus.webp" alt="Detecții aeriene Project Nexus într-o intersecție reală" />
            <figcaption>Real-world validation frame / source material</figcaption>
          </figure>

          <dl className="mf-metrics">
            <div><dt>Scenarii</dt><dd>11</dd></div>
            <div><dt>Imagini</dt><dd>~9.500</dd></div>
            <div><dt>Adnotări</dt><dd>&gt;140.000</dd></div>
          </dl>

          <div className="mf-clearing__method">
            <p className="mf-kicker">Method / inspectable</p>
            <ol>
              <li><span>01</span> Generare de medii și condiții variate</li>
              <li><span>02</span> Segmentare și adnotare automată</li>
              <li><span>03</span> Antrenare YOLOv8 și verificare pe date reale</li>
            </ol>
            <a
              href="https://docs.google.com/presentation/d/1IFLpSXYsgB3ro6IvawuXEFcsHJaB_8aAPX1dooPD5Xg/edit"
              target="_blank"
              rel="noreferrer"
            >
              Deschide prezentarea sursă <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section id="mf-passage" className="mf-beat mf-beat--passage" data-chapter="passage">
        <div className="mf-copy mf-copy--passage">
          <p className="mf-kicker">Continuity rule / Nexus → Aegis</p>
          <h2>Detecția devine decizie.</h2>
          <p>
            Bounding-box-urile nu dispar. Se ridică în cadre de acces, iar semnalul verificat
            devine traseul prin sistemul Aegis.
          </p>
          <div className="mf-next-beat">
            <span>Următorul prototip</span>
            <strong>Trust passage / Aegis</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
