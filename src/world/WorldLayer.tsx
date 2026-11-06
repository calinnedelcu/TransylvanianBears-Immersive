import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { hasWebGL, useReducedMotion } from '../three/support';
import './world.css';

const World = lazy(() => import('./World'));

/**
 * Puts the 3D world behind the home page. Until its first frame is drawn, and on
 * devices without WebGL or with "reduce motion" on, the page keeps its flat colours.
 */
export function WorldLayer() {
  const reduced = useReducedMotion();
  // Only probe WebGL when the world could actually be shown.
  const enabled = useMemo(() => !reduced && typeof window !== 'undefined' && hasWebGL(), [reduced]);
  const [ready, setReady] = useState(false);

  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('has-world', enabled && ready);
    return () => root.classList.remove('has-world');
  }, [enabled, ready]);

  if (!enabled) return null;

  return (
    <Suspense fallback={null}>
      <World onReady={onReady} />
    </Suspense>
  );
}
