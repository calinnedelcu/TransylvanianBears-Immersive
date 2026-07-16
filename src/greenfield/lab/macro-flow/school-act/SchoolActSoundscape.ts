export type SchoolActSoundCue = 'scan-start' | 'gate-open' | 'request-resolved';

export type SchoolActSoundscapeStatus =
  | 'idle'
  | 'running'
  | 'muted'
  | 'suspended'
  | 'silent'
  | 'disposed';

export type SchoolActSoundParameters = {
  /** Normalized progress over chapters 05-07. Values outside 0-1 are clamped. */
  progress: number;
  /** Normalized progress through the canonical five-stage Aegis scan. */
  scanProgress: number;
  /** Signed normalized scroll velocity. Values outside -1.25 to 1.25 are clamped. */
  velocity: number;
};

export type SchoolActSoundscapeOptions = {
  /** Shared context owned and closed by the experience orchestrator. */
  audioContext?: AudioContext | null;
  reducedMotion?: boolean;
  /** Output trim after the authored mix. Defaults to 0.5. */
  masterLevel?: number;
};

type CuePosition = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

type NoiseProfile = 'stone' | 'room' | 'transient';

type SoundGraph = {
  master: GainNode;
  limiter: DynamicsCompressorNode;
  cueBus: GainNode;
  stoneGain: GainNode;
  stoneFilter: BiquadFilterNode;
  stonePan: StereoPannerNode;
  roomGain: GainNode;
  roomFilter: BiquadFilterNode;
  roomPan: StereoPannerNode;
  noiseBuffers: Record<NoiseProfile, AudioBuffer>;
  continuousSources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
};

const MIN_GAIN = 0.0001;
const RELAY_THRESHOLDS = [0.18, 0.38, 0.58, 0.78] as const;

const NOISE_SEEDS: Record<NoiseProfile, number> = {
  stone: 0x5d2f3a11,
  room: 0x19c4e7b3,
  transient: 0x72a51d09,
};

const CUE_POSITIONS: Record<SchoolActSoundCue, CuePosition> = {
  'scan-start': { x: 0.72, y: 0.25, z: -1.25 },
  'gate-open': { x: 0.18, y: 0.05, z: -1.7 },
  'request-resolved': { x: 0.62, y: 0.18, z: -1.4 },
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

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function smoothstep(start: number, end: number, value: number) {
  if (start === end) return value < start ? 0 : 1;
  const normalized = clamp01((value - start) / (end - start));
  return normalized * normalized * (3 - 2 * normalized);
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
    // The node may already have been detached by a completed voice.
  }
}

/**
 * Procedural, opt-in Web Audio controller for the linear 05-07 school passage.
 * It never creates or closes an AudioContext; call resume() from a user gesture.
 */
export class SchoolActSoundscape {
  private readonly context: AudioContext | null;
  private graph: SoundGraph | null = null;
  private statusValue: SchoolActSoundscapeStatus;
  private readonly activeOneShotSources = new Set<AudioScheduledSourceNode>();
  private readonly activeOneShotNodes = new Set<AudioNode>();
  private parameters: SchoolActSoundParameters = {
    progress: 0,
    scanProgress: 0,
    velocity: 0,
  };
  private readonly masterLevel: number;
  private reducedMotion: boolean;
  private muted = true;
  private scanArmed = false;
  private nextRelayIndex = 0;
  private resumeOperation: Promise<boolean> | null = null;
  private disposed = false;

  constructor(options: SchoolActSoundscapeOptions = {}) {
    this.context = options.audioContext ?? null;
    this.statusValue = this.context && this.context.state !== 'closed' ? 'idle' : 'silent';
    this.reducedMotion = options.reducedMotion ?? false;
    this.masterLevel = clamp(finiteOr(options.masterLevel ?? 0.5, 0.5), 0, 1);
  }

  get status(): SchoolActSoundscapeStatus {
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
    return !this.disposed && this.context !== null && this.context.state !== 'closed';
  }

