import { assign, setup } from 'xstate';
import { FIRST_CHAPTER, type JourneyChapter } from './chapters';
import {
  minimumTier,
  nextQualityMode,
  type CapabilitySnapshot,
  type QualityMode,
  type QualityTier,
} from './quality';
import type { EvidenceCoreId } from './evidenceCores';

export type LensMode = 'raw' | 'segmentation' | 'detection';

export type ExperienceContext = {
  activeChapter: JourneyChapter;
  visitedChapters: JourneyChapter[];
  capabilityTier: QualityTier;
  runtimeTier: QualityTier;
  qualityMode: QualityMode;
  performanceFactor: number;
  reducedMotion: boolean;
  audioEnabled: boolean;
  lensMode: LensMode;
  evidenceCores: EvidenceCoreId[];
};

export type ExperienceInput = {
  capabilities: CapabilitySnapshot;
  reducedMotion: boolean;
};

export type ExperienceEvent =
  | { type: 'READY' }
  | { type: 'CHAPTER_ENTERED'; chapter: JourneyChapter }
  | { type: 'CAPABILITIES_CHANGED'; capabilities: CapabilitySnapshot }
  | { type: 'MOTION_CHANGED'; reduced: boolean }
  | { type: 'QUALITY_SAMPLE'; factor: number }
  | { type: 'QUALITY_FALLBACK' }
  | { type: 'CYCLE_QUALITY' }
  | { type: 'AUDIO_ENABLED' }
  | { type: 'AUDIO_MUTED' }
  | { type: 'LENS_SELECTED'; mode: LensMode }
  | { type: 'EVIDENCE_CORE_COLLECTED'; core: EvidenceCoreId };

export function effectiveQuality(context: ExperienceContext): QualityTier {
  if (context.reducedMotion) return 'editorial';
  if (context.qualityMode !== 'auto') return minimumTier(context.qualityMode, context.capabilityTier);
  return minimumTier(context.capabilityTier, context.runtimeTier);
}

export const experienceMachine = setup({
  types: {
    context: {} as ExperienceContext,
    events: {} as ExperienceEvent,
    input: {} as ExperienceInput,
  },
  actions: {
    enterChapter: assign(({ context, event }) => {
      if (event.type !== 'CHAPTER_ENTERED') return {};
      const visited = context.visitedChapters.includes(event.chapter)
        ? context.visitedChapters
        : [...context.visitedChapters, event.chapter];
      return { activeChapter: event.chapter, visitedChapters: visited };
    }),
    updateCapabilities: assign(({ event }) => {
      if (event.type !== 'CAPABILITIES_CHANGED') return {};
      return { capabilityTier: event.capabilities.tier };
    }),
    updateMotion: assign(({ event }) => (
      event.type === 'MOTION_CHANGED' ? { reducedMotion: event.reduced } : {}
    )),
    samplePerformance: assign(({ context, event }) => {
      if (event.type !== 'QUALITY_SAMPLE') return {};
      const factor = Math.max(0, Math.min(1, event.factor));
      if (context.qualityMode !== 'auto' || factor >= 0.34) return { performanceFactor: factor };
      return {
        performanceFactor: factor,
        runtimeTier: context.runtimeTier === 'cinematic' ? 'composed' : context.runtimeTier,
      };
    }),
    fallbackQuality: assign(() => ({
      runtimeTier: 'composed' as const,
      performanceFactor: 0,
    })),
    cycleQuality: assign(({ context }) => ({ qualityMode: nextQualityMode(context.qualityMode) })),
    enableAudio: assign({ audioEnabled: true }),
    muteAudio: assign({ audioEnabled: false }),
    selectLens: assign(({ event }) => (
      event.type === 'LENS_SELECTED' ? { lensMode: event.mode } : {}
    )),
    collectEvidenceCore: assign(({ context, event }) => {
      if (event.type !== 'EVIDENCE_CORE_COLLECTED' || context.evidenceCores.includes(event.core)) return {};
      return { evidenceCores: [...context.evidenceCores, event.core] };
    }),
  },
}).createMachine({
  id: 'transylvanian-bears-experience',
  initial: 'booting',
  context: ({ input }) => ({
    activeChapter: FIRST_CHAPTER,
    visitedChapters: [FIRST_CHAPTER],
    capabilityTier: input.capabilities.tier,
    runtimeTier: 'cinematic',
    qualityMode: 'auto',
    performanceFactor: 1,
    reducedMotion: input.reducedMotion,
    audioEnabled: false,
    lensMode: 'raw',
    evidenceCores: [],
  }),
  states: {
    booting: {
      on: { READY: 'running' },
    },
    running: {},
  },
  on: {
    CHAPTER_ENTERED: { actions: 'enterChapter' },
    CAPABILITIES_CHANGED: { actions: 'updateCapabilities' },
    MOTION_CHANGED: { actions: 'updateMotion' },
    QUALITY_SAMPLE: { actions: 'samplePerformance' },
    QUALITY_FALLBACK: { actions: 'fallbackQuality' },
    CYCLE_QUALITY: { actions: 'cycleQuality' },
    AUDIO_ENABLED: { actions: 'enableAudio' },
    AUDIO_MUTED: { actions: 'muteAudio' },
    LENS_SELECTED: { actions: 'selectLens' },
    EVIDENCE_CORE_COLLECTED: { actions: 'collectEvidenceCore' },
  },
});
