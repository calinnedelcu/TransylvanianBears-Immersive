import { ArrowDown, ExternalLink, LineChart, Network, Orbit, ScanSearch } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import './research-crossing.css';

type ResearchLens = 'economy' | 'automation';
type ResearchPhase = 'collect' | 'compare' | 'qualify';

const PHASES: Array<{ id: ResearchPhase; index: string; label: string }> = [
  { id: 'collect', index: '01', label: 'Collect' },
  { id: 'compare', index: '02', label: 'Compare' },
  { id: 'qualify', index: '03', label: 'Qualify' },
];

const READOUTS: Record<ResearchLens, Record<ResearchPhase, { title: string; body: string; metric: string }>> = {
  economy: {
    collect: {
      title: '2.449 evenimente nescheduled',
      body: 'Filtrate din 63.016 mesaje și legate de bare EUR/USD și Nasdaq-100 la un minut.',
      metric: '13 luni / 2 active',
    },
    compare: {
      title: 'Mișcare 1,3×–1,9× baseline',
      body: 'Ferestrele de eveniment sunt comparate cu perioade non-eveniment potrivite după oră și zi.',
      metric: 'matched baseline',
    },
    qualify: {
      title: 'Timestamp-ul nu este evenimentul',
      body: 'Drift-ul pre-eveniment este comparabil cu reacția post-eveniment; feed-ul public ajunge târziu.',
      metric: '49–54% direction hit',
    },
  },
  automation: {
    collect: {
      title: '3.037 ocupații ESCO',
      body: 'Șase caracteristici structurale descriu competențele, iar LightGBM estimează un scor orientativ.',
      metric: 'LightGBM / SHAP',
    },
    compare: {
      title: '654 ocupații COR mapate',
      body: 'Fuzzy matching la prag de 80% transferă modelul către 14,7% din clasificarea românească.',
      metric: '330 low / 318 medium / 6 high',
    },
    qualify: {
      title: 'Semnal, nu verdict',
      body: 'R² cross-validation negativ arată instabilitate serioasă. Scorurile nu sunt predicții exacte.',
      metric: 'R² CV −14,21 ± 6,16',
    },
  },
};

