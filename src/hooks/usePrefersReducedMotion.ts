import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const getInitial = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
};

export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState<boolean>(getInitial);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduce;
}
