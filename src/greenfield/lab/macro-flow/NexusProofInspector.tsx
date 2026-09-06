import { Boxes, Eye, ScanLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

type ProofMode = 'source' | 'segmentation' | 'detection';
type LensMode = 'raw' | 'segmentation' | 'detection';

type NexusProofInspectorProps = {
  mode: LensMode;
  onModeChange: (mode: LensMode) => void;
};

const MODES = [
  {
    id: 'source',
    lensMode: 'raw',
    label: 'Validare',
    detail: 'Cadru real autentic',
    hud: 'REAL VALIDATION / SOURCE FRAME',
    status: 'Validare reală',
    provenance: 'Stanford Drone Dataset',
    src: '/assets/projects/project-nexus.webp',
    width: 589,
    height: 504,
    alt: 'Cadru aerian autentic din validarea Project Nexus pe Stanford Drone Dataset',
    icon: Eye,
  },
  {
    id: 'segmentation',
    lensMode: 'segmentation',
    label: 'Segmentare',
    detail: 'Export sintetic autentic',
    hud: 'SEGMENTATION / SOURCE EXPORT',
    status: 'Segmentare sintetică',
    provenance: 'Unreal Engine 5 / AirSim',
    src: '/assets/projects/nexus-segmentation.webp',
    width: 904,
    height: 684,
    alt: 'Export autentic de segmentare Project Nexus din mediul sintetic Unreal Engine 5',
    icon: Boxes,
  },
  {
    id: 'detection',
    lensMode: 'detection',
    label: 'Detecții',
    detail: 'Export sintetic autentic',
    hud: 'DETECTION / SOURCE EXPORT',
    status: 'Detecții sintetice',
    provenance: 'Unreal Engine 5 / AirSim',
    src: '/assets/projects/nexus-detection.webp',
    width: 1203,
    height: 906,
    alt: 'Export autentic cu detecții Project Nexus din mediul sintetic Unreal Engine 5',
    icon: ScanLine,
  },
] as const;

export function NexusProofInspector({ mode, onModeChange }: NexusProofInspectorProps) {
  const [zoomed, setZoomed] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [zoomed, mode]);
  const proofMode: ProofMode = mode === 'raw' ? 'source' : mode;
  const activeMode = MODES.find((option) => option.id === proofMode) ?? MODES[0];

  const moveLoupe = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.style.setProperty('--proof-x', `${xPercent.toFixed(2)}%`);
    event.currentTarget.style.setProperty('--proof-y', `${yPercent.toFixed(2)}%`);
  };

  return (
    <figure
      className="mf-proof-lab"
      data-mode={proofMode}
      data-zoomed={zoomed || undefined}
      style={{ '--proof-image': `url("${activeMode.src}")` } as CSSProperties}
    >
      <div className="mf-proof-image-panel">
      <div ref={viewportRef} className="mf-proof-lab__viewport" data-lenis-prevent={zoomed || undefined} tabIndex={zoomed ? 0 : undefined} aria-label="Imagine Nexus; la mărire, derulează pentru detalii" onPointerMove={moveLoupe} onKeyDown={(event) => { if (event.key === 'Escape') setZoomed(false); }}>
        <img
          src={activeMode.src}
          alt={activeMode.alt}
          width={activeMode.width}
          height={activeMode.height}
          loading="lazy"
          decoding="async"
          data-authentic="true"
        />

        <div className="mf-proof-lab__loupe" aria-hidden="true" />
        <div className="mf-proof-lab__crosshair" aria-hidden="true"><i /><i /></div>

        <div className="mf-proof-lab__hud" aria-hidden="true">
          <span>PROJECT NEXUS / PROOF INSPECTOR</span>
          <span>{activeMode.provenance}</span>
          <span>{activeMode.hud}</span>
        </div>
      </div>

        <div className="mf-proof-tools">
          <button type="button" aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)}>{zoomed ? 'Revino la cadrul întreg' : 'Mărește imaginea · 2×'}</button>
          <a href={activeMode.src} target="_blank" rel="noreferrer">Deschide imaginea ↗</a>
        </div>
      </div>

      <figcaption className="mf-proof-lab__rail">
        <div>
          <span>03 / Rezultate · Nexus</span>
          <strong>Din simulare<br />în lumea reală.</strong>
          <p>Explorează segmentarea și detecțiile din mediul sintetic, apoi cadrul de validare pe Stanford Drone Dataset. Sunt imagini distincte din proiect, fiecare cu sursa indicată.</p>
        </div>

        <div className="mf-proof-lab__modes" role="group" aria-label="Schimbă lectura dovezii Nexus">
          {MODES.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={proofMode === option.id}
                data-active={proofMode === option.id || undefined}
                onClick={() => { setZoomed(false); onModeChange(option.lensMode); }}
              >
                <Icon aria-hidden="true" />
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
              </button>
            );
          })}
        </div>

        <dl>
          <div><dt>Cadru</dt><dd>{activeMode.width} × {activeMode.height}</dd></div>
          <div><dt>Proveniență</dt><dd>{activeMode.provenance}</dd></div>
          <div><dt>Status imagine</dt><dd>Autentică / export sursă</dd></div>
          <div><dt>Strat activ</dt><dd>{activeMode.status}</dd></div>
        </dl>
      </figcaption>
    </figure>
  );
}
