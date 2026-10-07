import { useState, type CSSProperties } from 'react';
import { MoveHorizontal } from 'lucide-react';
import type { Figure } from '../data';
import './CompareSlider.css';

type CompareSliderProps = {
  before: Figure;
  after: Figure;
  label: string;
  beforeLabel?: string;
  afterLabel?: string;
};

/**
 * Before / after comparison. A transparent range input covers the stage, so
 * dragging, tapping and the arrow keys all work with no custom pointer code.
 */
export function CompareSlider({ before, after, label, beforeLabel = 'Segmentare', afterLabel = 'Detecție' }: CompareSliderProps) {
  const [position, setPosition] = useState(50);
  const style = { '--pos': `${position}%`, aspectRatio: `${after.width} / ${after.height}` } as CSSProperties;

  return (
    <figure className="compare">
      <div className="compare__stage" style={style}>
        <img className="compare__img" src={after.src} width={after.width} height={after.height} alt={after.alt} loading="lazy" decoding="async" />
        <img
          className="compare__img compare__img--top"
          src={before.src}
          width={before.width}
          height={before.height}
          alt={before.alt}
          loading="lazy"
          decoding="async"
        />
        <span className="compare__tag compare__tag--left sticker">{beforeLabel}</span>
        <span className="compare__tag compare__tag--right sticker">{afterLabel}</span>
        <span className="compare__handle" aria-hidden="true">
          <span className="compare__grip">
            <MoveHorizontal />
          </span>
        </span>
        <input
          className="compare__range"
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-label={label}
          aria-valuetext={`${Math.round(position)}% ${beforeLabel.toLowerCase()}, ${Math.round(100 - position)}% ${afterLabel.toLowerCase()}`}
        />
      </div>
      <figcaption>
        <span>{before.caption}</span>
        <span>{after.caption}</span>
      </figcaption>
    </figure>
  );
}
