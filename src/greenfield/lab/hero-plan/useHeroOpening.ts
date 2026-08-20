import { useCallback, useEffect, useRef, useState } from 'react';

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
  const tagsRef = useRef<HTMLDivElement | null>(null);

  /**
   * Hover and choice are two different things, and merging them made the labels
   * unusable: the camera walks to whichever system is chosen and the labels are
   * projected from that camera, so hovering sent the label out from under the
   * cursor and the hover ended itself. Hover lights a system up and names it.
   * Travelling to one takes a click.
   */
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const [focusSlug, setFocusSlug] = useState<string | null>(null);
  const activeSlug = focusSlug ?? hoverSlug;
  // Sistemele deschise raman aprinse: pleci dintr-o cetate diferita de cea in care ai intrat.
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set());

  const selectNode = useCallback((slug: string) => {
    setFocusSlug((current) => (current === slug ? null : slug));
    setVisited((current) => {
      if (current.has(slug)) return current;
      const next = new Set(current);
      next.add(slug);
      return next;
    });
  }, []);

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
    tagsRef,
    activeSlug,
    focusSlug,
    visited,
    setHoverSlug,
    selectNode,
  };
}

export type HeroOpening = ReturnType<typeof useHeroOpening>;
