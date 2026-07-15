import {
  ArrowLeft,
  BookOpen,
  Check,
  Eye,
  LocateFixed,
  LockKeyhole,
  RotateCcw,
  ScanLine,
  SkipForward,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { useGreenfieldMode } from '../../hooks/useGreenfieldMode';
import { ControlLoopScene, type LookState } from './ControlLoopScene';
import {
  CORRECT_TARGET,
  completedLoopState,
  controlLoopReducer,
  initialLoopState,
  isMissionStage,
  isTransitionStage,
  type LensMode,
  type LoopState,
  type TargetId,
} from './controlLoopMachine';
import './control-loop.css';

const STORAGE_KEY = 'tb-control-loop-v1';

const LENS_LABELS: Record<LensMode, string> = {
  raw: 'Raw',
  segmentation: 'Segmentation',
  detection: 'Detection',
};

const TARGET_LABELS: Record<TargetId, string> = {
  human: 'Human',
  vehicle: 'Vehicle',
  structure: 'Structure',
};

function readPersistedState(): LoopState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialLoopState;
    const parsed = JSON.parse(saved) as { verification?: LoopState['verification'] };
    const verification = parsed.verification === 'viewed' ? 'viewed' : 'verified';
    return completedLoopState(verification);
  } catch {
    return initialLoopState;
  }
}

