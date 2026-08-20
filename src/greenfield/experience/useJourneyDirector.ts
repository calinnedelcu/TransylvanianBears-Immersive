import { useLayoutEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isJourneyChapter, type JourneyChapter } from './chapters';

gsap.registerPlugin(ScrollTrigger);

const HASH_RESTORE_MAX_ATTEMPTS = 8;
const HASH_RESTORE_TOLERANCE_PX = 2;

export type JourneyTelemetry = {
  journeyProgressRef: MutableRefObject<number>;
  worldProgressRef: MutableRefObject<number>;
  /**
   * The opening beat on its own clock, 0 to 1 across the threshold section.
   *
   * World progress runs all the way to chapter eleven, which leaves the opening
   * about six percent of it. That is enough for a camera move and nowhere near
   * enough for a citadel to assemble itself, so the sequence is measured against
   * the beat it actually occupies.
   */
  heroProgressRef: MutableRefObject<number>;
  sliceProgressRef: MutableRefObject<number>;
  schoolActProgressRef: MutableRefObject<number>;
  buriedActProgressRef: MutableRefObject<number>;
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
  onHeroProgress?: (progress: number) => void;
  onWorldProgress?: (progress: number, velocity: number) => void;
  onSliceProgress?: (progress: number, velocity: number) => void;
  onSchoolActProgress?: (progress: number, velocity: number) => void;
  onBuriedActProgress?: (progress: number, velocity: number) => void;
};

