import { Maximize2 } from 'lucide-react';
import type { Figure } from '../data';
import type { LightboxItem } from './Lightbox';
import { useContent } from '../i18n/useContent';
import './ProjectFigure.css';

type ProjectFigureProps = {
  figure: Figure;
  onOpen: (item: LightboxItem) => void;
  /** Columns the figure will occupy, used to pick the right responsive image. */
  sizes?: string;
};

/** A captioned image that opens in the lightbox. It is never upscaled past its native size. */
export function ProjectFigure({ figure, onOpen, sizes = '(min-width: 900px) 70vw, 100vw' }: ProjectFigureProps) {
  const { UI } = useContent();
  return (
    <figure className="pfig" data-fit={figure.fit ?? 'cover'} style={{ maxWidth: figure.width }}>
      <button
        type="button"
        className="pfig__btn"
        aria-label={`${UI.enlarge}: ${figure.caption}`}
        onClick={() => onOpen({ ...figure, caption: figure.caption })}
      >
        <img
          src={figure.src}
          srcSet={figure.srcSet}
          sizes={figure.srcSet ? sizes : undefined}
          width={figure.width}
          height={figure.height}
          alt={figure.alt}
          loading="lazy"
          decoding="async"
        />
        <span className="pfig__zoom" aria-hidden="true">
          <Maximize2 />
        </span>
      </button>
      <figcaption>{figure.caption}</figcaption>
    </figure>
  );
}
