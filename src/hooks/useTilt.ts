import type { PointerEvent } from 'react';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Tilts an element in 3D toward a mouse pointer by writing `--rx`, `--ry`
 * (rotation) and `--gx`, `--gy` (glare position) on it. Touch and reduced motion
 * leave it flat.
 */
export function useTilt(max = 7) {
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || reducedMotion()) return;
    const node = event.currentTarget;
    const box = node.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    node.classList.add('is-tilting');
    node.style.setProperty('--rx', `${((0.5 - y) * max * 2).toFixed(2)}deg`);
    node.style.setProperty('--ry', `${((x - 0.5) * max * 2).toFixed(2)}deg`);
    node.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    node.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
  };

  const onPointerLeave = (event: PointerEvent<HTMLElement>) => {
    const node = event.currentTarget;
    node.classList.remove('is-tilting');
    node.style.removeProperty('--rx');
    node.style.removeProperty('--ry');
  };

  return { onPointerMove, onPointerLeave };
}
