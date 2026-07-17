import type { CSSProperties } from 'react';

import './vertical-slice-loader.css';

const SEGMENT_COUNT = 7;

type IdentityLoaderStyle = CSSProperties & {
  '--mf-identity-loader-index'?: number;
  '--mf-identity-loader-progress'?: number;
  '--mf-identity-loader-reveal'?: number;
  '--mf-identity-loader-scale'?: number;
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
  const completedSegments = normalizedProgress === undefined
    ? undefined
    : Math.min(SEGMENT_COUNT, Math.floor(progressFraction * SEGMENT_COUNT));
  const loaderStyle: IdentityLoaderStyle = {
    '--mf-identity-loader-progress': progressFraction,
  };
  const statusText = unavailable
    ? 'Mod editorial / pregătit'
    : normalizedProgress === undefined
      ? 'Traseu 01–04 / acordare'
      : `Traseu 01–04 / ${Math.round(normalizedProgress)}%`;

  return (
    <div
      className="mf-identity-loader"
      role="status"
      aria-live="polite"
      aria-label={unavailable ? 'Mod editorial activ' : 'Se acordă încuietoarea citadelei'}
      data-indeterminate={normalizedProgress === undefined ? 'true' : 'false'}
      style={loaderStyle}
    >
      <div className="mf-identity-loader__assembly">
        <div
          className="mf-identity-loader__seal-meter"
          role={normalizedProgress === undefined ? undefined : 'progressbar'}
          aria-label={normalizedProgress === undefined ? undefined : 'Progres încărcare lume'}
          aria-valuemin={normalizedProgress === undefined ? undefined : 0}
          aria-valuemax={normalizedProgress === undefined ? undefined : 100}
          aria-valuenow={normalizedProgress === undefined ? undefined : Math.round(normalizedProgress)}
        >
          <div className="mf-identity-loader__seal" aria-hidden="true">
            <div className="mf-identity-loader__segments">
              {Array.from({ length: SEGMENT_COUNT }, (_, index) => {
                const segmentStart = index / SEGMENT_COUNT;
                const segmentReveal = normalizedProgress === undefined
                  ? 0
                  : Math.max(0, Math.min(1, (progressFraction - segmentStart) * SEGMENT_COUNT));
                const segmentStyle: IdentityLoaderStyle = {
                  '--mf-identity-loader-index': index,
                  '--mf-identity-loader-reveal': segmentReveal,
                  '--mf-identity-loader-scale': 0.955 + segmentReveal * 0.045,
                };

                return (
                  <span
                    className="mf-identity-loader__segment"
                    key={index}
                    style={segmentStyle}
                  >
                    <i className="mf-identity-loader__segment-face" />
                  </span>
                );
              })}
            </div>

            <div className="mf-identity-loader__hub">
              <span className="mf-identity-loader__shield">
                <span className="mf-identity-loader__shield-field">
                  <i className="mf-identity-loader__bear" />
                </span>
              </span>
            </div>

            <i className="mf-identity-loader__jewel" />
          </div>
        </div>

        <div className="mf-identity-loader__copy">
          <p className="mf-identity-loader__brand">Transylvanian Bears</p>
          <p className="mf-identity-loader__descriptor">Încuietoarea celor șapte sisteme</p>
          <div className="mf-identity-loader__readout" aria-hidden="true">
            <small className="mf-identity-loader__status">{statusText}</small>
            <span className="mf-identity-loader__count">
              {completedSegments === undefined
                ? '·· / 07'
                : `${String(completedSegments).padStart(2, '0')} / 07`}
            </span>
            <span className="mf-identity-loader__track">
              <i className="mf-identity-loader__track-fill" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
