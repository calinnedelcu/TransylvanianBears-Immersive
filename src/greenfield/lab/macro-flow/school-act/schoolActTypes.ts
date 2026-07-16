export const SCHOOL_ACT_TRACE_STAGES = [
  { id: 'issued', label: 'Issued' },
  { id: 'presented', label: 'Presented' },
  { id: 'gate-role', label: 'Gate role' },
  { id: 'atomic-redeem', label: 'Atomic redeem' },
  { id: 'audit-log', label: 'Audit log' },
] as const;

export type SchoolActTraceStage = (typeof SCHOOL_ACT_TRACE_STAGES)[number];
export type SchoolActTraceStageId = SchoolActTraceStage['id'];
export type SchoolActStatus = 'idle' | 'running' | 'allowed';

export type SchoolActState = Readonly<{
  status: SchoolActStatus;
  progress: number;
  stageIndex: number;
  completedStageCount: number;
}>;

export type UseSchoolActControllerOptions = Readonly<{
  reducedMotion?: boolean;
  durationMs?: number;
  onAllowed?: () => void;
}>;

export type SchoolActController = SchoolActState & Readonly<{
  stages: typeof SCHOOL_ACT_TRACE_STAGES;
  activeStage: SchoolActTraceStage;
  canStart: boolean;
  start: () => void;
  reset: () => void;
  resolve: () => void;
}>;
