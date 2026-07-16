import {
  SCHOOL_ACT_TRACE_STAGES,
  type SchoolActState,
} from './schoolActTypes';

export type SchoolActAction =
  | { type: 'START' }
  | { type: 'TICK'; progress: number }
  | { type: 'RESOLVE' }
  | { type: 'RESET' };

export const INITIAL_SCHOOL_ACT_STATE: SchoolActState = {
  status: 'idle',
  progress: 0,
  stageIndex: 0,
  completedStageCount: 0,
};

export const ALLOWED_SCHOOL_ACT_STATE: SchoolActState = {
  status: 'allowed',
  progress: 1,
  stageIndex: SCHOOL_ACT_TRACE_STAGES.length - 1,
  completedStageCount: SCHOOL_ACT_TRACE_STAGES.length,
};

export function clampSchoolActProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(1, progress));
}

export function schoolActStageIndexFromProgress(progress: number): number {
  const normalized = clampSchoolActProgress(progress);
  return Math.min(
    SCHOOL_ACT_TRACE_STAGES.length - 1,
    Math.floor(normalized * SCHOOL_ACT_TRACE_STAGES.length),
  );
}

export function schoolActCompletedStagesFromProgress(progress: number): number {
  return Math.min(
    SCHOOL_ACT_TRACE_STAGES.length,
    Math.floor(clampSchoolActProgress(progress) * SCHOOL_ACT_TRACE_STAGES.length),
  );
}

function runningState(progress: number): SchoolActState {
  return {
    status: 'running',
    progress,
    stageIndex: schoolActStageIndexFromProgress(progress),
    completedStageCount: schoolActCompletedStagesFromProgress(progress),
  };
}

export function schoolActReducer(
  state: SchoolActState,
  action: SchoolActAction,
): SchoolActState {
  switch (action.type) {
    case 'START':
      return state.status === 'idle' ? runningState(0) : state;

    case 'TICK': {
      if (state.status !== 'running') return state;
      const progress = Math.max(state.progress, clampSchoolActProgress(action.progress));
      return progress >= 1 ? ALLOWED_SCHOOL_ACT_STATE : runningState(progress);
    }

    case 'RESOLVE':
      return state.status === 'allowed' ? state : ALLOWED_SCHOOL_ACT_STATE;

    case 'RESET':
      return INITIAL_SCHOOL_ACT_STATE;
  }
}
