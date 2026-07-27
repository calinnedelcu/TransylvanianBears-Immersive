export type VerticalSliceLensMode = 'raw' | 'segmentation' | 'detection';

export type VerticalSliceStem = 'citadel' | 'threshold' | 'nexus' | 'evidence';

export type VerticalSliceCue = 'threshold-open' | 'lens-lock' | 'evidence-reveal';

export type VerticalSliceSoundscapeStatus =
  | 'idle'
  | 'running'
  | 'muted'
  | 'suspended'
  | 'silent'
  | 'disposed';

export type VerticalSliceSoundParameters = {
  /** Normalized progress over chapters 01-04. Values outside 0-1 are clamped. */
  progress: number;
  /** Signed, normalized scroll velocity. Values outside -1.25 to 1.25 are clamped. */
  velocity: number;
  lensMode: VerticalSliceLensMode;
};

export type VerticalSliceSoundPosition = Readonly<{
  /** Metres to the listener's right. */
  x: number;
  /** Metres above the listener. */
  y: number;
  /** Metres behind the listener; negative values are in front. */
  z: number;
}>;

export type VerticalSliceSoundscapeOptions = {
  /** Removes velocity modulation without muting the authored sound beds. */
  reducedMotion?: boolean;
  /** Forces the controller into a deterministic no-op fallback. */
  silent?: boolean;
  /** Output trim applied after the stem mix. Defaults to 0.68. */
  masterLevel?: number;
  /** Optional commissioning trims. Each stem defaults to 1. */
  stemLevels?: Partial<Record<VerticalSliceStem, number>>;
  /** Optional shared context. The caller remains responsible for closing it. */
  audioContext?: AudioContext;
};

type AudioContextConstructor = new (options?: AudioContextOptions) => AudioContext;
type NoiseColor = 'wind' | 'mechanical' | 'digital' | 'air';

type LensTuning = {
  root: number;
  filterFrequency: number;
  pulseRate: number;
  pulseDepth: number;
  evidenceRatio: number;
  partials: readonly [number, number, number];
  oscillatorLevels: readonly [number, number, number];
  dataFrequency: number;
  dataLevel: number;
  cueNotes: readonly [number, number, number];
  cueDuration: number;
  cueScanFrequency: number;
};

type SoundGraph = {
  master: GainNode;
  limiter: DynamicsCompressorNode;
  cueBus: GainNode;
  stems: Record<VerticalSliceStem, GainNode>;
  citadelFilter: BiquadFilterNode;
  citadelPan: StereoPannerNode;
  thresholdFilter: BiquadFilterNode;
  thresholdPulse: OscillatorNode;
  thresholdPulseDepth: GainNode;
  nexusFilter: BiquadFilterNode;
  nexusNoiseFilter: BiquadFilterNode;
  nexusNoiseLevel: GainNode;
  nexusPanner: PannerNode;
  nexusPulse: OscillatorNode;
  nexusPulseDepth: GainNode;
  nexusOscillators: OscillatorNode[];
  nexusOscillatorLevels: GainNode[];
  evidenceFilter: BiquadFilterNode;
  evidenceNoiseFilter: BiquadFilterNode;
  evidenceOscillators: OscillatorNode[];
  noiseBuffers: Record<NoiseColor, AudioBuffer>;
  continuousSources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
};

const MIN_GAIN = 0.0001;

const STEM_LEVEL_LIMIT = 1.5;

const DEFAULT_STEM_LEVELS: Record<VerticalSliceStem, number> = {
  citadel: 1,
  threshold: 1,
  nexus: 1,
  evidence: 1,
};

const DEFAULT_CUE_POSITIONS: Record<VerticalSliceCue, VerticalSliceSoundPosition> = {
  'threshold-open': { x: 0, y: 0.1, z: -2.8 },
  'lens-lock': { x: 0.9, y: 0.35, z: -1.7 },
  'evidence-reveal': { x: 0, y: 0.2, z: -1.3 },
};

const LENS_TUNING: Record<VerticalSliceLensMode, LensTuning> = {
  raw: {
    root: 49,
    filterFrequency: 520,
    pulseRate: 0.105,
    pulseDepth: 0.034,
    evidenceRatio: 1,
    partials: [1, 1.5, 2.01],
    oscillatorLevels: [0.125, 0.035, 0.016],
    dataFrequency: 960,
    dataLevel: 0.028,
    cueNotes: [4, 6, 8],
    cueDuration: 0.62,
    cueScanFrequency: 1120,
  },
  segmentation: {
    root: 55,
    filterFrequency: 880,
    pulseRate: 0.165,
    pulseDepth: 0.052,
    evidenceRatio: 1.125,
    partials: [1, 1.6, 2.25],
    oscillatorLevels: [0.1, 0.05, 0.026],
    dataFrequency: 1720,
    dataLevel: 0.048,
    cueNotes: [6, 8, 10],
    cueDuration: 0.68,
    cueScanFrequency: 2100,
  },
  detection: {
    root: 61.74,
    filterFrequency: 1260,
    pulseRate: 0.24,
    pulseDepth: 0.07,
    evidenceRatio: 1.25,
    partials: [1, 1.75, 2.5],
    oscillatorLevels: [0.082, 0.046, 0.034],
    dataFrequency: 2780,
    dataLevel: 0.066,
    cueNotes: [8, 12, 16],
    cueDuration: 0.54,
    cueScanFrequency: 3200,
  },
};

