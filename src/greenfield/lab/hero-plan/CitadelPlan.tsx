import { useEffect, useRef, type CSSProperties } from 'react';
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
  ROUTE_FROM,
  ROUTE_LENGTH,
  ROUTE_RADIUS,
  ROUTE_TO,
  SWEEP_PERIOD,
  SWEEP_RADIUS,
  VIEW_BOX,
  arcPath,
  contourPath,
  labelAnchor,
  pointX,
  pointY,
  polygonPoints,
  ringBandPath,
  sectorPath,
  sweepHit,
} from './citadelGeometry';
import { PLAN_NODES } from './planNodes';

const CONTOURS = [0, 1, 2, 3, 4, 5].map((i) => ({
  d: contourPath(360 + i * 58, i * 1.3),
  key: `contour-${i}`,
}));

const EDGE_TICKS = Array.from({ length: 22 }, (_, i) => 80 + i * 40);

/**
 * Coada fasciculului: 18 felii de 4°, deci 72° de urmă în spatele muchiei de atac.
 * Opacitatea scade pătratic — liniar lăsa o margine vizibilă la capătul cozii.
 */
const SWEEP_STEP = 4;
const SWEEP_TRAIL = Array.from({ length: 18 }, (_, i) => {
  const falloff = 1 - i / 18;
  return {
    key: `sweep-${i}`,
    d: sectorPath(SWEEP_RADIUS, -(i + 1) * SWEEP_STEP, -i * SWEEP_STEP),
    opacity: (falloff * falloff * 0.16).toFixed(4),
  };
});

/** Traseul de semnal, o singură dată: linia îl desenează, capul luminos îl parcurge. */
const ROUTE_PATH = arcPath(ROUTE_RADIUS, ROUTE_FROM, ROUTE_TO);

/** Cât timp după trecerea fasciculului rămâne numele sistemului pe readout, în grade. */
const ACQUIRE_ARC = 26;

/**
 * Ce vede instrumentul, scris cu litere.
 *
 * Citește ceasul chiar al animației de baleiaj, nu un `performance.now()` paralel:
 * așa readout-ul nu poate rămâne în urmă după minute de rulare, se oprește odată
 * cu fila ascunsă și pornește exact de unde a rămas. Textul se scrie doar când se
 * schimbă, iar bucla se oprește de tot când desenul iese din ecran — o pagină de
 * pornire n-are voie să țină un rAF viu cât timp cititorul e cu cinci capitole mai
 * jos.
 */
