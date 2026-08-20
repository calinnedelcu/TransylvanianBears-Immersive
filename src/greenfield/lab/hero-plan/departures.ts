import * as THREE from 'three';
import CITADEL from '../../../../shared/citadel.json';
import type { ProjectId } from '../../types';

/**
 * How the citadel lets go of a system.
 *
 * The citadel and the story do not share a WebGL context: choosing a system is a
 * navigation, and the context is torn down and rebuilt across it. So a single
 * continuous camera move between them is not available, and pretending otherwise
 * would produce a cut dressed up as a move.
 *
 * What is available is a departure and an arrival that agree. The citadel plays a
 * move that ends where the chapter begins, the seam is covered while the frame is
 * dark, and the chapter opens from the same place. Done honestly that reads as one
 * movement; done carelessly it reads as a page load with a fade on it.
 *
 * Each system leaves the citadel by the route that belongs to it: the mausoleum is
 * under the ground, so its departure goes down through the courtyard floor.
 */
export type DepartureMove = 'descend' | 'gate' | 'rise' | 'push';

export type Departure = {
  move: DepartureMove;
  /** How long the citadel takes to let go, in seconds. */
  seconds: number;
  /** Said over the dark, so the seam carries meaning instead of hiding. */
  line: string;
};

const PUSH: Departure = { move: 'push', seconds: 1.1, line: 'Se deschide' };

export const DEPARTURES: Record<ProjectId, Departure> = {
  'project-nexus': { move: 'rise', seconds: 1.4, line: 'Orașul sintetic se ridică' },
  aegis: { move: 'gate', seconds: 1.2, line: 'Poarta cedează' },
  schoolmate: PUSH,
  'the-buried-hands': { move: 'descend', seconds: 1.6, line: 'Mausoleul se deschide' },
  'economy-news': PUSH,
  'automation-risk': PUSH,
  'infect-exe': { move: 'push', seconds: 0.9, line: 'Semnalul se rupe' },
};

export type Pose = { eye: THREE.Vector3; target: THREE.Vector3 };

/** Where the camera ends up when the citadel hands this system over. */
export function departurePose(deg: number, move: DepartureMove): Pose {
  const a = (deg * Math.PI) / 180;
  const out = CITADEL.ring.outerRadius;
  const cos = Math.cos(a);
  const sin = Math.sin(a);

  switch (move) {
    // Down through the courtyard floor: the mausoleum is under the ground, so
    // that is the direction the reader should feel themselves going.
    case 'descend':
      return {
        eye: new THREE.Vector3(cos * out * 0.42, -7, sin * out * 0.42),
        target: new THREE.Vector3(cos * out * 0.2, -20, sin * out * 0.2),
      };
    // Out through the gate, at walking height, the way anyone would actually leave.
    case 'gate': {
      const g = (CITADEL.gate.centerDeg * Math.PI) / 180;
      return {
        eye: new THREE.Vector3(Math.cos(g) * (out - 1), 2.6, Math.sin(g) * (out - 1)),
        target: new THREE.Vector3(Math.cos(g) * (out + 26), 3.4, Math.sin(g) * (out + 26)),
      };
    }
    // Up and over: the synthetic field is a city seen from above.
    case 'rise':
      return {
        eye: new THREE.Vector3(cos * out * 0.7, 46, sin * out * 0.7),
        target: new THREE.Vector3(0, 0, 0),
      };
    // Straight into the bay, for systems whose story starts inside a room.
    default:
      return {
        eye: new THREE.Vector3(cos * (out - 2), 5.4, sin * (out - 2)),
        target: new THREE.Vector3(cos * (out - 14), 4.6, sin * (out - 14)),
      };
  }
}

export const NODE_DEGREES = new Map(CITADEL.nodes.map((node) => [node.id, node.deg]));
