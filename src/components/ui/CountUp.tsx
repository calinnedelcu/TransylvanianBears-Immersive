import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { cn } from '../../lib/utils';

type CountUpProps = {
  end: number;
  start?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  /** When true, uses easing curve (default). When false, linear. */
  ease?: boolean;
  /** Group thousands with locale separator. Disable for years. Default true. */
  grouping?: boolean;
};

// easeOutCubic
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function CountUp({
  end,
  start = 0,
  duration = 1800,
  suffix = '',
  prefix = '',
  className,
  ease = true,
  grouping = true,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [value, setValue] = useState(start);

  useEffect(() => {
    if (!inView) return;

    // Honor reduced motion: jump straight to the end.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValue(end);
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = ease ? easeOut(t) : t;
      setValue(start + (end - start) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, start, duration, ease]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {grouping
        ? Math.round(value).toLocaleString('ro-RO')
        : Math.round(value).toString()}
      {suffix}
    </span>
  );
}
