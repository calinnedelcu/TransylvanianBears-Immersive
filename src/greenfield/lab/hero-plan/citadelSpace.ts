import * as THREE from 'three';

/**
 * A bearing on the citadel's ring, in the coordinates the model actually loads in.
 *
 * The geometry is authored in Blender, where the ring lies in XY with Z up and
 * `polar()` returns (r·cos, r·sin). glTF is Y up, so the exporter rotates the
 * scene: Blender (x, y, z) arrives as (x, z, -y). The sine term changes sign.
 *
 * Reading that sign off the source and using (cos, sin) directly puts everything
 * on the opposite side of the ring, which is a mirror that a circular building
 * hides perfectly until something has to line up with something else. It cost a
 * camera walk that went through the back wall instead of through the gate.
 */
export function onRing(degrees: number, radius: number, height: number): THREE.Vector3 {
  const a = (degrees * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(a) * radius, height, -Math.sin(a) * radius);
}
