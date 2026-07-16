import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import {
  INITIAL_SCHOOL_ACT_STATE,
  schoolActReducer,
} from './schoolActMachine';
import {
  SCHOOL_ACT_TRACE_STAGES,
  type SchoolActController,
  type SchoolActStatus,
  type UseSchoolActControllerOptions,
} from './schoolActTypes';

export const DEFAULT_SCHOOL_ACT_DURATION_MS = 2_000;

function validDuration(durationMs: number | undefined): number {
  if (durationMs === undefined || !Number.isFinite(durationMs)) {
    return DEFAULT_SCHOOL_ACT_DURATION_MS;
  }
  return Math.max(1, durationMs);
}

export function useSchoolActController({
  reducedMotion = false,
  durationMs,
  onAllowed,
}: UseSchoolActControllerOptions = {}): SchoolActController {
  const [state, dispatch] = useReducer(schoolActReducer, INITIAL_SCHOOL_ACT_STATE);
  const frameRef = useRef<number | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const statusRef = useRef<SchoolActStatus>(state.status);
  const previousStatusRef = useRef<SchoolActStatus>(state.status);
  const onAllowedRef = useRef(onAllowed);
  const animationDuration = validDuration(durationMs);

  statusRef.current = state.status;
  onAllowedRef.current = onAllowed;

  const cancelScheduledWork = useCallback(() => {
    if (frameRef.current !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(frameRef.current);
    }
    if (completionTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(completionTimerRef.current);
    }
    frameRef.current = null;
    completionTimerRef.current = null;
    startedAtRef.current = null;
  }, []);

  const resolve = useCallback(() => {
    cancelScheduledWork();
    if (statusRef.current === 'allowed') return;
    statusRef.current = 'allowed';
    dispatch({ type: 'RESOLVE' });
  }, [cancelScheduledWork]);

  const reset = useCallback(() => {
    cancelScheduledWork();
    statusRef.current = 'idle';
    dispatch({ type: 'RESET' });
  }, [cancelScheduledWork]);

  const start = useCallback(() => {
    if (statusRef.current !== 'idle') return;
    cancelScheduledWork();

    if (reducedMotion || typeof window === 'undefined') {
      statusRef.current = 'allowed';
      dispatch({ type: 'RESOLVE' });
      return;
    }

    statusRef.current = 'running';
    dispatch({ type: 'START' });
    startedAtRef.current = window.performance.now();

    const finish = () => {
      cancelScheduledWork();
      if (statusRef.current !== 'running') return;
      statusRef.current = 'allowed';
      dispatch({ type: 'RESOLVE' });
    };

    const tick = (now: number) => {
      if (statusRef.current !== 'running' || startedAtRef.current === null) return;
      const progress = Math.min(1, (now - startedAtRef.current) / animationDuration);

      if (progress >= 1) {
        finish();
        return;
      }

      dispatch({ type: 'TICK', progress });
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    completionTimerRef.current = window.setTimeout(finish, animationDuration + 100);
  }, [animationDuration, cancelScheduledWork, reducedMotion]);

  useEffect(() => {
    if (reducedMotion && statusRef.current === 'running') resolve();
  }, [reducedMotion, resolve]);

  useEffect(() => {
    if (previousStatusRef.current !== 'allowed' && state.status === 'allowed') {
      onAllowedRef.current?.();
    }
    previousStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => cancelScheduledWork, [cancelScheduledWork]);

  return useMemo(() => ({
    ...state,
    stages: SCHOOL_ACT_TRACE_STAGES,
    activeStage: SCHOOL_ACT_TRACE_STAGES[state.stageIndex] ?? SCHOOL_ACT_TRACE_STAGES[0],
    canStart: state.status === 'idle',
    start,
    reset,
    resolve,
  }), [reset, resolve, start, state]);
}