  /** Resumes the shared context, builds the graph lazily, and fades the mix in. */
  resume(): Promise<boolean> {
    if (!this.isSupported) return Promise.resolve(false);

    this.muted = false;
    if (this.resumeOperation) return this.resumeOperation;

    const operation = this.performResume();
    this.resumeOperation = operation;
    void operation.finally(() => {
      if (this.resumeOperation === operation) this.resumeOperation = null;
    });
    return operation;
  }

  /** Fades only this controller to silence; the shared context remains untouched. */
  mute() {
    if (this.disposed) return;
    this.muted = true;
    this.scanArmed = false;
    this.statusValue = this.context ? 'muted' : 'silent';

    if (!this.context || !this.graph || this.context.state === 'closed') return;
    const now = this.context.currentTime;
    holdParameter(this.graph.master.gain, now);
    this.graph.master.gain.linearRampToValueAtTime(0, now + 0.09);
  }

  /** Stores parameters while silent and applies them only after the graph is enabled. */
  update(parameters: Partial<SchoolActSoundParameters>) {
    if (this.disposed) return;

    const previousScanProgress = this.parameters.scanProgress;
    if (parameters.progress !== undefined) {
      this.parameters.progress = clamp01(finiteOr(parameters.progress, this.parameters.progress));
    }
    if (parameters.scanProgress !== undefined) {
      this.parameters.scanProgress = clamp01(
        finiteOr(parameters.scanProgress, this.parameters.scanProgress),
      );
    }
    if (parameters.velocity !== undefined) {
      this.parameters.velocity = clamp(
        finiteOr(parameters.velocity, this.parameters.velocity),
        -1.25,
        1.25,
      );
    }

    this.applyParameters(false);
    this.advanceRelaySequence(previousScanProgress, this.parameters.scanProgress);
  }

  setReducedMotion(reducedMotion: boolean) {
    if (this.disposed || this.reducedMotion === reducedMotion) return;
    this.reducedMotion = reducedMotion;
    this.applyParameters(false);
  }

  /**
   * Plays an authored physical cue without unlocking audio implicitly.
   * Returns false while muted, suspended, unsupported, or disposed.
   */
  trigger(cue: SchoolActSoundCue) {
    if (!this.canPlayCue()) return false;

    switch (cue) {
      case 'scan-start':
        this.scanArmed = true;
        this.nextRelayIndex = RELAY_THRESHOLDS.findIndex(
          (threshold) => threshold > this.parameters.scanProgress + 0.001,
        );
        if (this.nextRelayIndex < 0) this.nextRelayIndex = RELAY_THRESHOLDS.length;
        this.playScannerTick(CUE_POSITIONS[cue]);
        break;
      case 'gate-open':
        this.scanArmed = false;
        this.playGateOpen(CUE_POSITIONS[cue]);
        break;
      case 'request-resolved':
        this.playRequestResolved(CUE_POSITIONS[cue]);
        break;
    }
    return true;
  }

