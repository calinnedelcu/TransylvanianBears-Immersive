import type { ProjectId } from '../../types';

/**
 * Geometria planului citadelei.
 *
 * Toate formele derivă din marca echipei citită ca plan concentric de fortificație:
 * inel de incintă cu poartă, nucleu fațetat, șase nișe locuite și șapte noduri de
 * sistem. Nimic nu este aleatoriu — relieful folosește o sumă de sinusoide cu fază
 * fixă, ca desenul să fie identic la fiecare randare.
 */

export const CENTER = 500;
export const VIEW_BOX = '40 40 920 920';

export const RING_OUTER = 300;
export const RING_INNER = 266;
export const ROUTE_RADIUS = 214;
export const LABEL_RADIUS = 348;

/** Depărtarea etichetei de traseul ei, ca textul să nu calce peste nod. */
export const LABEL_OFFSET = 14;

/** Golul din inel, în grade, care devine poarta. */
export const GATE_START = 80;
export const GATE_END = 100;

/**
 * Pozițiile celor șapte noduri pe inel, în ordinea indexului din `PROJECTS`.
 * Aici stă doar geometria — numele, disciplina, starea și metricile vin din
 * datele echipei, ca planul să nu poată intra în contradicție cu indexul.
 */
export const NODE_ANGLES: Array<{ id: ProjectId; deg: number }> = [
  { id: 'project-nexus', deg: 55 },
  { id: 'aegis', deg: 10 },
  { id: 'schoolmate', deg: -35 },
  { id: 'the-buried-hands', deg: -80 },
  { id: 'economy-news', deg: -125 },
  { id: 'automation-risk', deg: -170 },
  { id: 'infect-exe', deg: -215 },
];

/** Cele șase discipline, ca nișe în zidul locuit, opuse porții. */
export const NICHE_ANGLES = [130, 170, 210, 250, 290, 330];

const rad = (deg: number) => (deg * Math.PI) / 180;

export const pointX = (radius: number, deg: number) => CENTER + radius * Math.cos(rad(deg));
export const pointY = (radius: number, deg: number) => CENTER + radius * Math.sin(rad(deg));

/** Arc de cerc între două unghiuri, folosit pentru inel, poartă și traseu. */
export function arcPath(radius: number, from: number, to: number): string {
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 1 : 0;
  return [
    `M${pointX(radius, from).toFixed(1)} ${pointY(radius, from).toFixed(1)}`,
    `A${radius} ${radius} 0 ${large} ${sweep}`,
    `${pointX(radius, to).toFixed(1)} ${pointY(radius, to).toFixed(1)}`,
  ].join(' ');
}

/** Curbă de nivel: cerc deformat determinist, turtit pe verticală ca un relief. */
export function contourPath(radius: number, seed: number): string {
  const points: string[] = [];
  for (let deg = 0; deg < 360; deg += 5) {
    const t = rad(deg);
    const wobble =
      1 +
      0.038 * Math.sin(3 * t + seed) +
      0.024 * Math.sin(5 * t + seed * 1.7) +
      0.013 * Math.sin(8 * t + seed * 2.6);
    const x = CENTER + radius * wobble * Math.cos(t);
    const y = CENTER + radius * wobble * Math.sin(t) * 0.9;
    points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `M${points.join('L')}Z`;
}

/** Poligon regulat, pentru nucleul fațetat derivat din marcă. */
export function polygonPoints(radius: number, sides: number, offsetDeg: number): string {
  return Array.from({ length: sides }, (_, i) => {
    const deg = offsetDeg + i * (360 / sides);
    return `${pointX(radius, deg).toFixed(1)},${pointY(radius, deg).toFixed(1)}`;
  }).join(' ');
}

/** Eticheta stă în afara nodului; se ancorează spre exterior, nu peste desen. */
export function labelAnchor(deg: number): 'start' | 'end' {
  return Math.cos(rad(deg)) > -0.08 ? 'start' : 'end';
}

/**
 * Bandă inelară închisă: arcul exterior dus, arcul interior întors.
 * Stratificată pe axa Z, dă zidului o față plină, nu un contur prin care se vede.
 */
export function ringBandPath(outer: number, inner: number, from: number, to: number): string {
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return [
    `M${pointX(outer, from).toFixed(1)} ${pointY(outer, from).toFixed(1)}`,
    `A${outer} ${outer} 0 ${large} 1 ${pointX(outer, to).toFixed(1)} ${pointY(outer, to).toFixed(1)}`,
    `L${pointX(inner, to).toFixed(1)} ${pointY(inner, to).toFixed(1)}`,
    `A${inner} ${inner} 0 ${large} 0 ${pointX(inner, from).toFixed(1)} ${pointY(inner, from).toFixed(1)}`,
    'Z',
  ].join(' ');
}
