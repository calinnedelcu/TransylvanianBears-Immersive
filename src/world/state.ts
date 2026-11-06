import * as THREE from 'three';

/** Values the camera rig writes every frame and the scenery reads. */
export const world = {
  sky: new THREE.Color('#ffc531'),
  /** Mouse position, -1…1 (stays 0 on touch screens). */
  pointer: new THREE.Vector2(),
};

/** Small deterministic random generator, so the world looks the same on every visit. */
export function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
