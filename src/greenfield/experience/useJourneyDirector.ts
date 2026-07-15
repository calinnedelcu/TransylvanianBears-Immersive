import { useLayoutEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isJourneyChapter, type JourneyChapter } from './chapters';

gsap.registerPlugin(ScrollTrigger);

export type JourneyTelemetry = {
  journeyProgressRef: MutableRefObject<number>;
  worldProgressRef: MutableRefObject<number>;
  velocityRef: MutableRefObject<number>;
  directionRef: MutableRefObject<-1 | 0 | 1>;
};

type JourneyDirectorOptions = {
  rootRef: RefObject<HTMLElement | null>;
  reducedMotion: boolean;
  onChapterChange: (chapter: JourneyChapter) => void;
  onProgress?: (progress: number, velocity: number) => void;
};

export function useJourneyDirector({
  rootRef,
  reducedMotion,
  onChapterChange,
  onProgress,
}: JourneyDirectorOptions): JourneyTelemetry {
  const journeyProgressRef = useRef(0);
  const worldProgressRef = useRef(0);
  const velocityRef = useRef(0);
  const directionRef = useRef<-1 | 0 | 1>(0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const context = gsap.context(() => {
      const worldEnd = root.querySelector<HTMLElement>('#mf-infect');
      const updateCssProgress = (progress: number) => {
        root.style.setProperty('--mf-progress', progress.toFixed(4));
      };

      ScrollTrigger.create({
        id: 'journey-global',
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          const velocity = reducedMotion ? 0 : dampSigned(velocityRef.current, self.getVelocity() / 1800, 0.18);
          journeyProgressRef.current = self.progress;
          velocityRef.current = velocity;
          directionRef.current = Math.abs(velocity) < 0.012 ? 0 : velocity > 0 ? 1 : -1;
          updateCssProgress(self.progress);
          onProgress?.(self.progress, velocity);
        },
      });

      if (worldEnd) {
        ScrollTrigger.create({
          id: 'journey-world',
          trigger: root,
          start: 'top top',
          endTrigger: worldEnd,
          end: 'top top',
          onUpdate: (self) => {
            worldProgressRef.current = reducedMotion ? 1 : self.progress;
          },
        });
      }

      root.querySelectorAll<HTMLElement>('[data-chapter]').forEach((element) => {
        const chapter = element.dataset.chapter;
        if (!isJourneyChapter(chapter)) return;

        ScrollTrigger.create({
          trigger: element,
          start: 'top 46%',
          end: 'bottom 46%',
          onEnter: () => onChapterChange(chapter),
          onEnterBack: () => onChapterChange(chapter),
        });
      });
    }, root);

    ScrollTrigger.refresh();
    return () => {
      context.revert();
      root.style.removeProperty('--mf-progress');
    };
  }, [onChapterChange, onProgress, reducedMotion, rootRef]);

  return { journeyProgressRef, worldProgressRef, velocityRef, directionRef };
}

function dampSigned(current: number, target: number, amount: number) {
  return current + (target - current) * amount;
}
