import type { CSSProperties } from 'react';

type VerticalSliceLoaderProps = {
  unavailable?: boolean;
  progress?: number;
};

export function VerticalSliceLoader({ unavailable = false, progress }: VerticalSliceLoaderProps) {
  const normalizedProgress = progress === undefined
    ? undefined
    : Math.max(0, Math.min(100, progress));

  return (
    <div
      className="mf-cinematic-loader"
      role="status"
      aria-live="polite"
      aria-label={unavailable ? 'Mod editorial activ' : 'Se construiește citadela'}
    >
      <div className="mf-cinematic-loader__citadel" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
      </div>
      <div className="mf-cinematic-loader__lockup">
        <span className="mf-brand__mark" aria-hidden="true"><i /></span>
        <p>The Citadel of Seven Systems</p>
        <div
          className="mf-cinematic-loader__meter"
          role={normalizedProgress === undefined ? undefined : 'progressbar'}
          aria-label={normalizedProgress === undefined ? undefined : 'Progres încărcare lume'}
          aria-valuemin={normalizedProgress === undefined ? undefined : 0}
          aria-valuemax={normalizedProgress === undefined ? undefined : 100}
          aria-valuenow={normalizedProgress === undefined ? undefined : Math.round(normalizedProgress)}
          style={normalizedProgress === undefined ? undefined : {
            '--mf-loader-progress': normalizedProgress / 100,
          } as CSSProperties}
        >
          {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
        </div>
        <small>
          {unavailable
            ? 'Editorial path / ready'
            : normalizedProgress === undefined
              ? 'World 01-04 / assembling'
              : `World 01-04 / ${Math.round(normalizedProgress)}%`}
        </small>
      </div>
    </div>
  );
}
