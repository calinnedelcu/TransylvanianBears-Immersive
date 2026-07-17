export type BuriedLampFocus = 'oil' | 'mechanism' | 'mercury';

export type BuriedLampInput = {
  /** Normalized horizontal lamp target. Values outside -1 to 1 are clamped. */
  x: number;
  /** Normalized vertical lamp target. Values outside -1 to 1 are clamped. */
  y: number;
  active: boolean;
  focus: BuriedLampFocus;
};

export type BuriedActSoundCue =
  | 'lamp-focus'
  | 'mechanism-wake'
  | 'evidence-reveal'
  | 'pixel-compress';

export type BuriedActSoundscapeStatus =
  | 'idle'
  | 'running'
  | 'muted'
  | 'suspended'
  | 'silent'
  | 'disposed';

export type BuriedActSoundParameters = {
  /** Normalized progress over chapters 08-10. Values outside 0-1 are clamped. */
  progress: number;
  /** Signed normalized scroll velocity. Values outside -1.25 to 1.25 are clamped. */
  velocity: number;
  lamp: BuriedLampInput;
};

export type BuriedActSoundUpdate = Partial<Omit<BuriedActSoundParameters, 'lamp'>> & {
  lamp?: Partial<BuriedLampInput>;
};

export type BuriedActSoundPosition = Readonly<{
  /** Metres to the listener's right. */
  x: number;
  /** Metres above the listener. */
  y: number;
  /** Metres behind the listener; negative values are in front. */
  z: number;
}>;

export type BuriedActSoundscapeOptions = {
  /** Shared context owned and closed by the experience orchestrator. */
  audioContext?: AudioContext | null;
  /** Removes velocity modulation, spatial drift, and secondary cue sequences. */
  reducedMotion?: boolean;
  /** Output trim after the authored mix. Defaults to 0.42. */
  masterLevel?: number;
};

type NoiseProfile = 'stone' | 'air' | 'mechanical' | 'digital' | 'transient';

type FocusTuning = Readonly<{
  lampFilter: number;
  lampRoot: number;
  cueRoot: number;
  fallbackX: number;
}>;

type SoundGraph = {
  master: GainNode;
  limiter: DynamicsCompressorNode;
  cueBus: GainNode;
  stoneGain: GainNode;
  stoneFilter: BiquadFilterNode;
  stonePan: StereoPannerNode;
  lampGain: GainNode;
  lampFilter: BiquadFilterNode;
  lampTone: OscillatorNode;
  lampPanner: PannerNode;
  mechanismGain: GainNode;
  mechanismFilter: BiquadFilterNode;
  mechanismRoot: OscillatorNode;
  mechanismPulseDepth: GainNode;
  mercuryGain: GainNode;
  mercuryFilter: BiquadFilterNode;
  mercuryPanner: PannerNode;
  evidenceGain: GainNode;
  evidenceFilter: BiquadFilterNode;
  evidencePan: StereoPannerNode;
  pixelGain: GainNode;
  pixelFilter: BiquadFilterNode;
  pixelOscillator: OscillatorNode;
  noiseBuffers: Record<NoiseProfile, AudioBuffer>;
  continuousSources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
};

const MIN_GAIN = 0.0001;
const MUTE_FADE_SECONDS = 0.09;
const GRAPH_RELEASE_DELAY_MS = MUTE_FADE_SECONDS * 1000 + 20;

const NOISE_SEEDS: Record<NoiseProfile, number> = {
  stone: 0x451d2e89,
  air: 0x19b76c43,
  mechanical: 0x6e2a0f15,
  digital: 0x2f93c8d1,
  transient: 0x73a41be7,
};

const FOCUS_TUNING: Record<BuriedLampFocus, FocusTuning> = {
  oil: {
    lampFilter: 980,
    lampRoot: 82.41,
    cueRoot: 246.94,
    fallbackX: -0.82,
  },
  mechanism: {
    lampFilter: 1380,
    lampRoot: 92.5,
    cueRoot: 196,
    fallbackX: 0.12,
  },
  mercury: {
    lampFilter: 2240,
    lampRoot: 110,
    cueRoot: 329.63,
    fallbackX: 0.84,
  },
};

const STATIC_CUE_POSITIONS: Record<
  Exclude<BuriedActSoundCue, 'lamp-focus'>,
  BuriedActSoundPosition
> = {
  'mechanism-wake': { x: 0.58, y: 0.62, z: -2.15 },
  'evidence-reveal': { x: -0.18, y: 0.18, z: -1.75 },
  'pixel-compress': { x: 0, y: 0.08, z: -1.2 },
};

const FOCUS_NOISE_OFFSETS: Record<BuriedLampFocus, number> = {
  oil: 0.18,
  mechanism: 0.76,
  mercury: 1.31,
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
  if (start === end) return value < start ? 0 : 1;
  const normalized = clamp01((value - start) / (end - start));
  return normalized * normalized * (3 - 2 * normalized);
}

