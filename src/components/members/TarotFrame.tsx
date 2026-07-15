/**
 * Decorative SVG frame for the tarot card. Layered borders + dacian-wolf glyph
 * on top center, mirrored bottom flourish, ornate corner brackets, and four
 * tiny rune-like marks along the inner border. Pointer-events disabled.
 */
export function TarotFrame() {
  return (
    <svg
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none text-bear-gold/65"
    >
      {/* outer + inner double border */}
      <rect
        x="2.4"
        y="2.4"
        width="95.2"
        height="135.2"
        rx="2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
      />
      <rect
        x="4.4"
        y="4.4"
        width="91.2"
        height="131.2"
        rx="1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.22"
        opacity="0.7"
      />
      {/* hairline inner border */}
      <rect
        x="6.6"
        y="6.6"
        width="86.8"
        height="126.8"
        rx="0.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.12"
        opacity="0.4"
      />

      {/* corner flourishes */}
      <CornerFlourish x={4.4} y={4.4} />
      <CornerFlourish x={95.6} y={4.4} flipX />
      <CornerFlourish x={4.4} y={135.6} flipY />
      <CornerFlourish x={95.6} y={135.6} flipX flipY />

      {/* stylized dacian wolf head — top center, geometric non-literal */}
      <g
        transform="translate(50 8.4)"
        stroke="currentColor"
        strokeWidth="0.4"
        fill="none"
      >
        <path d="M -4.8 2.2 L 0 -2.0 L 4.8 2.2" />
        <path d="M -3.0 1.4 L 0 -0.7 L 3.0 1.4" opacity="0.7" />
        <path d="M -1.6 0.6 L 0 0.6" opacity="0.5" strokeWidth="0.55" />
        <circle cx="0" cy="3.4" r="0.46" fill="currentColor" />
      </g>

      {/* bottom-center mirrored ornament */}
      <g
        transform="translate(50 131.2) scale(1 -1)"
        stroke="currentColor"
        strokeWidth="0.35"
        fill="none"
        opacity="0.9"
      >
        <path d="M -4.4 2.0 L 0 -1.6 L 4.4 2.0" />
        <path d="M -2.4 1.0 L 0 -0.5 L 2.4 1.0" opacity="0.6" />
        <circle cx="0" cy="3.0" r="0.4" fill="currentColor" />
      </g>

      {/* side-rune marks: tiny tally accents on left + right inner border */}
      <g stroke="currentColor" strokeWidth="0.22" opacity="0.55">
        <line x1="6.6" y1="40" x2="9.4" y2="40" />
        <line x1="6.6" y1="44" x2="8.6" y2="44" />
        <line x1="6.6" y1="96" x2="9.4" y2="96" />
        <line x1="6.6" y1="100" x2="8.6" y2="100" />
        <line x1="93.4" y1="40" x2="90.6" y2="40" />
        <line x1="93.4" y1="44" x2="91.4" y2="44" />
        <line x1="93.4" y1="96" x2="90.6" y2="96" />
        <line x1="93.4" y1="100" x2="91.4" y2="100" />
      </g>
    </svg>
  );
}

function CornerFlourish({
  x,
  y,
  flipX,
  flipY,
}: {
  x: number;
  y: number;
  flipX?: boolean;
  flipY?: boolean;
}) {
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  return (
    <g
      transform={`translate(${x} ${y}) scale(${sx} ${sy})`}
      stroke="currentColor"
      strokeWidth="0.32"
      fill="none"
    >
      <path d="M 0 7.5 L 0 1.4 L 7.5 1.4" opacity="0.85" />
      <path d="M 1.4 5.2 Q 1.6 1.6 5.2 1.4" opacity="0.55" />
      <path d="M 2.6 4 Q 2.7 2.4 4 2.4" opacity="0.4" strokeWidth="0.18" />
      <circle cx="1.4" cy="1.4" r="0.55" fill="currentColor" opacity="0.9" />
      <circle cx="6.4" cy="1.4" r="0.18" fill="currentColor" opacity="0.7" />
      <circle cx="1.4" cy="6.4" r="0.18" fill="currentColor" opacity="0.7" />
    </g>
  );
}
