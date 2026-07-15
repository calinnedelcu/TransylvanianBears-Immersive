export type QualityTier = 'cinematic' | 'composed' | 'editorial';
export type QualityMode = 'auto' | 'composed' | 'editorial';

export type CapabilitySnapshot = {
  tier: QualityTier;
  coarsePointer: boolean;
  narrowViewport: boolean;
  memoryGb: number | null;
  logicalCores: number;
};

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

const TIER_RANK: Record<QualityTier, number> = {
  editorial: 0,
  composed: 1,
  cinematic: 2,
};

export function detectCapabilities(reducedMotion: boolean): CapabilitySnapshot {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      tier: reducedMotion ? 'editorial' : 'composed',
      coarsePointer: false,
      narrowViewport: false,
      memoryGb: null,
      logicalCores: 4,
    };
  }

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const narrowViewport = window.innerWidth < 820;
  const memoryGb = (navigator as NavigatorWithMemory).deviceMemory ?? null;
  const logicalCores = navigator.hardwareConcurrency || 4;
  const constrained = coarsePointer || narrowViewport || (memoryGb !== null && memoryGb <= 4) || logicalCores <= 4;

  return {
    tier: reducedMotion ? 'editorial' : constrained ? 'composed' : 'cinematic',
    coarsePointer,
    narrowViewport,
    memoryGb,
    logicalCores,
  };
}

export function minimumTier(a: QualityTier, b: QualityTier): QualityTier {
  return TIER_RANK[a] <= TIER_RANK[b] ? a : b;
}

export function nextQualityMode(mode: QualityMode): QualityMode {
  if (mode === 'auto') return 'composed';
  if (mode === 'composed') return 'editorial';
  return 'auto';
}