function isLampFocus(value: unknown): value is BuriedLampFocus {
  return value === 'oil' || value === 'mechanism' || value === 'mercury';
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

function safeDisconnect(node: AudioNode) {
  try {
    node.disconnect();
  } catch {
    // A completed voice or closed shared context may already have detached it.
  }
}

/**
 * Procedural, opt-in Web Audio controller for the linear 08-10 buried passage.
 * It never creates or closes an AudioContext; call resume() from a user gesture.
 */
export class BuriedActSoundscape {
  private readonly context: AudioContext | null;
  private graph: SoundGraph | null = null;
  private statusValue: BuriedActSoundscapeStatus;
  private readonly activeOneShotSources = new Set<AudioScheduledSourceNode>();
  private readonly activeOneShotNodes = new Set<AudioNode>();
  private parameters: BuriedActSoundParameters = {
    progress: 0,
    velocity: 0,
    lamp: {
      x: 0,
      y: 0,
      active: false,
      focus: 'oil',
    },
  };
  private readonly masterLevel: number;
  private reducedMotion: boolean;
  private muted = true;
  private resumeOperation: Promise<boolean> | null = null;
  private graphReleaseTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(options: BuriedActSoundscapeOptions = {}) {
    this.context = options.audioContext ?? null;
    this.statusValue = this.context && this.context.state !== 'closed' ? 'idle' : 'silent';
    this.reducedMotion = options.reducedMotion ?? false;
    this.masterLevel = clamp(finiteOr(options.masterLevel ?? 0.42, 0.42), 0, 1);
  }

  get status(): BuriedActSoundscapeStatus {
    if (this.disposed) return 'disposed';
    if (this.context?.state === 'closed') return 'silent';
    if (this.statusValue === 'running' && this.context?.state === 'suspended') {
      return 'suspended';
    }
    return this.statusValue;
  }

  get isSupported() {
    return !this.disposed && this.context !== null && this.context.state !== 'closed';
  }

  /** Resumes the shared context, builds the graph lazily, and fades the mix in. */
  resume(): Promise<boolean> {
    if (!this.isSupported) return Promise.resolve(false);

    this.muted = false;
    this.cancelGraphRelease();
    if (this.resumeOperation) return this.resumeOperation;

    const operation = this.performResume();
    this.resumeOperation = operation;
    void operation.finally(() => {
      if (this.resumeOperation === operation) this.resumeOperation = null;
    });
    return operation;
  }

  /** Fades this controller out, then releases its graph without touching the shared context. */
  mute() {
    if (this.disposed) return;
    this.muted = true;
    this.statusValue = this.context?.state === 'closed' || !this.context ? 'silent' : 'muted';

    if (!this.context || !this.graph) return;
    if (this.context.state === 'closed') {
      this.releaseGraph(this.graph);
      return;
    }

    const graph = this.graph;
    const now = this.context.currentTime;
    holdParameter(graph.master.gain, now);
    graph.master.gain.linearRampToValueAtTime(0, now + MUTE_FADE_SECONDS);
    this.scheduleGraphRelease(graph);
  }

  /** Stores normalized adaptive inputs without creating or resuming an audio graph. */
  update(parameters: BuriedActSoundUpdate) {
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

    const lamp = parameters.lamp;
    if (lamp) {
      if (lamp.x !== undefined) {
        this.parameters.lamp.x = clamp(finiteOr(lamp.x, this.parameters.lamp.x), -1, 1);
      }
      if (lamp.y !== undefined) {
        this.parameters.lamp.y = clamp(finiteOr(lamp.y, this.parameters.lamp.y), -1, 1);
      }
      if (typeof lamp.active === 'boolean') this.parameters.lamp.active = lamp.active;
      if (isLampFocus(lamp.focus)) this.parameters.lamp.focus = lamp.focus;
    }

    this.applyParameters(false);
  }

  /** Convenience update for pointer, touch, keyboard, and fallback lamp directors. */
  updateLamp(lamp: Partial<BuriedLampInput>) {
    this.update({ lamp });
  }

  setReducedMotion(reducedMotion: boolean) {
    if (this.disposed || this.reducedMotion === reducedMotion) return;
    this.reducedMotion = reducedMotion;
    this.applyParameters(false);
  }

  /**
   * Plays an authored procedural cue without unlocking audio implicitly.
   * Returns false while muted, suspended, unsupported, or disposed.
   */
  trigger(cue: BuriedActSoundCue, position?: BuriedActSoundPosition) {
    if (!this.canPlayCue()) return false;

    const cuePosition = position ?? this.getDefaultCuePosition(cue);
    switch (cue) {
      case 'lamp-focus':
        this.playLampFocus(cuePosition);
        break;
      case 'mechanism-wake':
        this.playMechanismWake(cuePosition);
        break;
      case 'evidence-reveal':
        this.playEvidenceReveal(cuePosition);
        break;
      case 'pixel-compress':
        this.playPixelCompress(cuePosition);
        break;
    }
    return true;
  }

  /** Stops and disconnects this graph without closing the externally owned context. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.muted = true;
    this.statusValue = 'disposed';
    this.cancelGraphRelease();

    for (const source of this.activeOneShotSources) {
      try {
        source.stop();
      } catch {
        // The voice may already have reached its scheduled stop time.
      }
    }
    this.activeOneShotSources.clear();

    for (const node of this.activeOneShotNodes) safeDisconnect(node);
    this.activeOneShotNodes.clear();

    this.releaseGraph();
  }

  private async performResume() {
    const context = this.context;
    if (!context || context.state === 'closed' || this.disposed) return false;

    try {
      if (context.state !== 'running') await context.resume();
    } catch {
      if (!this.disposed) this.statusValue = 'suspended';
      return false;
    }

    if (this.disposed) return false;
    if (this.muted || context.state !== 'running') {
      this.statusValue = context.state === 'running' ? 'muted' : 'suspended';
      return false;
    }

    const graph = this.ensureGraph();
    if (!graph) return false;

    this.statusValue = 'running';
    this.applyParameters(true);
    const now = context.currentTime;
    holdParameter(graph.master.gain, now);
    graph.master.gain.setValueAtTime(0, now);
    graph.master.gain.linearRampToValueAtTime(this.masterLevel, now + 0.5);
    return true;
  }

  private ensureGraph() {
    if (this.graph) return this.graph;
    const context = this.context;
    if (!context || context.state === 'closed') {
      this.statusValue = 'silent';
      return null;
    }

    try {
      const graph = this.buildGraph(context);
      this.graph = graph;
      return graph;
    } catch {
      this.graph = null;
      this.statusValue = 'silent';
      return null;
    }
  }

  private scheduleGraphRelease(graph: SoundGraph) {
    this.cancelGraphRelease();
    this.graphReleaseTimer = setTimeout(() => {
      this.graphReleaseTimer = null;
      if (this.muted && !this.disposed) this.releaseGraph(graph);
    }, GRAPH_RELEASE_DELAY_MS);
  }

  private cancelGraphRelease() {
    if (this.graphReleaseTimer === null) return;
    clearTimeout(this.graphReleaseTimer);
    this.graphReleaseTimer = null;
  }

  private releaseGraph(graph: SoundGraph | null = this.graph) {
    if (!graph || this.graph !== graph) return;

    for (const source of graph.continuousSources) {
      try {
        source.stop();
      } catch {
        // A completed source or closed shared context has already stopped it.
      }
    }
    for (const node of graph.nodes) safeDisconnect(node);
    this.graph = null;
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
    limiter.threshold.value = -18;
    limiter.knee.value = 7;
    limiter.ratio.value = 7;
    limiter.attack.value = 0.005;
    limiter.release.value = 0.24;
    master.connect(limiter).connect(context.destination);

    const cueBus = trackNode(context.createGain());
    cueBus.gain.value = 0.55;
    cueBus.connect(master);

    const noiseBuffers: Record<NoiseProfile, AudioBuffer> = {
      stone: this.createNoiseBuffer(context, 4.7, 'stone'),
      air: this.createNoiseBuffer(context, 3.7, 'air'),
      mechanical: this.createNoiseBuffer(context, 3.3, 'mechanical'),
      digital: this.createNoiseBuffer(context, 2.5, 'digital'),
      transient: this.createNoiseBuffer(context, 2.2, 'transient'),
    };

    const stoneSource = trackSource(context.createBufferSource());
    stoneSource.buffer = noiseBuffers.stone;
    stoneSource.loop = true;
    stoneSource.playbackRate.value = 0.79;
    const stoneHighpass = trackNode(context.createBiquadFilter());
    stoneHighpass.type = 'highpass';
    stoneHighpass.frequency.value = 28;
    const stoneFilter = trackNode(context.createBiquadFilter());
    stoneFilter.type = 'lowpass';
    stoneFilter.frequency.value = 390;
    stoneFilter.Q.value = 0.58;
    const stonePan = trackNode(context.createStereoPanner());
    stonePan.pan.value = -0.11;
    const stoneGain = trackNode(context.createGain());
    stoneGain.gain.value = 0;
    stoneSource
      .connect(stoneHighpass)
      .connect(stoneFilter)
      .connect(stonePan)
      .connect(stoneGain)
      .connect(master);

    const lampBody = trackNode(context.createGain());
    lampBody.gain.value = 0.72;
    const lampNoise = trackSource(context.createBufferSource());
    lampNoise.buffer = noiseBuffers.air;
    lampNoise.loop = true;
    lampNoise.playbackRate.value = 1.14;
    const lampHighpass = trackNode(context.createBiquadFilter());
    lampHighpass.type = 'highpass';
    lampHighpass.frequency.value = 210;
    const lampFilter = trackNode(context.createBiquadFilter());
    lampFilter.type = 'bandpass';
    lampFilter.frequency.value = FOCUS_TUNING.oil.lampFilter;
    lampFilter.Q.value = 0.72;
    const lampNoiseLevel = trackNode(context.createGain());
    lampNoiseLevel.gain.value = 0.48;
    lampNoise
      .connect(lampHighpass)
      .connect(lampFilter)
      .connect(lampNoiseLevel)
      .connect(lampBody);
    const lampTone = trackSource(context.createOscillator());
    lampTone.type = 'sine';
    lampTone.frequency.value = FOCUS_TUNING.oil.lampRoot;
    const lampToneLevel = trackNode(context.createGain());
    lampToneLevel.gain.value = 0.024;
    lampTone.connect(lampToneLevel).connect(lampBody);
    const lampPanner = trackNode(context.createPanner());
    this.configurePanner(lampPanner, { x: -0.82, y: 0.3, z: -1.55 });
    lampPanner.refDistance = 1.35;
    lampPanner.rolloffFactor = 0.56;
    const lampGain = trackNode(context.createGain());
    lampGain.gain.value = 0;
    lampBody.connect(lampPanner).connect(lampGain).connect(master);

    const mechanismBody = trackNode(context.createGain());
    mechanismBody.gain.value = 0.7;
    const mechanismNoise = trackSource(context.createBufferSource());
    mechanismNoise.buffer = noiseBuffers.mechanical;
    mechanismNoise.loop = true;
    mechanismNoise.playbackRate.value = 0.62;
    const mechanismFilter = trackNode(context.createBiquadFilter());
    mechanismFilter.type = 'bandpass';
    mechanismFilter.frequency.value = 155;
    mechanismFilter.Q.value = 0.84;
    const mechanismNoiseLevel = trackNode(context.createGain());
    mechanismNoiseLevel.gain.value = 0.37;
    mechanismNoise
      .connect(mechanismFilter)
      .connect(mechanismNoiseLevel)
      .connect(mechanismBody);
    const mechanismRoot = trackSource(context.createOscillator());
    mechanismRoot.type = 'triangle';
    mechanismRoot.frequency.value = 43.65;
    const mechanismRootLevel = trackNode(context.createGain());
    mechanismRootLevel.gain.value = 0.062;
    mechanismRoot.connect(mechanismRootLevel).connect(mechanismBody);
    const mechanismPartial = trackSource(context.createOscillator());
    mechanismPartial.type = 'sine';
    mechanismPartial.frequency.value = 87.3;
    mechanismPartial.detune.value = 7;
    const mechanismPartialLevel = trackNode(context.createGain());
    mechanismPartialLevel.gain.value = 0.017;
    mechanismPartial.connect(mechanismPartialLevel).connect(mechanismBody);
    const mechanismPulse = trackSource(context.createOscillator());
    mechanismPulse.type = 'sine';
    mechanismPulse.frequency.value = 0.56;
    const mechanismPulseDepth = trackNode(context.createGain());
    mechanismPulseDepth.gain.value = this.reducedMotion ? 0 : 0.028;
    mechanismPulse.connect(mechanismPulseDepth).connect(mechanismBody.gain);
    const mechanismPanner = trackNode(context.createPanner());
    this.configurePanner(mechanismPanner, STATIC_CUE_POSITIONS['mechanism-wake']);
    mechanismPanner.refDistance = 1.5;
    mechanismPanner.rolloffFactor = 0.55;
    const mechanismGain = trackNode(context.createGain());
    mechanismGain.gain.value = 0;
    mechanismBody.connect(mechanismPanner).connect(mechanismGain).connect(master);

    const mercuryBody = trackNode(context.createGain());
    mercuryBody.gain.value = 0.68;
    const mercuryNoise = trackSource(context.createBufferSource());
    mercuryNoise.buffer = noiseBuffers.air;
    mercuryNoise.loop = true;
    mercuryNoise.playbackRate.value = 0.92;
    const mercuryHighpass = trackNode(context.createBiquadFilter());
    mercuryHighpass.type = 'highpass';
    mercuryHighpass.frequency.value = 620;
    const mercuryFilter = trackNode(context.createBiquadFilter());
    mercuryFilter.type = 'bandpass';
    mercuryFilter.frequency.value = 1840;
    mercuryFilter.Q.value = 0.54;
    const mercuryNoiseLevel = trackNode(context.createGain());
    mercuryNoiseLevel.gain.value = 0.32;
    mercuryNoise
      .connect(mercuryHighpass)
      .connect(mercuryFilter)
      .connect(mercuryNoiseLevel)
      .connect(mercuryBody);
    const mercuryRoot = trackSource(context.createOscillator());
    mercuryRoot.type = 'sine';
    mercuryRoot.frequency.value = 73.42;
    const mercuryRootLevel = trackNode(context.createGain());
    mercuryRootLevel.gain.value = 0.021;
    mercuryRoot.connect(mercuryRootLevel).connect(mercuryBody);
    const mercuryPanner = trackNode(context.createPanner());
    this.configurePanner(mercuryPanner, { x: 0.68, y: -0.18, z: -2.2 });
    mercuryPanner.refDistance = 1.5;
    mercuryPanner.rolloffFactor = 0.5;
    const mercuryGain = trackNode(context.createGain());
    mercuryGain.gain.value = 0;
    mercuryBody.connect(mercuryPanner).connect(mercuryGain).connect(master);

    const evidenceBody = trackNode(context.createGain());
    evidenceBody.gain.value = 0.65;
    const evidenceNoise = trackSource(context.createBufferSource());
    evidenceNoise.buffer = noiseBuffers.air;
    evidenceNoise.loop = true;
    evidenceNoise.playbackRate.value = 0.81;
    const evidenceFilter = trackNode(context.createBiquadFilter());
    evidenceFilter.type = 'bandpass';
    evidenceFilter.frequency.value = 1480;
    evidenceFilter.Q.value = 0.46;
    const evidenceNoiseLevel = trackNode(context.createGain());
    evidenceNoiseLevel.gain.value = 0.24;
    evidenceNoise.connect(evidenceFilter).connect(evidenceNoiseLevel).connect(evidenceBody);
    const evidenceTone = trackSource(context.createOscillator());
    evidenceTone.type = 'triangle';
    evidenceTone.frequency.value = 146.83;
    const evidenceToneLevel = trackNode(context.createGain());
    evidenceToneLevel.gain.value = 0.027;
    evidenceTone.connect(evidenceToneLevel).connect(evidenceBody);
    const evidencePan = trackNode(context.createStereoPanner());
    evidencePan.pan.value = -0.14;
    const evidenceGain = trackNode(context.createGain());
    evidenceGain.gain.value = 0;
    evidenceBody.connect(evidencePan).connect(evidenceGain).connect(master);

    const pixelBody = trackNode(context.createGain());
    pixelBody.gain.value = 0.64;
    const pixelNoise = trackSource(context.createBufferSource());
    pixelNoise.buffer = noiseBuffers.digital;
    pixelNoise.loop = true;
    pixelNoise.playbackRate.value = 1.04;
    const pixelFilter = trackNode(context.createBiquadFilter());
    pixelFilter.type = 'bandpass';
    pixelFilter.frequency.value = 1120;
    pixelFilter.Q.value = 1.35;
    const pixelNoiseLevel = trackNode(context.createGain());
    pixelNoiseLevel.gain.value = 0.23;
    pixelNoise.connect(pixelFilter).connect(pixelNoiseLevel).connect(pixelBody);
    const pixelOscillator = trackSource(context.createOscillator());
    pixelOscillator.type = 'triangle';
    pixelOscillator.frequency.value = 110;
    const pixelOscillatorLevel = trackNode(context.createGain());
    pixelOscillatorLevel.gain.value = 0.034;
    pixelOscillator.connect(pixelOscillatorLevel).connect(pixelBody);
    const pixelGain = trackNode(context.createGain());
    pixelGain.gain.value = 0;
    pixelBody.connect(pixelGain).connect(master);

    const startAt = context.currentTime + 0.01;
    for (const source of continuousSources) source.start(startAt);

    return {
      master,
      limiter,
      cueBus,
      stoneGain,
      stoneFilter,
      stonePan,
      lampGain,
      lampFilter,
      lampTone,
      lampPanner,
      mechanismGain,
      mechanismFilter,
      mechanismRoot,
      mechanismPulseDepth,
      mercuryGain,
      mercuryFilter,
      mercuryPanner,
      evidenceGain,
      evidenceFilter,
      evidencePan,
      pixelGain,
      pixelFilter,
      pixelOscillator,
      noiseBuffers,
      continuousSources,
      nodes,
    };
  }

  private applyParameters(immediate: boolean) {
    const context = this.context;
    const graph = this.graph;
    if (!context || !graph || context.state === 'closed') return;

    const now = context.currentTime;
    const { progress, velocity, lamp } = this.parameters;
    const signedVelocity = this.reducedMotion ? 0 : velocity;
    const speed = Math.abs(signedVelocity);
    const movement = smoothstep(0.025, 1, speed);
    const tuning = FOCUS_TUNING[lamp.focus];
    const lampActivity = lamp.active ? 1 : 0;
    const oilFocus = lamp.focus === 'oil' ? 1 : 0;
    const mechanismFocus = lamp.focus === 'mechanism' ? 1 : 0;
    const mercuryFocus = lamp.focus === 'mercury' ? 1 : 0;
    const actEnvelope = smoothstep(0, 0.04, progress)
      * (1 - smoothstep(0.985, 1, progress));

    const descentWeight = 1 - smoothstep(0.18, 0.44, progress) * 0.7;
    const chamberWeight = smoothstep(0.13, 0.23, progress)
      * (1 - smoothstep(0.62, 0.74, progress));
    const lampWeight = smoothstep(0.15, 0.23, progress)
      * (1 - smoothstep(0.95, 1, progress));
    const mechanismWeight = smoothstep(0.34, 0.41, progress)
      * (1 - smoothstep(0.53, 0.64, progress));
    const mercuryWeight = smoothstep(0.45, 0.52, progress)
      * (1 - smoothstep(0.64, 0.74, progress));
    const evidenceWeight = smoothstep(0.58, 0.68, progress)
      * (1 - smoothstep(0.94, 0.99, progress));
    const pixelWeight = smoothstep(0.94, 0.99, progress);

    moveParameter(
      graph.stoneGain.gain,
      (0.011 + descentWeight * 0.018 + movement * 0.004) * actEnvelope,
      now,
      0.24,
      immediate,
    );
    moveParameter(
      graph.lampGain.gain,
      lampWeight * (0.004 + lampActivity * 0.014 + oilFocus * 0.0035) * actEnvelope,
      now,
      0.16,
      immediate,
    );
    moveParameter(
      graph.mechanismGain.gain,
      (mechanismWeight * 0.011 + chamberWeight * mechanismFocus * 0.015) * actEnvelope,
      now,
      0.17,
      immediate,
    );
    moveParameter(
      graph.mercuryGain.gain,
      (mercuryWeight * 0.01 + chamberWeight * mercuryFocus * 0.014) * actEnvelope,
      now,
      0.22,
      immediate,
    );
    moveParameter(
      graph.evidenceGain.gain,
      evidenceWeight * (0.019 + lampActivity * 0.002) * actEnvelope,
      now,
      0.25,
      immediate,
    );
    moveParameter(graph.pixelGain.gain, pixelWeight * 0.017 * actEnvelope, now, 0.2, immediate);

    moveParameter(
      graph.stoneFilter.frequency,
      340 + progress * 190 + movement * 190 + signedVelocity * 22,
      now,
      0.2,
      immediate,
    );
    moveParameter(
      graph.stonePan.pan,
      this.reducedMotion
        ? -0.04
        : -0.11 + Math.sin(progress * Math.PI * 1.4) * 0.07 + signedVelocity * 0.04,
      now,
      0.28,
      immediate,
    );

    moveParameter(
      graph.lampFilter.frequency,
      tuning.lampFilter + lamp.y * lampActivity * 220 + movement * 130,
      now,
      0.13,
      immediate,
    );
    moveParameter(
      graph.lampTone.frequency,
      tuning.lampRoot * (1 + lampActivity * 0.035),
      now,
      0.2,
      immediate,
    );
    const fallbackLampX = tuning.fallbackX;
    const lampX = this.reducedMotion
      ? fallbackLampX * 0.45
      : (lamp.active ? lamp.x * 1.72 : fallbackLampX) + signedVelocity * 0.05;
    const lampY = this.reducedMotion
      ? 0.3
      : 0.3 + (lamp.active ? lamp.y * 0.72 : 0);
    moveParameter(graph.lampPanner.positionX, lampX, now, 0.11, immediate);
    moveParameter(graph.lampPanner.positionY, lampY, now, 0.13, immediate);
    moveParameter(
      graph.lampPanner.positionZ,
      lamp.active && !this.reducedMotion ? -1.38 : -1.55,
      now,
      0.16,
      immediate,
    );

    moveParameter(
      graph.mechanismFilter.frequency,
      135 + mechanismWeight * 105 + mechanismFocus * 68 + movement * 115
        + signedVelocity * 18,
      now,
      0.15,
      immediate,
    );
    moveParameter(
      graph.mechanismRoot.frequency,
      43.65 + mechanismFocus * 3.4 + signedVelocity * 1.4,
      now,
      0.2,
      immediate,
    );
    moveParameter(
      graph.mechanismPulseDepth.gain,
      this.reducedMotion ? 0 : 0.022 + mechanismFocus * 0.01,
      now,
      0.2,
      immediate,
    );

    moveParameter(
      graph.mercuryFilter.frequency,
      1680 + mercuryFocus * 720 + progress * 260 + movement * 170,
      now,
      0.2,
      immediate,
    );
    moveParameter(
      graph.mercuryPanner.positionX,
      this.reducedMotion
        ? 0.54
        : 0.68 + Math.sin(progress * Math.PI * 2.2) * 0.23 + signedVelocity * 0.05,
      now,
      0.3,
      immediate,
    );

    moveParameter(
      graph.evidenceFilter.frequency,
      1320 + evidenceWeight * 640 + movement * 170,
      now,
      0.24,
      immediate,
    );
    moveParameter(
      graph.evidencePan.pan,
      this.reducedMotion
        ? 0
        : -0.18 + Math.sin(smoothstep(0.61, 0.91, progress) * Math.PI) * 0.36
          + signedVelocity * 0.035,
      now,
      0.28,
      immediate,
    );

    moveParameter(
      graph.pixelFilter.frequency,
      980 + pixelWeight * 1760 + movement * 120,
      now,
      0.14,
      immediate,
    );
    moveParameter(
      graph.pixelOscillator.frequency,
      110 - pixelWeight * 36 + signedVelocity * 1.8,
      now,
      0.16,
      immediate,
    );
  }

  private canPlayCue() {
    return !this.disposed
      && !this.muted
      && this.status === 'running'
      && this.context?.state === 'running'
      && this.graph !== null;
  }

  private getDefaultCuePosition(cue: BuriedActSoundCue): BuriedActSoundPosition {
    if (cue !== 'lamp-focus') return STATIC_CUE_POSITIONS[cue];

    const lamp = this.parameters.lamp;
    const fallbackX = FOCUS_TUNING[lamp.focus].fallbackX;
    const x = lamp.active ? lamp.x * 1.72 : fallbackX;
    return {
      x: this.reducedMotion ? fallbackX * 0.45 : x,
      y: this.reducedMotion ? 0.3 : 0.3 + (lamp.active ? lamp.y * 0.72 : 0),
      z: lamp.active && !this.reducedMotion ? -1.38 : -1.55,
    };
  }

  private playLampFocus(position: BuriedActSoundPosition) {
    const context = this.context!;
    const graph = this.graph!;
    const focus = this.parameters.lamp.focus;
    const tuning = FOCUS_TUNING[focus];
    const now = context.currentTime + 0.008;
    const end = now + (this.reducedMotion ? 0.16 : 0.24);
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.068, now + 0.008);
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, position);
    voice.connect(panner).connect(graph.cueBus);

    const iris = context.createBufferSource();
    iris.buffer = graph.noiseBuffers.transient;
    const irisFilter = context.createBiquadFilter();
    irisFilter.type = 'bandpass';
    irisFilter.frequency.value = tuning.cueRoot * 4;
    irisFilter.Q.value = 2.1;
    const irisLevel = context.createGain();
    irisLevel.gain.value = 0.46;
    iris.connect(irisFilter).connect(irisLevel).connect(voice);

    const glow = context.createOscillator();
    glow.type = 'triangle';
    glow.frequency.setValueAtTime(tuning.cueRoot, now);
    glow.frequency.exponentialRampToValueAtTime(tuning.cueRoot * 0.74, end);
    const glowLevel = context.createGain();
    glowLevel.gain.value = 0.31;
    glow.connect(glowLevel).connect(voice);

    const sources: AudioScheduledSourceNode[] = [iris, glow];
    const nodes: AudioNode[] = [
      voice,
      panner,
      iris,
      irisFilter,
      irisLevel,
      glow,
      glowLevel,
    ];
    this.registerOneShot(sources, nodes);
    iris.start(now, FOCUS_NOISE_OFFSETS[focus], end - now);
    glow.start(now);
    iris.stop(end);
    glow.stop(end);
  }

  private playMechanismWake(position: BuriedActSoundPosition) {
    const context = this.context!;
    const graph = this.graph!;
    const now = context.currentTime + 0.012;
    const end = now + (this.reducedMotion ? 0.38 : 0.72);
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.072, now + 0.018);
    voice.gain.exponentialRampToValueAtTime(0.024, now + Math.min(0.18, end - now));
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, position);
    voice.connect(panner).connect(graph.cueBus);

    const friction = context.createBufferSource();
    friction.buffer = graph.noiseBuffers.mechanical;
    friction.playbackRate.value = 0.71;
    const frictionFilter = context.createBiquadFilter();
    frictionFilter.type = 'lowpass';
    frictionFilter.frequency.value = 330;
    const frictionLevel = context.createGain();
    frictionLevel.gain.value = 0.42;
    friction.connect(frictionFilter).connect(frictionLevel).connect(voice);

    const body = context.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(48, now);
    body.frequency.exponentialRampToValueAtTime(39, end);
    const bodyLevel = context.createGain();
    bodyLevel.gain.value = 0.39;
    body.connect(bodyLevel).connect(voice);

    const metal = context.createOscillator();
    metal.type = 'sine';
    metal.frequency.setValueAtTime(174.61, now);
    metal.frequency.exponentialRampToValueAtTime(130.81, end);
    const metalLevel = context.createGain();
    metalLevel.gain.value = 0.08;
    metal.connect(metalLevel).connect(voice);

    const sources: AudioScheduledSourceNode[] = [friction, body, metal];
    const nodes: AudioNode[] = [
      voice,
      panner,
      friction,
      frictionFilter,
      frictionLevel,
      body,
      bodyLevel,
      metal,
      metalLevel,
    ];
    this.registerOneShot(sources, nodes);
    friction.start(now, 0.43, end - now);
    body.start(now);
    metal.start(now);
    for (const source of sources) source.stop(end);

    const tickCount = this.reducedMotion ? 1 : 4;
    for (let index = 0; index < tickCount; index += 1) {
      this.playMechanismTick(position, index, 0.09 + index * 0.105);
    }
  }

  private playMechanismTick(
    position: BuriedActSoundPosition,
    index: number,
    delay: number,
  ) {
    const context = this.context!;
    const graph = this.graph!;
    const now = context.currentTime + delay;
    const end = now + 0.055;
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.034, now + 0.004);
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, {
      x: this.reducedMotion ? position.x : position.x - 0.32 + index * 0.19,
      y: position.y,
      z: position.z - index * 0.09,
    });
    voice.connect(panner).connect(graph.cueBus);

    const tick = context.createBufferSource();
    tick.buffer = graph.noiseBuffers.transient;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 860 + index * 105;
    filter.Q.value = 1.35;
    tick.connect(filter).connect(voice);

    const nodes: AudioNode[] = [voice, panner, tick, filter];
    this.registerOneShot([tick], nodes);
    tick.start(now, 0.24 + index * 0.27, end - now);
    tick.stop(end);
  }

  private playEvidenceReveal(position: BuriedActSoundPosition) {
    const context = this.context!;
    const graph = this.graph!;
    const now = context.currentTime + 0.01;
    const end = now + (this.reducedMotion ? 0.3 : 0.48);
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.061, now + 0.014);
    voice.gain.exponentialRampToValueAtTime(0.018, now + Math.min(0.16, end - now));
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, position);
    voice.connect(panner).connect(graph.cueBus);

    const shutter = context.createBufferSource();
    shutter.buffer = graph.noiseBuffers.transient;
    shutter.playbackRate.value = 0.78;
    const shutterFilter = context.createBiquadFilter();
    shutterFilter.type = 'bandpass';
    shutterFilter.frequency.value = 570;
    shutterFilter.Q.value = 0.76;
    const shutterLevel = context.createGain();
    shutterLevel.gain.value = 0.48;
    shutter.connect(shutterFilter).connect(shutterLevel).connect(voice);

    const proofTone = context.createOscillator();
    proofTone.type = 'sine';
    proofTone.frequency.setValueAtTime(146.83, now);
    proofTone.frequency.exponentialRampToValueAtTime(196, end);
    const proofToneLevel = context.createGain();
    proofToneLevel.gain.value = 0.25;
    proofTone.connect(proofToneLevel).connect(voice);

    const sources: AudioScheduledSourceNode[] = [shutter, proofTone];
    const nodes: AudioNode[] = [
      voice,
      panner,
      shutter,
      shutterFilter,
      shutterLevel,
      proofTone,
      proofToneLevel,
    ];
    this.registerOneShot(sources, nodes);
    shutter.start(now, 1.02, end - now);
    proofTone.start(now);
    shutter.stop(end);
    proofTone.stop(end);
  }

  private playPixelCompress(position: BuriedActSoundPosition) {
    const context = this.context!;
    const graph = this.graph!;
    const now = context.currentTime + 0.01;
    const end = now + (this.reducedMotion ? 0.32 : 0.46);
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.058, now + 0.012);
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, position);
    voice.connect(panner).connect(graph.cueBus);

    const grain = context.createBufferSource();
    grain.buffer = graph.noiseBuffers.digital;
    const grainFilter = context.createBiquadFilter();
    grainFilter.type = 'bandpass';
    grainFilter.frequency.setValueAtTime(2480, now);
    grainFilter.frequency.exponentialRampToValueAtTime(520, end);
    grainFilter.Q.value = 1.5;
    const grainLevel = context.createGain();
    grainLevel.gain.value = 0.42;
    grain.connect(grainFilter).connect(grainLevel).connect(voice);

    const core = context.createOscillator();
    core.type = 'triangle';
    core.frequency.setValueAtTime(220, now);
    core.frequency.exponentialRampToValueAtTime(55, end);
    const coreLevel = context.createGain();
    coreLevel.gain.value = 0.3;
    core.connect(coreLevel).connect(voice);

    const sources: AudioScheduledSourceNode[] = [grain, core];
    const nodes: AudioNode[] = [
      voice,
      panner,
      grain,
      grainFilter,
      grainLevel,
      core,
      coreLevel,
    ];
    this.registerOneShot(sources, nodes);
    grain.start(now, 0.61, end - now);
    core.start(now);
    grain.stop(end);
    core.stop(end);

    const stepCount = this.reducedMotion ? 1 : 4;
    for (let index = 0; index < stepCount; index += 1) {
      this.playPixelStep(position, index, 0.055 + index * 0.065);
    }
  }

  private playPixelStep(position: BuriedActSoundPosition, index: number, delay: number) {
    const context = this.context!;
    const graph = this.graph!;
    const now = context.currentTime + delay;
    const end = now + 0.045;
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.026, now + 0.003);
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    const travel = this.reducedMotion ? 0 : (3 - index) * 0.14;
    this.configurePanner(panner, {
      x: position.x + (index % 2 === 0 ? -travel : travel),
      y: position.y,
      z: position.z - travel * 0.4,
    });
    voice.connect(panner).connect(graph.cueBus);

    const step = context.createBufferSource();
    step.buffer = graph.noiseBuffers.transient;
    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1540 + index * 260;
    step.connect(filter).connect(voice);

    const nodes: AudioNode[] = [voice, panner, step, filter];
    this.registerOneShot([step], nodes);
    step.start(now, 0.46 + index * 0.31, end - now);
    step.stop(end);
  }

  private createNoiseBuffer(
    context: AudioContext,
    seconds: number,
    profile: NoiseProfile,
  ) {
    const length = Math.max(2, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let seed = NOISE_SEEDS[profile];
    let low = 0;
    let mid = 0;
    let previousWhite = 0;

    for (let index = 0; index < length; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const white = (seed / 0xffffffff) * 2 - 1;
      let sample = white;

      switch (profile) {
        case 'stone':
          low = low * 0.986 + white * 0.014;
          sample = low * 2.6 + white * 0.028;
          break;
        case 'air':
          low = low * 0.78 + white * 0.22;
          sample = (white - low) * 0.56;
          break;
        case 'mechanical':
          low = low * 0.94 + white * 0.06;
          mid = mid * 0.66 + white * 0.34;
          sample = low * 1.4 + mid * 0.3;
          break;
        case 'digital':
          low = low * 0.38 + white * 0.62;
          sample = white * 0.38 + low * 0.48;
          break;
        case 'transient':
          sample = (white - previousWhite * 0.7) * 0.54 + low * 0.12;
          low = low * 0.86 + white * 0.14;
          break;
      }

      previousWhite = white;
      channel[index] = clamp(sample, -1, 1);
    }

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

  private configurePanner(panner: PannerNode, position: BuriedActSoundPosition) {
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.1;
    panner.maxDistance = 12;
    panner.rolloffFactor = 0.68;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;
    panner.positionX.value = clamp(finiteOr(position.x, 0), -6, 6);
    panner.positionY.value = clamp(finiteOr(position.y, 0), -3, 3);
    panner.positionZ.value = clamp(finiteOr(position.z, -1), -10, 3);
  }

  private registerOneShot(sources: AudioScheduledSourceNode[], nodes: AudioNode[]) {
    let remainingSources = sources.length;
    for (const node of nodes) this.activeOneShotNodes.add(node);

    const releaseNodes = () => {
      remainingSources -= 1;
      if (remainingSources > 0) return;
      for (const node of nodes) {
        safeDisconnect(node);
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
