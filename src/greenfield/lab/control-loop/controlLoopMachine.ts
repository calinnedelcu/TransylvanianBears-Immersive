export type LoopStage =
  | 'entry'
  | 'hub'
  | 'travel-out'
  | 'mission'
  | 'proof'
  | 'travel-back'
  | 'complete';

export type LensMode = 'raw' | 'segmentation' | 'detection';
export type TargetId = 'human' | 'vehicle' | 'structure';
export type VerificationStatus = 'idle' | 'incorrect' | 'verified' | 'viewed';

export type LoopState = {
  stage: LoopStage;
  lensMode: LensMode;
  selectedTarget: TargetId | null;
  verification: VerificationStatus;
  evidenceUnlocked: boolean;
  journalOpen: boolean;
};

export type LoopAction =
  | { type: 'enter' }
  | { type: 'select-mission' }
  | { type: 'arrive-mission' }
  | { type: 'set-lens'; mode: LensMode }
  | { type: 'cycle-lens' }
  | { type: 'select-target'; target: TargetId }
  | { type: 'skip-mission' }
  | { type: 'return-to-hub' }
  | { type: 'arrive-hub' }
  | { type: 'open-journal' }
  | { type: 'close-journal' }
  | { type: 'back' }
  | { type: 'reset' };

export const LENS_ORDER: LensMode[] = ['raw', 'segmentation', 'detection'];
export const CORRECT_TARGET: TargetId = 'human';

export const initialLoopState: LoopState = {
  stage: 'entry',
  lensMode: 'raw',
  selectedTarget: null,
  verification: 'idle',
  evidenceUnlocked: false,
  journalOpen: false,
};

export function completedLoopState(verification: VerificationStatus = 'verified'): LoopState {
  return {
    ...initialLoopState,
    stage: 'complete',
    verification,
    evidenceUnlocked: true,
  };
}

export function controlLoopReducer(state: LoopState, action: LoopAction): LoopState {
  switch (action.type) {
    case 'enter':
      return state.stage === 'entry' ? { ...state, stage: 'hub' } : state;

    case 'select-mission':
      return state.stage === 'hub' || state.stage === 'complete'
        ? {
            ...state,
            stage: 'travel-out',
            lensMode: 'raw',
            selectedTarget: null,
            verification: 'idle',
            journalOpen: false,
          }
        : state;

    case 'arrive-mission':
      return state.stage === 'travel-out' ? { ...state, stage: 'mission' } : state;

    case 'set-lens':
      return state.stage === 'mission' ? { ...state, lensMode: action.mode } : state;

    case 'cycle-lens': {
      if (state.stage !== 'mission') return state;
      const current = LENS_ORDER.indexOf(state.lensMode);
      return { ...state, lensMode: LENS_ORDER[(current + 1) % LENS_ORDER.length] };
    }

    case 'select-target':
      if (state.stage !== 'mission') return state;
      if (action.target === CORRECT_TARGET) {
        return {
          ...state,
          stage: 'proof',
          selectedTarget: action.target,
          verification: 'verified',
          evidenceUnlocked: true,
        };
      }
      return {
        ...state,
        selectedTarget: action.target,
        verification: 'incorrect',
      };

    case 'skip-mission':
      if (state.stage !== 'mission' && state.stage !== 'travel-out') return state;
      return {
        ...state,
        stage: 'proof',
        selectedTarget: null,
        verification: 'viewed',
        evidenceUnlocked: true,
      };

    case 'return-to-hub':
      return state.stage === 'proof' || state.stage === 'mission'
        ? { ...state, stage: 'travel-back', journalOpen: false }
        : state;

    case 'arrive-hub':
      return state.stage === 'travel-back'
        ? { ...state, stage: state.evidenceUnlocked ? 'complete' : 'hub' }
        : state;

    case 'open-journal':
      return { ...state, journalOpen: true };

    case 'close-journal':
      return { ...state, journalOpen: false };

    case 'back':
      if (state.journalOpen) return { ...state, journalOpen: false };
      if (state.stage === 'travel-out') return { ...state, stage: 'hub' };
      if (state.stage === 'mission' || state.stage === 'proof') {
        return { ...state, stage: 'travel-back' };
      }
      return state;

    case 'reset':
      return initialLoopState;

    default:
      return state;
  }
}

export function isMissionStage(stage: LoopStage) {
  return stage === 'travel-out' || stage === 'mission' || stage === 'proof';
}

export function isTransitionStage(stage: LoopStage) {
  return stage === 'travel-out' || stage === 'travel-back';
}
