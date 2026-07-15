import type { CSSProperties } from 'react';
import type { AssetSlot, SceneTone } from '../types';

type MediaPlaceholderProps = {
  asset: AssetSlot;
  tone?: SceneTone;
  compact?: boolean;
  label?: string;
};

export function MediaPlaceholder({ asset, tone = 'brass', compact = false, label = 'Media slot' }: MediaPlaceholderProps) {
  const style = { '--asset-ratio': asset.aspectRatio.replace(':', ' / ') } as CSSProperties;

  return (
    <figure
      className="gf-media-slot"
      data-kind={asset.kind}
      data-tone={tone}
      data-compact={compact || undefined}
      data-gf-motion
      style={style}
    >
      <div className="gf-media-slot__surface" aria-hidden="true">
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
