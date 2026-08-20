import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  CENTER,
  GATE_END,
  GATE_START,
  LABEL_OFFSET,
  LABEL_RADIUS,
  NICHE_ANGLES,
  RING_INNER,
  RING_OUTER,
  ROUTE_RADIUS,
  VIEW_BOX,
  arcPath,
  contourPath,
  labelAnchor,
  pointX,
  pointY,
  polygonPoints,
  ringBandPath,
} from './citadelGeometry';
import { PLAN_NODES } from './planNodes';

const CONTOURS = [0, 1, 2, 3, 4, 5].map((i) => ({
  d: contourPath(360 + i * 58, i * 1.3),
  key: `contour-${i}`,
}));

const EDGE_TICKS = Array.from({ length: 22 }, (_, i) => 80 + i * 40);

type CitadelPlanProps = {
  /** Nodul evidențiat de hover sau focus; null înseamnă niciunul. */
  activeSlug: string | null;
  onNodeFocus: (slug: string | null) => void;
  /** Când planul e doar decor (în timpul tranziției), scoatem link-urile din tab order. */
  interactive?: boolean;
};

export function CitadelPlan({ activeSlug, onNodeFocus, interactive = true }: CitadelPlanProps) {
  return (
    <svg
      className="hp-plan"
      viewBox={VIEW_BOX}
      role="img"
      aria-labelledby="hp-plan-title hp-plan-desc"
    >
      <title id="hp-plan-title">Planul citadelei Transylvanian Bears</title>
      <desc id="hp-plan-desc">
        Plan concentric: inelul incintei cu poarta la bază, nucleul fațetat în centru, șase nișe
        pentru cele șase discipline și șapte noduri etichetate cu sistemele echipei.
      </desc>

      <g className="hp-plan__terrain">
        {CONTOURS.map((contour, i) => (
          <path
            key={contour.key}
            className="hp-plan__contour"
            d={contour.d}
            style={{ '--i': String(i) } as CSSProperties}
          />
        ))}
      </g>

      <g className="hp-plan__ticks" aria-hidden="true">
        {EDGE_TICKS.map((offset) => (
          <line key={`tx-${offset}`} x1={offset} y1={52} x2={offset} y2={offset % 200 === 80 ? 68 : 60} />
        ))}
        {EDGE_TICKS.map((offset) => (
          <line key={`ty-${offset}`} x1={52} y1={offset} x2={offset % 200 === 80 ? 68 : 60} y2={offset} />
        ))}
      </g>

      {/* Incinta: un singur inel, întrerupt de poartă. */}
      <path className="hp-plan__wall" d={arcPath(RING_OUTER, GATE_END, GATE_START + 360)} />
      <path className="hp-plan__wall hp-plan__wall--inner" d={arcPath(RING_INNER, GATE_END, GATE_START + 360)} />

      {/* Poarta: jambele și pragul, în alamă. */}
      <g className="hp-plan__gate">
        <line
          x1={pointX(RING_INNER, GATE_START)} y1={pointY(RING_INNER, GATE_START)}
          x2={pointX(RING_OUTER, GATE_START)} y2={pointY(RING_OUTER, GATE_START)}
        />
        <line
          x1={pointX(RING_INNER, GATE_END)} y1={pointY(RING_INNER, GATE_END)}
          x2={pointX(RING_OUTER, GATE_END)} y2={pointY(RING_OUTER, GATE_END)}
        />
        <path d={arcPath(283, GATE_START, GATE_END)} />
      </g>

      {/* Șase nișe locuite = șase discipline. */}
      <g className="hp-plan__niches">
        {NICHE_ANGLES.map((deg) => (
          <g key={`niche-${deg}`} transform={`translate(${pointX(283, deg).toFixed(1)},${pointY(283, deg).toFixed(1)}) rotate(${deg + 90})`}>
            <rect x={-17} y={-13} width={34} height={26} />
          </g>
        ))}
      </g>

      {/* Nucleul fațetat, cu pivotul vermilion — singurul din tot cadrul. */}
      <polygon className="hp-plan__core" points={polygonPoints(94, 6, 30)} />
      <polygon className="hp-plan__core hp-plan__core--inner" points={polygonPoints(58, 6, 30)} />
      <rect
        className="hp-plan__pivot"
        x={CENTER - 6} y={CENTER - 6} width={12} height={12}
        transform={`rotate(45 ${CENTER} ${CENTER})`}
      />

      {/* Un singur traseu de semnal, cu câte o ramificație pe nod. */}
      <g className="hp-plan__spurs">
        {PLAN_NODES.map((node) => (
          <line
            key={`spur-${node.project.slug}`}
            x1={pointX(ROUTE_RADIUS, node.deg)} y1={pointY(ROUTE_RADIUS, node.deg)}
            x2={pointX(288, node.deg)} y2={pointY(288, node.deg)}
          />
        ))}
      </g>
      <path className="hp-plan__route" d={arcPath(ROUTE_RADIUS, 70, -215)} />

      {/* Nodurile sunt link-uri reale: planul este indexul. */}
      <g className="hp-plan__nodes">
        {PLAN_NODES.map(({ deg, project, shortDiscipline }, i) => {
          const nx = pointX(RING_OUTER, deg);
          const ny = pointY(RING_OUTER, deg);
          const anchor = labelAnchor(deg);
          // Eticheta se împinge spre exterior, altfel textul calcă peste rombul nodului.
          const lx = pointX(LABEL_RADIUS, deg) + (anchor === 'start' ? LABEL_OFFSET : -LABEL_OFFSET);
          const ly = pointY(LABEL_RADIUS, deg);

          return (
            <Link
              key={project.slug}
              className="hp-plan__node"
              to={`/next/work/${project.slug}`}
              data-active={activeSlug === project.slug || undefined}
              tabIndex={interactive ? undefined : -1}
              aria-label={`${project.index}. ${project.title} — ${project.disciplineLabel}`}
              onMouseEnter={() => onNodeFocus(project.slug)}
              onMouseLeave={() => onNodeFocus(null)}
              onFocus={() => onNodeFocus(project.slug)}
              onBlur={() => onNodeFocus(null)}
              style={{ '--i': String(i) } as CSSProperties}
            >
              <circle
                className="hp-plan__pulse"
                cx={nx} cy={ny} r={17}
                style={{ animationDelay: `${(i * 0.55).toFixed(2)}s` }}
              />
              <rect
                className="hp-plan__mark"
                x={-8} y={-8} width={16} height={16}
                transform={`translate(${nx.toFixed(1)},${ny.toFixed(1)}) rotate(45)`}
              />
              <text className="hp-plan__label" x={lx} y={ly} textAnchor={anchor}>
                <tspan className="hp-plan__index" x={lx} dy="-0.5em">{project.index}</tspan>
                <tspan x={lx} dy="1.6em">{project.shortTitle}</tspan>
                <tspan className="hp-plan__tag" x={lx} dy="1.35em">{shortDiscipline}</tspan>
              </text>
            </Link>
          );
        })}
      </g>

      <g className="hp-plan__north" aria-hidden="true" transform="translate(886,124)">
        <polygon points="0,-22 8,10 0,3 -8,10" />
        <text x={0} y={30} textAnchor="middle">N</text>
      </g>

      <text className="hp-plan__note" x={78} y={892} aria-hidden="true">
        INCINTĂ · NUCLEU · 06 NIȘE · 07 NODURI
      </text>
      <text className="hp-plan__note" x={78} y={918} aria-hidden="true">
        PLAN SCHEMATIC / NU RELEVEU
      </text>
    </svg>
  );
}

/**
 * Felia decorativă a planului, repetată pe axa Z în timpul tranziției ca liniile
 * să capete grosime. Zidul și nucleul se extrudează separat, fiindcă nucleul este
 * mai înalt decât incinta. Relieful rămâne în afară — terenul nu se ridică.
 * Fără link-uri și fără text, deci nu dublează accessibility tree-ul.
 */
export function CitadelPlanShell({ part }: { part: 'wall' | 'core' }) {
  return (
    <svg className="hp-plan hp-plan--shell" viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
      {part === 'wall' ? (
        <path className="hp-plan__band" d={ringBandPath(RING_OUTER, RING_INNER, GATE_END, GATE_START + 360)} />
      ) : (
        <polygon className="hp-plan__block" points={polygonPoints(94, 6, 30)} />
      )}
    </svg>
  );
}
