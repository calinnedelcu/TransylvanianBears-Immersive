export const EVIDENCE_CORE_IDS = ['source', 'structure', 'decision'] as const;

export type EvidenceCoreId = (typeof EVIDENCE_CORE_IDS)[number];

export const EVIDENCE_CORE_BY_LENS = {
  raw: 'source',
  segmentation: 'structure',
  detection: 'decision',
} as const;
