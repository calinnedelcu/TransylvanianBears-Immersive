import { useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SceneId } from '../types';

gsap.registerPlugin(ScrollTrigger);

type ScrollDirectorOptions = {
  rootRef: RefObject<HTMLElement | null>;
  reducedMotion: boolean;
  onSceneChange: (scene: SceneId) => void;
};

export function useScrollDirector({ rootRef, reducedMotion, onSceneChange }: ScrollDirectorOptions) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scenes = Array.from(root.querySelectorAll<HTMLElement>('[data-gf-scene]'));
    const setProgress = (progress: number) => {
      const centered = progress - 0.5;
      root.style.setProperty('--scene-progress', progress.toFixed(4));
      root.style.setProperty('--scene-shift', `${centered * 72}px`);
      root.style.setProperty('--scene-rotate', `${centered * 8}deg`);
    };

    const context = gsap.context(() => {
      scenes.forEach((scene) => {
        const id = scene.dataset.gfScene as SceneId;

        ScrollTrigger.create({
          trigger: scene,
          start: 'top 55%',
          end: 'bottom 45%',
          onEnter: () => onSceneChange(id),
          onEnterBack: () => onSceneChange(id),
          onUpdate: (self) => {
            if (!self.isActive) return;
            setProgress(reducedMotion ? (self.progress < 0.5 ? 0 : 1) : self.progress);
          },
        });
      });

      ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          root.style.setProperty('--world-progress', self.progress.toFixed(4));
        },
      });
    }, root);

    ScrollTrigger.refresh();

    return () => {
      context.revert();
      root.style.removeProperty('--scene-progress');
      root.style.removeProperty('--scene-shift');
      root.style.removeProperty('--scene-rotate');
      root.style.removeProperty('--world-progress');
    };
  }, [onSceneChange, reducedMotion, rootRef]);
}
