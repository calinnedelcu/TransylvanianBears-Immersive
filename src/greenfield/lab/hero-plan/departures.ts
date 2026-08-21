import * as THREE from 'three';
import CITADEL from '../../../../shared/citadel.json';

/**
 * How the citadel hands the reader over to the story.
 *
 * The opening ends with a building standing and the story starts with a city, so
 * something has to happen between them. The citadel has exactly one exit and it
 * spent the last of its sequence opening it, so that is the way: not a look at
 * the gate but a walk through it.
 *
 * Two poses rather than one, because arriving at a doorway and going through it
 * are different movements, and a single lerp between the far view and the far
 * side would cut the corner and pass through the wall.
 */
export type Pose = { eye: THREE.Vector3; target: THREE.Vector3 };

const OUT = CITADEL.ring.outerRadius;
const GATE = (CITADEL.gate.centerDeg * Math.PI) / 180;
const COS = Math.cos(GATE);
const SIN = Math.sin(GATE);

/** Standing in the opening, at the height of someone walking out of it. */
export function gateThreshold(): Pose {
  return {
    eye: new THREE.Vector3(COS * (OUT - 2.2), 2.5, SIN * (OUT - 2.2)),
    target: new THREE.Vector3(COS * (OUT + 30), 3.2, SIN * (OUT + 30)),
  };
}

/**
 * Just outside, on the ramp, looking down the road.
 *
 * Far enough that the citadel is behind the reader and the world can swap under
 * them unseen, but not so far that there is nothing left to look at. Walking a
 * long way out put the camera over empty ground with the fog closing in, which
 * reads as the scene ending rather than as leaving somewhere for somewhere else.
 * The ramp descends from the gate, so the frame keeps a road in it.
 */
export function gateBeyond(): Pose {
  return {
    eye: new THREE.Vector3(COS * (OUT + 7), 2.9, SIN * (OUT + 7)),
    target: new THREE.Vector3(COS * (OUT + 34), 0.6, SIN * (OUT + 34)),
  };
}
