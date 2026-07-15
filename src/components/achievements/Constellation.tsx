import { useMemo, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ACHIEVEMENTS,
  RANKING_COLOR,
  type Achievement,
  type AchievementRanking,
} from '../../data/achievements';

/**
 * Achievements as a star map. Each medal is a star; consecutive entries are
 * connected with thin gold lines that "draw in" as the user scrolls through
 * the section. Decorated with a compass rose, frame ornaments and ink dust
 * to evoke a hand-drawn medieval cartography panel.
 */

const VB_W = 100;
const VB_H = 38;
const PADDING_X = 6;

// Hand-tuned y offsets so the constellation feels organic instead of mechanical.
// Indexed against ACHIEVEMENTS in chronological order — adjust if you reorder.
const Y_OFFSETS = [12, 6, 22, 14, 26, 8, 18, 30, 10, 24, 16, 28];

const sizeFor: Record<AchievementRanking, number> = {
  gold: 1.3,
  silver: 1.0,
  bronze: 0.9,
  finalist: 0.75,
};

export function Constellation() {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 80%', 'center 40%'],
  });

  const { stars, polyline, totalLength } = useMemo(() => {
    const n = ACHIEVEMENTS.length;
    const usableW = VB_W - PADDING_X * 2;
    const stepX = usableW / Math.max(n - 1, 1);
    const placed = ACHIEVEMENTS.map((a, i) => ({
      a,
      x: PADDING_X + i * stepX,
      y: Y_OFFSETS[i % Y_OFFSETS.length],
      size: sizeFor[a.ranking],
    }));
    let length = 0;
    for (let i = 1; i < placed.length; i++) {
      const dx = placed[i].x - placed[i - 1].x;
      const dy = placed[i].y - placed[i - 1].y;
      length += Math.hypot(dx, dy);
    }
    const points = placed.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    return { stars: placed, polyline: points, totalLength: length };
  }, []);

  const dashOffset = useTransform(scrollYProgress, [0, 1], [totalLength, 0]);

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative w-full rounded-md border border-bear-gold/25 overflow-hidden surface-parchment">
        {/* heavier paper grain on the constellation panel */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.09] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.0' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.7'/></svg>\")",
          }}
        />

        {/* faint twinkling background dust */}
        <BackgroundDust />

        {/* corner ornaments — anchor the panel as a cartographic plate */}
        <CornerOrnaments />

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="relative w-full h-[34vh] min-h-[280px] max-h-[440px]"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="tb-gold-line" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#E8B547" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#F5D78A" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#E8B547" stopOpacity="0.3" />
            </linearGradient>
            <radialGradient id="tb-star-glow">
              <stop offset="0%" stopColor="#F8E8D0" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#E8B547" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#E8B547" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* declination rules — faint horizontal guide lines */}
          {[10, 20, 30].map((y) => (
            <line
              key={y}
              x1="2"
              y1={y}
              x2={VB_W - 2}
              y2={y}
              stroke="#E8B547"
              strokeWidth="0.06"
              strokeDasharray="0.5 0.6"
              opacity="0.25"
            />
          ))}

          {/* connecting lines — drawn-in via dash offset */}
          <motion.polyline
            points={polyline}
            fill="none"
            stroke="url(#tb-gold-line)"
            strokeWidth="0.18"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={totalLength}
            style={{ strokeDashoffset: dashOffset }}
            opacity="0.85"
          />

          {/* Stars (rendered above the line so they hide its joins) */}
          {stars.map(({ a, x, y, size }, i) => (
            <Star key={a.id} a={a} x={x} y={y} size={size} delay={i * 0.08} />
          ))}
        </svg>

        {/* Compass rose — bottom-left corner of the panel */}
        <CompassRose />
      </div>
    </div>
  );
}

function Star({
  a,
  x,
  y,
  size,
  delay,
}: {
  a: Achievement;
  x: number;
  y: number;
  size: number;
  delay: number;
}) {
  const color = RANKING_COLOR[a.ranking];
  return (
    <g style={{ animation: `tbStarTwinkle 3.8s ease-in-out ${delay}s infinite` }}>
      {/* glow halo */}
      <circle cx={x} cy={y} r={size * 1.8} fill="url(#tb-star-glow)" opacity={0.7} />
      {/* 4-pointed star spike for milestone (gold) entries */}
      {a.ranking === 'gold' && (
        <g stroke={color} strokeWidth="0.1" opacity="0.8">
          <line x1={x - size * 1.6} y1={y} x2={x + size * 1.6} y2={y} />
          <line x1={x} y1={y - size * 1.6} x2={x} y2={y + size * 1.6} />
        </g>
      )}
      {/* core */}
      <circle cx={x} cy={y} r={size * 0.5} fill={color} />
      {/* tiny year label — only for milestones */}
      {a.ranking === 'gold' && (
        <text
          x={x}
          y={y + size * 1.6 + 1.6}
          fontSize="1.3"
          textAnchor="middle"
          fill="#E8B547"
          opacity="0.8"
          style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.18em' }}
        >
          {a.year}
        </text>
      )}
    </g>
  );
}

function BackgroundDust() {
  // 36 random faint specks — slightly more density than before for parchment feel
  const dust = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: 0.4 + Math.random() * 0.7,
        delay: Math.random() * 5,
        op: 0.18 + Math.random() * 0.3,
      })),
    [],
  );
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full"
    >
      {dust.map((d) => (
        <circle
          key={d.id}
          cx={d.x}
          cy={d.y}
          r={d.s * 0.18}
          fill="#F5D78A"
          opacity={d.op}
          style={{ animation: `tbStarTwinkle 4.5s ease-in-out ${d.delay}s infinite` }}
        />
      ))}
    </svg>
  );
}

function CornerOrnaments() {
  // Four small L-bracket ornaments anchoring the cartographic plate.
  const corner =
    'pointer-events-none absolute h-7 w-7 border-bear-gold/55';
  return (
    <>
      <span className={`${corner} left-2 top-2 border-l border-t`} />
      <span className={`${corner} right-2 top-2 border-r border-t`} />
      <span className={`${corner} left-2 bottom-2 border-l border-b`} />
      <span className={`${corner} right-2 bottom-2 border-r border-b`} />
    </>
  );
}

function CompassRose() {
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 w-12 h-12 md:w-16 md:h-16 opacity-70">
      <svg viewBox="0 0 100 100" className="w-full h-full text-bear-gold">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.4" />
        {/* 4-point star */}
        <g fill="currentColor" opacity="0.85">
          <polygon points="50,8 54,46 50,50 46,46" />
          <polygon points="50,92 54,54 50,50 46,54" />
          <polygon points="8,50 46,54 50,50 46,46" />
          <polygon points="92,50 54,54 50,50 54,46" />
        </g>
        {/* diagonals */}
        <g fill="currentColor" opacity="0.4">
          <polygon points="22,22 47,49 50,50 49,47" />
          <polygon points="78,22 53,49 50,50 51,47" />
          <polygon points="22,78 47,51 50,50 49,53" />
          <polygon points="78,78 53,51 50,50 51,53" />
        </g>
        {/* center pin */}
        <circle cx="50" cy="50" r="2.5" fill="currentColor" />
        <text x="50" y="6" textAnchor="middle" fontSize="6" fill="currentColor" opacity="0.85" style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.15em' }}>N</text>
      </svg>
    </div>
  );
}
