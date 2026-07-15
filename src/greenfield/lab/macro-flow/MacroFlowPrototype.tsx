import {
  ArrowDown,
  Boxes,
  Check,
  ChevronDown,
  CircleX,
  Cog,
  Eye,
  Flame,
  Play,
  RefreshCcw,
  ScanLine,
  ShieldCheck,
  Waypoints,
  Wind,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { useGreenfieldMode } from '../../hooks/useGreenfieldMode';
import {
  MacroFlowScene,
  type MacroLensMode,
  type MacroTraceOutcome,
} from './MacroFlowScene';
import InfectInterlude from './InfectInterlude';
import ResearchCrossing from './ResearchCrossing';
import './macro-flow.css';

type MacroChapter =
  | 'threshold'
  | 'field'
  | 'lens'
  | 'proof'
  | 'passage'
  | 'access'
  | 'schoolmate'
  | 'descent'
  | 'lamp'
  | 'build'
  | 'infect'
  | 'research';
type TraceScenario = 'valid' | 'expired' | 'used';
type BuriedRule = 'oil' | 'mechanism' | 'mercury';

const CHAPTERS: Array<{ id: MacroChapter; index: string; label: string }> = [
  { id: 'threshold', index: '01', label: 'Threshold' },
  { id: 'field', index: '02', label: 'Synthetic field' },
  { id: 'lens', index: '03', label: 'Lens knot' },
  { id: 'proof', index: '04', label: 'Evidence' },
  { id: 'passage', index: '05', label: 'Aegis passage' },
  { id: 'access', index: '06', label: 'Access trace' },
  { id: 'schoolmate', index: '07', label: 'School products' },
  { id: 'descent', index: '08', label: 'Rule descent' },
  { id: 'lamp', index: '09', label: 'Lamp chamber' },
  { id: 'build', index: '10', label: 'Build proof' },
  { id: 'infect', index: '11', label: '1-bit breach' },
  { id: 'research', index: '12', label: 'Research crossing' },
];

const BURIED_RULES: Array<{
  id: BuriedRule;
  label: string;
  short: string;
  detail: string;
  position: { left: string; top: string };
  icon: typeof Flame;
}> = [
  {
    id: 'oil',
    label: 'Lumina este o resursă',
    short: 'Ulei',
    detail: 'Lampa consumă ulei, iar lumina amplificată îl consumă mai repede.',
    position: { left: '21%', top: '75%' },
    icon: Flame,
  },
  {
    id: 'mechanism',
    label: 'Cunoașterea deschide traseul',
    short: 'Mecanism',
    detail: 'Nu lupți cu mausoleul. Îi citești scripeții, capcanele și obiectele construite chiar de tine.',
    position: { left: '50%', top: '34%' },
    icon: Cog,
  },
  {
    id: 'mercury',
    label: 'Mediul este amenințarea',
    short: 'Vapori',
    detail: 'Mercurul nu este decor: expunerea schimbă ruta și obligă folosirea măștii.',
    position: { left: '72%', top: '72%' },
    icon: Wind,
  },
];

const TRACE_SCENARIOS: Array<{ id: TraceScenario; label: string; detail: string }> = [
  { id: 'valid', label: 'Valid', detail: 'În fereastra de 20s' },
  { id: 'expired', label: 'Expired', detail: 'TTL depășit' },
  { id: 'used', label: 'Already used', detail: 'Redeem repetat' },
];

const TRACE_STEPS = ['Issued', 'Presented', 'Gate role', 'Atomic redeem', 'Audit log'];

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

export default function MacroFlowPrototype() {
  const rootRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const traceTimersRef = useRef<number[]>([]);
  const reducedMotion = usePrefersReducedMotion();
  const [activeChapter, setActiveChapter] = useState<MacroChapter>('threshold');
  const [lensMode, setLensMode] = useState<MacroLensMode>('raw');
  const [traceScenario, setTraceScenario] = useState<TraceScenario>('valid');
  const [traceStep, setTraceStep] = useState(0);
  const [traceOutcome, setTraceOutcome] = useState<MacroTraceOutcome>('idle');
  const [buriedRules, setBuriedRules] = useState<Set<BuriedRule>>(() => new Set());
  const [activeBuriedRule, setActiveBuriedRule] = useState<BuriedRule>('oil');

  useGreenfieldMode('Macro Flow Lab');

  const clearTraceTimers = useCallback(() => {
    traceTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    traceTimersRef.current = [];
  }, []);

  const resetTrace = useCallback(() => {
    clearTraceTimers();
    setTraceStep(0);
    setTraceOutcome('idle');
  }, [clearTraceTimers]);

  const selectTraceScenario = useCallback((scenario: TraceScenario) => {
    clearTraceTimers();
    setTraceScenario(scenario);
    setTraceStep(0);
    setTraceOutcome('idle');
  }, [clearTraceTimers]);

  const runTrace = useCallback(() => {
    clearTraceTimers();
    setTraceStep(0);
    setTraceOutcome('running');

    const finalOutcome: MacroTraceOutcome =
      traceScenario === 'valid' ? 'allowed' : traceScenario;

    if (reducedMotion) {
      setTraceStep(TRACE_STEPS.length - 1);
      setTraceOutcome(finalOutcome);
      return;
    }

    TRACE_STEPS.slice(1).forEach((_, index) => {
      const timer = window.setTimeout(() => {
        const nextStep = index + 1;
        setTraceStep(nextStep);
        if (nextStep === TRACE_STEPS.length - 1) setTraceOutcome(finalOutcome);
      }, 430 * (index + 1));
      traceTimersRef.current.push(timer);
    });
  }, [clearTraceTimers, reducedMotion, traceScenario]);

  const revealBuriedRule = useCallback((rule: BuriedRule) => {
    setActiveBuriedRule(rule);
    setBuriedRules((current) => {
      if (current.has(rule)) return current;
      const next = new Set(current);
      next.add(rule);
      return next;
    });
  }, []);

  const moveLamp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.style.setProperty('--mf-lamp-x', `${x.toFixed(2)}%`);
    event.currentTarget.style.setProperty('--mf-lamp-y', `${y.toFixed(2)}%`);
  }, []);

  const updateProgress = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootTop = root.offsetTop;
    const worldEnd = root.querySelector<HTMLElement>('#mf-infect')?.offsetTop ?? root.scrollHeight;
    const max = Math.max(1, worldEnd - window.innerHeight);
    const progress = Math.max(0, Math.min(1, (window.scrollY - rootTop) / max));
    progressRef.current = progress;
    root.style.setProperty('--mf-progress', progress.toFixed(4));
    const chapters = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]'));
    const focusLine = window.innerHeight * 0.46;
    const focused = chapters.find((chapter) => {
      const rect = chapter.getBoundingClientRect();
      return rect.top <= focusLine && rect.bottom > focusLine;
    });
    const nextChapter = (focused?.dataset.chapter as MacroChapter | undefined) ?? 'threshold';
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

  useEffect(() => clearTraceTimers, [clearTraceTimers]);

  const traceFinished = traceOutcome !== 'idle' && traceOutcome !== 'running';
  const traceAllowed = traceOutcome === 'allowed';
  const traceResult = traceAllowed
    ? 'ALLOW / token redeemed once'
    : traceOutcome === 'expired'
      ? 'DENY / EXPIRED'
      : traceOutcome === 'used'
        ? 'DENY / ALREADY_USED'
        : 'Awaiting trace';

  return (
    <main
      ref={rootRef}
      className="mf-lab"
      data-active-chapter={activeChapter}
      data-lens={lensMode}
      data-trace-outcome={traceOutcome}
    >
      <a className="mf-skip" href="#mf-proof">Sari la dovada proiectului</a>

      <div className="mf-world" aria-hidden="true">
        <MacroFlowScene
          progressRef={progressRef}
          lensMode={lensMode}
          traceStep={traceStep}
          traceOutcome={traceOutcome}
          buriedDiscoveries={buriedRules.size}
          reducedMotion={reducedMotion}
        />
        <div className="mf-world__grade" />
      </div>

      <header className="mf-header">
        <Link className="mf-brand" to="/next" aria-label="Transylvanian Bears, start">
          <span className="mf-brand__mark" aria-hidden="true"><i /></span>
          <span>Transylvanian Bears</span>
        </Link>
        <p>Macro flow / spatial draft 02</p>
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
            <span>Urmează</span>
            <strong>Un eveniment prin sistem</strong>
          </div>
        </div>
      </section>

      <section id="mf-access" className="mf-beat mf-beat--access" data-chapter="access">
        <div className="mf-trace-knot">
          <div className="mf-trace-knot__heading">
            <p className="mf-kicker">Protect / Aegis transaction</p>
            <h2>Un cod scurt. Un singur drum prin sistem.</h2>
            <p>
              Tokenul este emis în backend, prezentat la poartă și consumat într-o tranzacție
              atomică. Condiția se schimbă; regula rămâne inspectabilă.
            </p>
          </div>

          <div className="mf-scenario-control" aria-label="Condiția tokenului">
            {TRACE_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                data-active={traceScenario === scenario.id || undefined}
                aria-pressed={traceScenario === scenario.id}
                onClick={() => selectTraceScenario(scenario.id)}
              >
                <strong>{scenario.label}</strong>
                <small>{scenario.detail}</small>
              </button>
            ))}
          </div>

          <ol className="mf-trace-flow" aria-label="Fluxul de validare Aegis">
            {TRACE_STEPS.map((step, index) => (
              <li
                key={step}
                data-current={traceOutcome === 'running' && traceStep === index || undefined}
                data-complete={traceStep >= index && traceOutcome !== 'idle' || undefined}
              >
                <span>0{index + 1}</span>
                <strong>{step}</strong>
                {traceStep > index || traceFinished && traceStep === index
                  ? <Check aria-hidden="true" />
                  : <i aria-hidden="true" />}
              </li>
            ))}
          </ol>

          <div className="mf-trace-command">
            <div className="mf-trace-result" role="status" aria-live="polite" data-finished={traceFinished || undefined}>
              {traceFinished
                ? traceAllowed ? <ShieldCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />
                : <ScanLine aria-hidden="true" />}
              <span><small>Transaction result</small><strong>{traceResult}</strong></span>
            </div>
            <div className="mf-trace-actions">
              <button
                className="mf-reset-trace"
                type="button"
                aria-label="Resetează trace-ul"
                title="Resetează trace-ul"
                onClick={resetTrace}
              >
                <RefreshCcw aria-hidden="true" />
              </button>
              <button
                className="mf-run-trace"
                type="button"
                disabled={traceOutcome === 'running'}
                onClick={runTrace}
              >
                <Play aria-hidden="true" />
                {traceOutcome === 'running' ? 'Tracing' : 'Rulează trace-ul'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="mf-schoolmate" className="mf-trust-clearing" data-chapter="schoolmate">
        <div className="mf-trust-clearing__inner">
          <header className="mf-trust-head">
            <p className="mf-kicker">Editorial clearing / school software</p>
            <p>Connected context / separate builds</p>
          </header>

          <div className="mf-trust-intro">
            <span>02 produse</span>
            <h2>Același context.<br />Două sisteme distincte.</h2>
            <p>
              Aegis tratează accesul și auditul de la poartă. SchoolMate tratează comunicarea,
              cererile, orarul și operațiunile dintre rolurile școlii.
            </p>
          </div>

          <article className="mf-product mf-product--aegis">
            <header>
              <p className="mf-kicker">Aegis / safe access</p>
              <h3>Aegis</h3>
              <p>Control de acces cu token QR opac, scurt, single-use și validare server-side.</p>
            </header>
            <figure>
              <img src="/assets/projects/aegis.webp" alt="Ecranul QR de acces din Aegis și marca proiectului" />
              <figcaption>Build capture / student access surface</figcaption>
            </figure>
            <dl>
              <div><dt>Token TTL</dt><dd>20s</dd></div>
              <div><dt>Entropie</dt><dd>256-bit</dd></div>
              <div><dt>Roluri</dt><dd>5</dd></div>
            </dl>
            <div className="mf-product__links">
              <a href="https://github.com/BosRegele/Aegis" target="_blank" rel="noreferrer">Repository <span aria-hidden="true">↗</span></a>
              <a href="https://www.jaromania.org/noutati/articole/news/o-noua-editie-a-programului-skills-for-the-future-se-deruleaza-in-bucuresti" target="_blank" rel="noreferrer">Skills for the Future <span aria-hidden="true">↗</span></a>
            </div>
          </article>

          <div className="mf-product-relation">
            <span>Aegis</span>
            <i aria-hidden="true" />
            <strong>Context comun, nu același produs</strong>
            <i aria-hidden="true" />
            <span>SchoolMate</span>
          </div>

          <article className="mf-product mf-product--schoolmate">
            <header>
              <p className="mf-kicker">SchoolMate / school operations</p>
              <h3>SchoolMate</h3>
              <p>
                Anunțuri, cereri, orare și administrare într-un build Flutter + Firebase pentru
                elevi, profesori, părinți, secretariat și poartă.
              </p>
            </header>
            <figure>
              <img src="/assets/projects/schoolmate.webp" alt="Portalul de secretariat SchoolMate cu lista de anunțuri" />
              <figcaption>Live portal capture / secretariat surface</figcaption>
            </figure>
            <ul className="mf-product-flows">
              <li><span>01</span> Anunțuri și oportunități</li>
              <li><span>02</span> Cereri și aprobări</li>
              <li><span>03</span> Orare și roluri</li>
              <li><span>04</span> Audit la poartă</li>
            </ul>
            <div className="mf-product__links">
              <a href="https://schoolmate-portal.web.app/" target="_blank" rel="noreferrer">Portal live <span aria-hidden="true">↗</span></a>
              <a href="https://www.youtube.com/watch?v=wNU1WhSMBKU" target="_blank" rel="noreferrer">Demo video <span aria-hidden="true">↗</span></a>
              <a href="https://github.com/calinnedelcu/SchoolMate-final" target="_blank" rel="noreferrer">Repository <span aria-hidden="true">↗</span></a>
            </div>
          </article>

          <figure className="mf-award-evidence">
            <img src="/assets/achievements/aegis-skills-future-2026.webp" alt="Participanți la finala Skills for the Future 2026" />
            <figcaption>
              <span>Result / Aegis</span>
              <strong>Locul 2 național</strong>
              <small>Skills for the Future 2026 / DB Global Technology × Junior Achievement România</small>
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="mf-descent" className="mf-beat mf-beat--descent" data-chapter="descent">
        <div className="mf-copy mf-copy--descent">
          <p className="mf-kicker">Continuity rule / Aegis → The Buried Hands</p>
          <h2>Regula devine lume.</h2>
          <p>
            Planul validat se pliază în straturi minerale. În următorul capitol, protecția nu mai
            este o permisiune de acces; devine regula spațiului prin care trebuie să supraviețuiești.
          </p>
          <div className="mf-next-beat">
            <span>Coboară în regulă</span>
            <strong>Rule Descent / The Buried Hands <ArrowDown aria-hidden="true" /></strong>
          </div>
        </div>
      </section>

      <section id="mf-lamp" className="mf-lamp-chamber" data-chapter="lamp">
        <div
          className="mf-lamp-chamber__stage"
          onPointerMove={moveLamp}
          data-complete={buriedRules.size === BURIED_RULES.length || undefined}
        >
          <img
            className="mf-lamp-chamber__base"
            src="/assets/projects/buried-hands/mechanism.png"
            alt="Mecanism cu scripeți, lampă și vas pentru mercur în The Buried Hands"
          />
          <div className="mf-lamp-chamber__reveal" aria-hidden="true">
            <img src="/assets/projects/buried-hands/mechanism.png" alt="" />
          </div>
          <div className="mf-lamp-chamber__shade" aria-hidden="true" />

          <header className="mf-lamp-head">
            <p className="mf-kicker">Imagine / lamp chamber</p>
            <h2>Nu ai armură.<br />Ai lumină.</h2>
            <p>Mișcă lumina prin cadru și inspectează cele trei reguli ale încăperii.</p>
          </header>

          <div className="mf-rule-hotspots" aria-label="Regulile încăperii">
            {BURIED_RULES.map((rule, index) => {
              const Icon = rule.icon;
              const found = buriedRules.has(rule.id);
              return (
                <button
                  key={rule.id}
                  type="button"
                  style={rule.position}
                  data-active={activeBuriedRule === rule.id || undefined}
                  data-found={found || undefined}
                  onClick={() => revealBuriedRule(rule.id)}
                  onFocus={() => revealBuriedRule(rule.id)}
                  aria-label={`${index + 1}. ${rule.label}`}
                >
                  <span><Icon aria-hidden="true" /></span>
                  <strong>{rule.short}</strong>
                </button>
              );
            })}
          </div>

          <aside className="mf-rule-readout" aria-live="polite">
            {BURIED_RULES.map((rule, index) => (
              <div key={rule.id} hidden={activeBuriedRule !== rule.id}>
                <span>0{index + 1} / regulă observată</span>
                <strong>{rule.label}</strong>
                <p>{rule.detail}</p>
              </div>
            ))}
          </aside>

          <div className="mf-lamp-progress">
            <span>{buriedRules.size.toString().padStart(2, '0')} / 03 reguli</span>
            <div aria-hidden="true"><i style={{ width: `${(buriedRules.size / BURIED_RULES.length) * 100}%` }} /></div>
            <a href="#mf-build">Vezi build-ul <ArrowDown aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section id="mf-build" className="mf-build-clearing" data-chapter="build">
        <div className="mf-build-clearing__inner">
          <header className="mf-build-head">
            <div>
              <p className="mf-kicker">Authentic gameplay / public build</p>
              <h2>Lumea nu este fundal.<br />Este sistem.</h2>
            </div>
            <p>
              Un stealth-puzzle plasat în anul 210 î.Hr. Jucătorul supraviețuiește prin
              observație, lumină, unelte și înțelegerea mecanismelor.
            </p>
          </header>

          <div className="mf-gameplay-strip">
            <figure>
              <img src="/assets/projects/buried-hands/guards.png" alt="Gardieni într-o sală slab luminată din The Buried Hands" />
              <figcaption><span>01 / Sound</span><strong>Gardienii aud pașii.</strong></figcaption>
            </figure>
            <figure>
              <img src="/assets/projects/buried-hands/mercury.png" alt="Sala cu mercur și mecanisme din The Buried Hands" />
              <figcaption><span>02 / Toxicity</span><strong>Mercurul schimbă traseul.</strong></figcaption>
            </figure>
            <figure>
              <img src="/assets/projects/buried-hands/royal-hall.png" alt="Sala Regală din mausoleu, cu statui și mecanism central" />
              <figcaption><span>03 / Scale</span><strong>Regula devine arhitectură.</strong></figcaption>
            </figure>
          </div>

          <dl className="mf-build-metrics">
            <div><dt>Engine</dt><dd>Godot 4.6</dd></div>
            <div><dt>Physics</dt><dd>Jolt</dd></div>
            <div><dt>Platform</dt><dd>Windows</dd></div>
            <div><dt>Jam result</dt><dd>Locul 2<span>team-confirmed</span></dd></div>
          </dl>

          <footer className="mf-build-footer">
            <div>
              <span>Premisă</span>
              <strong>Un meșteșugar, nu un războinic.</strong>
            </div>
            <nav aria-label="The Buried Hands links">
              <a href="https://juggypuggy.itch.io/the-buried-hands" target="_blank" rel="noreferrer">Joacă pe itch.io <span aria-hidden="true">↗</span></a>
              <a href="https://www.youtube.com/watch?v=RGyx2NxUYr8" target="_blank" rel="noreferrer">Vezi trailerul <span aria-hidden="true">↗</span></a>
              <a href="https://itch.io/jam/game-jam-vianu-2026/rate/4585325" target="_blank" rel="noreferrer">Jam submission <span aria-hidden="true">↗</span></a>
            </nav>
          </footer>

          <div className="mf-pixel-handoff">
            <span>Continuity / The Buried Hands → Infect.exe</span>
            <strong>Lumina se contractă într-un pixel.</strong>
            <i aria-hidden="true" />
          </div>
        </div>
      </section>

      <InfectInterlude />
      <ResearchCrossing />
    </main>
  );
}
