import { useCallback, useEffect, useRef } from 'react';
import type { JourneyChapter, JourneyTone } from '../chapters';
import { AmbientAudioEngine } from './AmbientAudioEngine';

type AmbientAudioOptions = {
  enabled: boolean;
  onEnabled: () => void;
  onMuted: () => void;
  getContext?: () => AudioContext | null;
};

export function useAmbientAudio({ enabled, onEnabled, onMuted, getContext }: AmbientAudioOptions) {
  const engineRef = useRef<AmbientAudioEngine | null>(null);

  const getEngine = useCallback(() => {
    engineRef.current ??= new AmbientAudioEngine(getContext?.() ?? undefined);
    return engineRef.current;
  }, [getContext]);

  const toggle = useCallback(async () => {
    const engine = getEngine();
    if (enabled) {
      engine.mute();
      onMuted();
      return false;
    }

    const started = await engine.enable();
    if (started) onEnabled();
    return started;
  }, [enabled, getEngine, onEnabled, onMuted]);

  const update = useCallback((progress: number, velocity: number) => {
    engineRef.current?.update(progress, velocity);
  }, []);

  const enterChapter = useCallback((chapter: JourneyChapter, tone: JourneyTone) => {
    engineRef.current?.enterChapter(chapter, tone);
  }, []);

  useEffect(() => {
    if (!enabled) engineRef.current?.mute();
  }, [enabled]);

  useEffect(() => () => engineRef.current?.dispose(), []);

  return { toggle, update, enterChapter };
}
