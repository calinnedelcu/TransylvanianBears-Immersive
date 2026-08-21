import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, type MutableRefObject } from 'react';
import * as THREE from 'three';
import CITADEL from '../../../../shared/citadel.json';

/**
 * The plan, drawn in 3D.
 *
 * During the plan and the tip nothing is solid: the citadel is line work, exactly
 * as the SVG draws it. A flattened solid read as a pale floating disc and threw
 * away everything that makes the drawing worth looking at — the ring, the niches,
 * the node diamonds, the gate, the frame ticks.
 *
 * Every dimension comes from shared/citadel.json, the same file the SVG and the
 * Blender model read, so these lines sit exactly on the drawn ones and exactly on
 * the solid that later grows out of them.
 */

const RING = CITADEL.ring;
const GATE = CITADEL.gate;
const BAYS = CITADEL.bays;
const CORE = CITADEL.core;

const rad = (deg: number) => (deg * Math.PI) / 180;
const at = (radius: number, deg: number, y = 0) =>
  new THREE.Vector3(radius * Math.cos(rad(deg)), y, radius * Math.sin(rad(deg)));

function arc(radius: number, from: number, to: number, steps = 96, y = 0) {
  return Array.from({ length: steps + 1 }, (_, i) => at(radius, from + ((to - from) * i) / steps, y));
}

function polygon(radius: number, sides: number, offsetDeg: number, y = 0) {
  const points = Array.from({ length: sides }, (_, i) => at(radius, offsetDeg + (i * 360) / sides, y));
  return [...points, points[0]];
}

/** Same deterministic wobble and vertical squash the SVG contour uses. */
function contour(radiusMetres: number, seed: number) {
  return Array.from({ length: 91 }, (_, i) => {
    const t = rad(i * 4);
    const wobble =
      1 +
      0.038 * Math.sin(3 * t + seed) +
      0.024 * Math.sin(5 * t + seed * 1.7) +
      0.013 * Math.sin(8 * t + seed * 2.6);
    const r = radiusMetres * wobble;
    return new THREE.Vector3(r * Math.cos(t), 0, r * Math.sin(t) * 0.9);
  });
}

type Drawn = { points: THREE.Vector3[]; tone: 'stone' | 'brass' | 'signal' | 'faint' };

function buildDrawing(): Drawn[] {
  const drawn: Drawn[] = [];
  const gateFrom = GATE.centerDeg + GATE.halfWidthDeg;
  const gateTo = GATE.centerDeg - GATE.halfWidthDeg + 360;

  // Terrain contours.
  for (let i = 0; i < CITADEL.terrain.contourCount; i += 1) {
    drawn.push({
      points: contour(CITADEL.terrain.contourStart + i * CITADEL.terrain.contourStep, i * 1.3),
      tone: 'faint',
    });
  }

  // Frame ticks: the survey sheet edge, one long mark every fifth.
  for (let deg = 0; deg < 360; deg += 5) {
    const long = deg % 25 === 0;
    drawn.push({
      points: [at(RING.outerRadius + 4.2, deg), at(RING.outerRadius + (long ? 5.9 : 5.1), deg)],
      tone: 'faint',
    });
  }

  // Enclosure: two circles broken by the gate.
  drawn.push({ points: arc(RING.outerRadius, gateFrom, gateTo), tone: 'stone' });
  drawn.push({ points: arc(RING.innerRadius, gateFrom, gateTo), tone: 'stone' });

  // Gate: jambs and threshold.
  drawn.push({
    points: [at(RING.innerRadius, gateFrom), at(RING.outerRadius, gateFrom)],
    tone: 'brass',
  });
  drawn.push({
    points: [at(RING.innerRadius, gateTo), at(RING.outerRadius, gateTo)],
    tone: 'brass',
  });
  drawn.push({
    points: arc((RING.innerRadius + RING.outerRadius) / 2, gateFrom, gateTo - 360, 12),
    tone: 'brass',
  });

  // Six inhabited bays, drawn as the footprints they are.
  for (let i = 0; i < BAYS.count; i += 1) {
    const centre = BAYS.startDeg + i * BAYS.stepDeg;
    const half = BAYS.widthDeg / 2;
    const inner = RING.outerRadius - 0.4;
    const outer = RING.outerRadius + BAYS.projection;
    drawn.push({
      points: [
        ...arc(inner, centre - half, centre + half, 8),
        ...arc(outer, centre + half, centre - half, 8),
        at(inner, centre - half),
      ],
      tone: 'stone',
    });
  }

  // Faceted core, twice, and the pivot cross.
  drawn.push({ points: polygon(CORE.radius, CORE.facets, 30), tone: 'brass' });
  drawn.push({ points: polygon(CORE.radius * 0.62, CORE.facets, 30), tone: 'brass' });
  drawn.push({ points: [at(0.6, 45), at(0.6, 225)], tone: 'signal' });
  drawn.push({ points: [at(0.6, 135), at(0.6, 315)], tone: 'signal' });

  // No system nodes and no route.
  //
  // Seven diamonds, a spur from each one to a signal arc, and the arc itself: that
  // was the drawing of the index - the reader picked a system off the citadel and
  // light ran down the route to it. The index is gone and the story is one scroll,
  // so all of it drew a way of reading the building that no longer exists. The arc
  // is the pale curve that used to hang over the plan with a lit head on it.
  //
  // What stays is the architecture: the enclosure, the niches, the gate, the core
  // and its pivot cross, the frame ticks. That is the citadel being drawn, which is
  // what the opening is about.

  return drawn;
}

const TONE_COLOR: Record<Drawn['tone'], string> = {
  stone: '#d7d0c3',
  brass: '#a98546',
  signal: '#69ced0',
  faint: '#60735c',
};

const TONE_OPACITY: Record<Drawn['tone'], number> = {
  stone: 0.9,
  brass: 0.85,
  signal: 0.8,
  faint: 0.4,
};

type PlanLinesProps = {
  progressRef: MutableRefObject<number>;
  fadeStart: number;
  fadeEnd: number;
};

export function PlanLines({ progressRef, fadeStart, fadeEnd }: PlanLinesProps) {
  const drawing = useMemo(() => buildDrawing(), []);
  // Plain Three objects, not the <line> intrinsic: that tag collides with the SVG
  // element of the same name and the reconciler ends up looking for state that was
  // never created for it.
  const lines = useMemo(
    () =>
      drawing.map((entry) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(entry.points);
        const material = new THREE.LineBasicMaterial({
          color: new THREE.Color(TONE_COLOR[entry.tone]),
          transparent: true,
          opacity: TONE_OPACITY[entry.tone],
          depthWrite: false,
          toneMapped: false,
        });
        const object = new THREE.Line(geometry, material);
        object.raycast = () => {};
        return { object, material, base: TONE_OPACITY[entry.tone] };
      }),
    [drawing],
  );

  useEffect(
    () => () =>
      lines.forEach(({ object, material }) => {
        object.geometry.dispose();
        material.dispose();
      }),
    [lines],
  );

  useFrame(() => {
    const p = progressRef.current;
    const fade = 1 - Math.max(0, Math.min(1, (p - fadeStart) / (fadeEnd - fadeStart)));
    lines.forEach(({ material, base }) => {
      material.opacity = base * fade;
    });
  });

  return (
    <group>
      {lines.map(({ object }, index) => (
        <primitive key={index} object={object} />
      ))}
    </group>
  );
}