  /** Stops and disconnects this graph without closing the externally owned context. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.muted = true;
    this.scanArmed = false;
    this.statusValue = 'disposed';

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

    if (this.graph) {
      for (const source of this.graph.continuousSources) {
        try {
          source.stop();
        } catch {
          // A closed shared context has already stopped its sources.
        }
      }
      for (const node of this.graph.nodes) safeDisconnect(node);
    }
    this.graph = null;
  }

  private async performResume() {
    const context = this.context;
    if (!context || context.state === 'closed' || this.disposed) return false;

    try {
      if (context.state !== 'running') await context.resume();
    } catch {
      this.statusValue = 'suspended';
      return false;
    }

    if (this.disposed || this.muted || context.state !== 'running') {
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
    graph.master.gain.linearRampToValueAtTime(this.masterLevel, now + 0.55);
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
    limiter.threshold.value = -16;
    limiter.knee.value = 7;
    limiter.ratio.value = 7;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.2;
    master.connect(limiter).connect(context.destination);

    const cueBus = trackNode(context.createGain());
    cueBus.gain.value = 0.72;
    cueBus.connect(master);

    const noiseBuffers: Record<NoiseProfile, AudioBuffer> = {
      stone: this.createNoiseBuffer(context, 4.9, 'stone'),
      room: this.createNoiseBuffer(context, 3.7, 'room'),
      transient: this.createNoiseBuffer(context, 2.1, 'transient'),
    };

    const stoneSource = trackSource(context.createBufferSource());
    stoneSource.buffer = noiseBuffers.stone;
    stoneSource.loop = true;
    stoneSource.playbackRate.value = 0.81;
    const stoneHighpass = trackNode(context.createBiquadFilter());
    stoneHighpass.type = 'highpass';
    stoneHighpass.frequency.value = 28;
    const stoneFilter = trackNode(context.createBiquadFilter());
    stoneFilter.type = 'lowpass';
    stoneFilter.frequency.value = 430;
    stoneFilter.Q.value = 0.62;
    const stonePan = trackNode(context.createStereoPanner());
    stonePan.pan.value = -0.15;
    const stoneGain = trackNode(context.createGain());
    stoneGain.gain.value = 0;
    stoneSource
      .connect(stoneHighpass)
      .connect(stoneFilter)
      .connect(stonePan)
      .connect(stoneGain)
      .connect(master);

    const roomSource = trackSource(context.createBufferSource());
    roomSource.buffer = noiseBuffers.room;
    roomSource.loop = true;
    roomSource.playbackRate.value = 0.94;
    const roomHighpass = trackNode(context.createBiquadFilter());
    roomHighpass.type = 'highpass';
    roomHighpass.frequency.value = 76;
    const roomFilter = trackNode(context.createBiquadFilter());
    roomFilter.type = 'lowpass';
    roomFilter.frequency.value = 1320;
    roomFilter.Q.value = 0.48;
    const roomPan = trackNode(context.createStereoPanner());
    roomPan.pan.value = 0.08;
    const roomGain = trackNode(context.createGain());
    roomGain.gain.value = 0;
    roomSource
      .connect(roomHighpass)
      .connect(roomFilter)
      .connect(roomPan)
      .connect(roomGain)
      .connect(master);

    const startAt = context.currentTime + 0.01;
    stoneSource.start(startAt);
    roomSource.start(startAt);

    return {
      master,
      limiter,
      cueBus,
      stoneGain,
      stoneFilter,
      stonePan,
      roomGain,
      roomFilter,
      roomPan,
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
    const progress = this.parameters.progress;
    const schoolMix = smoothstep(0.16, 0.72, progress);
    const accessFocus = 1 - Math.abs(progress - 0.46) / 0.46;
    const speed = this.reducedMotion
      ? 0
      : clamp(Math.abs(this.parameters.velocity), 0, 1.25);
    const scanEnergy = smoothstep(0.05, 0.82, this.parameters.scanProgress)
      * smoothstep(1, 0.74, this.parameters.scanProgress);

    const stoneLevel = mix(0.046, 0.011, schoolMix) + speed * 0.007;
    const roomLevel = mix(0.004, 0.034, schoolMix) + Math.max(0, accessFocus) * 0.003;
    const stoneFrequency = 360 + progress * 150 + speed * 170;
    const roomFrequency = 1120 + progress * 640 + scanEnergy * 260 + speed * 180;
    const panTravel = this.reducedMotion ? 0 : 0.07;

    moveParameter(graph.stoneGain.gain, stoneLevel, now, 0.24, immediate);
    moveParameter(graph.roomGain.gain, roomLevel, now, 0.28, immediate);
    moveParameter(graph.stoneFilter.frequency, stoneFrequency, now, 0.2, immediate);
    moveParameter(graph.roomFilter.frequency, roomFrequency, now, 0.18, immediate);
    moveParameter(
      graph.stonePan.pan,
      -0.15 + Math.sin(progress * Math.PI) * panTravel,
      now,
      0.3,
      immediate,
    );
    moveParameter(
      graph.roomPan.pan,
      0.08 - Math.sin(progress * Math.PI * 1.5) * panTravel,
      now,
      0.3,
      immediate,
    );
  }

  private advanceRelaySequence(previousProgress: number, nextProgress: number) {
    if (!this.scanArmed || nextProgress <= previousProgress || !this.canPlayCue()) return;

    let scheduled = 0;
    while (
      this.nextRelayIndex < RELAY_THRESHOLDS.length
      && RELAY_THRESHOLDS[this.nextRelayIndex] <= nextProgress
    ) {
      const threshold = RELAY_THRESHOLDS[this.nextRelayIndex];
      if (threshold > previousProgress) {
        this.playRelayTick(this.nextRelayIndex, scheduled * 0.055);
        scheduled += 1;
      }
      this.nextRelayIndex += 1;
    }

    if (nextProgress >= 0.999) this.scanArmed = false;
  }

  private canPlayCue() {
    return !this.disposed
      && !this.muted
      && this.status === 'running'
      && this.context?.state === 'running'
      && this.graph !== null;
  }

  private playScannerTick(position: CuePosition) {
    const context = this.context!;
    const graph = this.graph!;
    const now = context.currentTime + 0.012;
    const end = now + 0.115;
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.16, now + 0.006);
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, position);
    voice.connect(panner).connect(graph.cueBus);

    const click = context.createBufferSource();
    click.buffer = graph.noiseBuffers.transient;
    const clickFilter = context.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.value = 1850;
    clickFilter.Q.value = 2.6;
    click.connect(clickFilter).connect(voice);

    const body = context.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(620, now);
    body.frequency.exponentialRampToValueAtTime(310, end);
    const bodyGain = context.createGain();
    bodyGain.gain.value = 0.19;
    body.connect(bodyGain).connect(voice);

    const sources: AudioScheduledSourceNode[] = [click, body];
    const nodes: AudioNode[] = [voice, panner, click, clickFilter, body, bodyGain];
    this.registerOneShot(sources, nodes);
    click.start(now, 0.37, end - now);
    body.start(now);
    click.stop(end);
    body.stop(end);
  }

  private playRelayTick(index: number, delay: number) {
    const context = this.context!;
    const graph = this.graph!;
    const now = context.currentTime + 0.008 + delay;
    const end = now + 0.075;
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.082, now + 0.004);
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, {
      x: -0.42 + index * 0.27,
      y: 0.04,
      z: -1.55 - index * 0.22,
    });
    voice.connect(panner).connect(graph.cueBus);

    const click = context.createBufferSource();
    click.buffer = graph.noiseBuffers.transient;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 920 + index * 85;
    filter.Q.value = 1.45;
    click.connect(filter).connect(voice);

    const nodes: AudioNode[] = [voice, panner, click, filter];
    this.registerOneShot([click], nodes);
    click.start(now, 0.71 + index * 0.11, end - now);
    click.stop(end);
  }

  private playGateOpen(position: CuePosition) {
    const context = this.context!;
    const graph = this.graph!;
    const now = context.currentTime + 0.012;
    const end = now + 0.42;
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.14, now + 0.008);
    voice.gain.exponentialRampToValueAtTime(0.035, now + 0.095);
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, position);
    voice.connect(panner).connect(graph.cueBus);

    const latch = context.createBufferSource();
    latch.buffer = graph.noiseBuffers.transient;
    const latchFilter = context.createBiquadFilter();
    latchFilter.type = 'bandpass';
    latchFilter.frequency.value = 740;
    latchFilter.Q.value = 1.1;
    latch.connect(latchFilter).connect(voice);

    const body = context.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(104, now);
    body.frequency.exponentialRampToValueAtTime(58, now + 0.18);
    const bodyGain = context.createGain();
    bodyGain.gain.value = 0.28;
    body.connect(bodyGain).connect(voice);

    const sources: AudioScheduledSourceNode[] = [latch, body];
    const nodes: AudioNode[] = [voice, panner, latch, latchFilter, body, bodyGain];
    this.registerOneShot(sources, nodes);
    latch.start(now, 1.06, 0.24);
    body.start(now);
    latch.stop(end);
    body.stop(end);

    const practicalCount = this.reducedMotion ? 2 : 3;
    for (let index = 0; index < practicalCount; index += 1) {
      this.playPracticalClick(index, 0.14 + index * 0.105);
    }
  }

  private playPracticalClick(index: number, delay: number) {
    const context = this.context!;
    const graph = this.graph!;
    const now = context.currentTime + delay;
    const end = now + 0.055;
    const voice = context.createGain();
    voice.gain.setValueAtTime(MIN_GAIN, now);
    voice.gain.exponentialRampToValueAtTime(0.045, now + 0.003);
    voice.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    const panner = context.createPanner();
    this.configurePanner(panner, {
      x: index % 2 === 0 ? -0.58 : 0.52,
      y: 0.62,
      z: -2.2 - index * 1.15,
    });
    voice.connect(panner).connect(graph.cueBus);

    const click = context.createBufferSource();
    click.buffer = graph.noiseBuffers.transient;
    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1350 + index * 160;
    click.connect(filter).connect(voice);

    const nodes: AudioNode[] = [voice, panner, click, filter];
    this.registerOneShot([click], nodes);
    click.start(now, 0.24 + index * 0.19, end - now);
    click.stop(end);
  }

  private playRequestResolved(position: CuePosition) {
    const context = this.context!;
    const graph = this.graph!;
    const now = context.currentTime + 0.012;
    const paperEnd = now + 0.72;
    const paperVoice = context.createGain();
    paperVoice.gain.setValueAtTime(MIN_GAIN, now);
    paperVoice.gain.exponentialRampToValueAtTime(0.055, now + 0.045);
    paperVoice.gain.exponentialRampToValueAtTime(0.025, now + 0.36);
    paperVoice.gain.exponentialRampToValueAtTime(MIN_GAIN, paperEnd);
    const pan = context.createStereoPanner();
    pan.pan.setValueAtTime(this.reducedMotion ? 0 : -0.48, now);
    pan.pan.linearRampToValueAtTime(this.reducedMotion ? 0.08 : 0.56, paperEnd);
    paperVoice.connect(pan).connect(graph.cueBus);

    const paper = context.createBufferSource();
    paper.buffer = graph.noiseBuffers.transient;
    paper.playbackRate.value = 0.83;
    const paperFilter = context.createBiquadFilter();
    paperFilter.type = 'bandpass';
    paperFilter.frequency.value = 1180;
    paperFilter.Q.value = 0.68;
    paper.connect(paperFilter).connect(paperVoice);

    const stampAt = now + 0.53;
    const stampEnd = stampAt + 0.11;
    const stampVoice = context.createGain();
    stampVoice.gain.setValueAtTime(MIN_GAIN, stampAt);
    stampVoice.gain.exponentialRampToValueAtTime(0.09, stampAt + 0.005);
    stampVoice.gain.exponentialRampToValueAtTime(MIN_GAIN, stampEnd);
    const stampPanner = context.createPanner();
    this.configurePanner(stampPanner, position);
    stampVoice.connect(stampPanner).connect(graph.cueBus);
    const stamp = context.createBufferSource();
    stamp.buffer = graph.noiseBuffers.transient;
    const stampFilter = context.createBiquadFilter();
    stampFilter.type = 'lowpass';
    stampFilter.frequency.value = 640;
    stamp.connect(stampFilter).connect(stampVoice);

    const sources: AudioScheduledSourceNode[] = [paper, stamp];
    const nodes: AudioNode[] = [
      paperVoice,
      pan,
      paper,
      paperFilter,
      stampVoice,
      stampPanner,
      stamp,
      stampFilter,
    ];
    this.registerOneShot(sources, nodes);
    paper.start(now, 0.88, paperEnd - now);
    stamp.start(stampAt, 1.42, stampEnd - stampAt);
    paper.stop(paperEnd);
    stamp.stop(stampEnd);
  }

  private createNoiseBuffer(
    context: AudioContext,
    seconds: number,
    profile: NoiseProfile,
  ) {
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let seed = NOISE_SEEDS[profile];
    let slow = 0;
    let previousWhite = 0;

    for (let index = 0; index < length; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const white = seed / 0xffffffff * 2 - 1;
      slow = slow * 0.985 + white * 0.015;
      const edge = white - previousWhite * 0.72;
      previousWhite = white;

      if (profile === 'stone') channel[index] = slow * 2.45 + white * 0.035;
      else if (profile === 'room') channel[index] = slow * 0.72 + white * 0.18;
      else channel[index] = edge * 0.56 + slow * 0.14;
    }

    return buffer;
  }

  private configurePanner(panner: PannerNode, position: CuePosition) {
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
