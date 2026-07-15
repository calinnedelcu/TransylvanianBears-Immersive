import { useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type EditorialDirectorOptions = {
  rootRef: RefObject<HTMLElement | null>;
  reducedMotion: boolean;
};

export function useEditorialDirector({ rootRef, reducedMotion }: EditorialDirectorOptions) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const tracked = Array.from(root.querySelectorAll<HTMLElement>('[data-gf-motion]'));

    if (reducedMotion) {
      tracked.forEach((element) => {
        element.style.setProperty('--motion-y', '0px');
        element.style.setProperty('--motion-y-inverse', '0px');
        element.style.setProperty('--motion-y-soft', '0px');
      });
      return;
    }

    const context = gsap.context(() => {
      tracked.forEach((element) => {
        ScrollTrigger.create({
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => {
            if (self.isActive) element.dataset.motionActive = 'true';
            else delete element.dataset.motionActive;
          },
          onUpdate: (self) => {
            const centered = self.progress - 0.5;
            element.style.setProperty('--motion-y', `${centered * -44}px`);
            element.style.setProperty('--motion-y-inverse', `${centered * 44}px`);
            element.style.setProperty('--motion-y-soft', `${centered * -18}px`);
          },
        });
      });
    }, root);

    ScrollTrigger.refresh();

    return () => {
      context.revert();
      tracked.forEach((element) => {
        element.style.removeProperty('--motion-y');
        element.style.removeProperty('--motion-y-inverse');
        element.style.removeProperty('--motion-y-soft');
        delete element.dataset.motionActive;
      });
    };
  }, [reducedMotion, rootRef]);
}
