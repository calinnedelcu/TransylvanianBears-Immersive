import { useEffect, useState } from 'react';

/**
 * Returns the id of the section that currently crosses a thin band near the
 * middle of the viewport, or null while none of the tracked sections does.
 */
export function useActiveSection(ids: readonly string[], enabled = true) {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('|');

  useEffect(() => {
    if (!enabled || !('IntersectionObserver' in window)) {
      setActive(null);
      return;
    }

    const sections = key
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const current = sections.find((section) => visible.has(section.id));
        setActive(current ? current.id : null);
      },
      { rootMargin: '-42% 0px -52% 0px', threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      setActive(null);
    };
  }, [key, enabled]);

  return active;
}
