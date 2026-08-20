import { useEffect, type ReactNode } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { setSmoothScroll } from './smoothScroll';

gsap.registerPlugin(ScrollTrigger);

function LenisGsapBridge({ disabled }: { disabled: boolean }) {
  const lenis = useLenis();

  useEffect(() => {
    setSmoothScroll(lenis ?? null);
    return () => setSmoothScroll(null);
  }, [lenis]);

  useEffect(() => {
    if (!lenis || disabled) return;

    const update = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off('scroll', ScrollTrigger.update);
      gsap.ticker.remove(update);
    };
  }, [disabled, lenis]);

  return null;
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <ReactLenis
      root
      options={{
        autoRaf: false,
        duration: reducedMotion ? 0 : 1.05,
        easing: (value) => Math.min(1, 1.001 - 2 ** (-10 * value)),
        smoothWheel: !reducedMotion,
        syncTouch: false,
        wheelMultiplier: 0.86,
        touchMultiplier: 1.1,
        anchors: { offset: 0 },
        autoResize: true,
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
      }}
    >
      <LenisGsapBridge disabled={reducedMotion} />
      {children}
    </ReactLenis>
  );
}
