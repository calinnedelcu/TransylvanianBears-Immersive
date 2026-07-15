import { motion, useTransform, type MotionValue } from 'framer-motion';
import type { CSSProperties } from 'react';
import { cn } from '../../lib/utils';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

type BearMascotProps = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  /** Shared mouse motion values; bear sits forward (high mouseStrength). */
  mouseX?: MotionValue<number>;
  mouseY?: MotionValue<number>;
  mouseStrength?: number;
  mouseMax?: number;
  /** Scroll-driven Y from ScrollTrigger. */
  scrollY?: MotionValue<number>;
  /** Scroll-driven opacity (1 → 0 as Hero exits). */
  scrollOpacity?: MotionValue<number>;
};

const fallback = { x: 0, y: 0 };

export function BearMascot({
  src,
  alt,
  className,
  style,
  mouseX,
  mouseY,
  mouseStrength = 1,
  mouseMax = 18,
  scrollY,
  scrollOpacity,
}: BearMascotProps) {
  const reduce = usePrefersReducedMotion();

  const safeMx = useTransform(() => 0);
  const safeMy = useTransform(() => 0);
  const safeSY = useTransform(() => 0);
  const safeOp = useTransform(() => 1);

  const mxToPx = useTransform(mouseX ?? safeMx, (v) => v * mouseMax * mouseStrength);
  const myToPx = useTransform(mouseY ?? safeMy, (v) => v * mouseMax * mouseStrength);
  const sY = scrollY ?? safeSY;
  const x = mxToPx;
  const y = useTransform([myToPx, sY] as const, ([m, s]) => (m as number) + (s as number));
  const opacity = scrollOpacity ?? safeOp;

  if (reduce) {
    // Static, no breathing, no parallax — just drop in.
    return (
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={style}
        className={cn('select-none pointer-events-none', className)}
      />
    );
  }

  return (
    <motion.div
      // Intro: opacity 0→1, scale 0.85→1, translateY 30→0
      initial={{ opacity: 0, scale: 0.85, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      className={cn('select-none pointer-events-none', className)}
      style={{ ...style, x, opacity }}
    >
      {/* Inner wrapper carries the breathing loop without conflicting with intro transform */}
      <motion.img
        src={src}
        alt={alt}
        draggable={false}
        animate={reduce ? undefined : { scale: [1, 1.02, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ y, willChange: 'transform' }}
        className="block w-full h-auto"
      />
    </motion.div>
  );
}

export const NO_MOUSE = fallback;
