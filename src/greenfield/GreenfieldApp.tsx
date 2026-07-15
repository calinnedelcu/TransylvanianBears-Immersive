import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { GreenfieldHeader } from './components/GreenfieldHeader';
import { ProgressRail } from './components/ProgressRail';
import { StoryChapter } from './components/StoryChapter';
import { WorldStage } from './components/WorldStage';
import { SCENES } from './data';
import { useScrollDirector } from './hooks/useScrollDirector';
import type { SceneId } from './types';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useGreenfieldMode } from './hooks/useGreenfieldMode';
import './greenfield.css';

export function GreenfieldApp() {
  const rootRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();
  const [activeScene, setActiveScene] = useState<SceneId>('signal');
  const handleSceneChange = useCallback((scene: SceneId) => setActiveScene(scene), []);

  useScrollDirector({ rootRef, reducedMotion, onSceneChange: handleSceneChange });
  useGreenfieldMode('Story');

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;

    let restoreFrame = 0;
    const previousBehavior = document.documentElement.style.scrollBehavior;
    const frame = window.requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      target.scrollIntoView({ block: 'start' });
      restoreFrame = window.requestAnimationFrame(() => {
        document.documentElement.style.scrollBehavior = previousBehavior;
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(restoreFrame);
      document.documentElement.style.scrollBehavior = previousBehavior;
    };
  }, [location.hash]);

  return (
    <main ref={rootRef} className="gf-app" data-active-scene={activeScene}>
      <a className="gf-skip" href="#signal">Sari la conținut</a>
      <GreenfieldHeader />
      <WorldStage activeScene={activeScene} />
      <ProgressRail activeScene={activeScene} />

      <div className="gf-story">
        {SCENES.map((scene) => (
          <StoryChapter key={scene.id} scene={scene} />
        ))}
      </div>

      <footer className="gf-footer">
        <p>Transylvanian Bears</p>
        <p>C.N.I. Tudor Vianu / București</p>
        <p>{new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
