import { useProgress } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { VerticalSliceLoader } from './VerticalSliceLoader';

type VerticalSliceLoadingGateProps = {
  cameraReady: boolean;
};

export function VerticalSliceLoadingGate({ cameraReady }: VerticalSliceLoadingGateProps) {
  const { active, loaded, progress, total } = useProgress();
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (active || total > 0) setStarted(true);
  }, [active, total]);

  useEffect(() => {
    if (active || loaded < total || !cameraReady) return;
    const timer = window.setTimeout(() => setReady(true), total === 0 ? 450 : 180);
    return () => window.clearTimeout(timer);
  }, [active, cameraReady, loaded, total]);

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => setReady(true), 8_000);
    return () => window.clearTimeout(fallbackTimer);
  }, []);

  if (ready) return null;
  const composedProgress = cameraReady
    ? (total === 0 ? 100 : progress)
    : Math.min(progress, 92);
  return <VerticalSliceLoader progress={started || cameraReady ? composedProgress : 0} />;
}
