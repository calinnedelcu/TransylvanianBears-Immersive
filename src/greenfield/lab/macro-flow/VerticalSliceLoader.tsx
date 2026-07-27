import './vertical-slice-loader.css';

type VerticalSliceLoaderProps = {
  unavailable?: boolean;
  progress?: number;
  revealing?: boolean;
};

export function VerticalSliceLoader({
  unavailable = false,
  revealing = false,
}: VerticalSliceLoaderProps) {
  if (unavailable) return null;

  return (
    <div
      className="mf-gate-loader"
      role="status"
      aria-live="polite"
      aria-label="Se încarcă intrarea în citadelă"
      data-revealing={revealing ? 'true' : 'false'}
    />
  );
}
