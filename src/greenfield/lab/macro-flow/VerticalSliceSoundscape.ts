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
  evidenceRatio: number;
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
  nexusFilter: BiquadFilterNode;
  nexusPanner: PannerNode;
  nexusPulse: OscillatorNode;
  nexusOscillators: OscillatorNode[];
  evidenceFilter: BiquadFilterNode;
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
  'threshold-open': { x: -1.4, y: 0.1, z: -2.8 },
  'lens-lock': { x: 0.9, y: 0.35, z: -1.7 },
  'evidence-reveal': { x: 0, y: 0.2, z: -1.3 },
};

const LENS_TUNING: Record<VerticalSliceLensMode, LensTuning> = {
  raw: {
    root: 49,
    filterFrequency: 480,
    pulseRate: 0.11,
    evidenceRatio: 1,
  },
  segmentation: {
    root: 55,
    filterFrequency: 760,
    pulseRate: 0.17,
    evidenceRatio: 1.125,
  },
  detection: {
    root: 61.74,
    filterFrequency: 1040,
    pulseRate: 0.24,
    evidenceRatio: 1.25,
  },
};

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
    cueBus.gain.value = 0.78;
    cueBus.connect(master);

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
    const nexusOscillatorLevels = [0.12, 0.047, 0.026];
    const nexusOscillatorTypes: OscillatorType[] = ['triangle', 'sine', 'sine'];
    const nexusRatios = [1, 1.5, 2.01];
    const nexusOscillators = nexusRatios.map((ratio, index) => {
      const oscillator = trackSource(context.createOscillator());
      oscillator.type = nexusOscillatorTypes[index];
      oscillator.frequency.value = LENS_TUNING.raw.root * ratio;
      oscillator.detune.value = index === 1 ? 6 : index === 2 ? -8 : 0;
      const level = trackNode(context.createGain());
      level.gain.value = nexusOscillatorLevels[index];
      oscillator.connect(level).connect(nexusBody);
      return oscillator;
    });

    const nexusNoise = trackSource(context.createBufferSource());
    nexusNoise.buffer = noiseBuffers.digital;
    nexusNoise.loop = true;
    nexusNoise.playbackRate.value = 0.73;
    const nexusNoiseFilter = trackNode(context.createBiquadFilter());
    nexusNoiseFilter.type = 'bandpass';
    nexusNoiseFilter.frequency.value = 1180;
    nexusNoiseFilter.Q.value = 1.2;
    const nexusNoiseLevel = trackNode(context.createGain());
    nexusNoiseLevel.gain.value = 0.045;
    nexusNoise.connect(nexusNoiseFilter).connect(nexusNoiseLevel).connect(nexusBody);

    const nexusPulse = trackSource(context.createOscillator());
    nexusPulse.type = 'sine';
    nexusPulse.frequency.value = LENS_TUNING.raw.pulseRate;
    const nexusPulseDepth = trackNode(context.createGain());
    nexusPulseDepth.gain.value = 0.055;
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
      nexusFilter,
      nexusPanner,
      nexusPulse,
      nexusOscillators,
      evidenceFilter,
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

    const citadelWeight = mix(1, 0.16, smoothstep(0.12, 0.43, progress));
    const thresholdWeight = smoothstep(0.015, 0.1, progress)
      * (1 - smoothstep(0.24, 0.37, progress));
    const nexusWeight = smoothstep(0.2, 0.34, progress)
      * mix(1, 0.35, smoothstep(0.78, 0.93, progress));
    const evidenceWeight = smoothstep(0.7, 0.83, progress);

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
      420 + progress * 290 + movement * 720,
      now,
      0.14,
      immediate,
    );
    moveParameter(
      this.graph.citadelPan.pan,
      -0.14 + Math.sin(progress * Math.PI * 2) * 0.09,
      now,
      0.22,
      immediate,
    );
    moveParameter(
      this.graph.thresholdFilter.frequency,
      105 + thresholdWeight * 95 + movement * 230,
      now,
      0.12,
      immediate,
    );
    moveParameter(
      this.graph.thresholdPulse.frequency,
      0.085 + thresholdWeight * 0.08,
      now,
      0.2,
      immediate,
    );

    moveParameter(
      this.graph.nexusFilter.frequency,
      tuning.filterFrequency + movement * 340,
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
    const nexusRatios = [1, 1.5, 2.01];
    this.graph.nexusOscillators.forEach((oscillator, index) => {
      moveParameter(
        oscillator.frequency,
        tuning.root * nexusRatios[index],
        now,
        0.24,
        immediate,
      );
    });

    const nexusTravel = clamp01((progress - 0.2) / 0.62);
    moveParameter(
      this.graph.nexusPanner.positionX,
      Math.sin(nexusTravel * Math.PI * 1.65) * 1.8,
      now,
      0.15,
      immediate,
    );
    moveParameter(
      this.graph.nexusPanner.positionY,
      0.35 + Math.sin(nexusTravel * Math.PI) * 0.55,
      now,
      0.18,
      immediate,
    );
    moveParameter(
      this.graph.nexusPanner.positionZ,
      -2.8 + Math.cos(nexusTravel * Math.PI) * 0.85,
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
    const end = now + 1.45;
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.105, now + 0.035);
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, position);
    voice.connect(panner).connect(graph.cueBus);

    const low = context.createOscillator();
    low.type = 'triangle';
    low.frequency.setValueAtTime(51, now);
    low.frequency.exponentialRampToValueAtTime(38, end);
    const lowLevel = context.createGain();
    lowLevel.gain.value = 0.58;
    low.connect(lowLevel).connect(voice);

    const metal = context.createOscillator();
    metal.type = 'sine';
    metal.frequency.setValueAtTime(196, now);
    metal.frequency.exponentialRampToValueAtTime(146.83, end);
    const metalLevel = context.createGain();
    metalLevel.gain.value = 0.095;
    metal.connect(metalLevel).connect(voice);

    const friction = context.createBufferSource();
    friction.buffer = graph.noiseBuffers.mechanical;
    friction.playbackRate.value = 0.72;
    const frictionFilter = context.createBiquadFilter();
    frictionFilter.type = 'lowpass';
    frictionFilter.frequency.value = 310;
    const frictionLevel = context.createGain();
    frictionLevel.gain.value = 0.34;
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
    friction.start(now, 0.38);
    for (const source of sources) source.stop(end);
  }

  private playLensCue(position: VerticalSliceSoundPosition) {
    const context = this.context!;
    const graph = this.graph!;
    const tuning = LENS_TUNING[this.parameters.lensMode];
    const now = context.currentTime + 0.008;
    const end = now + 0.58;
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.064, now + 0.012);
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, position);
    voice.connect(panner).connect(graph.cueBus);

    const root = context.createOscillator();
    root.type = 'sine';
    root.frequency.setValueAtTime(tuning.root * 8, now);
    root.frequency.exponentialRampToValueAtTime(tuning.root * 10, now + 0.16);
    const rootLevel = context.createGain();
    rootLevel.gain.value = 0.75;
    root.connect(rootLevel).connect(voice);

    const partial = context.createOscillator();
    partial.type = 'triangle';
    partial.frequency.value = tuning.root * 12;
    const partialLevel = context.createGain();
    partialLevel.gain.value = 0.16;
    partial.connect(partialLevel).connect(voice);

    const scan = context.createBufferSource();
    scan.buffer = graph.noiseBuffers.digital;
    const scanFilter = context.createBiquadFilter();
    scanFilter.type = 'bandpass';
    scanFilter.frequency.value = tuning.filterFrequency * 2.2;
    scanFilter.Q.value = 2.8;
    const scanLevel = context.createGain();
    scanLevel.gain.value = 0.12;
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
    const end = now + 1.55;
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.052, now + 0.025);
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, position);
    voice.connect(panner).connect(graph.cueBus);

    const frequencies = [196, 293.66, 440].map((frequency) => frequency * tuning.evidenceRatio);
    const levels = [0.68, 0.22, 0.08];
    const oscillators = frequencies.map((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.996, end);
      const level = context.createGain();
      level.gain.value = levels[index];
      oscillator.connect(level).connect(voice);
      return { oscillator, level };
    });

    const sources: AudioScheduledSourceNode[] = oscillators.map(({ oscillator }) => oscillator);
    const nodes: AudioNode[] = [
      voice,
      panner,
      ...oscillators.flatMap(({ oscillator, level }) => [oscillator, level]),
    ];
    this.registerOneShot(sources, nodes);
    for (const source of sources) {
      source.start(now);
      source.stop(end);
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