const LOCK_SEQUENCE_FREQUENCIES = [146.83, 164.81, 174.61, 196, 220, 246.94] as const;
const LOCK_SEQUENCE_TIMES = [0, 0.1, 0.21, 0.33, 0.46, 0.6] as const;

const NOISE_SEEDS: Record<NoiseColor, number> = {
  wind: 0x02f6e2b1,
  mechanical: 0x43a91d07,
  digital: 0x176ac91d,
  air: 0x6c8e9cf5,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function smoothstep(start: number, end: number, value: number) {
  const normalized = clamp01((value - start) / (end - start));
  return normalized * normalized * (3 - 2 * normalized);
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function isLensMode(value: unknown): value is VerticalSliceLensMode {
  return value === 'raw' || value === 'segmentation' || value === 'detection';
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as typeof window & {
    webkitAudioContext?: AudioContextConstructor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

function holdParameter(parameter: AudioParam, atTime: number) {
  try {
    parameter.cancelAndHoldAtTime(atTime);
  } catch {
    const currentValue = parameter.value;
    parameter.cancelScheduledValues(atTime);
    parameter.setValueAtTime(currentValue, atTime);
  }
}

function moveParameter(
  parameter: AudioParam,
  target: number,
  atTime: number,
  timeConstant: number,
  immediate: boolean,
) {
  holdParameter(parameter, atTime);
  if (immediate) {
    parameter.setValueAtTime(target, atTime);
    return;
  }
  parameter.setTargetAtTime(target, atTime, timeConstant);
}

/**
 * Procedural, opt-in Web Audio controller for the 01-04 macro-flow slice.
 * Creating an instance is silent; call resume() from an explicit user action.
 */
export class VerticalSliceSoundscape {
  private context: AudioContext | null = null;
  private readonly ownsContext: boolean;
  private graph: SoundGraph | null = null;
  private statusValue: VerticalSliceSoundscapeStatus;
  private readonly silentRequested: boolean;
  private readonly activeOneShotSources = new Set<AudioScheduledSourceNode>();
  private readonly activeOneShotNodes = new Set<AudioNode>();
  private readonly stemLevels: Record<VerticalSliceStem, number>;
  private parameters: VerticalSliceSoundParameters = {
    progress: 0,
    velocity: 0,
    lensMode: 'raw',
  };
  private masterLevel: number;
  private reducedMotion: boolean;
  private muted = true;
  private resumeOperation: Promise<boolean> | null = null;
  private disposed = false;

  constructor(options: VerticalSliceSoundscapeOptions = {}) {
    this.context = options.audioContext ?? null;
    this.ownsContext = options.audioContext === undefined;
    this.silentRequested = options.silent ?? false;
    this.statusValue = this.silentRequested ? 'silent' : 'idle';
    this.reducedMotion = options.reducedMotion ?? prefersReducedMotion();
    this.masterLevel = clamp(finiteOr(options.masterLevel ?? 0.68, 0.68), 0, 1);
    this.stemLevels = { ...DEFAULT_STEM_LEVELS };

    for (const stem of Object.keys(this.stemLevels) as VerticalSliceStem[]) {
      const requestedLevel = options.stemLevels?.[stem];
      if (requestedLevel === undefined) continue;
      this.stemLevels[stem] = clamp(finiteOr(requestedLevel, 1), 0, STEM_LEVEL_LIMIT);
    }
  }

  get status(): VerticalSliceSoundscapeStatus {
    if (
      this.statusValue === 'running'
      && this.context
      && this.context.state === 'suspended'
    ) {
      return 'suspended';
    }
    return this.statusValue;
  }

  get isSupported() {
    return !this.disposed
      && !this.silentRequested
      && (this.context !== null || getAudioContextConstructor() !== null);
  }

  /** Creates or resumes the graph and fades it in. Invoke from a user gesture. */
  resume(): Promise<boolean> {
    if (this.disposed || this.silentRequested) return Promise.resolve(false);

    this.muted = false;
    if (this.resumeOperation) return this.resumeOperation;

    const operation = this.performResume();
    this.resumeOperation = operation;
    void operation.finally(() => {
      if (this.resumeOperation === operation) this.resumeOperation = null;
    });
    return operation;
  }

  /** Fades the owned output to silence. Parameters can continue to be updated while muted. */
  mute() {
    if (this.disposed) return;
    this.muted = true;
    this.statusValue = this.silentRequested ? 'silent' : 'muted';

    if (!this.context || !this.graph || this.context.state === 'closed') return;
    const now = this.context.currentTime;
    holdParameter(this.graph.master.gain, now);
    this.graph.master.gain.linearRampToValueAtTime(0, now + 0.08);
  }

  /**
   * Updates adaptive inputs without creating or resuming an AudioContext.
   * All fields are optional so event sources may update independently.
   */
  update(parameters: Partial<VerticalSliceSoundParameters>) {
    if (this.disposed) return;

    if (parameters.progress !== undefined) {
      this.parameters.progress = clamp01(finiteOr(parameters.progress, this.parameters.progress));
    }
    if (parameters.velocity !== undefined) {
      this.parameters.velocity = clamp(
        finiteOr(parameters.velocity, this.parameters.velocity),
        -1.25,
        1.25,
      );
    }
    if (isLensMode(parameters.lensMode)) this.parameters.lensMode = parameters.lensMode;

    this.applyParameters(false);
  }

  setReducedMotion(reducedMotion: boolean) {
    if (this.disposed || this.reducedMotion === reducedMotion) return;
    this.reducedMotion = reducedMotion;
    this.applyParameters(false);
  }

  /** Applies a commissioning trim without changing the authored crossfade. */
  setStemLevel(stem: VerticalSliceStem, level: number) {
    if (this.disposed) return;
    this.stemLevels[stem] = clamp(finiteOr(level, this.stemLevels[stem]), 0, STEM_LEVEL_LIMIT);
    this.applyParameters(false);
  }

  /**
   * Schedules a procedural HRTF-positioned cue. It never unlocks audio implicitly.
   * Returns false while muted, suspended, unsupported, or disposed.
   */
  trigger(cue: VerticalSliceCue, position: VerticalSliceSoundPosition = DEFAULT_CUE_POSITIONS[cue]) {
    if (
      this.disposed
      || this.muted
      || this.status !== 'running'
      || !this.context
      || !this.graph
      || this.context.state !== 'running'
    ) {
      return false;
    }

    switch (cue) {
      case 'threshold-open':
        this.playThresholdCue(position);
        break;
      case 'lens-lock':
        this.playLensCue(position);
        break;
      case 'evidence-reveal':
        this.playEvidenceCue(position);
        break;
    }
    return true;
  }

  /** Stops every source, disconnects every node, and closes the owned AudioContext. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.muted = true;
    this.statusValue = 'disposed';

    for (const source of this.activeOneShotSources) {
      try {
        source.stop();
      } catch {
        // The voice may already have reached its scheduled stop time.
      }
    }
    this.activeOneShotSources.clear();

    for (const node of this.activeOneShotNodes) node.disconnect();
    this.activeOneShotNodes.clear();

    if (this.graph) {
      for (const source of this.graph.continuousSources) {
        try {
          source.stop();
        } catch {
          // A closed context has already stopped its scheduled sources.
        }
      }
      for (const node of this.graph.nodes) node.disconnect();
    }

    const context = this.context;
    this.context = null;
    this.graph = null;
    if (this.ownsContext && context && context.state !== 'closed') void context.close();
  }

  private async performResume() {
    const graph = this.ensureGraph();
    const context = this.context;
    if (!graph || !context || this.disposed) return false;

    try {
      if (context.state !== 'running') await context.resume();
    } catch {
      this.statusValue = 'suspended';
      return false;
    }

    if (this.disposed || this.muted) return false;
    if (context.state !== 'running') {
      this.statusValue = 'suspended';
      return false;
    }

    this.statusValue = 'running';
    this.applyParameters(false);
    const now = context.currentTime;
    holdParameter(graph.master.gain, now);
    graph.master.gain.linearRampToValueAtTime(this.masterLevel, now + 0.45);
    return true;
  }

  private ensureGraph() {
    if (this.graph) return this.graph;
    const AudioContextClass = getAudioContextConstructor();
    if (!this.context && !AudioContextClass) {
      this.statusValue = 'silent';
      return null;
    }

    let context: AudioContext | null = this.context;
    try {
      context ??= new AudioContextClass!({ latencyHint: 'interactive' });
      const graph = this.buildGraph(context);
      this.context = context;
      this.graph = graph;
      this.applyParameters(true);
      return graph;
    } catch {
      if (this.ownsContext && context && context.state !== 'closed') void context.close();
      if (this.ownsContext) this.context = null;
      this.graph = null;
      this.statusValue = 'silent';
      return null;
    }
  }

  private buildGraph(context: AudioContext): SoundGraph {
    const nodes: AudioNode[] = [];
    const continuousSources: AudioScheduledSourceNode[] = [];
    const trackNode = <NodeType extends AudioNode>(node: NodeType) => {
      nodes.push(node);
      return node;
    };
    const trackSource = <SourceType extends AudioScheduledSourceNode>(source: SourceType) => {
      nodes.push(source);
      continuousSources.push(source);
      return source;
    };

    const master = trackNode(context.createGain());
    master.gain.value = 0;
    const limiter = trackNode(context.createDynamicsCompressor());
    limiter.threshold.value = -14;
    limiter.knee.value = 8;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.22;
    master.connect(limiter).connect(context.destination);

    const stems: Record<VerticalSliceStem, GainNode> = {
      citadel: trackNode(context.createGain()),
      threshold: trackNode(context.createGain()),
      nexus: trackNode(context.createGain()),
      evidence: trackNode(context.createGain()),
    };
    for (const stem of Object.values(stems)) {
      stem.gain.value = 0;
      stem.connect(master);
    }

    const cueBus = trackNode(context.createGain());
    cueBus.gain.value = 0.72;
    cueBus.connect(master);
    const cueSpace = trackNode(context.createConvolver());
    cueSpace.buffer = this.createStoneImpulse(context, 1.65);
    const cueSpaceLevel = trackNode(context.createGain());
    cueSpaceLevel.gain.value = 0.17;
    cueBus.connect(cueSpace).connect(cueSpaceLevel).connect(master);

    const noiseBuffers: Record<NoiseColor, AudioBuffer> = {
      wind: this.createNoiseBuffer(context, 4.7, 'wind'),
      mechanical: this.createNoiseBuffer(context, 3.4, 'mechanical'),
      digital: this.createNoiseBuffer(context, 2.3, 'digital'),
      air: this.createNoiseBuffer(context, 3.1, 'air'),
    };

    // Citadel: broad exterior air plus a low stone/room resonance.
    const citadelNoise = trackSource(context.createBufferSource());
    citadelNoise.buffer = noiseBuffers.wind;
    citadelNoise.loop = true;
    citadelNoise.playbackRate.value = 0.82;
    const citadelHighpass = trackNode(context.createBiquadFilter());
    citadelHighpass.type = 'highpass';
    citadelHighpass.frequency.value = 34;
    const citadelFilter = trackNode(context.createBiquadFilter());
    citadelFilter.type = 'lowpass';
    citadelFilter.frequency.value = 480;
    citadelFilter.Q.value = 0.58;
    const citadelPan = trackNode(context.createStereoPanner());
    citadelPan.pan.value = -0.14;
    const citadelNoiseLevel = trackNode(context.createGain());
    citadelNoiseLevel.gain.value = 0.76;
    citadelNoise
      .connect(citadelHighpass)
      .connect(citadelFilter)
      .connect(citadelPan)
      .connect(citadelNoiseLevel)
      .connect(stems.citadel);

    const citadelResonance = trackSource(context.createOscillator());
    citadelResonance.type = 'sine';
    citadelResonance.frequency.value = 55;
    citadelResonance.detune.value = -7;
    const citadelResonanceLevel = trackNode(context.createGain());
    citadelResonanceLevel.gain.value = 0.075;
    citadelResonance.connect(citadelResonanceLevel).connect(stems.citadel);

    // Threshold: filtered gate friction with slow, non-rhythmic mechanical breathing.
    const thresholdNoise = trackSource(context.createBufferSource());
    thresholdNoise.buffer = noiseBuffers.mechanical;
    thresholdNoise.loop = true;
    thresholdNoise.playbackRate.value = 0.61;
    const thresholdFilter = trackNode(context.createBiquadFilter());
    thresholdFilter.type = 'bandpass';
    thresholdFilter.frequency.value = 132;
    thresholdFilter.Q.value = 0.72;
    const thresholdNoiseLevel = trackNode(context.createGain());
    thresholdNoiseLevel.gain.value = 0.42;
    const thresholdBody = trackNode(context.createGain());
    thresholdBody.gain.value = 0.67;
    thresholdNoise
      .connect(thresholdFilter)
      .connect(thresholdNoiseLevel)
      .connect(thresholdBody);

    const thresholdRoot = trackSource(context.createOscillator());
    thresholdRoot.type = 'triangle';
    thresholdRoot.frequency.value = 43.65;
    const thresholdRootLevel = trackNode(context.createGain());
    thresholdRootLevel.gain.value = 0.13;
    thresholdRoot.connect(thresholdRootLevel).connect(thresholdBody);

    const thresholdPartial = trackSource(context.createOscillator());
    thresholdPartial.type = 'sine';
    thresholdPartial.frequency.value = 87.3;
    thresholdPartial.detune.value = 9;
    const thresholdPartialLevel = trackNode(context.createGain());
    thresholdPartialLevel.gain.value = 0.035;
    thresholdPartial.connect(thresholdPartialLevel).connect(thresholdBody);

    const thresholdPulse = trackSource(context.createOscillator());
    thresholdPulse.type = 'sine';
    thresholdPulse.frequency.value = 0.12;
    const thresholdPulseDepth = trackNode(context.createGain());
    thresholdPulseDepth.gain.value = 0.085;
    thresholdPulse.connect(thresholdPulseDepth).connect(thresholdBody.gain);
    thresholdBody.connect(stems.threshold);

    // Nexus: a spatial low drone with lens-dependent harmonics and data air.
    const nexusBody = trackNode(context.createGain());
    nexusBody.gain.value = 0.64;
    const nexusOscillatorTypes: OscillatorType[] = ['triangle', 'sine', 'sine'];
    const nexusOscillatorLevels: GainNode[] = [];
    const nexusOscillators = LENS_TUNING.raw.partials.map((ratio, index) => {
      const oscillator = trackSource(context.createOscillator());
      oscillator.type = nexusOscillatorTypes[index];
      oscillator.frequency.value = LENS_TUNING.raw.root * ratio;
      oscillator.detune.value = index === 1 ? 6 : index === 2 ? -8 : 0;
      const level = trackNode(context.createGain());
      level.gain.value = LENS_TUNING.raw.oscillatorLevels[index];
      oscillator.connect(level).connect(nexusBody);
      nexusOscillatorLevels.push(level);
      return oscillator;
    });

    const nexusNoise = trackSource(context.createBufferSource());
    nexusNoise.buffer = noiseBuffers.digital;
    nexusNoise.loop = true;
    nexusNoise.playbackRate.value = 0.73;
    const nexusNoiseFilter = trackNode(context.createBiquadFilter());
    nexusNoiseFilter.type = 'bandpass';
    nexusNoiseFilter.frequency.value = LENS_TUNING.raw.dataFrequency;
    nexusNoiseFilter.Q.value = 1.2;
    const nexusNoiseLevel = trackNode(context.createGain());
    nexusNoiseLevel.gain.value = LENS_TUNING.raw.dataLevel;
    nexusNoise.connect(nexusNoiseFilter).connect(nexusNoiseLevel).connect(nexusBody);

    const nexusPulse = trackSource(context.createOscillator());
    nexusPulse.type = 'sine';
    nexusPulse.frequency.value = LENS_TUNING.raw.pulseRate;
    const nexusPulseDepth = trackNode(context.createGain());
    nexusPulseDepth.gain.value = LENS_TUNING.raw.pulseDepth;
    nexusPulse.connect(nexusPulseDepth).connect(nexusBody.gain);

    const nexusFilter = trackNode(context.createBiquadFilter());
    nexusFilter.type = 'lowpass';
    nexusFilter.frequency.value = LENS_TUNING.raw.filterFrequency;
    nexusFilter.Q.value = 0.78;
    const nexusPanner = trackNode(context.createPanner());
    this.configurePanner(nexusPanner, { x: 0, y: 0.4, z: -2.7 });
    nexusPanner.refDistance = 1.6;
    nexusPanner.rolloffFactor = 0.52;
    nexusBody.connect(nexusFilter).connect(nexusPanner).connect(stems.nexus);

    // Evidence: deliberately sparse air and stable, paper-like sine partials.
    const evidenceBody = trackNode(context.createGain());
    evidenceBody.gain.value = 0.62;
    const evidenceNoise = trackSource(context.createBufferSource());
    evidenceNoise.buffer = noiseBuffers.air;
    evidenceNoise.loop = true;
    evidenceNoise.playbackRate.value = 0.89;
    const evidenceNoiseFilter = trackNode(context.createBiquadFilter());
    evidenceNoiseFilter.type = 'bandpass';
    evidenceNoiseFilter.frequency.value = 2450;
    evidenceNoiseFilter.Q.value = 0.46;
    const evidenceNoiseLevel = trackNode(context.createGain());
    evidenceNoiseLevel.gain.value = 0.037;
    evidenceNoise
      .connect(evidenceNoiseFilter)
      .connect(evidenceNoiseLevel)
      .connect(evidenceBody);

    const evidenceFrequencies = [196, 293.66];
    const evidenceOscillators = evidenceFrequencies.map((frequency, index) => {
      const oscillator = trackSource(context.createOscillator());
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 0 ? -4 : 5;
      const level = trackNode(context.createGain());
      level.gain.value = index === 0 ? 0.034 : 0.012;
      oscillator.connect(level).connect(evidenceBody);
      return oscillator;
    });
    const evidenceFilter = trackNode(context.createBiquadFilter());
    evidenceFilter.type = 'lowpass';
    evidenceFilter.frequency.value = 1650;
    evidenceFilter.Q.value = 0.42;
    evidenceBody.connect(evidenceFilter).connect(stems.evidence);

    for (const source of continuousSources) source.start();

    return {
      master,
      limiter,
      cueBus,
      stems,
      citadelFilter,
      citadelPan,
      thresholdFilter,
      thresholdPulse,
      thresholdPulseDepth,
      nexusFilter,
      nexusNoiseFilter,
      nexusNoiseLevel,
      nexusPanner,
      nexusPulse,
      nexusPulseDepth,
      nexusOscillators,
      nexusOscillatorLevels,
      evidenceFilter,
      evidenceNoiseFilter,
      evidenceOscillators,
      noiseBuffers,
      continuousSources,
      nodes,
    };
  }

  private applyParameters(immediate: boolean) {
    if (!this.context || !this.graph || this.context.state === 'closed') return;
    const { progress, velocity, lensMode } = this.parameters;
    const now = this.context.currentTime;
    const speed = this.reducedMotion ? 0 : Math.min(1, Math.abs(velocity));
    const movement = smoothstep(0.025, 0.9, speed);
    const tuning = LENS_TUNING[lensMode];

    // The four chapters form one score: mountain air recedes into the lock,
    // the lock releases into the corridor, and the corridor resolves on paper.
    const approach = smoothstep(0.015, 0.235, progress);
    const lockPressure = smoothstep(0.075, 0.225, progress)
      * (1 - smoothstep(0.3, 0.46, progress));
    const thresholdCrossing = smoothstep(0.22, 0.4, progress);
    const corridorArrival = smoothstep(0.225, 0.37, progress);
    const lensArrival = smoothstep(0.46, 0.62, progress);
    const proofArrival = smoothstep(0.7, 0.84, progress);

    const citadelWeight = mix(1, 0.14, smoothstep(0.18, 0.39, progress));
    const thresholdWeight = lockPressure;
    const nexusWeight = corridorArrival * mix(1, 0.54, proofArrival);
    const evidenceWeight = proofArrival;

    moveParameter(
      this.graph.stems.citadel.gain,
      citadelWeight * (0.078 + movement * 0.022) * this.stemLevels.citadel,
      now,
      0.16,
      immediate,
    );
    moveParameter(
      this.graph.stems.threshold.gain,
      thresholdWeight * (0.068 + movement * 0.019) * this.stemLevels.threshold,
      now,
      0.13,
      immediate,
    );
    moveParameter(
      this.graph.stems.nexus.gain,
      nexusWeight * (0.083 + movement * 0.018) * this.stemLevels.nexus,
      now,
      0.18,
      immediate,
    );
    moveParameter(
      this.graph.stems.evidence.gain,
      evidenceWeight * 0.044 * this.stemLevels.evidence,
      now,
      0.24,
      immediate,
    );

    moveParameter(
      this.graph.citadelFilter.frequency,
      350 + approach * 330 + movement * 620,
      now,
      0.14,
      immediate,
    );
    moveParameter(
      this.graph.citadelPan.pan,
      mix(-0.18, 0.025, approach) + Math.sin(progress * Math.PI * 2) * 0.035,
      now,
      0.22,
      immediate,
    );
    moveParameter(
      this.graph.thresholdFilter.frequency,
      108 + lockPressure * 155 + thresholdCrossing * 54 + movement * 190,
      now,
      0.12,
      immediate,
    );
    moveParameter(
      this.graph.thresholdPulse.frequency,
      0.072 + lockPressure * 0.105,
      now,
      0.2,
      immediate,
    );
    moveParameter(
      this.graph.thresholdPulseDepth.gain,
      0.026 + lockPressure * 0.068,
      now,
      0.16,
      immediate,
    );

    moveParameter(
      this.graph.nexusFilter.frequency,
      tuning.filterFrequency + lensArrival * 120 + movement * 300,
      now,
      0.17,
      immediate,
    );
    moveParameter(
      this.graph.nexusPulse.frequency,
      tuning.pulseRate,
      now,
      0.22,
      immediate,
    );
    const nexusOscillatorLevels = this.graph.nexusOscillatorLevels;
    this.graph.nexusOscillators.forEach((oscillator, index) => {
      moveParameter(
        oscillator.frequency,
        tuning.root * tuning.partials[index],
        now,
        0.2,
        immediate,
      );
      moveParameter(
        nexusOscillatorLevels[index].gain,
        tuning.oscillatorLevels[index] * mix(0.88, 1, lensArrival),
        now,
        0.18,
        immediate,
      );
    });
    moveParameter(
      this.graph.nexusNoiseFilter.frequency,
      tuning.dataFrequency + movement * 420,
      now,
      0.13,
      immediate,
    );
    moveParameter(
      this.graph.nexusNoiseLevel.gain,
      tuning.dataLevel * (0.72 + lensArrival * 0.28 + movement * 0.1),
      now,
      0.15,
      immediate,
    );
    moveParameter(
      this.graph.nexusPulseDepth.gain,
      tuning.pulseDepth * (0.72 + corridorArrival * 0.28),
      now,
      0.18,
      immediate,
    );

    const nexusTravel = clamp01((progress - 0.22) / 0.6);
    moveParameter(
      this.graph.nexusPanner.positionX,
      mix(-1.3, 0.9, nexusTravel) + Math.sin(nexusTravel * Math.PI) * 0.28,
      now,
      0.15,
      immediate,
    );
    moveParameter(
      this.graph.nexusPanner.positionY,
      0.28 + Math.sin(nexusTravel * Math.PI) * 0.34,
      now,
      0.18,
      immediate,
    );
    moveParameter(
      this.graph.nexusPanner.positionZ,
      mix(-3.35, -1.75, nexusTravel),
      now,
      0.18,
      immediate,
    );

    moveParameter(
      this.graph.evidenceFilter.frequency,
      1450 + evidenceWeight * 520 + (tuning.evidenceRatio - 1) * 480,
      now,
      0.26,
      immediate,
    );
    moveParameter(
      this.graph.evidenceNoiseFilter.frequency,
      2180 + evidenceWeight * 420 + (tuning.evidenceRatio - 1) * 980,
      now,
      0.24,
      immediate,
    );
    const evidenceFrequencies = [196, 293.66];
    this.graph.evidenceOscillators.forEach((oscillator, index) => {
      moveParameter(
        oscillator.frequency,
        evidenceFrequencies[index] * tuning.evidenceRatio,
        now,
        0.3,
        immediate,
      );
    });
  }

  private createStoneImpulse(context: AudioContext, seconds: number) {
    const length = Math.max(2, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(2, length, context.sampleRate);

    for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
      const channel = buffer.getChannelData(channelIndex);
      let seed = (NOISE_SEEDS.mechanical ^ (channelIndex * 0x45d9f3b)) >>> 0;
      let low = 0;
      for (let index = 0; index < length; index += 1) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const white = (seed / 0xffffffff) * 2 - 1;
        low = low * 0.86 + white * 0.14;
        const air = white - low;
        const remaining = 1 - index / (length - 1);
        channel[index] = air * Math.pow(remaining, 2.75) * 0.34;
      }

      const reflectionTimes = [0.041, 0.073, 0.127, 0.211];
      const reflectionLevels = [0.48, -0.31, 0.2, -0.12];
      reflectionTimes.forEach((time, index) => {
        const sample = Math.min(length - 1, Math.floor(time * context.sampleRate));
        const stereoTrim = channelIndex === 0 ? 1 : 0.88 + index * 0.025;
        channel[sample] = clamp(channel[sample] + reflectionLevels[index] * stereoTrim, -1, 1);
      });
    }

    return buffer;
  }

  private createNoiseBuffer(context: AudioContext, seconds: number, color: NoiseColor) {
    const length = Math.max(2, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let seed = NOISE_SEEDS[color];
    let low = 0;
    let mid = 0;

    for (let index = 0; index < length; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const white = (seed / 0xffffffff) * 2 - 1;
      let sample = white;

      switch (color) {
        case 'wind':
          low = low * 0.985 + white * 0.015;
          sample = low * 3.1;
          break;
        case 'mechanical':
          low = low * 0.94 + white * 0.06;
          mid = mid * 0.68 + white * 0.32;
          sample = low * 1.55 + mid * 0.28;
          break;
        case 'digital':
          low = low * 0.42 + white * 0.58;
          sample = white * 0.42 + low * 0.45;
          break;
        case 'air':
          low = low * 0.78 + white * 0.22;
          sample = (white - low) * 0.58;
          break;
      }

      channel[index] = clamp(sample, -1, 1);
    }

    // Remove the endpoint discontinuity so looping beds do not click.
    const startValue = channel[0];
    const endpointDelta = channel[length - 1] - startValue;
    for (let index = 1; index < length; index += 1) {
      channel[index] = clamp(
        channel[index] - endpointDelta * (index / (length - 1)),
        -1,
        1,
      );
    }

    return buffer;
  }

  private playThresholdCue(position: VerticalSliceSoundPosition) {
    const context = this.context!;
    const graph = this.graph!;
    const now = context.currentTime + 0.012;
    const releaseTime = now + 0.76;
    const end = now + 1.92;
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.086, now + 0.025);
    voice.gain.setValueAtTime(0.082, releaseTime + 0.38);
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, position);
    voice.connect(panner).connect(graph.cueBus);

    const low = context.createOscillator();
    low.type = 'triangle';
    low.frequency.setValueAtTime(55, now);
    low.frequency.exponentialRampToValueAtTime(49, releaseTime);
    low.frequency.exponentialRampToValueAtTime(36.71, end);
    const lowLevel = context.createGain();
    lowLevel.gain.setValueAtTime(MIN_GAIN, now);
    lowLevel.gain.setValueAtTime(MIN_GAIN, releaseTime - 0.018);
    lowLevel.gain.exponentialRampToValueAtTime(0.72, releaseTime + 0.055);
    lowLevel.gain.exponentialRampToValueAtTime(0.46, releaseTime + 0.34);
    lowLevel.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    low.connect(lowLevel).connect(voice);

    const metal = context.createOscillator();
    metal.type = 'triangle';
    metal.frequency.setValueAtTime(LOCK_SEQUENCE_FREQUENCIES[0], now);
    const metalLevel = context.createGain();
    metalLevel.gain.setValueAtTime(MIN_GAIN, now);
    LOCK_SEQUENCE_TIMES.forEach((offset, index) => {
      const strike = now + offset;
      metal.frequency.setValueAtTime(LOCK_SEQUENCE_FREQUENCIES[index], strike);
      metalLevel.gain.setValueAtTime(MIN_GAIN, strike);
      metalLevel.gain.linearRampToValueAtTime(0.44 + index * 0.035, strike + 0.008);
      metalLevel.gain.exponentialRampToValueAtTime(MIN_GAIN, strike + 0.064);
      panner.positionX.setValueAtTime(
        clamp(position.x + mix(-1.25, 1.25, index / (LOCK_SEQUENCE_TIMES.length - 1)), -8, 8),
        strike,
      );
    });
    panner.positionX.linearRampToValueAtTime(clamp(position.x, -8, 8), releaseTime + 0.22);
    metal.connect(metalLevel).connect(voice);

    const friction = context.createBufferSource();
    friction.buffer = graph.noiseBuffers.mechanical;
    friction.playbackRate.value = 0.66;
    const frictionFilter = context.createBiquadFilter();
    frictionFilter.type = 'lowpass';
    frictionFilter.frequency.setValueAtTime(170, now);
    frictionFilter.frequency.setValueAtTime(210, releaseTime - 0.02);
    frictionFilter.frequency.exponentialRampToValueAtTime(720, releaseTime + 0.24);
    frictionFilter.frequency.exponentialRampToValueAtTime(190, end);
    const frictionLevel = context.createGain();
    frictionLevel.gain.setValueAtTime(MIN_GAIN, now);
    frictionLevel.gain.setValueAtTime(MIN_GAIN, releaseTime - 0.028);
    frictionLevel.gain.exponentialRampToValueAtTime(0.43, releaseTime + 0.13);
    frictionLevel.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    friction.connect(frictionFilter).connect(frictionLevel).connect(voice);

    const sources: AudioScheduledSourceNode[] = [low, metal, friction];
    const nodes: AudioNode[] = [
      voice,
      panner,
      low,
      lowLevel,
      metal,
      metalLevel,
      friction,
      frictionFilter,
      frictionLevel,
    ];
    this.registerOneShot(sources, nodes);
    low.start(now);
    metal.start(now);
    friction.start(now, 0.42);
    for (const source of sources) source.stop(end);
  }

  private playLensCue(position: VerticalSliceSoundPosition) {
    const context = this.context!;
    const graph = this.graph!;
    const tuning = LENS_TUNING[this.parameters.lensMode];
    const now = context.currentTime + 0.008;
    const end = now + tuning.cueDuration;
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.058, now + 0.012);
    voice.gain.setValueAtTime(0.052, Math.max(now + 0.02, end - 0.15));
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, position);
    panner.positionX.linearRampToValueAtTime(position.x * 0.28, end);
    voice.connect(panner).connect(graph.cueBus);

    const root = context.createOscillator();
    root.type = 'sine';
    root.frequency.setValueAtTime(tuning.root * tuning.cueNotes[0], now);
    const rootLevel = context.createGain();
    rootLevel.gain.setValueAtTime(MIN_GAIN, now);
    const noteSpacing = tuning.cueDuration * 0.225;
    tuning.cueNotes.forEach((ratio, index) => {
      const onset = now + index * noteSpacing;
      root.frequency.setValueAtTime(tuning.root * ratio, onset);
      rootLevel.gain.setValueAtTime(MIN_GAIN, onset);
      rootLevel.gain.linearRampToValueAtTime(0.72 - index * 0.11, onset + 0.008);
      rootLevel.gain.exponentialRampToValueAtTime(MIN_GAIN, onset + noteSpacing * 0.78);
    });
    root.connect(rootLevel).connect(voice);

    const partial = context.createOscillator();
    partial.type = 'triangle';
    partial.frequency.value = tuning.root * tuning.cueNotes[2] * 1.5;
    const partialLevel = context.createGain();
    partialLevel.gain.setValueAtTime(MIN_GAIN, now);
    const finalOnset = now + noteSpacing * 2;
    partialLevel.gain.setValueAtTime(MIN_GAIN, finalOnset);
    partialLevel.gain.linearRampToValueAtTime(0.15, finalOnset + 0.006);
    partialLevel.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    partial.connect(partialLevel).connect(voice);

    const scan = context.createBufferSource();
    scan.buffer = graph.noiseBuffers.digital;
    const scanFilter = context.createBiquadFilter();
    scanFilter.type = 'bandpass';
    scanFilter.frequency.setValueAtTime(tuning.cueScanFrequency * 0.7, now);
    scanFilter.frequency.exponentialRampToValueAtTime(tuning.cueScanFrequency * 1.18, end);
    scanFilter.Q.value = this.parameters.lensMode === 'detection' ? 4.1 : 2.7;
    const scanLevel = context.createGain();
    scanLevel.gain.setValueAtTime(MIN_GAIN, now);
    scanLevel.gain.exponentialRampToValueAtTime(0.12, now + 0.018);
    scanLevel.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    scan.connect(scanFilter).connect(scanLevel).connect(voice);

    const sources: AudioScheduledSourceNode[] = [root, partial, scan];
    const nodes: AudioNode[] = [
      voice,
      panner,
      root,
      rootLevel,
      partial,
      partialLevel,
      scan,
      scanFilter,
      scanLevel,
    ];
    this.registerOneShot(sources, nodes);
    for (const source of sources) source.start(now);
    for (const source of sources) source.stop(end);
  }

  private playEvidenceCue(position: VerticalSliceSoundPosition) {
    const context = this.context!;
    const graph = this.graph!;
    const tuning = LENS_TUNING[this.parameters.lensMode];
    const now = context.currentTime + 0.012;
    const end = now + 1.36;
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.048, now + 0.025);
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, position);
    panner.positionZ.linearRampToValueAtTime(Math.min(-0.72, position.z + 0.42), end);
    voice.connect(panner).connect(graph.cueBus);

    const frequencies = [196, 293.66, 392].map((frequency) => frequency * tuning.evidenceRatio);
    const levels = [0.7, 0.26, 0.11];
    const onsets = [0, 0.13, 0.29];
    const oscillators = frequencies.map((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      const onset = now + onsets[index];
      oscillator.frequency.setValueAtTime(frequency, onset);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.996, end);
      const level = context.createGain();
      level.gain.setValueAtTime(MIN_GAIN, onset);
      level.gain.exponentialRampToValueAtTime(levels[index], onset + 0.024);
      level.gain.exponentialRampToValueAtTime(MIN_GAIN, Math.min(end, onset + 0.78));
      oscillator.connect(level).connect(voice);
      return { oscillator, level, onset };
    });

    const sources: AudioScheduledSourceNode[] = oscillators.map(({ oscillator }) => oscillator);
    const nodes: AudioNode[] = [
      voice,
      panner,
      ...oscillators.flatMap(({ oscillator, level }) => [oscillator, level]),
    ];
    this.registerOneShot(sources, nodes);
    for (const { oscillator, onset } of oscillators) {
      oscillator.start(onset);
      oscillator.stop(end);
    }
  }

  private configurePanner(panner: PannerNode, position: VerticalSliceSoundPosition) {
    const x = clamp(finiteOr(position.x, 0), -8, 8);
    const y = clamp(finiteOr(position.y, 0), -4, 4);
    const z = clamp(finiteOr(position.z, -1), -12, 4);
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.2;
    panner.maxDistance = 14;
    panner.rolloffFactor = 0.72;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;
  }

  private registerOneShot(sources: AudioScheduledSourceNode[], nodes: AudioNode[]) {
    let remainingSources = sources.length;
    for (const node of nodes) this.activeOneShotNodes.add(node);

    const releaseNodes = () => {
      remainingSources -= 1;
      if (remainingSources > 0) return;
      for (const node of nodes) {
        node.disconnect();
        this.activeOneShotNodes.delete(node);
      }
    };

    for (const source of sources) {
      this.activeOneShotSources.add(source);
      source.addEventListener('ended', () => {
        this.activeOneShotSources.delete(source);
        releaseNodes();
      }, { once: true });
    }
  }
}
