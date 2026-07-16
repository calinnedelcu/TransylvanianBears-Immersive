export type MacroLensMode = 'raw' | 'segmentation' | 'detection';

export type MacroTraceOutcome = 'idle' | 'running' | 'allowed';

export type LensPointerState = {
  x: number;
  y: number;
  active: boolean;
};

export type NexusFlightInput = {
  x: number;
  y: number;
  active: boolean;
};
