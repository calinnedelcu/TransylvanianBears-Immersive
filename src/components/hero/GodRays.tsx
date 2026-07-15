/**
 * Subtle volumetric god-rays from the upper-left moon area.
 * Pure CSS overlay; does not animate (calm, atmospheric).
 */
export function GodRays() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'conic-gradient(from 215deg at 18% 22%, transparent 0deg, rgba(245,215,138,0.07) 6deg, transparent 12deg, transparent 28deg, rgba(245,215,138,0.05) 34deg, transparent 40deg, transparent 60deg, rgba(245,215,138,0.04) 66deg, transparent 72deg, transparent 360deg)',
        mixBlendMode: 'screen',
        filter: 'blur(2px)',
      }}
    />
  );
}
