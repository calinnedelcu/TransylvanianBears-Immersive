import { useLayoutEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isJourneyChapter, type JourneyChapter } from './chapters';

gsap.registerPlugin(ScrollTrigger);

export type JourneyTelemetry = {
  journeyProgressRef: MutableRefObject<number>;
  worldProgressRef: MutableRefObject<number>;
  sliceProgressRef: MutableRefObject<number>;
  schoolActProgressRef: MutableRefObject<number>;
  schoolEntranceHandoffProgressRef: MutableRefObject<number>;
  descentHandoffProgressRef: MutableRefObject<number>;
  velocityRef: MutableRefObject<number>;
  directionRef: MutableRefObject<-1 | 0 | 1>;
};

type JourneyDirectorOptions = {
  rootRef: RefObject<HTMLElement | null>;
  reducedMotion: boolean;
  onChapterChange: (chapter: JourneyChapter) => void;
  onProgress?: (progress: number, velocity: number) => void;
  onSliceProgress?: (progress: number, velocity: number) => void;
  onSchoolActProgress?: (progress: number, velocity: number) => void;
};

export function useJourneyDirector({
  rootRef,
  reducedMotion,
  onChapterChange,
  onProgress,
  onSliceProgress,
  onSchoolActProgress,
}: JourneyDirectorOptions): JourneyTelemetry {
  const journeyProgressRef = useRef(0);
  const worldProgressRef = useRef(0);
  const sliceProgressRef = useRef(0);
  const schoolActProgressRef = useRef(0);
  const schoolEntranceHandoffProgressRef = useRef(0);
  const descentHandoffProgressRef = useRef(0);
  const velocityRef = useRef(0);
  const directionRef = useRef<-1 | 0 | 1>(0);
  const initialHashRestoredRef = useRef(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const context = gsap.context(() => {
      const worldEnd = root.querySelector<HTMLElement>('#mf-infect');
      const sliceEnd = root.querySelector<HTMLElement>('#mf-passage');
      const schoolActStart = root.querySelector<HTMLElement>('#mf-passage');
      const schoolActEnd = root.querySelector<HTMLElement>('#mf-descent');
      const descentHandoffStart = root.querySelector<HTMLElement>('#mf-descent');
      const descentHandoffEnd = root.querySelector<HTMLElement>('#mf-lamp');
      const threshold = root.querySelector<HTMLElement>('#mf-threshold');
      const thresholdCopy = threshold?.querySelector<HTMLElement>('.mf-copy--hero');
      const proof = root.querySelector<HTMLElement>('#mf-proof');
      const proofHandoff = proof?.querySelector<HTMLElement>('.mf-proof-handoff');
      const proofPaper = proofHandoff?.querySelector<HTMLElement>('.mf-proof-handoff__paper');
      const proofFrame = proofHandoff?.querySelector<HTMLElement>('.mf-proof-handoff__frame');
      const proofFieldImage = proofPaper?.querySelector<HTMLElement>('.mf-proof-handoff__image--field');
      const proofValidationImage = proofPaper?.querySelector<HTMLElement>('.mf-proof-handoff__image--validation');
      const traceKnot = root.querySelector<HTMLElement>('.mf-trace-knot');
      const schoolBridge = root.querySelector<HTMLElement>('.mf-school-bridge');
      const schoolBridgeCopy = schoolBridge?.querySelector<HTMLElement>('.mf-school-bridge__copy');
      const updateCssProgress = (progress: number) => {
        root.style.setProperty('--mf-progress', progress.toFixed(4));
      };

      if (threshold && thresholdCopy && !reducedMotion) {
        gsap.to(thresholdCopy, {
          opacity: 0,
          y: -44,
          scale: 0.975,
          filter: 'blur(5px)',
          ease: 'none',
          scrollTrigger: {
            trigger: threshold,
            start: '22% top',
            end: '52% top',
            scrub: true,
          },
        });
      }

      if (
        proof
        && proofHandoff
        && proofPaper
        && proofFrame
        && proofFieldImage
        && proofValidationImage
        && !reducedMotion
      ) {
        const handoffTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: proof,
            start: 'top 96%',
            end: 'top 18%',
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        handoffTimeline
          .fromTo(proofHandoff, {
            autoAlpha: 0,
          }, {
            autoAlpha: 1,
            duration: 0.12,
            ease: 'none',
          })
          .fromTo(proofFrame, {
            width: '18vmin',
            height: '18vmin',
            borderRadius: '50%',
            rotate: -2,
          }, {
            width: '86vw',
            height: '78vh',
            borderRadius: '0%',
            rotate: 0,
            duration: 0.72,
            ease: 'power2.inOut',
          }, 0)
          .fromTo(proofPaper, {
            clipPath: 'inset(46% 46% round 50%)',
          }, {
            clipPath: 'inset(0% 0% round 0%)',
            duration: 0.82,
            ease: 'power2.inOut',
          }, 0.02)
          .fromTo(proofFieldImage, {
            opacity: 1,
            scale: 1,
          }, {
            opacity: 0,
            scale: 1.045,
            duration: 0.4,
            ease: 'power1.inOut',
          }, 0.34)
          .fromTo(proofValidationImage, {
            opacity: 0,
            scale: 1.06,
          }, {
            opacity: 1,
            scale: 1,
            duration: 0.46,
            ease: 'power2.out',
          }, 0.38)
          .to(proofFrame, {
            opacity: 0,
            duration: 0.16,
            ease: 'none',
          }, 0.74)
          .to(proofHandoff, {
            autoAlpha: 0,
            duration: 0.12,
            ease: 'none',
          }, 0.86);
      }

      if (traceKnot && schoolBridge && schoolBridgeCopy && !reducedMotion) {
        gsap.fromTo(traceKnot, {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
        }, {
          opacity: 0,
          y: -26,
          filter: 'blur(4px)',
          ease: 'none',
          scrollTrigger: {
            trigger: schoolBridge,
            start: 'top 55%',
            end: 'top 8%',
            scrub: true,
          },
        });
        gsap.fromTo(schoolBridgeCopy, {
          opacity: 0,
          y: 48,
        }, {
          opacity: 1,
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: schoolBridge,
            start: 'top 62%',
            end: 'top 18%',
            scrub: true,
          },
        });
      }

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

      if (sliceEnd) {
        ScrollTrigger.create({
          id: 'journey-vertical-slice',
          trigger: root,
          start: 'top top',
          endTrigger: sliceEnd,
          end: 'top top',
          onUpdate: (self) => {
            sliceProgressRef.current = self.progress;
            onSliceProgress?.(self.progress, velocityRef.current);
          },
        });
      }

      if (schoolActStart && schoolActEnd) {
        ScrollTrigger.create({
          id: 'journey-school-entrance-handoff',
          trigger: schoolActStart,
          start: 'top 46%',
          end: 'top top',
          onUpdate: (self) => {
            schoolEntranceHandoffProgressRef.current = self.progress;
          },
        });

        ScrollTrigger.create({
          id: 'journey-school-act',
          trigger: schoolActStart,
          start: 'top top',
          endTrigger: schoolActEnd,
          end: 'top top',
          onUpdate: (self) => {
            schoolActProgressRef.current = self.progress;
            onSchoolActProgress?.(self.progress, velocityRef.current);
          },
        });
      }

      if (descentHandoffStart && descentHandoffEnd) {
        ScrollTrigger.create({
          id: 'journey-descent-handoff',
          trigger: descentHandoffStart,
          start: 'top 46%',
          endTrigger: descentHandoffEnd,
          end: 'top 46%',
          onUpdate: (self) => {
            descentHandoffProgressRef.current = self.progress;
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
    let hashRestoreFrame = 0;
    if (!initialHashRestoredRef.current && window.location.hash.length > 1) {
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      const target = document.getElementById(targetId);
      if (target && root.contains(target)) {
        hashRestoreFrame = window.requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          const scrollPadding = Number.parseFloat(
            getComputedStyle(document.documentElement).scrollPaddingTop,
          ) || 0;
          const top = window.scrollY + target.getBoundingClientRect().top - scrollPadding;
          window.scrollTo({ top, behavior: 'auto' });
          ScrollTrigger.update();
          initialHashRestoredRef.current = true;
        });
      }
    }
    return () => {
      window.cancelAnimationFrame(hashRestoreFrame);
      context.revert();
      root.style.removeProperty('--mf-progress');
    };
  }, [onChapterChange, onProgress, onSchoolActProgress, onSliceProgress, reducedMotion, rootRef]);

  return {
    journeyProgressRef,
    worldProgressRef,
    sliceProgressRef,
    schoolActProgressRef,
    schoolEntranceHandoffProgressRef,
    descentHandoffProgressRef,
    velocityRef,
    directionRef,
  };
}

function dampSigned(current: number, target: number, amount: number) {
  return current + (target - current) * amount;
}
