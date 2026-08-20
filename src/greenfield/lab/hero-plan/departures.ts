import * as THREE from 'three';
import CITADEL from '../../../../shared/citadel.json';

/**
 * How the citadel hands the reader over to the story.
 *
 * The opening ends with a building standing and the story starts with a city,
 * and something has to happen between them or the reader is cut from one to the
 * other. The citadel has exactly one exit, and it spent the last of its sequence
 * opening it, so that is where they go: out through the gate, at walking height,
 * the way anyone would actually leave a building.
 */
export type Pose = { eye: THREE.Vector3; target: THREE.Vector3 };

export function gatePose(): Pose {
  const out = CITADEL.ring.outerRadius;
  const a = (CITADEL.gate.centerDeg * Math.PI) / 180;
  return {
    eye: new THREE.Vector3(Math.cos(a) * (out - 1), 2.6, Math.sin(a) * (out - 1)),
    target: new THREE.Vector3(Math.cos(a) * (out + 26), 3.4, Math.sin(a) * (out + 26)),
  };
}
