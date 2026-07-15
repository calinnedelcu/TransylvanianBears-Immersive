import type { CSSProperties } from 'react';
import { cn } from '../../lib/utils';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

type FogDriftProps = {
  src: string;
  /** Direction of horizontal drift. */
  direction?: 'l-to-r' | 'r-to-l';
  /** Animation duration (seconds). */
  durationSec?: number;
  /** Final opacity at rest. */
  opacity?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * A fog layer that drifts horizontally in a slow infinite loop.
 * Renders TWO copies side-by-side so the loop is seamless (translateX wraps cleanly).
 * Honors prefers-reduced-motion (static, no animation).
 */
export function FogDrift({
  src,
  direction = 'l-to-r',
  durationSec = 30,
  opacity = 0.4,
  className,
  style,
}: FogDriftProps) {
  const reduce = usePrefersReducedMotion();
  const animClass = direction === 'l-to-r' ? 'animate-fog-l' : 'animate-fog-r';

  return (
    <div
      aria-hidden="true"
      className={cn('absolute pointer-events-none overflow-hidden', className)}
      style={{ opacity, ...style }}
    >
      <div
        className={cn('flex w-[200%] h-full', !reduce && animClass)}
        style={{ animationDuration: `${durationSec}s` }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="w-1/2 h-full object-cover object-bottom select-none"
        />
        <img
          src={src}
          alt=""
          draggable={false}
          className="w-1/2 h-full object-cover object-bottom select-none"
        />
      </div>
    </div>
  );
}
