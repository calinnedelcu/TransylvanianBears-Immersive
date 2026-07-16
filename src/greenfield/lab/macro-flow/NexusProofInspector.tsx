import { Boxes, Eye, ScanLine } from 'lucide-react';
import { useState, type PointerEvent as ReactPointerEvent } from 'react';

type ProofMode = 'source' | 'segmentation' | 'detection';

const MODES = [
  { id: 'source', label: 'Source', detail: 'Captură reală', icon: Eye },
  { id: 'segmentation', label: 'Classes', detail: 'Overlay metodologic', icon: Boxes },
  { id: 'detection', label: 'Objects', detail: 'Inspectează limitele', icon: ScanLine },
] as const;

const SEGMENTS = [
  { color: '#5fc7bf', left: '3%', top: '4%', width: '42%', height: '46%', shape: 'polygon(0 0, 94% 5%, 83% 84%, 16% 100%)' },
  { color: '#d7ba63', left: '42%', top: '2%', width: '55%', height: '38%', shape: 'polygon(12% 0, 100% 8%, 92% 100%, 0 79%)' },
  { color: '#d96451', left: '17%', top: '48%', width: '47%', height: '48%', shape: 'polygon(7% 8%, 89% 0, 100% 83%, 0 100%)' },
  { color: '#638e9a', left: '61%', top: '39%', width: '37%', height: '58%', shape: 'polygon(8% 0, 100% 12%, 91% 100%, 0 83%)' },
] as const;

const DETECTIONS = [
  { label: 'vehicle · .91', left: '17%', top: '22%', width: '14%', height: '13%', color: '#df6553' },
  { label: 'vehicle · .88', left: '47%', top: '32%', width: '12%', height: '11%', color: '#df6553' },
  { label: 'pedestrian · .82', left: '68%', top: '48%', width: '7%', height: '16%', color: '#72d9d6' },
  { label: 'vehicle · .79', left: '28%', top: '63%', width: '15%', height: '12%', color: '#df6553' },
  { label: 'signal · .76', left: '76%', top: '19%', width: '8%', height: '13%', color: '#d8b75e' },
] as const;

export function NexusProofInspector() {
  const [mode, setMode] = useState<ProofMode>('source');

  const moveInspector = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.style.setProperty('--proof-x', `${x.toFixed(2)}%`);
    event.currentTarget.style.setProperty('--proof-y', `${y.toFixed(2)}%`);
  };

  return (
    <figure className="mf-proof-lab" data-mode={mode}>
      <div className="mf-proof-lab__viewport" onPointerMove={moveInspector}>
        <img
          src="/assets/projects/project-nexus.webp"
          alt="Detecții aeriene Project Nexus într-o intersecție reală"
          width="589"
          height="504"
          loading="lazy"
          decoding="async"
        />

        <div className="mf-proof-lab__segments" aria-hidden="true">
          {SEGMENTS.map((segment, index) => (
            <span key={index} style={{
              left: segment.left,
              top: segment.top,
              width: segment.width,
              height: segment.height,
              background: segment.color,
              clipPath: segment.shape,
            }} />
          ))}
        </div>

        <div className="mf-proof-lab__detections" aria-hidden="true">
          {DETECTIONS.map((detection) => (
            <span key={detection.label} style={{
              left: detection.left,
              top: detection.top,
              width: detection.width,
              height: detection.height,
              borderColor: detection.color,
              color: detection.color,
            }}>
              <i>{detection.label}</i>
            </span>
          ))}
        </div>

        <div className="mf-proof-lab__loupe" aria-hidden="true" />
        <div className="mf-proof-lab__crosshair" aria-hidden="true"><i /><i /></div>
        <div className="mf-proof-lab__scan" aria-hidden="true" />

        <div className="mf-proof-lab__hud" aria-hidden="true">
          <span>NX-01 / REAL VALIDATION</span>
          <span>45.7557 N / 21.2292 E</span>
          <span>{mode.toUpperCase()} VIEW</span>
        </div>
      </div>

      <figcaption className="mf-proof-lab__rail">
        <div>
          <span>Evidence surface / 01</span>
          <strong>O singură sursă.<br />Trei lecturi.</strong>
          <p>Imaginea este captura reală disponibilă. Straturile colorate explică metoda și nu sunt prezentate ca output suplimentar al proiectului.</p>
        </div>

        <div className="mf-proof-lab__modes" role="group" aria-label="Schimbă lectura dovezii Nexus">
          {MODES.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={mode === option.id}
                data-active={mode === option.id || undefined}
                onClick={() => setMode(option.id)}
              >
                <Icon aria-hidden="true" />
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
              </button>
            );
          })}
        </div>

        <dl>
          <div><dt>Frame</dt><dd>589 × 504</dd></div>
          <div><dt>Source</dt><dd>Project capture</dd></div>
          <div><dt>Evidence</dt><dd>Verified input</dd></div>
        </dl>
      </figcaption>
    </figure>
  );
}
