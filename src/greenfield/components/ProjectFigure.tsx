import { useState } from 'react';
import type { ProjectMedia } from '../projectMedia';

export function ProjectFigure({ media, eager = false }: { media: ProjectMedia; eager?: boolean }) {
  return (
    <figure className="cs-figure" data-contain={media.contain || undefined}>
      <a href={media.src} target="_blank" rel="noreferrer" aria-label={`Deschide imaginea: ${media.label}`}>
        <img src={media.src} alt={media.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      </a>
      <figcaption><span>{media.label}</span><span aria-hidden="true">Vezi imaginea ↗</span></figcaption>
    </figure>
  );
}

const OUTPUTS: ProjectMedia[] = [
  { src: '/assets/projects/nexus-segmentation.webp', label: 'Segmentare', alt: 'Cadru sintetic din Nexus cu persoanele evidențiate în verde.' },
  { src: '/assets/projects/nexus-detection.webp', label: 'Detecție', alt: 'Cadru sintetic din Nexus cu marcaje de detecție albastre.' },
];

export function NexusOutputs() {
  const [selected, setSelected] = useState(0);
  return (
    <div className="cs-outputs">
      <div className="cs-outputs__controls" role="group" aria-label="Alege output-ul Nexus">
        {OUTPUTS.map((output, index) => <button key={output.src} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{output.label}</button>)}
      </div>
      <ProjectFigure media={OUTPUTS[selected]} />
      <p className="cs-caption" aria-live="polite">{selected === 0 ? 'Persoanele sunt evidențiate în cadrul sintetic.' : 'Marcajele arată output-ul etapei de detecție.'}</p>
    </div>
  );
}
