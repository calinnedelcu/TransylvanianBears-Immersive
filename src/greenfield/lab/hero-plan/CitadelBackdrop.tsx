import { useEffect, useMemo, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Three quiet ridge profiles, with distance expressed through air and colour. */
const RIDGES = [
  { z: -130, heights: [12, 17, 15, 25, 21, 29, 24, 20, 27, 16, 22, 12], top: '#243744', foot: '#2c424c' },
  { z: -85, heights: [4, 10, 7, 15, 12, 9, 16, 10, 13, 7, 12, 5], top: '#192c35', foot: '#233943' },
  { z: -48, heights: [1, 5, 3, 8, 5, 3, 6, 2, 7, 5, 2, 0], top: '#102025', foot: '#192e35' },
];

function ridgeMesh(ridge: typeof RIDGES[number]) {
  const anchors = ridge.heights.map((height, i) => (
    new THREE.Vector3(-180 + i * 360 / (ridge.heights.length - 1), height, ridge.z)
  ));
  // Extend beyond the camera's oblique view so no vertical card edge enters frame.
  anchors.unshift(new THREE.Vector3(-600, ridge.heights[0], ridge.z));
  anchors.push(new THREE.Vector3(600, ridge.heights[ridge.heights.length - 1], ridge.z));
  const curve = new THREE.CatmullRomCurve3(anchors, false, 'centripetal');
  const profile = curve.getPoints(240);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const top = new THREE.Color(ridge.top);
  const foot = new THREE.Color(ridge.foot);
  profile.forEach((point, i) => {
    // Small deterministic variation retains a rocky edge without a sawtooth skyline.
    const detail = Math.sin(point.x * 0.61) * 0.32 + Math.sin(point.x * 1.43) * 0.12;
    positions.push(point.x, point.y + detail, point.z, point.x, -24, point.z);
    colors.push(top.r, top.g, top.b, foot.r, foot.g, foot.b);
    if (i < profile.length - 1) {
      const j = i * 2;
      indices.push(j, j + 1, j + 2, j + 2, j + 1, j + 3);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.raycast = () => {};
  // The backdrop belongs behind the opaque foreground and its translucent build.
  mesh.renderOrder = -90;
  return mesh;
}

export function CitadelBackdrop({ progressRef }: { progressRef: MutableRefObject<number> }) {
  const ridges = useMemo(() => RIDGES.map(ridgeMesh), []);
  useFrame(() => {
    const t = THREE.MathUtils.clamp((progressRef.current - 0.36) / 0.2, 0, 1);
    const reveal = t * t * (3 - 2 * t);
    ridges.forEach((ridge) => {
      ridge.visible = reveal > 0.001;
      ridge.material.opacity = reveal;
    });
  });
  useEffect(() => () => ridges.forEach((ridge) => {
    ridge.geometry.dispose();
    ridge.material.dispose();
  }), [ridges]);
  return <group>{ridges.map((ridge) => <primitive key={ridge.uuid} object={ridge} />)}</group>;
}
