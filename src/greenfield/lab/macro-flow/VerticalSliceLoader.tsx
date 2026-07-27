import type { CSSProperties } from 'react';

import './vertical-slice-loader.css';

const GATE_BAR_COUNT = 7;

type GateLoaderStyle = CSSProperties & {
  '--mf-gate-loader-progress'?: number;
};

type VerticalSliceLoaderProps = {
  unavailable?: boolean;
  progress?: number;
  revealing?: boolean;
};

export function VerticalSliceLoader({
  unavailable = false,
  progress,
  revealing = false,
}: VerticalSliceLoaderProps) {
  const normalizedProgress = progress === undefined
    ? undefined
    : Math.max(0, Math.min(100, progress));
  const progressFraction = normalizedProgress === undefined ? 0 : normalizedProgress / 100;
  const completedBars = normalizedProgress === undefined
    ? undefined
    : Math.min(GATE_BAR_COUNT, Math.floor(progressFraction * GATE_BAR_COUNT));
  const loaderStyle: GateLoaderStyle = {
    '--mf-gate-loader-progress': progressFraction,
  };
  const statusText = unavailable
    ? 'Mod editorial / pregătit'
    : revealing
      ? 'Intrarea este pregătită'
    : normalizedProgress === undefined
      ? 'Cartografiem cetatea'
      : `Cartografiem cetatea / ${Math.round(normalizedProgress)}%`;

  return (
    <div
      className="mf-gate-loader"
      role="status"
      aria-live="polite"
      aria-label={unavailable ? 'Mod editorial activ' : 'Se încarcă intrarea în citadelă'}
      data-indeterminate={normalizedProgress === undefined ? 'true' : 'false'}
      data-revealing={revealing ? 'true' : 'false'}
      style={loaderStyle}
    >
      <figure className="mf-gate-loader__scene" aria-hidden="true">
        <img src="/assets/world/first-light-poster.webp" alt="" />
        <span className="mf-gate-loader__atmosphere" />
        <figcaption>
          <span>46° 46′ N / 23° 35′ E</span>
          <span>Entry sequence / 01</span>
        </figcaption>
      </figure>

      <div className="mf-gate-loader__copy">
        <p className="mf-gate-loader__kicker">Interactive expedition / Transylvania</p>
        <p className="mf-gate-loader__brand">
          <span>Transylvanian</span>
          <span>Bears</span>
        </p>
        <p className="mf-gate-loader__descriptor">
          Șapte sisteme construite în interiorul aceleiași cetăți.
        </p>
      </div>

      <div className="mf-gate-loader__status">
        <div className="mf-gate-loader__readout" aria-hidden="true">
          <small>{statusText}</small>
          <span>{completedBars === undefined ? '·· / 07' : `${String(completedBars).padStart(2, '0')} / 07`}</span>
        </div>
        <span className="mf-gate-loader__track"><i /></span>
        <div className="mf-gate-loader__markers" aria-hidden="true">
          {Array.from({ length: GATE_BAR_COUNT }, (_, index) => (
            <i key={index} data-ready={completedBars !== undefined && index < completedBars ? 'true' : 'false'} />
          ))}
        </div>
      </div>
    </div>
  );
}
