import { useProgress } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { VerticalSliceLoader } from './VerticalSliceLoader';

type VerticalSliceLoadingGateProps = {
  cameraReady: boolean;
};

export function VerticalSliceLoadingGate({ cameraReady }: VerticalSliceLoadingGateProps) {
  const { active, loaded, progress, total } = useProgress();
  const [started, setStarted] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (active || total > 0) setStarted(true);
  }, [active, total]);

  useEffect(() => {
    if (active || loaded < total || !cameraReady) return;
    const revealDelay = total === 0 ? 450 : 180;
    const revealTimer = window.setTimeout(() => setRevealing(true), revealDelay);
    const readyTimer = window.setTimeout(() => setReady(true), revealDelay + 780);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(readyTimer);
    };
  }, [active, cameraReady, loaded, total]);

  useEffect(() => {
    if (ready) return;
    const fallbackTimer = window.setTimeout(() => setFailed(true), 8_000);
    return () => window.clearTimeout(fallbackTimer);
  }, [ready]);

  if (ready || failed) return null;
  const composedProgress = revealing
    ? 100
    : cameraReady
    ? (total === 0 ? 100 : progress)
    : Math.min(progress, 92);
  return (
    <VerticalSliceLoader
      progress={started || cameraReady ? composedProgress : 0}
      revealing={revealing}
    />
  );
}
