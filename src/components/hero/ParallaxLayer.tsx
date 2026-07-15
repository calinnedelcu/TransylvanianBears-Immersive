import { forwardRef, type CSSProperties } from 'react';
import { motion, type MotionValue, useTransform } from 'framer-motion';
import { cn } from '../../lib/utils';

type ParallaxLayerProps = {
  src: string;
  alt?: string;
  /** Base CSS classes for sizing/positioning (e.g. "absolute inset-x-0 bottom-0 w-full"). */
  className?: string;
  /** Inline style overrides (z-index, opacity, etc.). */
  style?: CSSProperties;
  /**
   * Shared mouse motion values (typically -1..1 normalized) and a depth multiplier.
   * Distant layers should pass small `mouseStrength` (e.g. 0.15), close layers larger (e.g. 1).
   */
  mouseX?: MotionValue<number>;
  mouseY?: MotionValue<number>;
  mouseStrength?: number;
  /** Max pixel translation on mouse parallax. */
  mouseMax?: number;
  /** Additional Y offset MotionValue from scroll-driven animation. */
  scrollY?: MotionValue<number>;
};

/**
 * A positioned <img> that translates with mouse + scroll parallax.
 * Pure render: parent owns motion values and ScrollTrigger setup.
 */
export const ParallaxLayer = forwardRef<HTMLImageElement, ParallaxLayerProps>(function ParallaxLayer(
  {
    src,
    alt = '',
    className,
    style,
    mouseX,
    mouseY,
    mouseStrength = 0.5,
    mouseMax = 15,
    scrollY,
  },
  ref,
) {
  // Convert normalized mouse (-1..1) to a px offset, scaled by depth.
  const mxFallback = useTransform(() => 0);
  const myFallback = useTransform(() => 0);
  const x = useTransform(mouseX ?? mxFallback, (v) => v * mouseMax * mouseStrength);
  const yMouse = useTransform(mouseY ?? myFallback, (v) => v * mouseMax * mouseStrength);
  const yScrollFallback = useTransform(() => 0);
  const yScroll = scrollY ?? yScrollFallback;
  const y = useTransform([yMouse, yScroll] as const, ([m, s]) => (m as number) + (s as number));

  return (
    <motion.img
      ref={ref}
      src={src}
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      draggable={false}
      style={{ x, y, willChange: 'transform', ...style }}
      className={cn('select-none pointer-events-none', className)}
    />
  );
});
