import { useEffect } from 'react';
import './vertical-slice-loader.css';

type VerticalSliceLoaderProps = {
  unavailable?: boolean;
  progress?: number;
  revealing?: boolean;
  onTimeout?: () => void;
};

export function VerticalSliceLoader({
  unavailable = false,
  progress,
  revealing = false,
  onTimeout,
}: VerticalSliceLoaderProps) {
  useEffect(() => {
    if (!onTimeout || revealing || unavailable) return;
    const timer = window.setTimeout(onTimeout, 8_000);
    return () => window.clearTimeout(timer);
  }, [onTimeout, revealing, unavailable]);

  if (unavailable) return null;
  const percentage = progress === undefined ? undefined : Math.round(Math.min(100, Math.max(0, progress)));

  return (
    <div
      className="mf-gate-loader"
      data-revealing={revealing ? 'true' : 'false'}
    >
      <div className="mf-gate-loader__signal">
        <span className="mf-gate-loader__mark" aria-hidden="true">TB</span>
        <p>Se deschide citadela</p>
        <span className="mf-gate-loader__track" role="progressbar"
          aria-label="Încărcarea citadelei" aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={percentage} data-indeterminate={percentage === undefined || undefined}>
          <i style={percentage === undefined ? undefined : { width: `${percentage}%` }} />
        </span>
      </div>
    </div>
  );
}
