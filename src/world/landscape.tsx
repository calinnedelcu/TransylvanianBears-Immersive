import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ink } from '../three/Ink';
import { PALETTE, getToonRamp } from '../three/shapes';
import { MONUMENT, RESULTS_CENTER, TEAM_Z, roadX } from './journey';
import { seeded, world } from './state';

const Z_START = 26;
const INK = new THREE.Color(PALETTE.ink);
const Z_END = -300;

/** Ground that takes on a darker shade of the current sky. */
function Ground() {
  const material = useRef<THREE.MeshToonMaterial>(null);
  useFrame(() => {
    material.current?.color.copy(world.sky).lerp(INK, 0.3);
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -140]}>
      <planeGeometry args={[600, 800]} />
      <meshToonMaterial ref={material} gradientMap={getToonRamp()} />
    </mesh>
  );
}

/** The dashed comic-book road that links every station. */
function Road() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dashes = useMemo(() => {
    const list: { x: number; z: number; yaw: number }[] = [];
    for (let z = Z_START - 8; z > MONUMENT.z + 6; z -= 2.4) {
      const slope = (roadX(z - 0.5) - roadX(z + 0.5)) / 1;
      list.push({ x: roadX(z), z, yaw: Math.atan(slope) });
    }
    return list;
  }, []);

  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    const dummy = new THREE.Object3D();
    dashes.forEach((dash, index) => {
      dummy.position.set(dash.x, 0.03, dash.z);
      dummy.rotation.set(0, dash.yaw, 0);
      dummy.updateMatrix();
      node.setMatrixAt(index, dummy.matrix);
    });
    node.instanceMatrix.needsUpdate = true;
  }, [dashes]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, dashes.length]}>
      <boxGeometry args={[0.32, 0.04, 1.3]} />
      <meshBasicMaterial color={PALETTE.ink} />
    </instancedMesh>
  );
}

/** True where trees must not grow: the road, and the clearings around stations. */
function blocked(x: number, z: number) {
  if (Math.abs(x - roadX(z)) < 9) return true;
  if (z < TEAM_Z + 20 && z > MONUMENT.z - 10 && Math.abs(x) < 18) return true;
  if (Math.abs(z - RESULTS_CENTER.z) < 12 && Math.abs(x) < 14) return true;
  return false;
}

function Forest({ count }: { count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const trees = useMemo(() => {
    const random = seeded(7);
    const list: { x: number; z: number; s: number; tone: number }[] = [];
    let guard = 0;
    while (list.length < count && guard < count * 20) {
      guard += 1;
      const side = random() > 0.5 ? 1 : -1;
      const x = side * (8 + random() * 34);
      const z = Z_START - random() * (Z_START - Z_END);
      if (blocked(x, z)) continue;
      list.push({ x, z, s: 0.7 + random() * 0.9, tone: random() });
    }
    return list;
  }, [count]);

  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    const dummy = new THREE.Object3D();
    const light = new THREE.Color(PALETTE.mint);
    const deep = new THREE.Color('#3fa36f');
    trees.forEach((tree, index) => {
      dummy.position.set(tree.x, 1.5 * tree.s, tree.z);
      dummy.scale.setScalar(tree.s);
      dummy.rotation.set(0, tree.tone * 6, 0);
      dummy.updateMatrix();
      node.setMatrixAt(index, dummy.matrix);
      node.setColorAt(index, tree.tone > 0.5 ? light : deep);
    });
    node.instanceMatrix.needsUpdate = true;
    if (node.instanceColor) node.instanceColor.needsUpdate = true;
  }, [trees]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, trees.length]}>
      <coneGeometry args={[1, 3, 6]} />
      <meshToonMaterial gradientMap={getToonRamp()} />
      <Ink width={2.5} />
    </instancedMesh>
  );
}

/** Low-poly Carpathians on both sides; the fog fades them into the sky. */
function Mountains({ count }: { count: number }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);
  const peaks = useMemo(() => {
    const random = seeded(21);
    return Array.from({ length: count }, (_, index) => {
      const side = index % 2 === 0 ? 1 : -1;
      const h = 14 + random() * 26;
      return {
        x: side * (46 + random() * 60),
        z: -14 - (index / count) * (-14 - Z_END + 40) - random() * 12,
        h,
        r: h * (0.55 + random() * 0.25),
        tone: random(),
      };
    });
  }, [count]);

  useLayoutEffect(() => {
    const body = bodies.current;
    const cap = caps.current;
    if (!body || !cap) return;
    const dummy = new THREE.Object3D();
    const tones = [PALETTE.wine, '#7d3350', PALETTE.cobalt].map((hex) => new THREE.Color(hex));
    peaks.forEach((peak, index) => {
      dummy.position.set(peak.x, peak.h / 2, peak.z);
      dummy.scale.set(peak.r, peak.h, peak.r);
      dummy.rotation.set(0, peak.tone * 3, 0);
      dummy.updateMatrix();
      body.setMatrixAt(index, dummy.matrix);
      body.setColorAt(index, tones[Math.floor(peak.tone * tones.length) % tones.length]);
      // The snow cap is the top 30% of the same cone.
      dummy.position.set(peak.x, peak.h * 0.85 + 0.05, peak.z);
      dummy.scale.set(peak.r * 0.3 + 0.08, peak.h * 0.3 + 0.1, peak.r * 0.3 + 0.08);
      dummy.updateMatrix();
      cap.setMatrixAt(index, dummy.matrix);
    });
    body.instanceMatrix.needsUpdate = true;
    cap.instanceMatrix.needsUpdate = true;
    if (body.instanceColor) body.instanceColor.needsUpdate = true;
  }, [peaks]);

  return (
    <>
      <instancedMesh ref={bodies} args={[undefined, undefined, peaks.length]}>
        <coneGeometry args={[1, 1, 6]} />
        <meshToonMaterial gradientMap={getToonRamp()} />
        <Ink width={3} />
      </instancedMesh>
      <instancedMesh ref={caps} args={[undefined, undefined, peaks.length]}>
        <coneGeometry args={[1, 1, 6]} />
        <meshToonMaterial color={PALETTE.bone} gradientMap={getToonRamp()} />
      </instancedMesh>
    </>
  );
}

export function Landscape({ light }: { light: boolean }) {
  return (
    <>
      <Ground />
      <Road />
      <Forest count={light ? 70 : 150} />
      <Mountains count={light ? 26 : 40} />
    </>
  );
}
