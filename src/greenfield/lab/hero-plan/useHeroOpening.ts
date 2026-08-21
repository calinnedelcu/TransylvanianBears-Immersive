import { useEffect, useRef, useState } from 'react';

/**
 * The state the opening shares with its 3D scene.
 *
 * It lives in a hook because the drawing is DOM and the citadel is in a canvas:
 * they are different React trees and can only meet at a common parent. On the
 * lab page that parent is the page; in the story it is the whole experience.
 */

export type PlanFrame = { cx: number; cy: number; radius: number };

export function useHeroOpening() {
  const planRef = useRef<HTMLDivElement>(null);
  // Unde sta desenul pe ecran. Scena 3D isi deriva pozitia camerei din asta,
  // ca modelul sa aterizeze exact peste plan la orice latime.
  const planFrameRef = useRef<PlanFrame | null>(null);

  /**
   * Which system the pointer is over, and nothing more.
   *
   * There used to be a chosen system as well, kept apart from the hovered one
   * because merging them made the labels unusable: the camera walked to whatever
   * was chosen and the labels were projected from that camera, so hovering sent a
   * label out from under the cursor and ended its own hover. Choosing is gone with
   * the index it belonged to - the story is one scroll now - and what survives is
   * the drawing lighting a system up as you pass over it.
   */
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const activeSlug = hoverSlug;

  useEffect(() => {
    const measure = () => {
      const node = planRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      planFrameRef.current = {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        // Inelul are raza 300 intr-un viewBox de 920.
        radius: (300 / 920) * rect.width,
      };
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, []);

  return {
    planRef,
    planFrameRef,
    activeSlug,
    setHoverSlug,
  };
}

export type HeroOpening = ReturnType<typeof useHeroOpening>;
