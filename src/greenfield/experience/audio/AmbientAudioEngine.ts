import type { JourneyChapter, JourneyTone } from '../chapters';

const TONE_FREQUENCIES: Record<JourneyTone, [number, number]> = {
  mineral: [146.83, 220],
  cyan: [174.61, 261.63],
  paper: [196, 293.66],
  brass: [130.81, 246.94],
  moss: [110, 196],
  mercury: [98, 146.83],
  vermilion: [82.41, 164.81],
  dawn: [220, 329.63],
};

const TONE_BED_LEVELS: Record<JourneyTone, number> = {
  mineral: 0.019,
  cyan: 0.016,
  paper: 0.011,
  brass: 0.018,
  moss: 0.017,
  mercury: 0.023,
  vermilion: 0.02,
  dawn: 0.026,
};

export class AmbientAudioEngine {
  private context: AudioContext | null = null;
  private readonly ownsContext: boolean;
  private master: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windPan: StereoPannerNode | null = null;
  private toneGain: GainNode | null = null;
  private toneFilter: BiquadFilterNode | null = null;
  private toneOscillators: OscillatorNode[] = [];
  private sources: AudioScheduledSourceNode[] = [];
  private enabled = false;
  private lastChapter: JourneyChapter | null = null;

  constructor(context?: AudioContext) {
    this.context = context ?? null;
    this.ownsContext = context === undefined;
  }

  async enable() {
    this.ensureGraph();
    if (!this.context || !this.master) return false;
    await this.context.resume();
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0.72, now + 0.9);
    this.enabled = true;
    return this.context.state === 'running';
  }

  mute() {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + 0.18);
    this.enabled = false;
  }

  update(progress: number, velocity: number) {
    if (!this.context || !this.windGain || !this.windFilter || !this.windPan) return;
    const now = this.context.currentTime;
    const speed = Math.min(1, Math.abs(velocity));
    this.windGain.gain.setTargetAtTime(0.018 + speed * 0.045, now, 0.12);
    this.windFilter.frequency.setTargetAtTime(420 + progress * 240 + speed * 760, now, 0.14);
    this.windPan.pan.setTargetAtTime(Math.sin(progress * Math.PI * 2) * 0.18, now, 0.2);
    this.toneFilter?.frequency.setTargetAtTime(310 + progress * 170 + speed * 240, now, 0.24);
  }

  enterChapter(chapter: JourneyChapter, tone: JourneyTone) {
    if (!this.enabled || chapter === this.lastChapter) return;
    this.lastChapter = chapter;
    this.morphTone(tone);
    this.playCue(tone);
  }

  dispose() {
    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // A one-shot source may already be stopped.
      }
    });
    this.sources = [];
    if (this.ownsContext) void this.context?.close();
    this.context = null;
    this.master = null;
    this.windGain = null;
    this.windFilter = null;
    this.windPan = null;
    this.toneGain = null;
    this.toneFilter = null;
    this.toneOscillators = [];
  }

  private ensureGraph() {
    if (this.master) return;
    const AudioContextClass = window.AudioContext;
    const context = this.context ?? (AudioContextClass ? new AudioContextClass({ latencyHint: 'interactive' }) : null);
    if (!context) return;
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    const toneGain = context.createGain();
    toneGain.gain.value = TONE_BED_LEVELS.mineral;
    const toneFilter = context.createBiquadFilter();
    toneFilter.type = 'lowpass';
    toneFilter.frequency.value = 360;
    toneFilter.Q.value = 0.6;
    toneGain.connect(toneFilter).connect(master);

    [TONE_FREQUENCIES.mineral[0] / 3, TONE_FREQUENCIES.mineral[1] / 4].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 0 ? -5 : 7;
      gain.gain.value = index === 0 ? 0.42 : 0.11;
      oscillator.connect(gain).connect(toneGain);
      oscillator.start();
      this.sources.push(oscillator);
      this.toneOscillators.push(oscillator);
    });

    const windSource = context.createBufferSource();
    windSource.buffer = this.createNoiseBuffer(context, 4);
    windSource.loop = true;
    const windFilter = context.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 480;
    windFilter.Q.value = 0.72;
    const windPan = context.createStereoPanner();
    const windGain = context.createGain();
    windGain.gain.value = 0.018;
    windSource.connect(windFilter).connect(windPan).connect(windGain).connect(master);
    windSource.start();

    this.context = context;
    this.master = master;
    this.windGain = windGain;
    this.windFilter = windFilter;
    this.windPan = windPan;
    this.toneGain = toneGain;
    this.toneFilter = toneFilter;
    this.sources.push(windSource);
  }

  private morphTone(tone: JourneyTone) {
    if (!this.context || !this.toneGain || this.toneOscillators.length < 2) return;
    const now = this.context.currentTime;
    const [root, harmonic] = TONE_FREQUENCIES[tone];
    const targets = [root / 3, harmonic / 4];
    this.toneOscillators.forEach((oscillator, index) => {
      oscillator.frequency.cancelScheduledValues(now);
      oscillator.frequency.setTargetAtTime(targets[index], now, tone === 'vermilion' ? 0.18 : 0.72);
      oscillator.detune.setTargetAtTime(index === 0 ? -5 : 7, now, 0.4);
    });
    this.toneGain.gain.cancelScheduledValues(now);
    this.toneGain.gain.setTargetAtTime(TONE_BED_LEVELS[tone], now, 0.65);
  }

  private createNoiseBuffer(context: AudioContext, seconds: number) {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let seed = 0x2f6e2b1;
    let previous = 0;

    for (let index = 0; index < length; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const white = seed / 0xffffffff * 2 - 1;
      previous = previous * 0.985 + white * 0.015;
      channel[index] = previous * 2.8;
    }

    return buffer;
  }

  private playCue(tone: JourneyTone) {
    if (!this.context || !this.master) return;
    const [root, harmonic] = TONE_FREQUENCIES[tone];
    const now = this.context.currentTime + 0.02;

    [root, harmonic].forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      const pan = this.context!.createStereoPanner();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.996, now + 1.6);
      pan.pan.value = index === 0 ? -0.22 : 0.28;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.055 : 0.018, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      oscillator.connect(gain).connect(pan).connect(this.master!);
      oscillator.start(now);
      oscillator.stop(now + 1.85);
    });
  }
}
