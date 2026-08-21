import * as THREE from 'three';
import CITADEL from '../../../../shared/citadel.json';
import { onRing } from './citadelSpace';

/**
 * How the citadel hands the reader over to the story.
 *
 * The opening ends with the reader outside the walls, looking in at a building
 * that has just finished putting itself together. So the way on is inward: up to
 * the gate it spent the last of its sequence opening, and through it.
 *
 * That direction is not a preference, it is the only one that works. Aiming the
 * walk outward meant the camera had to reverse, because it starts facing the
 * citadel: measured, the heading swung 76 degrees in a single step of the move,
 * which reads as the camera turning its back just before the door. Entering
 * keeps the heading it already has - the worst step is now five degrees.
 *
 * Two poses rather than one, because approaching a doorway and passing through
 * it are different movements, and a single lerp between the far view and the far
 * side cuts the corner and takes the camera through the wall.
 */
export type Pose = { eye: THREE.Vector3; target: THREE.Vector3 };

const OUT = CITADEL.ring.outerRadius;
const IN = CITADEL.ring.innerRadius;
const GATE = CITADEL.gate.centerDeg;

/** Outside the gate, at the height of someone about to walk in through it. */
export function gateThreshold(): Pose {
  return {
    eye: onRing(GATE, OUT + 9, 2.7),
    target: new THREE.Vector3(0, 4.6, 0),
  };
}

/**
 * Inside the courtyard, the gate behind and the keep filling the far half.
 *
 * Two wrong answers on the way to this one. Stopping three metres inside the wall
 * left the reader at a standstill in an empty court at the exact moment the story
 * changes worlds, and a cut taken from a standstill is a cut. Driving all the way
 * onto the keep fixed the standstill and replaced the court with a featureless
 * slab of wall, which is worse to look at and worse to leave. This ends still
 * moving, with the keep across most of the frame and the ramparts either side of
 * it, and lets the flare take the frame from there.
 */
export function gateBeyond(): Pose {
  return {
    eye: onRing(GATE, IN - 5.6, 2.7),
    // Aimed at the middle of the keep's doorway, which is 2.5m up.
    //
    // This used to look at 6.2, and the head of that portal is at 4.82: the walk
    // ended pointed at blank wall above the door, with the lit recess and the
    // light spilling out of it below the bottom of the frame. The reader crossed
    // the whole courtyard and arrived at masonry.
    target: new THREE.Vector3(0, 2.5, 0),
  };
}