const ECONOMY_MARKS = 2449;
const AUTOMATION_MARKS = 654;

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function ease(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function hash(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function phaseFromProgress(progress: number): ResearchPhase {
  if (progress < 0.34) return 'collect';
  if (progress < 0.7) return 'compare';
  return 'qualify';
}

export default function ResearchCrossing() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });
  const visibleRef = useRef(false);
  const frameRef = useRef(0);
  const [lens, setLens] = useState<ResearchLens>('economy');
  const [phase, setPhase] = useState<ResearchPhase>('collect');
  const reducedMotion = usePrefersReducedMotion();
  const readout = READOUTS[lens][phase];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;
    const progress = reducedMotion ? 1 : progressRef.current;
    const assemble = ease(progress / 0.28);
    const cross = ease((progress - 0.24) / 0.46);
    const qualify = ease((progress - 0.66) / 0.34);
    const pointer = pointerRef.current;
    const pointerX = pointer.x * w;
    const pointerY = pointer.y * h;

    context.fillStyle = '#efeee9';
    context.fillRect(0, 0, w, h);

    context.strokeStyle = 'rgba(15, 17, 20, 0.13)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(w * 0.5, 0);
    context.lineTo(w * 0.5, h);
    context.moveTo(0, h * 0.5);
    context.lineTo(w, h * 0.5);
    context.stroke();

    const economySelected = lens === 'economy';
    const economyAlpha = economySelected ? 0.72 : 0.18;
    const automationAlpha = economySelected ? 0.17 : 0.76;
    const economyRenderCount = w < 700 ? 920 : ECONOMY_MARKS;
    const automationRenderCount = w < 700 ? 420 : AUTOMATION_MARKS;

    for (let index = 0; index < economyRenderCount; index += 1) {
      const u = hash(index, 1);
      const v = hash(index, 2);
      const sourceColumn = index % 48;
      const sourceRow = Math.floor(index / 48) % 7;
      const sourceX = w * 0.5 + (sourceColumn - 23.5) * 4;
      const sourceY = h * 0.5 + (sourceRow - 3) * 4;
      const fieldX = w * (0.055 + u * 0.89);
      const wave = Math.sin(u * Math.PI * 8) * h * 0.045;
      const fieldY = h * (0.33 + (v - 0.5) * 0.24) + wave;
      const crossingX = w * (0.12 + u * 0.76);
      const crossingY = h * (0.5 - (u - 0.5) * 0.38 + (v - 0.5) * 0.13);
      const x1 = sourceX + (fieldX - sourceX) * assemble;
      const y1 = sourceY + (fieldY - sourceY) * assemble;
      const x = x1 + (crossingX - x1) * cross;
      const y = y1 + (crossingY - y1) * cross;
      const distance = Math.hypot(x - pointerX, y - pointerY);
      const focus = pointer.active && distance < 92 ? 1 : 0;
      const size = (focus ? 2.8 : 1.25) + qualify * 0.3;
      context.fillStyle = `rgba(20, 78, 190, ${Math.min(1, economyAlpha + focus * 0.28)})`;
      context.fillRect(Math.round(x), Math.round(y), size, size);
    }

    for (let index = 0; index < automationRenderCount; index += 1) {
      const u = hash(index, 3);
      const v = hash(index, 4);
      const sourceColumn = index % 48;
      const sourceRow = Math.floor(index / 48) % 7;
      const sourceX = w * 0.5 + (sourceColumn - 23.5) * 4;
      const sourceY = h * 0.5 + (sourceRow - 3) * 4;
      const risk = index < 330 ? 0 : index < 648 ? 1 : 2;
      const riskY = [0.63, 0.74, 0.85][risk];
      const fieldX = w * (0.1 + u * 0.8);
      const fieldY = h * (riskY + (v - 0.5) * (risk === 2 ? 0.025 : 0.08));
      const crossingX = w * (0.12 + u * 0.76);
      const crossingY = h * (0.5 + (u - 0.5) * 0.38 + (v - 0.5) * 0.13);
      const x1 = sourceX + (fieldX - sourceX) * assemble;
      const y1 = sourceY + (fieldY - sourceY) * assemble;
      const x2 = x1 + (crossingX - x1) * cross;
      const y2 = y1 + (crossingY - y1) * cross;
      const x = x2 + (fieldX - x2) * qualify;
      const y = y2 + (fieldY - y2) * qualify;
      const distance = Math.hypot(x - pointerX, y - pointerY);
      const focus = pointer.active && distance < 92 ? 1 : 0;
      const size = risk === 2 ? 3 : focus ? 2.8 : 1.5;
      const color = risk === 2 ? '210, 55, 40' : risk === 1 ? '15, 17, 20' : '62, 111, 72';
      context.fillStyle = `rgba(${color}, ${Math.min(1, automationAlpha + focus * 0.24)})`;
      context.fillRect(Math.round(x), Math.round(y), size, size);
    }

    if (pointer.active && !reducedMotion) {
      context.strokeStyle = lens === 'economy' ? 'rgba(20, 78, 190, 0.7)' : 'rgba(210, 55, 40, 0.7)';
      context.lineWidth = 1;
      context.beginPath();
      context.arc(pointerX, pointerY, 92, 0, Math.PI * 2);
      context.stroke();
    }
  }, [lens, reducedMotion]);

  const requestDraw = useCallback(() => {
    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(draw);
  }, [draw]);

  const updateProgress = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    const journey = section.querySelector<HTMLElement>('.rc-journey');
    if (!journey) return;
    const rect = journey.getBoundingClientRect();
    const max = Math.max(1, journey.offsetHeight - window.innerHeight);
    const nextProgress = clamp(-rect.top / max);
    progressRef.current = nextProgress;
    const nextPhase = phaseFromProgress(nextProgress);
    setPhase((current) => current === nextPhase ? current : nextPhase);
    requestDraw();
  }, [requestDraw]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
      if (entry.isIntersecting) updateProgress();
    }, { rootMargin: '20% 0px', threshold: 0 });
    observer.observe(section);

    const handleViewportChange = () => {
      if (visibleRef.current) updateProgress();
    };
    window.addEventListener('scroll', handleViewportChange, { passive: true });
    window.addEventListener('resize', handleViewportChange);
    updateProgress();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [updateProgress]);

  useEffect(() => requestDraw(), [requestDraw]);

  const moveLens = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
      active: true,
    };
    requestDraw();
  }, [requestDraw]);

  const leaveLens = useCallback(() => {
    pointerRef.current.active = false;
    requestDraw();
  }, [requestDraw]);

  const selectLens = useCallback((nextLens: ResearchLens) => {
    setLens(nextLens);
  }, []);

  return (
    <section id="mf-research" ref={sectionRef} className="rc-section" data-chapter="research">
      <div className="rc-journey">
        <div className="rc-instrument" onPointerMove={moveLens} onPointerLeave={leaveLens}>
          <canvas ref={canvasRef} className="rc-canvas" role="img" aria-label="Câmp abstract de observații care leagă evenimente financiare și ocupații analizate">
            Două cercetări compară observații: 2.449 evenimente financiare și 654 ocupații COR mapate.
          </canvas>

          <header className="rc-heading">
            <p>Research Crossing / 12</p>
            <h2>Measure what<br />changes.</h2>
          </header>

          <div className="rc-lenses" role="group" aria-label="Research lens">
            <button type="button" data-active={lens === 'economy' || undefined} aria-pressed={lens === 'economy'} onClick={() => selectLens('economy')} onFocus={() => selectLens('economy')}>
              <LineChart aria-hidden="true" />
              <span>Market reaction</span>
              <strong>EconomyNews</strong>
            </button>
            <button type="button" data-active={lens === 'automation' || undefined} aria-pressed={lens === 'automation'} onClick={() => selectLens('automation')} onFocus={() => selectLens('automation')}>
              <Network aria-hidden="true" />
              <span>Labour transformation</span>
              <strong>Automation Risk</strong>
            </button>
          </div>

          <aside className="rc-readout" aria-live="polite">
            <span>{lens === 'economy' ? 'A / market lens' : 'B / occupation lens'}</span>
            <strong>{readout.title}</strong>
            <p>{readout.body}</p>
            <small>{readout.metric}</small>
          </aside>

          <ol className="rc-phases" aria-label="Research method phases">
            {PHASES.map((item) => (
              <li key={item.id} data-active={phase === item.id || undefined} data-passed={PHASES.findIndex((phaseItem) => phaseItem.id === phase) > PHASES.findIndex((phaseItem) => phaseItem.id === item.id) || undefined}>
                <span>{item.index}</span><strong>{item.label}</strong>
              </li>
            ))}
          </ol>

          <div className="rc-axis-labels" aria-hidden="true">
            <span>2.449 events</span>
            <span>654 occupations</span>
          </div>

          <a className="rc-to-evidence" href="#rc-economy" aria-label="Continuă la dovezile cercetării">
            <span>Read the evidence</span><ArrowDown aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="rc-evidence">
        <header className="rc-evidence__intro">
          <p>Two papers / one discipline</p>
          <h3>Un rezultat valorează cât limita pe care o declară.</h3>
          <span>Method · result · limitation</span>
        </header>

        <article id="rc-economy" className="rc-paper rc-paper--economy">
          <div className="rc-paper__copy">
            <p>01 / Economic research + machine learning</p>
            <h3>Unexpected Online Financial News and Intraday Market Reactions</h3>
            <p className="rc-paper__dek">Un event study despre EUR/USD și Nasdaq-100 care testează separat magnitudinea mișcării și valoarea direcțională a sentimentului LLM.</p>
            <dl>
              <div><dt>Events</dt><dd>2.449</dd></div>
              <div><dt>Magnitude</dt><dd>1,3×–1,9×</dd></div>
              <div><dt>Direction</dt><dd>49–54%</dd></div>
            </dl>
            <div className="rc-paper__method">
              <span>Method</span>
              <p>Baseline stratificat după oră și zi, erori cluster-robust și corecție Benjamini–Hochberg.</p>
              <span>Critical finding</span>
              <p>Mișcarea începe înaintea timestamp-ului public; latența feed-ului schimbă interpretarea.</p>
            </div>
            <nav aria-label="EconomyNews sources">
              <a href="https://github.com/calinnedelcu/economynewsresearch/blob/main/paper/main.pdf" target="_blank" rel="noreferrer">Read paper <ExternalLink aria-hidden="true" /></a>
              <a href="https://github.com/calinnedelcu/economynewsresearch" target="_blank" rel="noreferrer">Replication repo <ExternalLink aria-hidden="true" /></a>
            </nav>
            <small>Authors / Andrei Calin Nedelcu · Andrei Cheroiu</small>
          </div>
          <div className="rc-paper__media">
            <figure>
              <img src="/assets/projects/research-crossing/economy-event-timeline.png" alt="Rata zilnică a celor 2.449 evenimente financiare pe categorii între martie 2025 și mai 2026" loading="lazy" />
              <figcaption>Authentic figure / gold event arrival rate</figcaption>
            </figure>
            <figure>
              <img src="/assets/projects/research-crossing/economy-pre-post-drift.png" alt="Comparația mișcării absolute înainte și după timestamp pentru EUR/USD și Nasdaq-100" loading="lazy" />
              <figcaption>Authentic figure / pre-event versus post-event drift</figcaption>
            </figure>
          </div>
        </article>

        <article id="rc-automation" className="rc-paper rc-paper--automation">
          <div className="rc-paper__copy">
            <p>02 / Labour research + machine learning</p>
            <h3>Estimarea riscului de automatizare pentru ocupațiile din România</h3>
            <p className="rc-paper__dek">Un pipeline ESCO → LightGBM → SHAP → COR care transformă structura competențelor într-un scor orientativ și inspectabil.</p>
            <dl>
              <div><dt>COR mapped</dt><dd>654</dd></div>
              <div><dt>Coverage</dt><dd>14,7%</dd></div>
              <div><dt>Test MAE</dt><dd>11,03</dd></div>
            </dl>
            <div className="rc-paper__method">
              <span>Method</span>
              <p>Șase caracteristici ocupaționale, regresie LightGBM, interpretare SHAP și fuzzy matching COR–ESCO la 80%.</p>
              <span>Critical limitation</span>
              <p>R² CV = −14,21 ± 6,16 și acoperirea redusă interzic citirea scorurilor ca predicții exacte.</p>
            </div>
            <nav aria-label="Automation Risk sources">
              <a href="https://github.com/BalaurulBondoc771/Evaluarea-riscului-de-automatizare-a-ocupa-iilor-utiliz-nd-metode-de-nv-are-automat-" target="_blank" rel="noreferrer">Open repository <ExternalLink aria-hidden="true" /></a>
            </nav>
            <small>Project credit / team confirmation pending</small>
          </div>
          <div className="rc-paper__media">
            <figure>
              <img src="/assets/projects/research-crossing/automation-shap.png" alt="Distribuția impactului SHAP pentru caracteristicile modelului de automatizare" loading="lazy" />
              <figcaption>Authentic figure / SHAP impact distribution</figcaption>
            </figure>
            <div className="rc-risk-split" aria-label="Distribuția celor 654 ocupații COR mapate">
              <div><span>Low</span><strong>330</strong><i style={{ '--risk-share': '50.5%' } as CSSProperties} /></div>
              <div><span>Medium</span><strong>318</strong><i style={{ '--risk-share': '48.6%' } as CSSProperties} /></div>
              <div><span>High</span><strong>6</strong><i style={{ '--risk-share': '0.9%' } as CSSProperties} /></div>
              <small>Mapped subset only / not the Romanian labour market</small>
            </div>
          </div>
        </article>

        <footer id="rc-handoff" className="rc-handoff">
          <Orbit aria-hidden="true" />
          <span>Continuity / axis → evidence timeline</span>
          <strong>Metoda capătă istorie.</strong>
          <p>Proiectele, oamenii și rezultatele se aliniază acum pe aceeași axă verificabilă.</p>
          <span className="rc-handoff__next"><ScanSearch aria-hidden="true" /> Next / Evidence Weave</span>
        </footer>
      </div>
    </section>
  );
}
