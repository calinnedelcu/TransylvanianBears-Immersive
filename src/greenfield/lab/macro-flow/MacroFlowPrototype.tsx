import {
  ArrowDown,
  Boxes,
  Check,
  ChevronDown,
  CircleX,
  Cog,
  Eye,
  Flame,
  Gauge,
  Play,
  RefreshCcw,
  ScanLine,
  ShieldCheck,
  Volume2,
  VolumeX,
  Waypoints,
  Wind,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { ViewTransitionLink } from '../../components/ViewTransitionLink';
import { JOURNEY_CHAPTERS, chapterTone, type JourneyChapter } from '../../experience/chapters';
import { ExperienceProvider } from '../../experience/ExperienceProvider';
import { useAmbientAudio } from '../../experience/audio/useAmbientAudio';
import { effectiveQuality } from '../../experience/experienceMachine';
import { useExperienceActorRef, useExperienceSelector } from '../../experience/useExperience';
import { useJourneyDirector } from '../../experience/useJourneyDirector';
import { useGreenfieldMode } from '../../hooks/useGreenfieldMode';
import type { MacroLensMode, MacroTraceOutcome } from './MacroFlowScene';
import type { LensPointerState } from './macroFlowTypes';
import InfectInterlude from './InfectInterlude';
import ResearchCrossing from './ResearchCrossing';
import EvidenceWeave from './EvidenceWeave';
import { NexusProofInspector } from './NexusProofInspector';
import BuriedGameplayTheater from './BuriedGameplayTheater';
import './macro-flow.css';

const MacroFlowScene = lazy(() => import('./MacroFlowScene').then((module) => ({ default: module.MacroFlowScene })));

type TraceScenario = 'valid' | 'expired' | 'used';
type BuriedRule = 'oil' | 'mechanism' | 'mercury';

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

function MacroFlowExperience() {
  const rootRef = useRef<HTMLElement>(null);
  const traceTimersRef = useRef<number[]>([]);
  const lensPointerRef = useRef<LensPointerState>({ x: 0.5, y: 0.5, active: false });
  const reducedMotion = usePrefersReducedMotion();
  const experienceActor = useExperienceActorRef();
  const activeChapter = useExperienceSelector((state) => state.context.activeChapter);
  const lensMode = useExperienceSelector((state) => state.context.lensMode);
  const qualityTier = useExperienceSelector((state) => effectiveQuality(state.context));
  const qualityMode = useExperienceSelector((state) => state.context.qualityMode);
  const audioEnabled = useExperienceSelector((state) => state.context.audioEnabled);
  const [traceScenario, setTraceScenario] = useState<TraceScenario>('valid');
  const [traceStep, setTraceStep] = useState(0);
  const [traceOutcome, setTraceOutcome] = useState<MacroTraceOutcome>('idle');
  const [buriedRules, setBuriedRules] = useState<Set<BuriedRule>>(() => new Set());
  const [activeBuriedRule, setActiveBuriedRule] = useState<BuriedRule>('oil');

  const enableAudio = useCallback(() => experienceActor.send({ type: 'AUDIO_ENABLED' }), [experienceActor]);
  const muteAudio = useCallback(() => experienceActor.send({ type: 'AUDIO_MUTED' }), [experienceActor]);
  const {
    toggle: toggleAudio,
    update: updateAudio,
    enterChapter: enterAudioChapter,
  } = useAmbientAudio({ enabled: audioEnabled, onEnabled: enableAudio, onMuted: muteAudio });
  const enterChapter = useCallback((chapter: JourneyChapter) => {
    experienceActor.send({ type: 'CHAPTER_ENTERED', chapter });
  }, [experienceActor]);
  const onJourneyProgress = useCallback((progress: number, velocity: number) => {
    updateAudio(progress, velocity);
  }, [updateAudio]);
  const { worldProgressRef: progressRef, velocityRef } = useJourneyDirector({
    rootRef,
    reducedMotion,
    onChapterChange: enterChapter,
    onProgress: onJourneyProgress,
  });

  useGreenfieldMode({
    title: 'Transylvanian Bears — Produse, jocuri și cercetare aplicată',
    description: 'O experiență interactivă despre cele șapte proiecte construite de Transylvanian Bears: software școlar, jocuri, machine learning și cercetare.',
    absoluteTitle: true,
  });

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

  const moveLens = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const compact = window.innerWidth <= 820;
    const minimumX = compact ? 0.75 : 0.59;
    const maximumX = compact ? 0.8 : 0.94;
    const minimumY = compact ? 0.36 : 0.06;
    const maximumY = compact ? 0.64 : 0.94;
    const x = Math.max(minimumX, Math.min(maximumX, event.clientX / window.innerWidth));
    const yFromTop = Math.max(minimumY, Math.min(maximumY, event.clientY / window.innerHeight));
    lensPointerRef.current = { x, y: 1 - yFromTop, active: true };
    event.currentTarget.style.setProperty('--mf-lens-x', `${(x * 100).toFixed(2)}%`);
    event.currentTarget.style.setProperty('--mf-lens-y', `${(yFromTop * 100).toFixed(2)}%`);
    event.currentTarget.dataset.lensEngaged = 'true';
  }, []);

  const leaveLens = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    lensPointerRef.current.active = false;
    delete event.currentTarget.dataset.lensEngaged;
  }, []);

  useEffect(() => {
    document.body.classList.add('mf-lab-mode');
    return () => document.body.classList.remove('mf-lab-mode');
  }, []);

  useEffect(() => {
    enterAudioChapter(activeChapter, chapterTone(activeChapter));
  }, [activeChapter, enterAudioChapter]);

  useEffect(() => clearTraceTimers, [clearTraceTimers]);

  const traceFinished = traceOutcome !== 'idle' && traceOutcome !== 'running';
  const traceAllowed = traceOutcome === 'allowed';
  const macroWorldActive = qualityTier !== 'editorial'
    && activeChapter !== 'infect'
    && activeChapter !== 'research'
    && activeChapter !== 'evidence-weave'
    && activeChapter !== 'final-return'
    && activeChapter !== 'open-paths'
    && activeChapter !== 'dawn';
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
      data-quality-tier={qualityTier}
      data-lens={lensMode}
      data-trace-outcome={traceOutcome}
    >
      <a className="mf-skip" href="#mf-proof">Sari la dovada proiectului</a>

      <div className="mf-world" aria-hidden="true">
        {macroWorldActive ? (
          <Suspense fallback={<div className="mf-canvas-fallback" aria-hidden="true" />}>
            <MacroFlowScene
              progressRef={progressRef}
              lensPointerRef={lensPointerRef}
              lensMode={lensMode}
              traceStep={traceStep}
              traceOutcome={traceOutcome}
              buriedDiscoveries={buriedRules.size}
              reducedMotion={reducedMotion}
              qualityTier={qualityTier}
              velocityRef={velocityRef}
              onPerformanceFactor={(factor) => experienceActor.send({ type: 'QUALITY_SAMPLE', factor })}
              onPerformanceFallback={() => experienceActor.send({ type: 'QUALITY_FALLBACK' })}
            />
          </Suspense>
        ) : null}
        <div className="mf-world__grade" />
      </div>

      <header className="mf-header">
        <ViewTransitionLink className="mf-brand" to="/" aria-label="Transylvanian Bears, start">
          <span className="mf-brand__mark" aria-hidden="true"><i /></span>
          <span>Transylvanian Bears</span>
        </ViewTransitionLink>
        <p>Interactive expedition / 16 chapters</p>
        <div className="mf-header__actions">
          <button
            className="mf-system-control"
            type="button"
            aria-label={`Calitate ${qualityMode === 'auto' ? `automată, ${qualityTier}` : qualityTier}. Schimbă nivelul.`}
            title={`Calitate: ${qualityMode === 'auto' ? `auto / ${qualityTier}` : qualityTier}`}
            data-tier={qualityTier}
            onClick={() => experienceActor.send({ type: 'CYCLE_QUALITY' })}
          >
            <Gauge aria-hidden="true" />
            <span>{qualityMode === 'auto' ? 'A' : qualityTier === 'composed' ? 'B' : 'C'}</span>
          </button>
          <button
            className="mf-system-control"
            type="button"
            aria-label={audioEnabled ? 'Oprește sunetul ambiental' : 'Pornește sunetul ambiental'}
            title={audioEnabled ? 'Sunet pornit' : 'Sunet oprit'}
            data-active={audioEnabled || undefined}
            onClick={() => void toggleAudio()}
          >
            {audioEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
          </button>
          <ViewTransitionLink className="mf-index-link" to="/work">
            Open work index <Waypoints aria-hidden="true" />
          </ViewTransitionLink>
        </div>
      </header>

      <nav className="mf-rail" aria-label="Macro flow chapters">
        {JOURNEY_CHAPTERS.map((chapter) => (
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
          <p className="mf-kicker">Independent build team / Transylvania</p>
          <h1><span>Transylvanian</span><span>Bears</span></h1>
          <div className="mf-hero-statement">
            <strong>Un sistem. Nu șapte insule.</strong>
            <p>Software, jocuri, machine learning și cercetare aplicată, construite de aceeași echipă.</p>
          </div>
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
        <div
          className="mf-lens-knot"
          onPointerMove={moveLens}
          onPointerEnter={moveLens}
          onPointerLeave={leaveLens}
        >
          <div className="mf-lens-reticle" aria-hidden="true">
            <i /><i /><span>inspect</span>
          </div>
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
                  onClick={() => experienceActor.send({ type: 'LENS_SELECTED', mode: option.id })}
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

          <NexusProofInspector />

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

        <div className="mf-school-bridge">
          <div className="mf-school-bridge__copy">
            <p className="mf-kicker">Campus passage / Aegis → SchoolMate</p>
            <h2>Poarta nu încheie traseul. Îl mută înăuntru.</h2>
            <p>
              După validare, elevul intră în același context pe care SchoolMate îl conectează:
              coridor, clasă, profesor și secretariat.
            </p>
            <div className="mf-school-bridge__roles" aria-label="Traseul prin școală">
              <span><small>01</small><strong>Poartă</strong></span>
              <span><small>02</small><strong>Coridor</strong></span>
              <span><small>03</small><strong>Clasă</strong></span>
              <span><small>04</small><strong>Secretariat</strong></span>
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
              <img src="/assets/projects/aegis.webp" alt="Ecranul QR de acces din Aegis și marca proiectului" width="851" height="656" loading="lazy" decoding="async" />
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
              <img src="/assets/projects/schoolmate.webp" alt="Portalul de secretariat SchoolMate cu lista de anunțuri" width="1519" height="890" loading="lazy" decoding="async" />
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
            <img src="/assets/achievements/aegis-skills-future-2026.webp" alt="Participanți la finala Skills for the Future 2026" width="1600" height="1200" loading="lazy" decoding="async" />
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
            src="/assets/projects/buried-hands/mechanism.webp"
            alt="Mecanism cu scripeți, lampă și vas pentru mercur în The Buried Hands"
            width="1916"
            height="1004"
            loading="lazy"
            decoding="async"
          />
          <div className="mf-lamp-chamber__reveal" aria-hidden="true">
            <img src="/assets/projects/buried-hands/mechanism.webp" alt="" width="1916" height="1004" loading="lazy" decoding="async" />
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

          <BuriedGameplayTheater />

          <dl id="mf-build-metrics" className="mf-build-metrics">
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
      <EvidenceWeave />
    </main>
  );
}

export default function MacroFlowPrototype() {
  return (
    <ExperienceProvider>
      <MacroFlowExperience />
    </ExperienceProvider>
  );
}