function ScanReadout() {
  const ref = useRef<SVGTextElement>(null);

  useEffect(() => {
    const node = ref.current;
    const svg = node?.ownerSVGElement;
    if (!node || !svg) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const sweep = svg.querySelector('.hp-plan__sweep');
    let raf = 0;
    let written = '';

    const tick = () => {
      const animation = sweep?.getAnimations?.()[0];
      const clock = animation?.currentTime;
      const seconds = typeof clock === 'number' ? clock / 1000 : 0;
      const bearing = (((seconds / SWEEP_PERIOD) % 1) + 1) % 1 * 360;

      const acquired = PLAN_NODES.find(({ deg }) => {
        const behind = (((bearing - deg) % 360) + 360) % 360;
        return behind < ACQUIRE_ARC;
      });

      const next = `BALEIAJ ${String(Math.floor(bearing)).padStart(3, '0')}° · ${
        acquired ? acquired.project.shortTitle.toUpperCase() : '—'
      }`;
      if (next !== written) {
        written = next;
        node.textContent = next;
      }
      raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !raf) raf = requestAnimationFrame(tick);
      else if (!entry.isIntersecting && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    observer.observe(svg);

    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <text ref={ref} className="hp-plan__note hp-plan__note--live" x={78} y={892} aria-hidden="true">
      BALEIAJ 000° · —
    </text>
  );
}

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
      <defs>
        <radialGradient id="hp-core-halo">
          <stop offset="0%" stopColor="#a98546" stopOpacity="0.42" />
          <stop offset="38%" stopColor="#a98546" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#a98546" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Lumina nucleului. Cadrul avea totul la același ton: fără un punct cald
          în mijloc, ochiul nu are unde să se așeze și desenul citește ca zgomot. */}
      <circle className="hp-plan__halo" cx={CENTER} cy={CENTER} r={205} fill="url(#hp-core-halo)" />
      <polygon className="hp-plan__core" points={polygonPoints(94, 6, 30)} />
      <polygon className="hp-plan__core hp-plan__core--inner" points={polygonPoints(58, 6, 30)} />
      <circle className="hp-plan__pivot-glow" cx={CENTER} cy={CENTER} r={9} />
      <rect
        className="hp-plan__pivot"
        x={CENTER - 6} y={CENTER - 6} width={12} height={12}
        transform={`rotate(45 ${CENTER} ${CENTER})`}
      />

      {/*
        Fasciculul. Planul e un instrument, nu un desen tipărit: baleiază, iar
        nodurile răspund când trece peste ele. Muchia de atac e desenată la 0°
        și tot grupul se rotește, deci sincronul cu nodurile e o întârziere
        calculată din unghi — nu se poate desincroniza.
      */}
      <g className="hp-plan__sweep" aria-hidden="true">
        {SWEEP_TRAIL.map((sector) => (
          <path key={sector.key} d={sector.d} style={{ opacity: sector.opacity }} />
        ))}
        <line
          className="hp-plan__sweep-edge"
          x1={CENTER} y1={CENTER}
          x2={pointX(SWEEP_RADIUS, 0)} y2={pointY(SWEEP_RADIUS, 0)}
        />
      </g>

      {/* Un singur traseu de semnal, cu câte o ramificație pe nod. */}
      <g className="hp-plan__spurs">
        {PLAN_NODES.map((node) => (
          <line
            key={`spur-${node.project.slug}`}
            x1={pointX(ROUTE_RADIUS, node.deg)} y1={pointY(ROUTE_RADIUS, node.deg)}
            x2={pointX(288, node.deg)} y2={pointY(288, node.deg)}
            style={{ animationDelay: `${sweepHit(node.deg).toFixed(3)}s` }}
          />
        ))}
      </g>
      <path
        className="hp-plan__route"
        d={ROUTE_PATH}
        style={{ '--hp-route-len': ROUTE_LENGTH.toFixed(1) } as CSSProperties}
      />
      {/* Capul semnalului merge pe exact același arc, cu aceeași cadență ca linia. */}
      <circle
        className="hp-plan__route-head"
        cx={0} cy={0} r={5}
        aria-hidden="true"
        style={{ offsetPath: `path("${ROUTE_PATH}")` } as CSSProperties}
      />

      {/* Nodurile sunt link-uri reale: planul este indexul. */}
      <g className="hp-plan__nodes">
        {PLAN_NODES.map(({ deg, project, shortDiscipline }, i) => {
          const nx = pointX(RING_OUTER, deg);
          const ny = pointY(RING_OUTER, deg);
          const anchor = labelAnchor(deg);
          // Când trece fasciculul peste nodul ăsta. Aceeași valoare pentru inel,
          // pentru licărul mărcii și pentru ramificația lui.
          const hit = `${sweepHit(deg).toFixed(3)}s`;
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
                style={{ animationDelay: hit }}
              />
              {/* Inelul de răspuns: pornește sub marcă și se deschide, o singură
                  dată la fiecare trecere a fasciculului. */}
              <circle
                className="hp-plan__ping"
                cx={nx} cy={ny} r={13}
                style={{ animationDelay: hit }}
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

      <ScanReadout />
      <text className="hp-plan__note" x={78} y={918} aria-hidden="true">
        INCINTĂ · NUCLEU · 06 NIȘE · 07 NODURI / PLAN SCHEMATIC
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