function IconButton({
  label,
  children,
  onClick,
  active = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      className="cl-icon-button"
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StageRail({ stage, evidenceUnlocked }: Pick<LoopState, 'stage' | 'evidenceUnlocked'>) {
  const missionActive = isMissionStage(stage);

  return (
    <div className="cl-stage-rail" aria-label="Mission progress">
      <span className={stage === 'hub' || stage === 'entry' ? 'is-active' : ''}>Hub</span>
      <i aria-hidden="true" />
      <span className={missionActive ? 'is-active' : ''}>Observe</span>
      <i aria-hidden="true" />
      <span className={stage === 'complete' ? 'is-active' : evidenceUnlocked ? 'is-done' : ''}>Memory</span>
    </div>
  );
}

function LensControl({ mode, onChange }: { mode: LensMode; onChange: (mode: LensMode) => void }) {
  return (
    <div className="cl-lens-control" aria-label="Lens mode">
      {(Object.keys(LENS_LABELS) as LensMode[]).map((lensMode) => (
        <button
          key={lensMode}
          type="button"
          className={mode === lensMode ? 'is-active' : ''}
          aria-pressed={mode === lensMode}
          onClick={() => onChange(lensMode)}
        >
          {LENS_LABELS[lensMode]}
        </button>
      ))}
    </div>
  );
}

function Journal({ state, onClose }: { state: LoopState; onClose: () => void }) {
  return (
    <section className="cl-journal" aria-modal="true" role="dialog" aria-labelledby="journal-title">
      <header className="cl-journal__header">
        <div>
          <p className="cl-kicker">Field journal / 01</p>
          <h2 id="journal-title">Evidence archive</h2>
        </div>
        <IconButton label="Close journal" onClick={onClose}>
          <X aria-hidden="true" />
        </IconButton>
      </header>

      <div className="cl-journal__body">
        <article className={state.evidenceUnlocked ? 'cl-evidence is-unlocked' : 'cl-evidence'}>
          <div className="cl-evidence__index">NX-01</div>
          <div className="cl-evidence__content">
            <p className="cl-kicker">Project Nexus / Observe</p>
            <h3>{state.evidenceUnlocked ? 'Perception dataset verified' : 'Evidence encrypted'}</h3>
            {state.evidenceUnlocked ? (
              <>
                <p>
                  A machine-vision dataset built around varied road conditions, dense annotation, and
                  verifiable scenario coverage.
                </p>
                <div className="cl-evidence__metrics">
                  <span><strong>11</strong> scenarios</span>
                  <span><strong>~9,500</strong> images</span>
                  <span><strong>&gt;140,000</strong> annotations</span>
                </div>
                <a
                  href="https://docs.google.com/presentation/d/1IFLpSXYsgB3ro6IvawuXEFcsHJaB_8aAPX1dooPD5Xg/edit"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source deck <ArrowLeft aria-hidden="true" />
                </a>
              </>
            ) : (
              <p>Complete the Observe mission to bind verified project evidence to the citadel.</p>
            )}
          </div>
          <div className="cl-evidence__state" aria-label={state.evidenceUnlocked ? 'Unlocked' : 'Locked'}>
            {state.evidenceUnlocked ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
          </div>
        </article>
      </div>
    </section>
  );
}

function MissionPanel({
  state,
  onLensChange,
  onTarget,
  onSkip,
}: {
  state: LoopState;
  onLensChange: (mode: LensMode) => void;
  onTarget: (target: TargetId) => void;
  onSkip: () => void;
}) {
  return (
    <section className="cl-mission-panel" aria-labelledby="mission-question">
      <div className="cl-mission-panel__heading">
        <div>
          <p className="cl-kicker">Nexus / Classification gate</p>
          <h2 id="mission-question">Which signal protects the crossing?</h2>
        </div>
        <button className="cl-text-command" type="button" onClick={onSkip}>
          <SkipForward aria-hidden="true" /> Skip
        </button>
      </div>

      <LensControl mode={state.lensMode} onChange={onLensChange} />

      <div className="cl-targets" aria-label="Choose a target">
        {(['vehicle', 'human', 'structure'] as TargetId[]).map((target, index) => (
          <button
            key={target}
            type="button"
            className={state.selectedTarget === target ? 'is-selected' : ''}
            onClick={() => onTarget(target)}
          >
            <span>0{index + 1}</span>
            {TARGET_LABELS[target]}
          </button>
        ))}
      </div>

      <p className="cl-feedback" aria-live="polite">
        {state.verification === 'incorrect'
          ? 'That class is present, but it is not the safety-critical signal. Reframe and retry.'
          : 'Change the Lens, inspect the scene, then verify one class.'}
      </p>
    </section>
  );
}

function ProofPanel({ state, onReturn }: { state: LoopState; onReturn: () => void }) {
  return (
    <section className="cl-proof" aria-labelledby="proof-title">
      <div className="cl-proof__heading">
        <p className="cl-kicker">Evidence bound / NX-01</p>
        <h2 id="proof-title">
          {state.verification === 'viewed' ? 'Mission viewed.' : 'Human signal verified.'}
        </h2>
      </div>
      <div className="cl-proof__metrics">
        <span><strong>11</strong> scenarios</span>
        <span><strong>~9,500</strong> images</span>
        <span><strong>&gt;140,000</strong> annotations</span>
      </div>
      <button className="cl-primary-command" type="button" onClick={onReturn}>
        Bind to citadel <ArrowLeft aria-hidden="true" />
      </button>
    </section>
  );
}

function HubPanel({
  completed,
  onSelectMission,
}: {
  completed: boolean;
  onSelectMission: () => void;
}) {
  return (
    <section className="cl-hub-panel" aria-labelledby="hub-title">
      <div className="cl-hub-panel__copy">
        <p className="cl-kicker">Citadel core / 4 wings</p>
        <h2 id="hub-title">{completed ? 'Observe is now part of the world.' : 'Choose the first discipline.'}</h2>
      </div>
      <div className="cl-wings" aria-label="Citadel wings">
        <button type="button" className="is-active" onClick={onSelectMission}>
          <Eye aria-hidden="true" />
          <span>Observe<small>Nexus</small></span>
        </button>
        <span><LockKeyhole aria-hidden="true" /> Protect</span>
        <span><LockKeyhole aria-hidden="true" /> Imagine</span>
        <span><LockKeyhole aria-hidden="true" /> Measure</span>
      </div>
      <button className="cl-primary-command" type="button" onClick={onSelectMission}>
        {completed ? 'Re-enter Nexus' : 'Enter Nexus'} <ArrowLeft aria-hidden="true" />
      </button>
    </section>
  );
}

export default function ControlLoopPrototype() {
  const location = useLocation();
  const systemReducedMotion = usePrefersReducedMotion();
  const reducedMotion =
    systemReducedMotion || new URLSearchParams(location.search).get('motion') === 'reduce';
  const [state, dispatch] = useReducer(controlLoopReducer, undefined, readPersistedState);
  const lookRef = useRef<LookState>({ yaw: 0, pitch: 0 });
  const dragRef = useRef({ active: false, pointerId: -1, x: 0, y: 0 });

  useGreenfieldMode('Control Lab');

  const recenter = useCallback(() => {
    lookRef.current.yaw = 0;
    lookRef.current.pitch = 0;
  }, []);

  const selectMission = useCallback(() => {
    recenter();
    dispatch({ type: 'select-mission' });
  }, [recenter]);

  const returnToHub = useCallback(() => {
    recenter();
    dispatch({ type: 'return-to-hub' });
  }, [recenter]);

  const selectTarget = useCallback((target: TargetId) => {
    if (target === CORRECT_TARGET) recenter();
    dispatch({ type: 'select-target', target });
  }, [recenter]);

  const skipMission = useCallback(() => {
    recenter();
    dispatch({ type: 'skip-mission' });
  }, [recenter]);

  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    recenter();
    dispatch({ type: 'reset' });
  }, [recenter]);

  const primaryAction = useCallback(() => {
    if (state.journalOpen) {
      dispatch({ type: 'close-journal' });
      return;
    }
    if (state.stage === 'entry') dispatch({ type: 'enter' });
    else if (state.stage === 'hub' || state.stage === 'complete') selectMission();
    else if (state.stage === 'proof') returnToHub();
  }, [returnToHub, selectMission, state.journalOpen, state.stage]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousCursor = document.body.style.cursor;
    document.body.classList.add('cl-lab-mode');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.classList.remove('cl-lab-mode');
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.cursor = previousCursor;
    };
  }, []);

  useEffect(() => {
    if (state.stage === 'complete' && state.evidenceUnlocked) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ verification: state.verification }),
      );
    }
  }, [state.evidenceUnlocked, state.stage, state.verification]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const interactiveTarget = target?.closest('button, a, input, textarea, select');

      if (event.key === 'Escape') {
        event.preventDefault();
        dispatch({ type: 'back' });
        return;
      }

      if (interactiveTarget || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const amount = event.repeat ? 0.035 : 0.055;
        if (event.key === 'ArrowLeft') lookRef.current.yaw = Math.min(0.48, lookRef.current.yaw + amount);
        if (event.key === 'ArrowRight') lookRef.current.yaw = Math.max(-0.48, lookRef.current.yaw - amount);
        if (event.key === 'ArrowUp') lookRef.current.pitch = Math.min(0.28, lookRef.current.pitch + amount);
        if (event.key === 'ArrowDown') lookRef.current.pitch = Math.max(-0.28, lookRef.current.pitch - amount);
        return;
      }

      if (event.key.toLowerCase() === 'q') {
        event.preventDefault();
        dispatch({ type: 'cycle-lens' });
      } else if (event.key.toLowerCase() === 'j') {
        event.preventDefault();
        dispatch({ type: state.journalOpen ? 'close-journal' : 'open-journal' });
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        recenter();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        primaryAction();
      } else if (state.stage === 'mission' && ['1', '2', '3'].includes(event.key)) {
        dispatch({ type: 'set-lens', mode: (['raw', 'segmentation', 'detection'] as LensMode[])[Number(event.key) - 1] });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [primaryAction, recenter, state.journalOpen, state.stage]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId || isTransitionStage(state.stage)) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    lookRef.current.yaw = Math.max(-0.48, Math.min(0.48, lookRef.current.yaw - deltaX * 0.0034));
    lookRef.current.pitch = Math.max(-0.28, Math.min(0.28, lookRef.current.pitch - deltaY * 0.0034));
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <main className="cl-lab" data-stage={state.stage} data-lens={state.lensMode}>
      <div
        className="cl-canvas-shell"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onContextMenu={(event) => event.preventDefault()}
      >
        <ControlLoopScene
          stage={state.stage}
          lensMode={state.lensMode}
          selectedTarget={state.selectedTarget}
          evidenceUnlocked={state.evidenceUnlocked}
          reducedMotion={reducedMotion}
          lookRef={lookRef}
          onSelectMission={selectMission}
          onSelectTarget={selectTarget}
          onArriveMission={() => dispatch({ type: 'arrive-mission' })}
          onArriveHub={() => dispatch({ type: 'arrive-hub' })}
        />
      </div>

      {isMissionStage(state.stage) && <div className="cl-lens-mask" aria-hidden="true" />}

      {!state.journalOpen && (
        <header className="cl-topbar">
          <Link className="cl-exit" to="/next" aria-label="Exit control lab" title="Exit control lab">
            <ArrowLeft aria-hidden="true" />
            <span>LAB 02 / CONTROL</span>
          </Link>
          <StageRail stage={state.stage} evidenceUnlocked={state.evidenceUnlocked} />
          <div className="cl-tools">
            <IconButton label="Recenter view" onClick={recenter}>
              <LocateFixed aria-hidden="true" />
            </IconButton>
            <IconButton label="Open journal" onClick={() => dispatch({ type: 'open-journal' })}>
              <BookOpen aria-hidden="true" />
            </IconButton>
            <IconButton label="Reset prototype" onClick={reset}>
              <RotateCcw aria-hidden="true" />
            </IconButton>
          </div>
        </header>
      )}

      {state.stage !== 'entry' && !state.journalOpen && (
        <div className="cl-view-reticle" aria-hidden="true"><span /></div>
      )}

      {state.stage === 'entry' && (
        <section className="cl-entry" aria-labelledby="entry-title">
          <p className="cl-kicker">Interaction prototype / not art direction</p>
          <h1 id="entry-title">The citadel responds.</h1>
          <p>One mission. One decision. One permanent consequence.</p>
          <button className="cl-primary-command" type="button" onClick={() => dispatch({ type: 'enter' })}>
            Enter system <ArrowLeft aria-hidden="true" />
          </button>
        </section>
      )}

      {(state.stage === 'hub' || state.stage === 'complete') && !state.journalOpen && (
        <HubPanel completed={state.stage === 'complete'} onSelectMission={selectMission} />
      )}

      {state.stage === 'mission' && !state.journalOpen && (
        <MissionPanel
          state={state}
          onLensChange={(mode) => dispatch({ type: 'set-lens', mode })}
          onTarget={selectTarget}
          onSkip={skipMission}
        />
      )}

      {state.stage === 'proof' && !state.journalOpen && (
        <ProofPanel state={state} onReturn={returnToHub} />
      )}

      {isTransitionStage(state.stage) && (
        <div className="cl-transit" role="status">
          <ScanLine aria-hidden="true" />
          <span>{state.stage === 'travel-out' ? 'Routing to Observe' : 'Binding evidence to core'}</span>
        </div>
      )}

      {state.journalOpen && <Journal state={state} onClose={() => dispatch({ type: 'close-journal' })} />}

      <div className="cl-screen-reader-status" aria-live="polite">
        {state.verification === 'incorrect' ? 'Incorrect target. Try again.' : ''}
      </div>
    </main>
  );
}
