import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { syncSmoothScroll } from '../../components/smoothScroll';

const RANGES: Record<string, [string, string]> = {
  'project-nexus': ['mf-lens', 'mf-proof'],
  aegis: ['mf-access', 'mf-access'],
  schoolmate: ['mf-schoolmate', 'mf-schoolmate'],
  'the-buried-hands': ['mf-descent', 'mf-build'],
  'economy-news': ['rc-economy', 'rc-economy'],
  'automation-risk': ['rc-automation', 'rc-automation'],
  'infect-exe': ['mf-infect', 'mf-infect'],
};

/** Preserve the authored camera's document coordinates while containing project playback. */
export function useProjectScrollBounds() {
  const { search } = useLocation();
  const slug = new URLSearchParams(search).get('project');
  useLayoutEffect(() => {
    const range = slug && RANGES[slug];
    if (!range) return;
    let correcting = false;
    const savedInert = new Map<HTMLElement, boolean>();
    const bounds = () => {
      const start = document.getElementById(range[0]);
      const end = document.getElementById(range[1]);
      if (!start || !end) return null;
      const min = window.scrollY + start.getBoundingClientRect().top;
      const max = Math.max(min, window.scrollY + end.getBoundingClientRect().bottom - innerHeight);
      document.querySelectorAll<HTMLElement>('.mf-lab [data-chapter], .rc-paper').forEach((element) => {
        if (!savedInert.has(element)) savedInert.set(element, element.inert);
        const rect = element.getBoundingClientRect();
        const outside = rect.bottom + scrollY <= min + 1 || rect.top + scrollY >= max + innerHeight - 1;
        element.inert = savedInert.get(element)! || outside;
      });
      return { min, max };
    };
    const clamp = () => {
      if (correcting) return;
      const limits = bounds();
      if (!limits) return;
      const target = Math.max(limits.min, Math.min(limits.max, window.scrollY));
      document.documentElement.toggleAttribute('data-project-end', target >= limits.max - 2);
      if (Math.abs(target - window.scrollY) < 0.5) return;
      correcting = true;
      window.scrollTo({ top: target, behavior: 'instant' });
      syncSmoothScroll(target);
      correcting = false;
    };
    const wheel = (event: WheelEvent) => {
      // Keep menus and project media independently scrollable.
      if ((event.target as Element).closest('.experience-nav nav, .mf-proof-lab__viewport')) return;
      const limits = bounds();
      if (!limits) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      const proposed = scrollY + delta;
      if (proposed < limits.min || proposed > limits.max) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const target = Math.max(limits.min, Math.min(limits.max, proposed));
        window.scrollTo({ top: target, behavior: 'instant' });
        syncSmoothScroll(target);
      }
    };
    window.addEventListener('scroll', clamp, { passive: true });
    window.addEventListener('resize', clamp);
    window.addEventListener('wheel', wheel, { passive: false, capture: true });
    const observer = new ResizeObserver(clamp);
    observer.observe(document.body);
    clamp();
    return () => {
      observer.disconnect();
      document.documentElement.removeAttribute('data-project-end');
      savedInert.forEach((value, element) => { element.inert = value; });
      window.removeEventListener('scroll', clamp);
      window.removeEventListener('resize', clamp);
      window.removeEventListener('wheel', wheel, true);
    };
  }, [slug]);
}
