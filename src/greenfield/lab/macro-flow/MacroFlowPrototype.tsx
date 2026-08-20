import {
  ArrowDown,
  Boxes,
  Check,
  Cog,
  Eye,
  Flame,
  Gauge,
  ScanLine,
  Volume2,
  VolumeX,
  Waypoints,
  Wind,
} from 'lucide-react';
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { ViewTransitionLink } from '../../components/ViewTransitionLink';
import {
  chapterIndex,
  chapterTone,
  type JourneyChapter,
} from '../../experience/chapters';
import { ExperienceProvider } from '../../experience/ExperienceProvider';
import { useAmbientAudio } from '../../experience/audio/useAmbientAudio';
import { EVIDENCE_CORE_BY_LENS, type EvidenceCoreId } from '../../experience/evidenceCores';
import { effectiveQuality } from '../../experience/experienceMachine';
import { useExperienceActorRef, useExperienceSelector } from '../../experience/useExperience';
import { useJourneyDirector } from '../../experience/useJourneyDirector';
import { useGreenfieldMode } from '../../hooks/useGreenfieldMode';
import { ACTS, actBySlug, entryOf, exitOf } from '../hero-plan/acts';
import { ActArrival } from './ActArrival';
import { ActExit } from './ActExit';
import '../hero-plan/hero-plan.css';
import type { MacroLensMode } from './MacroFlowScene';
import type { LensPointerState, NexusFlightInput } from './macroFlowTypes';
import InfectInterlude from './InfectInterlude';
import ResearchCrossing from './ResearchCrossing';
import EvidenceWeave from './EvidenceWeave';
import { NexusProofInspector } from './NexusProofInspector';
import BuriedGameplayTheater from './BuriedGameplayTheater';
import {
  BuriedActSoundscape,
  type BuriedLampFocus,
} from './buried-act/BuriedActSoundscape';
import { VerticalSliceSoundscape } from './VerticalSliceSoundscape';
import { VerticalSliceLoader } from './VerticalSliceLoader';
import { SchoolActOverlay } from './school-act/SchoolActOverlay';
import { SchoolActSoundscape } from './school-act/SchoolActSoundscape';
import { useSchoolActController } from './school-act/useSchoolActController';
import type { SchoolActStatus } from './school-act/schoolActTypes';
import './macro-flow.css';

const MacroFlowScene = lazy(() => import('./MacroFlowScene').then((module) => ({ default: module.MacroFlowScene })));

type WorldErrorBoundaryProps = { children: ReactNode; onError: () => void };
type WorldErrorBoundaryState = { failed: boolean };

