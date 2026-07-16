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
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { ViewTransitionLink } from '../../components/ViewTransitionLink';
import { JOURNEY_CHAPTERS, chapterTone, type JourneyChapter } from '../../experience/chapters';
import { ExperienceProvider } from '../../experience/ExperienceProvider';
import { useAmbientAudio } from '../../experience/audio/useAmbientAudio';
import { EVIDENCE_CORE_BY_LENS, type EvidenceCoreId } from '../../experience/evidenceCores';
import { effectiveQuality } from '../../experience/experienceMachine';
import { useExperienceActorRef, useExperienceSelector } from '../../experience/useExperience';
import { useJourneyDirector } from '../../experience/useJourneyDirector';
import { useGreenfieldMode } from '../../hooks/useGreenfieldMode';
import type { MacroLensMode, MacroTraceOutcome } from './MacroFlowScene';
import type { LensPointerState, NexusFlightInput } from './macroFlowTypes';
import InfectInterlude from './InfectInterlude';
import ResearchCrossing from './ResearchCrossing';
import EvidenceWeave from './EvidenceWeave';
import { NexusProofInspector } from './NexusProofInspector';
import BuriedGameplayTheater from './BuriedGameplayTheater';
import { VerticalSliceSoundscape } from './VerticalSliceSoundscape';
import { VerticalSliceLoader } from './VerticalSliceLoader';
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
  const sharedAudioContextRef = useRef<AudioContext | null>(null);
  const verticalSoundscapeRef = useRef<VerticalSliceSoundscape | null>(null);
  const verticalSoundParametersRef = useRef({ progress: 0, velocity: 0, lensMode: 'raw' as MacroLensMode });
  const lastSoundChapterRef = useRef<JourneyChapter | null>(null);
  const lensPointerRef = useRef<LensPointerState>({ x: 0.5, y: 0.5, active: false });
  const nexusFlightInputRef = useRef<NexusFlightInput>({ x: 0, y: 0, active: false });
  const reducedMotion = usePrefersReducedMotion();
  const experienceActor = useExperienceActorRef();
  const activeChapter = useExperienceSelector((state) => state.context.activeChapter);
  const lensMode = useExperienceSelector((state) => state.context.lensMode);
  const qualityTier = useExperienceSelector((state) => effectiveQuality(state.context));
  const qualityMode = useExperienceSelector((state) => state.context.qualityMode);
  const audioEnabled = useExperienceSelector((state) => state.context.audioEnabled);
  const evidenceCores = useExperienceSelector((state) => state.context.evidenceCores);
  const [traceScenario, setTraceScenario] = useState<TraceScenario>('valid');
  const [traceStep, setTraceStep] = useState(0);
  const [traceOutcome, setTraceOutcome] = useState<MacroTraceOutcome>('idle');
  const [buriedRules, setBuriedRules] = useState<Set<BuriedRule>>(() => new Set());
  const [activeBuriedRule, setActiveBuriedRule] = useState<BuriedRule>('oil');

  const getSharedAudioContext = useCallback(() => {
    if (sharedAudioContextRef.current) return sharedAudioContextRef.current;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
    if (!AudioContextClass) return null;
    sharedAudioContextRef.current = new AudioContextClass({ latencyHint: 'interactive' });
    return sharedAudioContextRef.current;
  }, []);

  const getVerticalSoundscape = useCallback(() => {
    const context = getSharedAudioContext();
    if (!context) return null;
    verticalSoundscapeRef.current ??= new VerticalSliceSoundscape({
      reducedMotion,
      masterLevel: 0.46,
      stemLevels: { evidence: 0.82 },
      audioContext: context,
    });
    verticalSoundscapeRef.current.update(verticalSoundParametersRef.current);
    return verticalSoundscapeRef.current;
  }, [getSharedAudioContext, reducedMotion]);

  const enableAudio = useCallback(() => experienceActor.send({ type: 'AUDIO_ENABLED' }), [experienceActor]);
  const muteAudio = useCallback(() => experienceActor.send({ type: 'AUDIO_MUTED' }), [experienceActor]);
  const {
    toggle: toggleAmbientAudio,
    update: updateAudio,
    enterChapter: enterAudioChapter,
  } = useAmbientAudio({
    enabled: audioEnabled,
    onEnabled: enableAudio,
    onMuted: muteAudio,
    getContext: getSharedAudioContext,
  });
  const enterChapter = useCallback((chapter: JourneyChapter) => {
    experienceActor.send({ type: 'CHAPTER_ENTERED', chapter });
    if (chapter === 'field' && lastSoundChapterRef.current !== 'field') {
      verticalSoundscapeRef.current?.trigger('threshold-open');
    }
    lastSoundChapterRef.current = chapter;
  }, [experienceActor]);
  const collectEvidenceCore = useCallback((core: EvidenceCoreId) => {
    experienceActor.send({ type: 'EVIDENCE_CORE_COLLECTED', core });
    const cueX = core === 'source' ? -1.2 : core === 'structure' ? 1.2 : 0;
    verticalSoundscapeRef.current?.trigger('evidence-reveal', { x: cueX, y: 0.2, z: -1.4 });
  }, [experienceActor]);
  const selectLens = useCallback((mode: MacroLensMode) => {
    experienceActor.send({ type: 'LENS_SELECTED', mode });
    verticalSoundParametersRef.current.lensMode = mode;
    verticalSoundscapeRef.current?.update({ lensMode: mode });
    verticalSoundscapeRef.current?.trigger('lens-lock', {
      x: mode === 'raw' ? -0.9 : mode === 'segmentation' ? 0 : 0.9,
      y: 0.35,
      z: -1.7,
    });
  }, [experienceActor]);
  const toggleComposedAudio = useCallback(async () => {
    const soundscape = getVerticalSoundscape();
    if (audioEnabled) {
      soundscape?.mute();
      await toggleAmbientAudio();
      return;
    }

    const [ambientStarted, verticalStarted] = await Promise.all([
      toggleAmbientAudio(),
      soundscape?.resume() ?? Promise.resolve(false),
    ]);
    if (verticalStarted && !ambientStarted) enableAudio();
  }, [audioEnabled, enableAudio, getVerticalSoundscape, toggleAmbientAudio]);
  const onJourneyProgress = useCallback((progress: number, velocity: number) => {
    updateAudio(progress, velocity);
  }, [updateAudio]);
  const onSliceProgress = useCallback((progress: number, velocity: number) => {
    verticalSoundParametersRef.current.progress = progress;
    verticalSoundParametersRef.current.velocity = velocity;
    verticalSoundscapeRef.current?.update({ progress, velocity });
  }, []);
  const { worldProgressRef: progressRef, velocityRef } = useJourneyDirector({
    rootRef,
    reducedMotion,
    onChapterChange: enterChapter,
    onProgress: onJourneyProgress,
    onSliceProgress,
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
    nexusFlightInputRef.current = {
      x: Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1)),
      y: Math.max(-1, Math.min(1, 1 - event.clientY / window.innerHeight * 2)),
      active: true,
    };
    event.currentTarget.style.setProperty('--mf-lens-x', `${(x * 100).toFixed(2)}%`);
    event.currentTarget.style.setProperty('--mf-lens-y', `${(yFromTop * 100).toFixed(2)}%`);
    event.currentTarget.dataset.lensEngaged = 'true';
  }, []);

  const leaveLens = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    lensPointerRef.current.active = false;
    nexusFlightInputRef.current.active = false;
    delete event.currentTarget.dataset.lensEngaged;
  }, []);

  const moveFlightWithKeyboard = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const vector = event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a'
      ? [-1, 0]
      : event.key === 'ArrowRight' || event.key.toLowerCase() === 'd'
        ? [1, 0]
        : event.key === 'ArrowUp' || event.key.toLowerCase() === 'w'
          ? [0, 1]
          : event.key === 'ArrowDown' || event.key.toLowerCase() === 's'
            ? [0, -1]
            : null;
    if (!vector) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.34 : 0.2;
    nexusFlightInputRef.current = {
      x: Math.max(-1, Math.min(1, nexusFlightInputRef.current.x + vector[0] * step)),
      y: Math.max(-1, Math.min(1, nexusFlightInputRef.current.y + vector[1] * step)),
      active: true,
    };
  }, []);

  const stopFlightWithKeyboard = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (!['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(event.key.toLowerCase())) return;
    nexusFlightInputRef.current.active = false;
  }, []);

  useEffect(() => {
    document.body.classList.add('mf-lab-mode');
    return () => document.body.classList.remove('mf-lab-mode');
  }, []);

  useEffect(() => {
    enterAudioChapter(activeChapter, chapterTone(activeChapter));
  }, [activeChapter, audioEnabled, enterAudioChapter]);

  useEffect(() => {
    verticalSoundscapeRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    if (!audioEnabled) verticalSoundscapeRef.current?.mute();
  }, [audioEnabled]);

  useEffect(() => () => {
    verticalSoundscapeRef.current?.dispose();
    const context = sharedAudioContextRef.current;
    sharedAudioContextRef.current = null;
    if (context && context.state !== 'closed') void context.close();
  }, []);

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
      data-evidence-cores={evidenceCores.length}
      data-trace-outcome={traceOutcome}
    >
      <a className="mf-skip" href="#mf-proof">Sari la dovada proiectului</a>

      <div className="mf-world" aria-hidden="true">
        {macroWorldActive ? (
          <Suspense fallback={<VerticalSliceLoader />}>
            <MacroFlowScene
              activeChapter={activeChapter}
              progressRef={progressRef}
              lensPointerRef={lensPointerRef}
              nexusFlightInputRef={nexusFlightInputRef}
              lensMode={lensMode}
              collectedEvidenceCores={evidenceCores}
              onCollectEvidenceCore={collectEvidenceCore}
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
            onClick={() => void toggleComposedAudio()}
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
          <p className="mf-kicker">The Citadel of Seven Systems / Transylvania</p>
          <h1><span>Transylvanian</span><span>Bears</span></h1>
          <div className="mf-hero-statement">
            <strong>Șapte sisteme. O singură cetate.</strong>
            <p>Software, jocuri, machine learning și cercetare aplicată, construite sub același însemn.</p>
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
          tabIndex={0}
          aria-label="Controlează drona Nexus și schimbă modul de analiză"
          onPointerMove={moveLens}
          onPointerEnter={moveLens}
          onPointerLeave={leaveLens}
          onKeyDown={moveFlightWithKeyboard}
          onKeyUp={stopFlightWithKeyboard}
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
                  onClick={() => selectLens(option.id)}
                >
                  <Icon aria-hidden="true" />
                  <span><strong>{option.label}</strong><small>{option.description}</small></span>
                </button>
              );
            })}
          </div>
          <div className="mf-evidence-cores" aria-live="polite" aria-label={`${evidenceCores.length} din 3 nuclee de dovadă colectate`}>
            {LENS_OPTIONS.map((option, index) => {
              const Icon = option.icon;
              const core = EVIDENCE_CORE_BY_LENS[option.id];
              const collected = evidenceCores.includes(core);
              return (
                <span key={core} data-collected={collected || undefined}>
                  <Icon aria-hidden="true" />
                  <small>Core 0{index + 1}</small>
                  {collected ? <Check aria-hidden="true" /> : <i aria-hidden="true" />}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      <section id="mf-proof" className="mf-clearing" data-chapter="proof">
        <div className="mf-proof-handoff" aria-hidden="true">
          <div className="mf-proof-handoff__paper">
            <img
              className="mf-proof-handoff__image mf-proof-handoff__image--field"
              src="/assets/projects/nexus-ue5-aerial.webp"
              alt=""
              width="1280"
              height="960"
              decoding="async"
            />
            <img
              className="mf-proof-handoff__image mf-proof-handoff__image--validation"
              src="/assets/projects/project-nexus.webp"
              alt=""
              width="589"
              height="504"
              decoding="async"
            />
            <span>Synthetic field / real-world validation</span>
          </div>
          <div className="mf-proof-handoff__frame">
            <i /><i /><i /><i />
            <span>NX-01 / source plane</span>
          </div>
        </div>
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

          <NexusProofInspector mode={lensMode} onModeChange={selectLens} />

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

          <footer className="mf-clearing__credits">
            <div>
              <p className="mf-kicker">Team / confirmed authors</p>
              <ul>
                <li>Nedelcu Călin</li>
                <li>Cheroiu Andrei</li>
                <li>Buloi Cristian</li>
                <li>Colan Vlad</li>
              </ul>
            </div>
            <p>
              Autorii, metoda și volumele publicate sunt verificate în prezentarea echipei.
              Straturile demonstrative sunt marcate separat de materialul autentic.
            </p>
          </footer>
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
