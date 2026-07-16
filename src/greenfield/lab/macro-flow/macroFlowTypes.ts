export type MacroLensMode = 'raw' | 'segmentation' | 'detection';

export type MacroTraceOutcome = 'idle' | 'running' | 'allowed' | 'expired' | 'used';

export type LensPointerState = {
  x: number;
  y: number;
  active: boolean;
};