class WorldErrorBoundary extends Component<WorldErrorBoundaryProps, WorldErrorBoundaryState> {
  state: WorldErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): WorldErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('Immersive renderer unavailable; continuing with the editorial route.', error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function supportsWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

type BuriedRule = 'oil' | 'mechanism' | 'mercury';
type MacroSoundAct = 'vertical' | 'school' | 'buried';

const INFECT_CHAPTER_INDEX = chapterIndex('infect');

function soundActForChapter(chapter: JourneyChapter): MacroSoundAct | null {
  switch (chapter) {
    case 'threshold':
    case 'field':
    case 'lens':
    case 'proof':
      return 'vertical';
    case 'passage':
    case 'access':
    case 'schoolmate':
      return 'school';
    case 'descent':
    case 'lamp':
    case 'build':
      return 'buried';
    default:
      return null;
  }
}

const BURIED_RULES: Array<{
  id: BuriedRule;
  label: string;
  short: string;
  detail: string;
  icon: typeof Flame;
}> = [
  {
    id: 'oil',
    label: 'Lampa are combustibil',
    short: 'Ulei',
    detail: 'Lampa consumă ulei. Jocul oferă separat o comandă pentru mai multă lumină.',
    icon: Flame,
  },
  {
    id: 'mechanism',
    label: 'Vaza închide circuitul',
    short: 'Mecanism',
    detail: 'Umpli o vază cu mercur și o aduci înapoi la mecanism.',
    icon: Cog,
  },
  {
    id: 'mercury',
    label: 'Expunerea este măsurată',
    short: 'Vapori',
    detail: 'Masca protejează de vapori, iar HUD-ul urmărește nivelul lor.',
    icon: Wind,
  },
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

function MacroFlowExperience() {
  /**
   * One act at a time.
   *
   * The reader chose a system on the ring, and an act that shares a document with
   * its neighbours is not really a destination: scroll far enough either way and
   * you are somewhere you never asked to be. Only the chosen act is on the page,
   * so there is nothing above or below it to fall into.
   */
  const { act: actSlug } = useParams();
  const act = actBySlug(actSlug) ?? ACTS[0];
  const shows = (chapter: string) => (act.chapters as string[]).includes(chapter);

  const rootRef = useRef<HTMLElement>(null);
  const sharedAudioContextRef = useRef<AudioContext | null>(null);
  const verticalSoundscapeRef = useRef<VerticalSliceSoundscape | null>(null);
  const schoolSoundscapeRef = useRef<SchoolActSoundscape | null>(null);
  const buriedSoundscapeRef = useRef<BuriedActSoundscape | null>(null);
  const verticalSoundParametersRef = useRef({ progress: 0, velocity: 0, lensMode: 'raw' as MacroLensMode });
  const schoolSoundParametersRef = useRef({ progress: 0, scanProgress: 0, velocity: 0 });
  const buriedSoundParametersRef = useRef({
    progress: 0,
    velocity: 0,
    lamp: { x: -0.82, y: 0.1, active: false, focus: 'oil' as BuriedLampFocus },
  });
  const buriedFocusRef = useRef<BuriedLampFocus>('oil');
  const buriedEvidenceCueRef = useRef(0);
  const buriedPixelCueRef = useRef(false);
  const automaticLensModeRef = useRef<MacroLensMode>('raw');
  const lampRaisedRef = useRef(false);
  const schoolActStatusRef = useRef<SchoolActStatus>('idle');
  const previousSchoolActStatusRef = useRef<SchoolActStatus>('idle');
  const schoolRequestCueRef = useRef(false);
  const lastSoundChapterRef = useRef<JourneyChapter | null>(null);
  const lensPointerRef = useRef<LensPointerState>({ x: 0.5, y: 0.5, active: false });
  const nexusFlightInputRef = useRef<NexusFlightInput>({ x: 0, y: 0, active: false });
  const reducedMotion = usePrefersReducedMotion();
  const [webglAvailable] = useState(supportsWebGL);
  const [rendererFailure, setRendererFailure] = useState<'render-error' | 'context-lost' | null>(null);
  const directInfectEntryRef = useRef(window.location.hash === '#mf-infect');
  const directInfectChapterReachedRef = useRef(false);
  const [buriedHandoffComplete, setBuriedHandoffComplete] = useState(
    () => directInfectEntryRef.current,
  );
  const handleRendererError = useCallback(() => setRendererFailure('render-error'), []);
  const handleRendererContextLost = useCallback(() => setRendererFailure('context-lost'), []);
  const handleBuriedPixelHandoffRendered = useCallback(() => {
    setBuriedHandoffComplete(true);
  }, []);
  const experienceActor = useExperienceActorRef();
  const handlePerformanceFactor = useCallback((factor: number) => {
    experienceActor.send({ type: 'QUALITY_SAMPLE', factor });
  }, [experienceActor]);
  const handlePerformanceFallback = useCallback(() => {
    experienceActor.send({ type: 'QUALITY_FALLBACK' });
  }, [experienceActor]);
  const activeChapter = useExperienceSelector((state) => state.context.activeChapter);
  const lensMode = useExperienceSelector((state) => state.context.lensMode);
  const qualityTier = useExperienceSelector((state) => effectiveQuality(state.context));
  const qualityMode = useExperienceSelector((state) => state.context.qualityMode);
  const audioEnabled = useExperienceSelector((state) => state.context.audioEnabled);
  const evidenceCores = useExperienceSelector((state) => state.context.evidenceCores);
  const schoolAct = useSchoolActController({ reducedMotion });
  const {
    canStart: canStartSchoolScan,
    reset: resetSchoolAct,
    resolve: resolveSchoolAct,
    start: runSchoolScan,
  } = schoolAct;
  schoolActStatusRef.current = schoolAct.status;

  useEffect(() => {
    if (
      (activeChapter === 'schoolmate' || activeChapter === 'descent')
      && schoolActStatusRef.current === 'idle'
    ) {
      schoolActStatusRef.current = 'allowed';
      resolveSchoolAct();
    }
  }, [activeChapter, resolveSchoolAct]);

  const [lampRaisedByUser, setLampRaisedByUser] = useState(false);
  const [lampAutoRaised, setLampAutoRaised] = useState(false);
  const [activeBuriedRule, setActiveBuriedRule] = useState<BuriedRule>('oil');
  const lampRaised = lampRaisedByUser || lampAutoRaised;
  lampRaisedRef.current = lampRaised;

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

  const getSchoolSoundscape = useCallback(() => {
    const context = getSharedAudioContext();
    if (!context) return null;
    schoolSoundscapeRef.current ??= new SchoolActSoundscape({
      audioContext: context,
      reducedMotion,
      masterLevel: 0.36,
    });
    schoolSoundscapeRef.current.update(schoolSoundParametersRef.current);
    return schoolSoundscapeRef.current;
  }, [getSharedAudioContext, reducedMotion]);

  const getBuriedSoundscape = useCallback(() => {
    const context = getSharedAudioContext();
    if (!context) return null;
    buriedSoundscapeRef.current ??= new BuriedActSoundscape({
      audioContext: context,
      reducedMotion,
      masterLevel: 0.34,
    });
    buriedSoundscapeRef.current.update(buriedSoundParametersRef.current);
    return buriedSoundscapeRef.current;
  }, [getSharedAudioContext, reducedMotion]);

  const getChapterSoundscape = useCallback((chapter: JourneyChapter) => {
    switch (soundActForChapter(chapter)) {
      case 'vertical':
        return getVerticalSoundscape();
      case 'school':
        return getSchoolSoundscape();
      case 'buried':
        return getBuriedSoundscape();
      default:
        return null;
    }
  }, [getBuriedSoundscape, getSchoolSoundscape, getVerticalSoundscape]);

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
  useLayoutEffect(() => {
    enterChapter(entryOf(act));
  }, [act, enterChapter]);

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
    if (audioEnabled) {
      verticalSoundscapeRef.current?.mute();
      schoolSoundscapeRef.current?.mute();
      buriedSoundscapeRef.current?.mute();
      await toggleAmbientAudio();
      return;
    }

    const soundscape = getChapterSoundscape(activeChapter);
    const [ambientStarted, actStarted] = await Promise.all([
      toggleAmbientAudio(),
      soundscape?.resume() ?? Promise.resolve(false),
    ]);
    if (actStarted && !ambientStarted) enableAudio();
  }, [activeChapter, audioEnabled, enableAudio, getChapterSoundscape, toggleAmbientAudio]);
  const onJourneyProgress = useCallback((progress: number, velocity: number) => {
    updateAudio(progress, velocity);
  }, [updateAudio]);
  const onWorldProgress = useCallback((progress: number) => {
    if (progress < 0.112 || progress >= 0.176) return;
    const mode: MacroLensMode = progress < 0.135
      ? 'raw'
      : progress < 0.155
        ? 'segmentation'
        : 'detection';
    if (automaticLensModeRef.current === mode) return;
    automaticLensModeRef.current = mode;
    selectLens(mode);
  }, [selectLens]);
  const onSliceProgress = useCallback((progress: number, velocity: number) => {
    verticalSoundParametersRef.current.progress = progress;
    verticalSoundParametersRef.current.velocity = velocity;
    verticalSoundscapeRef.current?.update({ progress, velocity });
  }, []);
  const onSchoolActProgress = useCallback((progress: number, velocity: number) => {
    schoolSoundParametersRef.current.progress = progress;
    schoolSoundParametersRef.current.velocity = velocity;
    schoolSoundscapeRef.current?.update({ progress, velocity });

    if (progress >= 0.43 && schoolActStatusRef.current === 'idle') {
      schoolActStatusRef.current = 'allowed';
      resolveSchoolAct();
    } else if (progress <= 0.12 && schoolActStatusRef.current !== 'idle') {
      schoolActStatusRef.current = 'idle';
      schoolRequestCueRef.current = false;
      resetSchoolAct();
    }

    if (progress >= 0.78 && !schoolRequestCueRef.current) {
      schoolRequestCueRef.current = true;
      schoolSoundscapeRef.current?.trigger('request-resolved');
    }
  }, [resetSchoolAct, resolveSchoolAct]);
  const onBuriedActProgress = useCallback((progress: number, velocity: number) => {
    if (progress < 0.999) setBuriedHandoffComplete(false);
    if (progress >= 0.37) setLampAutoRaised(true);
    else if (progress <= 0.27) setLampAutoRaised(false);

    if (progress <= 0.08) setLampRaisedByUser(false);
    const nextRule: BuriedRule = progress < 0.4
      ? 'oil'
      : progress < 0.51
        ? 'mechanism'
        : 'mercury';
    setActiveBuriedRule(nextRule);

    const nextFocus = nextRule as BuriedLampFocus;
    const lampX = nextFocus === 'oil' ? -0.82 : nextFocus === 'mechanism' ? 0.12 : 0.84;
    buriedSoundParametersRef.current = {
      progress,
      velocity,
      lamp: {
        x: lampX,
        y: nextFocus === 'mechanism' ? 0.44 : 0.08,
        active: lampRaisedRef.current || progress >= 0.37,
        focus: nextFocus,
      },
    };
    buriedSoundscapeRef.current?.update(buriedSoundParametersRef.current);

    if (nextFocus !== buriedFocusRef.current && progress >= 0.29) {
      buriedFocusRef.current = nextFocus;
      buriedSoundscapeRef.current?.trigger('lamp-focus');
      if (nextFocus === 'mechanism') buriedSoundscapeRef.current?.trigger('mechanism-wake');
    }

    const evidenceThresholds = [0.58, 0.69, 0.79];
    while (
      buriedEvidenceCueRef.current < evidenceThresholds.length
      && progress >= evidenceThresholds[buriedEvidenceCueRef.current]
    ) {
      buriedSoundscapeRef.current?.trigger('evidence-reveal');
      buriedEvidenceCueRef.current += 1;
    }
    if (progress >= 0.95 && !buriedPixelCueRef.current) {
      buriedPixelCueRef.current = true;
      buriedSoundscapeRef.current?.trigger('pixel-compress');
    }
    if (progress <= 0.08) {
      buriedFocusRef.current = 'oil';
      buriedEvidenceCueRef.current = 0;
      buriedPixelCueRef.current = false;
    }
  }, []);
  useEffect(() => {
    // Safari and Chrome restore the previous scroll offset on reload. On a page
    // whose opening is a scroll driven transition, that drops the visitor into
    // the middle of it: no plan, no tip, no rise, just a citadel already there.
    // A hash is a deliberate destination and is left alone.
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    if (window.location.hash.length <= 1) window.scrollTo(0, 0);
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  const {
    worldProgressRef: progressRef,
    schoolActProgressRef,
    buriedActProgressRef,
    schoolEntranceHandoffProgressRef,
    descentHandoffProgressRef,
    velocityRef,
  } = useJourneyDirector({
    rootRef,
    reducedMotion,
    onChapterChange: enterChapter,
    onProgress: onJourneyProgress,
    onWorldProgress,
    onSliceProgress,
    onSchoolActProgress,
    onBuriedActProgress,
  });

  useLayoutEffect(() => {
    if (activeChapter === 'infect') {
      if (directInfectEntryRef.current) {
        directInfectChapterReachedRef.current = true;
        setBuriedHandoffComplete(true);
      }
      return;
    }

    if (chapterIndex(activeChapter) >= INFECT_CHAPTER_INDEX) return;
    if (directInfectEntryRef.current && !directInfectChapterReachedRef.current) return;

    directInfectEntryRef.current = false;
    setBuriedHandoffComplete(false);
  }, [activeChapter]);

  useGreenfieldMode({
    title: 'Transylvanian Bears — Produse, jocuri și cercetare aplicată',
    description: 'O experiență interactivă despre cele șapte proiecte construite de Transylvanian Bears: software școlar, jocuri, machine learning și cercetare.',
    absoluteTitle: true,
  });

  const startSchoolScan = useCallback(() => {
    if (!canStartSchoolScan) return;
    schoolActStatusRef.current = reducedMotion ? 'allowed' : 'running';
    schoolSoundParametersRef.current.scanProgress = 0;

    if (audioEnabled) {
      const soundscape = getSchoolSoundscape();
      void soundscape?.resume().then((started) => {
        if (started) soundscape.trigger('scan-start');
      });
    }
    runSchoolScan();
  }, [audioEnabled, canStartSchoolScan, getSchoolSoundscape, reducedMotion, runSchoolScan]);

  const raiseLamp = useCallback(() => {
    setLampRaisedByUser(true);
    lampRaisedRef.current = true;
    buriedSoundParametersRef.current.lamp.active = true;
    if (!audioEnabled || soundActForChapter(activeChapter) !== 'buried') return;

    const soundscape = getBuriedSoundscape();
    soundscape?.updateLamp({ active: true });
    void soundscape?.resume().then((started) => {
      if (started) soundscape.trigger('lamp-focus');
    });
  }, [activeChapter, audioEnabled, getBuriedSoundscape]);

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
    schoolSoundscapeRef.current?.setReducedMotion(reducedMotion);
    buriedSoundscapeRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    const activeSoundAct = soundActForChapter(activeChapter);
    if (!audioEnabled || activeSoundAct !== 'vertical') verticalSoundscapeRef.current?.mute();
    if (!audioEnabled || activeSoundAct !== 'school') schoolSoundscapeRef.current?.mute();
    if (!audioEnabled || activeSoundAct !== 'buried') buriedSoundscapeRef.current?.mute();
    if (!audioEnabled) return;

    const soundscape = getChapterSoundscape(activeChapter);
    if (soundscape?.status !== 'running') void soundscape?.resume();
  }, [activeChapter, audioEnabled, getChapterSoundscape]);

  useEffect(() => {
    schoolSoundParametersRef.current.scanProgress = schoolAct.progress;
    schoolSoundscapeRef.current?.update({ scanProgress: schoolAct.progress });

    if (
      previousSchoolActStatusRef.current !== 'allowed'
      && schoolAct.status === 'allowed'
    ) {
      schoolSoundscapeRef.current?.trigger('gate-open');
    }
    previousSchoolActStatusRef.current = schoolAct.status;
  }, [schoolAct.progress, schoolAct.status]);

  useEffect(() => () => {
    verticalSoundscapeRef.current?.dispose();
    schoolSoundscapeRef.current?.dispose();
    buriedSoundscapeRef.current?.dispose();
    const context = sharedAudioContextRef.current;
    sharedAudioContextRef.current = null;
    if (context && context.state !== 'closed') void context.close();
  }, []);

  const macroWorldActive = webglAvailable
    && rendererFailure === null
    && qualityTier !== 'editorial'
    && !directInfectEntryRef.current
    && !(activeChapter === 'infect' && buriedHandoffComplete)
    && activeChapter !== 'research'
    && activeChapter !== 'evidence-weave'
    && activeChapter !== 'final-return'
    && activeChapter !== 'open-paths'
    && activeChapter !== 'dawn';
  return (
    <main
      ref={rootRef}
      className="mf-lab"
      data-active-chapter={activeChapter}
      data-quality-tier={qualityTier}
      data-lens={lensMode}
      data-evidence-cores={evidenceCores.length}
      data-trace-outcome={schoolAct.status}
      data-renderer={macroWorldActive ? 'webgl' : 'editorial'}
      data-renderer-failure={rendererFailure ?? undefined}
    >
      {/* The skip link has to name something that is on this page: it used to
          point at the Nexus proof from inside whatever act the reader was in. */}
      <a className="mf-skip" href={`#mf-${exitOf(act)}`}>Sari la finalul capitolului</a>

      <div className="mf-world" aria-hidden="true">
        {macroWorldActive ? (
          <WorldErrorBoundary onError={handleRendererError}>
            <Suspense fallback={<VerticalSliceLoader />}>
              <MacroFlowScene
                activeChapter={activeChapter}
                progressRef={progressRef}
                schoolActProgressRef={schoolActProgressRef}
                buriedActProgressRef={buriedActProgressRef}
                schoolEntranceHandoffProgressRef={schoolEntranceHandoffProgressRef}
                descentHandoffProgressRef={descentHandoffProgressRef}
                lensPointerRef={lensPointerRef}
                nexusFlightInputRef={nexusFlightInputRef}
                lensMode={lensMode}
                collectedEvidenceCores={evidenceCores}
                onCollectEvidenceCore={collectEvidenceCore}
                traceProgress={schoolAct.progress}
                traceOutcome={schoolAct.status}
                lampRaised={lampRaised}
                reducedMotion={reducedMotion}
                qualityTier={qualityTier}
                velocityRef={velocityRef}
                onPerformanceFactor={handlePerformanceFactor}
                onPerformanceFallback={handlePerformanceFallback}
                onRendererFailure={handleRendererContextLost}
                onBuriedPixelHandoffRendered={handleBuriedPixelHandoffRendered}
              />
            </Suspense>
          </WorldErrorBoundary>
        ) : null}
        <div className="mf-world__grade" />
      </div>

      <ActArrival act={act} />

      <header className="mf-header">
        <ViewTransitionLink className="mf-brand" to="/" aria-label="Transylvanian Bears, start">
          <span>Transylvanian Bears</span>
        </ViewTransitionLink>
        <Link className="mf-header__back" to="/">
          <span aria-hidden="true">&larr;</span>
          {act.systems.length ? 'Înapoi la cetate' : 'Închiderea drumului'}
        </Link>
        <div className="mf-header__actions">
          <button
            className="mf-system-control"
            type="button"
            aria-label={reducedMotion
              ? 'Calitate editorială pentru mișcare redusă'
              : `Calitate ${qualityMode === 'auto' ? `automată, ${qualityTier}` : qualityTier}. Schimbă nivelul.`}
            title={reducedMotion
              ? 'Calitate editorială / mișcare redusă'
              : `Calitate: ${qualityMode === 'auto' ? `auto / ${qualityTier}` : qualityTier}`}
            data-tier={qualityTier}
            disabled={reducedMotion}
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


      {shows('field') ? (
      <section id="mf-field" className="mf-beat mf-beat--field" data-chapter="field">
        <div className="mf-copy mf-copy--side">
          <p className="mf-kicker">Project Nexus / synthetic field</p>
          <h2>Un oraș construit ca instrument de cercetare.</h2>
          <p>
            Strada, clădirile și semnalele devin materia datasetului: 11 scenarii, aproximativ
            9.500 de imagini și peste 140.000 de adnotări.
          </p>
        </div>
      </section>
      ) : null}

      {shows('lens') ? (
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
            <p className="mf-kicker">Evidence lens / Project Nexus</p>
            <h2>Trei suprafețe de evidență.</h2>
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
                  title={`${option.label}: ${option.description}`}
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
      ) : null}

      {shows('proof') ? (
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
              src="/assets/projects/nexus-detection.webp"
              alt=""
              width="1200"
              height="900"
              decoding="async"
            />
            <div className="mf-proof-handoff__labels">
              <span>Synthetic RGB / UE5 field</span>
              <span>Detection export / separate frame</span>
            </div>
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
      ) : null}

      <SchoolActOverlay
        shows={shows}
        traceProgress={schoolAct.progress}
        traceStep={schoolAct.stageIndex}
        traceOutcome={schoolAct.status}
        onStartScan={startSchoolScan}
        reducedMotion={reducedMotion}
      />

      {shows('descent') ? (
      <section id="mf-descent" className="mf-beat mf-beat--descent" data-chapter="descent">
        <div className="mf-copy mf-copy--descent">
          <p className="mf-kicker">Continuity rule / SchoolMate → The Buried Hands</p>
          <h2>Mausoleul se închide.</h2>
          <p>
            În premisa jocului, plasată în anul 210 î.Hr., un meșteșugar rămâne prins în mausoleul lui Qin Shi Huang când
            începe sigilarea complexului. Are unelte, cunoaște mecanismele și dispune de puțin ulei.
          </p>
          <div className="mf-next-beat">
            <span>Coboară în mausoleu</span>
            <strong>Rule Descent / The Buried Hands <ArrowDown aria-hidden="true" /></strong>
          </div>
        </div>
      </section>
      ) : null}

      {shows('lamp') ? (
      <section id="mf-lamp" className="mf-lamp-chamber" data-chapter="lamp">
        <div
          className="mf-lamp-chamber__stage"
          data-lamp-raised={lampRaised || undefined}
        >
          <figure className="mf-lamp-chamber__fallback-media">
            <picture style={{ display: 'contents' }}>
              <source
                media="(max-width: 820px)"
                srcSet="/assets/projects/buried-hands/mobile/mechanism.webp"
              />
              <img
                src="/assets/projects/buried-hands/mechanism.webp"
                alt="Mecanism cu scripeți, lampă și vas pentru mercur în The Buried Hands"
                width="1916"
                height="1004"
                loading="lazy"
                decoding="async"
              />
            </picture>
          </figure>
          <div className="mf-lamp-chamber__shade" aria-hidden="true" />

          <header className="mf-lamp-head">
            <p className="mf-kicker">Interpretare web / reguli documentate</p>
            <h2>Lumina dezvăluie dovezile.</h2>
            <p>Scena 3D aparține site-ului; informațiile provin din pagina și capturile publice ale jocului.</p>
          </header>

          <div className="mf-lamp-command-panel">
            <button
              className="mf-lamp-command"
              type="button"
              aria-label={lampRaised ? 'Lampa este ridicată' : 'Ridică lampa'}
              aria-disabled={lampRaised}
              onClick={lampRaised ? undefined : raiseLamp}
            >
              <Flame aria-hidden="true" />
              <span>
                <strong>{lampRaised ? 'Lampa este ridicată' : 'Ridică lampa'}</strong>
                <small role="status" aria-live="polite">{lampRaised ? 'Traseul este acum lizibil' : 'O singură acțiune, fără rută alternativă'}</small>
              </span>
            </button>

            <ol className="mf-rule-sequence" aria-label="Sistemele revelate de lampă">
              {BURIED_RULES.map((rule, index) => {
                const Icon = rule.icon;
                return (
                  <li key={rule.id} data-active={activeBuriedRule === rule.id || undefined}>
                    <span>0{index + 1}</span>
                    <Icon aria-hidden="true" />
                    <strong>{rule.short}</strong>
                  </li>
                );
              })}
            </ol>
          </div>

          <aside className="mf-rule-readout" aria-live="polite">
            {BURIED_RULES.map((rule, index) => {
              return (
                <div key={rule.id} hidden={activeBuriedRule !== rule.id}>
                  <span>0{index + 1} / sistem observat</span>
                  <strong>{rule.label}</strong>
                  <p>{rule.detail}</p>
                </div>
              );
            })}
          </aside>

          <div className="mf-lamp-progress">
            <span>Traseu luminat / {BURIED_RULES.find((rule) => rule.id === activeBuriedRule)?.short}</span>
            <div aria-hidden="true"><i data-focus={activeBuriedRule} /></div>
            <a href="#mf-build">Vezi build-ul <ArrowDown aria-hidden="true" /></a>
          </div>
        </div>
      </section>
      ) : null}

      {shows('build') ? (
      <section id="mf-build" className="mf-build-clearing" data-chapter="build">
        <div className="mf-build-clearing__inner">
          <header className="mf-build-head">
            <div>
              <p className="mf-kicker">Authentic gameplay / public build</p>
              <h2>Regulile apar<br />în gameplay.</h2>
            </div>
            <p>
              The Buried Hands este un joc 3D descărcabil pentru Windows. Pagina proiectului
              listează Godot 4.6, GDScript, Jolt Physics și Forward+.
            </p>
          </header>

          <BuriedGameplayTheater />

          <div className="mf-build-record">
            <div className="mf-build-record__label">
              <span>Build record / source-checked</span>
              <p>Capturile provin din galeria publică a proiectului. Scena 3D și soundscape-ul sunt reconstrucții create pentru acest website.</p>
            </div>

            <dl id="mf-build-metrics" className="mf-build-metrics">
              <div><dt>Engine</dt><dd>Godot 4.6</dd></div>
              <div><dt>Physics</dt><dd>Jolt</dd></div>
              <div><dt>Platform</dt><dd>Windows</dd></div>
              <div><dt>Event</dt><dd>Vianu<span>Game Jam 2026</span></dd></div>
            </dl>

            <footer className="mf-build-footer">
              <div>
                <span>Premisă</span>
                <strong>Un meșteșugar prins în timpul sigilării mausoleului.</strong>
              </div>
              <nav aria-label="The Buried Hands links">
                <a href="https://juggypuggy.itch.io/the-buried-hands" target="_blank" rel="noreferrer">Descarcă jocul <span aria-hidden="true">↗</span></a>
                <a href="https://www.youtube.com/watch?v=RGyx2NxUYr8" target="_blank" rel="noreferrer">Vezi gameplay-ul <span aria-hidden="true">↗</span></a>
                <a href="https://itch.io/jam/game-jam-vianu-2026/rate/4585325" target="_blank" rel="noreferrer">Jam submission <span aria-hidden="true">↗</span></a>
              </nav>
            </footer>
          </div>

          <div className="mf-pixel-handoff">
            <div className="mf-pixel-handoff__stage">
              <span>Continuity / The Buried Hands → Infect.exe</span>
              <strong>Lumina se contractă într-un pixel.</strong>
              <i aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {shows('infect') ? <InfectInterlude /> : null}
      {shows('research') ? <ResearchCrossing /> : null}
      {shows('evidence-weave') ? <EvidenceWeave /> : null}

      {/* The way out belongs to the act, not to the chapter that happens to end
          it, so it is placed once here rather than by hand inside five files. */}
      <ActExit chapter={exitOf(act)} />
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