export function useJourneyDirector({
  rootRef,
  reducedMotion,
  onChapterChange,
  onProgress,
  onWorldProgress,
  onHeroProgress,
  onSliceProgress,
  onSchoolActProgress,
  onBuriedActProgress,
}: JourneyDirectorOptions): JourneyTelemetry {
  const journeyProgressRef = useRef(0);
  const worldProgressRef = useRef(0);
  const heroProgressRef = useRef(0);
  const sliceProgressRef = useRef(0);
  const schoolActProgressRef = useRef(0);
  const buriedActProgressRef = useRef(0);
  const schoolEntranceHandoffProgressRef = useRef(0);
  const descentHandoffProgressRef = useRef(0);
  const velocityRef = useRef(0);
  const directionRef = useRef<-1 | 0 | 1>(0);
  const initialHashRestoredRef = useRef(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let directedChapter = root.dataset.activeChapter;
    const publishChapter = (chapter: JourneyChapter) => {
      if (directedChapter === chapter) return;
      directedChapter = chapter;
      onChapterChange(chapter);
    };

    const context = gsap.context(() => {
      const heroBeat = root.querySelector<HTMLElement>('#mf-threshold');
      const worldEnd = root.querySelector<HTMLElement>('#mf-infect');
      const sliceEnd = root.querySelector<HTMLElement>('#mf-passage');
      const schoolActStart = root.querySelector<HTMLElement>('#mf-passage');
      const schoolActEnd = root.querySelector<HTMLElement>('#mf-descent');
      const buriedActStart = root.querySelector<HTMLElement>('#mf-descent');
      const buriedLamp = root.querySelector<HTMLElement>('#mf-lamp');
      const buriedBuild = root.querySelector<HTMLElement>('#mf-build');
      const buriedActEnd = root.querySelector<HTMLElement>('#mf-infect');
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
      const lensKnot = root.querySelector<HTMLElement>('.mf-lens-knot');
      const traceKnot = root.querySelector<HTMLElement>('.mf-trace-knot');
      const schoolBridge = root.querySelector<HTMLElement>('.mf-school-bridge');
      const schoolBridgeCopy = schoolBridge?.querySelector<HTMLElement>('.mf-school-bridge__copy');
      const updateCssProgress = (progress: number) => {
        root.style.setProperty('--mf-progress', progress.toFixed(4));
      };

      if (threshold && thresholdCopy && !reducedMotion) {
        gsap.to(thresholdCopy, {
          opacity: 0,
          y: -24,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: threshold,
            start: '28% top',
            end: '58% top',
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
        && lensKnot
        && !reducedMotion
      ) {
        const compactProofHandoff = window.matchMedia('(max-width: 820px)').matches;
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
          .fromTo(lensKnot, {
            autoAlpha: 1,
            y: 0,
          }, {
            autoAlpha: 0,
            y: -20,
            duration: 0.18,
            ease: 'none',
          }, 0)
          .fromTo(proofHandoff, {
            autoAlpha: 0,
          }, {
            autoAlpha: 1,
            duration: 0.1,
            ease: 'none',
          }, 0.14)
          .fromTo(proofFrame, {
            width: '26vmin',
            height: '18vmin',
            borderRadius: '0%',
            rotate: 0,
          }, {
            width: '100vw',
            height: '100dvh',
            borderRadius: '0%',
            rotate: 0,
            duration: 0.44,
            ease: 'power2.inOut',
          }, 0.16)
          .fromTo(proofPaper, {
            clipPath: 'inset(41% 37% round 0%)',
          }, {
            clipPath: 'inset(0% 0% round 0%)',
            duration: 0.44,
            ease: 'power2.inOut',
          }, 0.16)
          .fromTo(proofValidationImage, {
            opacity: 1,
            scale: 1,
            clipPath: compactProofHandoff
              ? 'inset(0% 100% 0% 0%)'
              : 'inset(0% 50% 0% 50%)',
          }, {
            opacity: 1,
            scale: 1,
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 0.24,
            ease: 'power2.inOut',
          }, 0.5)
          .fromTo(proofFieldImage, {
            width: '100%',
          }, {
            width: compactProofHandoff ? '100%' : '55%',
            duration: 0.24,
            ease: 'power2.inOut',
          }, 0.5)
          .to(proofFrame, {
            opacity: 0,
            duration: 0.16,
            ease: 'none',
          }, 0.78)
          .to(proofHandoff, {
            autoAlpha: 0,
            duration: 0.12,
            ease: 'none',
          }, 0.88);
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

      if (heroBeat) {
        ScrollTrigger.create({
          id: 'journey-hero',
          trigger: heroBeat,
          start: 'top top',
          end: 'bottom top',
          onUpdate: (self) => {
            heroProgressRef.current = reducedMotion ? 1 : self.progress;
            onHeroProgress?.(heroProgressRef.current);
          },
        });
      }

      if (worldEnd) {
        ScrollTrigger.create({
          id: 'journey-world',
          trigger: root,
          start: 'top top',
          endTrigger: worldEnd,
          end: 'top top',
          onUpdate: (self) => {
            worldProgressRef.current = reducedMotion ? 1 : self.progress;
            onWorldProgress?.(worldProgressRef.current, velocityRef.current);
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

      if (buriedActStart && buriedActEnd) {
        ScrollTrigger.create({
          id: 'journey-buried-act',
          trigger: buriedActStart,
          start: 'top top',
          endTrigger: buriedActEnd,
          end: 'top top',
          onUpdate: (self) => {
            const progress = remapBuriedActProgress(
              self.progress,
              buriedActStart,
              buriedLamp,
              buriedBuild,
              buriedActEnd,
            );
            buriedActProgressRef.current = progress;
            root.dataset.buriedActProgress = progress.toFixed(4);
            onBuriedActProgress?.(progress, velocityRef.current);
          },
        });
      }

      root.querySelectorAll<HTMLElement>('[data-chapter]').forEach((element) => {
        const chapter = element.dataset.chapter;
        if (!isJourneyChapter(chapter)) return;
        if (!element.hasAttribute('tabindex')) element.tabIndex = -1;

        ScrollTrigger.create({
          trigger: element,
          start: 'top 46%',
          end: 'bottom 46%',
          onEnter: () => publishChapter(chapter),
          onEnterBack: () => publishChapter(chapter),
          onRefresh: (self) => {
            if (self.isActive) publishChapter(chapter);
          },
          onUpdate: (self) => {
            if (self.isActive) publishChapter(chapter);
          },
        });
      });
    }, root);

    ScrollTrigger.refresh();
    let hashRestoreFrame = 0;
    if (!initialHashRestoredRef.current && window.location.hash.length > 1) {
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      const target = document.getElementById(targetId);
      if (target && root.contains(target)) {
        const targetChapter = target.dataset.chapter;
        const expectedHash = `#${targetId}`;
        let hashRestoreAttempt = 0;
        const restoreHash = () => {
          if (window.location.hash !== expectedHash) {
            initialHashRestoredRef.current = true;
            return;
          }
          hashRestoreAttempt += 1;
          ScrollTrigger.refresh();
          const scrollPadding = Number.parseFloat(
            getComputedStyle(document.documentElement).scrollPaddingTop,
          ) || 0;
          const offset = target.getBoundingClientRect().top - scrollPadding;
          if (Math.abs(offset) > HASH_RESTORE_TOLERANCE_PX) {
            window.scrollTo({ top: window.scrollY + offset, behavior: 'auto' });
          }
          ScrollTrigger.update();

          if (isJourneyChapter(targetChapter) && root.dataset.activeChapter !== targetChapter) {
            publishChapter(targetChapter);
          }

          hashRestoreFrame = window.requestAnimationFrame(() => {
            if (window.location.hash !== expectedHash) {
              initialHashRestoredRef.current = true;
              return;
            }
            const verifiedScrollPadding = Number.parseFloat(
              getComputedStyle(document.documentElement).scrollPaddingTop,
            ) || 0;
            const verifiedOffset = target.getBoundingClientRect().top - verifiedScrollPadding;
            const chapterRestored = !isJourneyChapter(targetChapter)
              || root.dataset.activeChapter === targetChapter;
            if (
              (Math.abs(verifiedOffset) <= HASH_RESTORE_TOLERANCE_PX && chapterRestored)
              || hashRestoreAttempt >= HASH_RESTORE_MAX_ATTEMPTS
            ) {
              if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
              target.focus({ preventScroll: true });
              initialHashRestoredRef.current = true;
              return;
            }
            hashRestoreFrame = window.requestAnimationFrame(restoreHash);
          });
        };
        hashRestoreFrame = window.requestAnimationFrame(restoreHash);
      }
    }
    return () => {
      window.cancelAnimationFrame(hashRestoreFrame);
      context.revert();
      root.style.removeProperty('--mf-progress');
      delete root.dataset.buriedActProgress;
    };
  }, [onBuriedActProgress, onChapterChange, onHeroProgress, onProgress, onSchoolActProgress, onSliceProgress, onWorldProgress, reducedMotion, rootRef]);

  return {
    journeyProgressRef,
    worldProgressRef,
    heroProgressRef,
    sliceProgressRef,
    schoolActProgressRef,
    buriedActProgressRef,
    schoolEntranceHandoffProgressRef,
    descentHandoffProgressRef,
    velocityRef,
    directionRef,
  };
}

function dampSigned(current: number, target: number, amount: number) {
  return current + (target - current) * amount;
}

function remapBuriedActProgress(
  rawProgress: number,
  start: HTMLElement,
  lamp: HTMLElement | null,
  build: HTMLElement | null,
  end: HTMLElement,
) {
  if (!lamp || !build) return rawProgress;

  const totalDistance = end.offsetTop - start.offsetTop;
  if (totalDistance <= 0) return rawProgress;

  const lampBoundary = (lamp.offsetTop - start.offsetTop) / totalDistance;
  const buildBoundary = (build.offsetTop - start.offsetTop) / totalDistance;
  const segment = (value: number, from: number, to: number) => (
    Math.max(0, Math.min(1, (value - from) / Math.max(0.0001, to - from)))
  );

  if (rawProgress < lampBoundary) {
    return segment(rawProgress, 0, lampBoundary) * 0.18;
  }
  if (rawProgress < buildBoundary) {
    return 0.18 + segment(rawProgress, lampBoundary, buildBoundary) * 0.43;
  }
  return 0.61 + segment(rawProgress, buildBoundary, 1) * 0.39;
}
