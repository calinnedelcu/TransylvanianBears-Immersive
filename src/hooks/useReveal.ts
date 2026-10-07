import { useEffect, useRef } from 'react';

/**
 * Adds `is-visible` the first time the element scrolls into view.
 * Without IntersectionObserver the element is simply shown.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!('IntersectionObserver' in window)) {
      element.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          element.classList.add('is-visible');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return ref;
}
