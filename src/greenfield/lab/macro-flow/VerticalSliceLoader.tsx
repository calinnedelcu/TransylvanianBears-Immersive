import type { CSSProperties } from 'react';

import './vertical-slice-loader.css';

const GATE_BAR_COUNT = 7;

type GateLoaderStyle = CSSProperties & {
  '--mf-gate-loader-index'?: number;
  '--mf-gate-loader-progress'?: number;
  '--mf-gate-loader-lift'?: number;
};

type VerticalSliceLoaderProps = {
  unavailable?: boolean;
  progress?: number;
};

export function VerticalSliceLoader({ unavailable = false, progress }: VerticalSliceLoaderProps) {
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
    : normalizedProgress === undefined
      ? 'Ridicăm poarta / acordare'
      : `Ridicăm poarta / ${Math.round(normalizedProgress)}%`;

  return (
    <div
      className="mf-gate-loader"
      role="status"
      aria-live="polite"
      aria-label={unavailable ? 'Mod editorial activ' : 'Se încarcă intrarea în citadelă'}
      data-indeterminate={normalizedProgress === undefined ? 'true' : 'false'}
      style={loaderStyle}
    >
      <div className="mf-gate-loader__scene" aria-hidden="true">
        <span className="mf-gate-loader__arch" />
        <div className="mf-gate-loader__bars">
          {Array.from({ length: GATE_BAR_COUNT }, (_, index) => {
            const barStart = index / GATE_BAR_COUNT;
            const lift = normalizedProgress === undefined
              ? 0
              : Math.max(0, Math.min(1, (progressFraction - barStart) * GATE_BAR_COUNT));
            const barStyle: GateLoaderStyle = {
              '--mf-gate-loader-index': index,
              '--mf-gate-loader-lift': lift,
            };

            return <i key={index} style={barStyle} />;
          })}
        </div>
        <span className="mf-gate-loader__horizon" />
      </div>

      <div className="mf-gate-loader__copy">
        <p className="mf-gate-loader__brand">Transylvanian Bears</p>
        <p className="mf-gate-loader__descriptor">Citadela celor șapte sisteme</p>
        <div className="mf-gate-loader__readout" aria-hidden="true">
          <small>{statusText}</small>
          <span>{completedBars === undefined ? '·· / 07' : `${String(completedBars).padStart(2, '0')} / 07`}</span>
        </div>
        <span className="mf-gate-loader__track"><i /></span>
      </div>
    </div>
  );
}
