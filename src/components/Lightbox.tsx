import { useCallback, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Picture } from '../data';
import './Lightbox.css';

export type LightboxItem = Picture & { caption?: string };

/**
 * Native <dialog> lightbox: focus is trapped, Escape closes it and the rest of
 * the page is inert while it is open, all without extra code.
 */
export function useLightbox(): { open: (item: LightboxItem) => void; element: ReactNode } {
  const ref = useRef<HTMLDialogElement>(null);
  const [item, setItem] = useState<LightboxItem | null>(null);

  const open = useCallback((next: LightboxItem) => {
    setItem(next);
    // The dialog renders its content from state, so open it after the commit.
    requestAnimationFrame(() => {
      if (ref.current && !ref.current.open) ref.current.showModal();
    });
  }, []);

  const element = (
    <dialog
      ref={ref}
      className="lightbox surface-ink"
      aria-label={item?.caption ?? item?.alt ?? 'Imagine mărită'}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      onClose={() => setItem(null)}
    >
      {item && (
        <figure className="lightbox__figure">
          <img src={item.src} srcSet={item.srcSet} alt={item.alt} />
          {item.caption && <figcaption>{item.caption}</figcaption>}
        </figure>
      )}
      <button type="button" className="lightbox__close" aria-label="Închide imaginea" onClick={() => ref.current?.close()}>
        <X aria-hidden="true" />
      </button>
    </dialog>
  );

  return { open, element };
}
