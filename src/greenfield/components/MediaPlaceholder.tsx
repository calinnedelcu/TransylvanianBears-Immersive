import type { CSSProperties, PointerEvent } from 'react';
import type { AssetSlot, SceneTone } from '../types';

type MediaPlaceholderProps = {
  asset: AssetSlot;
  tone?: SceneTone;
  compact?: boolean;
  label?: string;
};

export function MediaPlaceholder({ asset, tone = 'brass', compact = false, label = 'Media slot' }: MediaPlaceholderProps) {
  const style = { '--asset-ratio': asset.aspectRatio.replace(':', ' / ') } as CSSProperties;
  const moveSurface = (event: PointerEvent<HTMLElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const horizontal = (event.clientX - rect.left) / rect.width - 0.5;
    const vertical = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty('--media-rotate-x', `${(-vertical * 2.2).toFixed(2)}deg`);
    event.currentTarget.style.setProperty('--media-rotate-y', `${(horizontal * 2.6).toFixed(2)}deg`);
  };

  const resetSurface = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.style.removeProperty('--media-rotate-x');
    event.currentTarget.style.removeProperty('--media-rotate-y');
  };

  return (
    <figure
      className="gf-media-slot"
      data-kind={asset.kind}
      data-tone={tone}
      data-compact={compact || undefined}
      data-has-media={asset.previewSrc || undefined}
      data-gf-motion
      style={style}
      onPointerMove={moveSurface}
      onPointerLeave={resetSurface}
    >
      <div className="gf-media-slot__surface" aria-hidden={asset.previewSrc ? undefined : true}>
        {asset.previewSrc && (
          <img
            className="gf-media-slot__media"
            src={asset.previewSrc}
            alt={asset.alt}
            loading={compact ? 'eager' : 'lazy'}
            decoding="async"
          />
        )}
        <span className="gf-media-slot__axis gf-media-slot__axis--x" />
        <span className="gf-media-slot__axis gf-media-slot__axis--y" />
        <span className="gf-media-slot__plane gf-media-slot__plane--a" />
        <span className="gf-media-slot__plane gf-media-slot__plane--b" />
        <span className="gf-media-slot__pivot" />
        <span className="gf-media-slot__code">{asset.id}</span>
      </div>
      <figcaption>
        <div>
          <span>{label}</span>
          <strong>{asset.subject}</strong>
        </div>
        <dl>
          <div>
            <dt>Format</dt>
            <dd>{asset.aspectRatio}</dd>
          </div>
          <div>
            <dt>Minimum</dt>
            <dd>{asset.minimumSize}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{asset.status}</dd>
          </div>
        </dl>
      </figcaption>
    </figure>
  );
}
