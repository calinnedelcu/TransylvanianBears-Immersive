import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { QualityTier } from '../../experience/quality';

type CarpathianThresholdProps = {
  progressRef: MutableRefObject<number>;
  qualityTier: QualityTier;
  reducedMotion: boolean;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function range(value: number, start: number, end: number) {
  return clamp01((value - start) / (end - start));
}

function smooth(value: number) {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function seeded(seed: number) {
  const value = Math.sin(seed * 91.371 + 17.17) * 43758.5453;
  return value - Math.floor(value);
}

function setInstanceTransform(
  mesh: THREE.InstancedMesh | null,
  index: number,
  scratch: THREE.Object3D,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
  rotation: [number, number, number] = [0, 0, 0],
) {
  if (!mesh) return;
  scratch.position.set(...position);
  scratch.rotation.set(...rotation);
  scratch.scale.set(...scale);
  scratch.updateMatrix();
  mesh.setMatrixAt(index, scratch.matrix);
}

function markInstanceMatrixDirty(mesh: THREE.InstancedMesh | null) {
  if (mesh) mesh.instanceMatrix.needsUpdate = true;
}

function createGothicArchShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-6.15, 0);
  shape.lineTo(6.15, 0);
  shape.lineTo(6.15, 5.55);
  shape.quadraticCurveTo(4.5, 9.35, 0, 11.25);
  shape.quadraticCurveTo(-4.5, 9.35, -6.15, 5.55);
  shape.closePath();

  const opening = new THREE.Path();
  opening.moveTo(-3.55, 0);
  opening.lineTo(3.55, 0);
  opening.lineTo(3.55, 4.95);
  opening.quadraticCurveTo(2.35, 7.65, 0, 9.25);
  opening.quadraticCurveTo(-2.35, 7.65, -3.55, 4.95);
  opening.closePath();
  shape.holes.push(opening);
  return shape;
}

function createTunnelRibShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-3.82, 0);
  shape.lineTo(3.82, 0);
  shape.lineTo(3.82, 4.65);
  shape.quadraticCurveTo(2.55, 7.35, 0, 8.55);
  shape.quadraticCurveTo(-2.55, 7.35, -3.82, 4.65);
  shape.closePath();

  const opening = new THREE.Path();
  opening.moveTo(-3.28, 0);
  opening.lineTo(3.28, 0);
  opening.lineTo(3.28, 4.42);
  opening.quadraticCurveTo(2.12, 6.75, 0, 7.86);
  opening.quadraticCurveTo(-2.12, 6.75, -3.28, 4.42);
  opening.closePath();
  shape.holes.push(opening);
  return shape;
}

function createShieldShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.6);
  shape.lineTo(1.25, 1.12);
  shape.lineTo(1.08, -0.55);
  shape.quadraticCurveTo(0.75, -1.28, 0, -1.7);
  shape.quadraticCurveTo(-0.75, -1.28, -1.08, -0.55);
  shape.lineTo(-1.25, 1.12);
  shape.closePath();
  return shape;
}

function createHeraldicBearShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.08);
  shape.lineTo(0.72, 0.7);
  shape.lineTo(1, -0.12);
  shape.lineTo(0.56, -0.8);
  shape.lineTo(0.24, -1.05);
  shape.lineTo(0.24, -0.55);
  shape.lineTo(0, -0.25);
  shape.lineTo(-0.24, -0.55);
  shape.lineTo(-0.24, -1.05);
  shape.lineTo(-0.56, -0.8);
  shape.lineTo(-1, -0.12);
  shape.lineTo(-0.72, 0.7);
  shape.closePath();
  return shape;
}

function createWingShape(direction: -1 | 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.08);
  shape.lineTo(direction * 0.78, 0.34);
  shape.lineTo(direction * 1.65, 0.1);
  shape.lineTo(direction * 1.22, -0.18);
  shape.lineTo(direction * 0.84, -0.03);
  shape.lineTo(direction * 0.54, -0.34);
  shape.lineTo(0, -0.12);
  shape.closePath();
  return shape;
}

function BearCrest() {
  const shield = useMemo(createShieldShape, []);
  const bear = useMemo(createHeraldicBearShape, []);

  return (
    <group position={[0, 10.05, 15.12]} scale={0.88}>
      <mesh position={[0, 0, -0.08]}>
        <extrudeGeometry args={[shield, { depth: 0.22, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.045, bevelSegments: 2 }]} />
        <meshStandardMaterial color="#491318" emissive="#26080c" emissiveIntensity={0.42} roughness={0.56} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.02, 0.19]} scale={0.84}>
        <extrudeGeometry args={[bear, { depth: 0.12, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.025, bevelSegments: 1 }]} />
        <meshStandardMaterial color="#b69c68" emissive="#44351f" emissiveIntensity={0.34} metalness={0.76} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.02, 0.38]} rotation={[0, 0, Math.PI / 4]} scale={[1.25, 0.82, 0.68]}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial color="#1a1413" metalness={0.48} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.28, 0.39]} rotation={[0, 0, Math.PI / 4]} scale={[0.72, 0.72, 0.42]}>
        <boxGeometry args={[0.16, 0.16, 0.12]} />
        <meshStandardMaterial color="#a72b32" emissive="#7e151d" emissiveIntensity={1.9} roughness={0.24} />
      </mesh>
    </group>
  );
}

function GuardianBear({ position, mirror = false }: { position: [number, number, number]; mirror?: boolean }) {
  const earRef = useRef<THREE.InstancedMesh>(null);
  const legRef = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const geometries = useMemo(() => ({
    ear: new THREE.DodecahedronGeometry(0.25, 0),
    leg: new THREE.DodecahedronGeometry(0.44, 0),
  }), []);
  const materials = useMemo(() => ({
    ear: new THREE.MeshStandardMaterial({ color: '#48463f', roughness: 0.96 }),
    leg: new THREE.MeshStandardMaterial({ color: '#414039', roughness: 0.97 }),
  }), []);

  useLayoutEffect(() => {
    [[0.54, 2.4], [1.04, 2.33]].forEach(([x, y], index) => {
      setInstanceTransform(earRef.current, index, scratch, [x, y, -0.02]);
    });
    [-0.72, 0.64].forEach((x, index) => {
      setInstanceTransform(legRef.current, index, scratch, [x, 0.72, 0.22], [0.8, 1.15, 0.92]);
    });
    markInstanceMatrixDirty(earRef.current);
    markInstanceMatrixDirty(legRef.current);
  }, [scratch]);

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  return (
    <group position={position} rotation={[0, mirror ? -0.12 : 0.12, 0]} scale={[mirror ? -0.82 : 0.82, 0.82, 0.82]}>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.92, 1.04, 0.48, 8]} />
        <meshStandardMaterial color="#302f2a" roughness={0.98} />
      </mesh>
      <mesh position={[-0.2, 1.42, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.1, 1.28, 1]}>
        <capsuleGeometry args={[0.62, 1.3, 5, 8]} />
        <meshStandardMaterial color="#4b4941" roughness={0.96} />
      </mesh>
      <mesh position={[0.72, 1.78, 0.02]} scale={[1.04, 1.12, 0.94]}>
        <dodecahedronGeometry args={[0.72, 0]} />
        <meshStandardMaterial color="#555249" roughness={0.94} />
      </mesh>
      <instancedMesh ref={earRef} args={[geometries.ear, materials.ear, 2]} frustumCulled={false} />
      <mesh position={[1.32, 1.58, 0.14]} scale={[1.28, 0.72, 0.82]}>
        <dodecahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color="#666158" roughness={0.92} />
      </mesh>
      <mesh position={[1.68, 1.62, 0.18]} rotation={[0, 0, Math.PI / 4]} scale={[1.18, 0.82, 0.72]}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color="#171615" roughness={0.44} />
      </mesh>
      <instancedMesh ref={legRef} args={[geometries.leg, materials.leg, 2]} frustumCulled={false} />
    </group>
  );
}

const FORTRESS_TOWERS = [
  { x: -7.75, z: 13.25, height: 10.1 },
  { x: 7.75, z: 13.25, height: 10.1 },
] as const;

function FortressTowers() {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const battlementRef = useRef<THREE.InstancedMesh>(null);
  const windowRef = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const geometries = useMemo(() => ({
    body: new THREE.CylinderGeometry(2.58, 2.9, 1, 8),
    roof: new THREE.ConeGeometry(3.38, 4.75, 8),
    battlement: new THREE.BoxGeometry(0.74, 0.82, 0.68),
    window: new THREE.PlaneGeometry(0.26, 1.16),
  }), []);
  const materials = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({
      color: '#3d403a',
      emissive: '#111815',
      emissiveIntensity: 0.28,
      roughness: 0.96,
    }),
    roof: new THREE.MeshStandardMaterial({ color: '#0b1010', roughness: 0.83, metalness: 0.12 }),
    battlement: new THREE.MeshStandardMaterial({ color: '#494b43', roughness: 0.95 }),
    window: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.72 }),
  }), []);

  useLayoutEffect(() => {
    let battlementIndex = 0;
    let windowIndex = 0;
    FORTRESS_TOWERS.forEach((tower, towerIndex) => {
      setInstanceTransform(
        bodyRef.current,
        towerIndex,
        scratch,
        [tower.x, tower.height / 2, tower.z],
        [1, tower.height, 1],
      );
      setInstanceTransform(
        roofRef.current,
        towerIndex,
        scratch,
        [tower.x, tower.height + 2.35, tower.z],
        [1, 1, 1],
        [0, Math.PI / 8, 0],
      );

      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI * 0.25;
        setInstanceTransform(
          battlementRef.current,
          battlementIndex,
          scratch,
          [
            tower.x + Math.sin(angle) * 2.42,
            tower.height + 0.18,
            tower.z + Math.cos(angle) * 2.42,
          ],
          [1, 1, 1],
          [0, angle, 0],
        );
        battlementIndex += 1;
      }

      [4.1, 6.65].forEach((y, rowIndex) => {
        setInstanceTransform(windowRef.current, windowIndex, scratch, [tower.x, y, tower.z + 2.62]);
        windowRef.current?.setColorAt(
          windowIndex,
          new THREE.Color(rowIndex === 0 ? '#b55b3c' : '#d2a568'),
        );
        windowIndex += 1;
      });
    });

    [bodyRef.current, roofRef.current, battlementRef.current, windowRef.current]
      .forEach(markInstanceMatrixDirty);
    if (windowRef.current?.instanceColor) windowRef.current.instanceColor.needsUpdate = true;
  }, [scratch]);

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  return (
    <>
      <instancedMesh ref={bodyRef} args={[geometries.body, materials.body, FORTRESS_TOWERS.length]} frustumCulled={false} />
      <instancedMesh ref={roofRef} args={[geometries.roof, materials.roof, FORTRESS_TOWERS.length]} frustumCulled={false} />
      <instancedMesh ref={battlementRef} args={[geometries.battlement, materials.battlement, FORTRESS_TOWERS.length * 8]} frustumCulled={false} />
      <instancedMesh ref={windowRef} args={[geometries.window, materials.window, FORTRESS_TOWERS.length * 2]} frustumCulled={false} />
      {FORTRESS_TOWERS.flatMap((tower) => [4.1, 6.65].map((y) => (
        <pointLight
          key={`${tower.x}-${y}`}
          position={[tower.x, y, tower.z + 2.87]}
          intensity={3.2}
          distance={5.5}
          color="#d77d4a"
        />
      )))}
    </>
  );
}

function GatePassage({ qualityTier, progressRef }: Pick<CarpathianThresholdProps, 'qualityTier' | 'progressRef'>) {
  const oculusRef = useRef<THREE.Group>(null);
  const wallRef = useRef<THREE.InstancedMesh>(null);
  const ribRef = useRef<THREE.InstancedMesh>(null);
  const sconceHandleRef = useRef<THREE.InstancedMesh>(null);
  const sconceFlameRef = useRef<THREE.InstancedMesh>(null);
  const oculusTickRef = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const ribShape = useMemo(createTunnelRibShape, []);
  const bearShape = useMemo(createHeraldicBearShape, []);
  const ribCount = qualityTier === 'cinematic' ? 6 : 4;
  const geometries = useMemo(() => ({
    wall: new THREE.BoxGeometry(0.58, 7.2, 13.2),
    rib: new THREE.ExtrudeGeometry(ribShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSize: 0.035,
      bevelThickness: 0.025,
      bevelSegments: 1,
    }),
    sconceHandle: new THREE.CylinderGeometry(0.045, 0.06, 0.44, 8),
    sconceFlame: new THREE.OctahedronGeometry(0.14, 0),
    oculusTick: new THREE.BoxGeometry(0.28, 0.035, 0.035),
  }), [ribShape]);
  const materials = useMemo(() => ({
    wall: new THREE.MeshStandardMaterial({
      color: '#3b3932',
      emissive: '#151713',
      emissiveIntensity: 0.25,
      roughness: 0.97,
    }),
    rib: new THREE.MeshStandardMaterial({
      color: '#5a564b',
      emissive: '#211a15',
      emissiveIntensity: 0.32,
      roughness: 0.94,
    }),
    sconceHandle: new THREE.MeshStandardMaterial({ color: '#1b1a17', metalness: 0.7, roughness: 0.35 }),
    sconceFlame: new THREE.MeshStandardMaterial({
      color: '#efb16f',
      emissive: '#dd6336',
      emissiveIntensity: 3.2,
      roughness: 0.2,
    }),
    oculusTick: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
  }), []);

  useLayoutEffect(() => {
    [-3.68, 3.68].forEach((x, index) => {
      setInstanceTransform(wallRef.current, index, scratch, [x, 3.6, 8.55]);
    });

    for (let index = 0; index < ribCount; index += 1) {
      const z = 13.25 - index * (10.2 / Math.max(1, ribCount - 1));
      setInstanceTransform(ribRef.current, index, scratch, [0, 0, z]);
    }

    let sconceIndex = 0;
    [-1, 1].forEach((side) => {
      [11.7, 7.9, 4.15].forEach((z) => {
        setInstanceTransform(
          sconceHandleRef.current,
          sconceIndex,
          scratch,
          [side * 3.1, 2.9, z],
          [1, 1, 1],
          [0, 0, Math.PI / 2],
        );
        setInstanceTransform(sconceFlameRef.current, sconceIndex, scratch, [side * 3.32, 3.25, z]);
        sconceIndex += 1;
      });
    });

    for (let index = 0; index < 7; index += 1) {
      const angle = -Math.PI / 2 + index * (Math.PI * 2 / 7);
      setInstanceTransform(
        oculusTickRef.current,
        index,
        scratch,
        [Math.cos(angle) * 1.48, Math.sin(angle) * 1.48, 0.02],
        [1, 1, 1],
        [0, 0, angle],
      );
      oculusTickRef.current?.setColorAt(
        index,
        new THREE.Color(index === 0 ? '#b6353c' : '#c4ae76'),
      );
    }

    [wallRef.current, ribRef.current, sconceHandleRef.current, sconceFlameRef.current, oculusTickRef.current]
      .forEach(markInstanceMatrixDirty);
    if (oculusTickRef.current?.instanceColor) oculusTickRef.current.instanceColor.needsUpdate = true;
  }, [ribCount, scratch]);

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  useFrame(({ clock }) => {
    if (!oculusRef.current) return;
    const departure = smooth(range(progressRef.current, 0.085, 0.12));
    oculusRef.current.position.y = 5.35 + departure * 1.5;
    oculusRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.38) * 0.025;
    oculusRef.current.scale.setScalar(1 - departure * 0.2);
  });

  return (
    <group>
      <mesh position={[0, 0.01, 8.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.05, 13.4, 12, 22]} />
        <meshStandardMaterial color="#282722" emissive="#160e0b" emissiveIntensity={0.22} roughness={0.98} />
      </mesh>
      <instancedMesh ref={wallRef} args={[geometries.wall, materials.wall, 2]} frustumCulled={false} />
      <instancedMesh ref={ribRef} args={[geometries.rib, materials.rib, ribCount]} frustumCulled={false} />
      <instancedMesh ref={sconceHandleRef} args={[geometries.sconceHandle, materials.sconceHandle, 6]} frustumCulled={false} />
      <instancedMesh ref={sconceFlameRef} args={[geometries.sconceFlame, materials.sconceFlame, 6]} frustumCulled={false} />
      {[-1, 1].flatMap((side) => [11.7, 7.9, 4.15].map((z, index) => (
        <pointLight
          key={`${side}-${z}`}
          position={[side * 3.32, 3.25, z]}
          color={index === 2 ? '#b76d4d' : '#df824d'}
          intensity={9}
          distance={7}
          decay={2.1}
        />
      )))}

      <group ref={oculusRef} position={[0, 5.35, 7.2]}>
        <mesh>
          <ringGeometry args={[1.22, 1.3, 64]} />
          <meshStandardMaterial color="#a9905f" emissive="#514127" emissiveIntensity={0.8} metalness={0.76} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0, 0.04]} scale={0.86}>
          <shapeGeometry args={[bearShape]} />
          <meshBasicMaterial color="#72d9d6" transparent opacity={0.72} toneMapped={false} />
        </mesh>
        <instancedMesh ref={oculusTickRef} args={[geometries.oculusTick, materials.oculusTick, 7]} frustumCulled={false} />
        <pointLight position={[0, 0, 0.45]} color="#72d9d6" intensity={9} distance={12} decay={2.2} />
      </group>
    </group>
  );
}

function BatFlock({ progressRef, qualityTier, reducedMotion }: CarpathianThresholdProps) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const leftWingRef = useRef<THREE.InstancedMesh>(null);
  const rightWingRef = useRef<THREE.InstancedMesh>(null);
  const flapValuesRef = useRef<number[]>([]);
  const compact = useThree((state) => state.size.width <= 820);
  const leftWing = useMemo(() => createWingShape(-1), []);
  const rightWing = useMemo(() => createWingShape(1), []);
  const rootTransform = useMemo(() => new THREE.Object3D(), []);
  const childTransform = useMemo(() => new THREE.Object3D(), []);
  const composedMatrix = useMemo(() => new THREE.Matrix4(), []);
  const geometries = useMemo(() => ({
    body: new THREE.SphereGeometry(0.32, 8, 6),
    leftWing: new THREE.ShapeGeometry(leftWing),
    rightWing: new THREE.ShapeGeometry(rightWing),
  }), [leftWing, rightWing]);
  const materials = useMemo(() => ({
    body: new THREE.MeshBasicMaterial({ color: '#050707' }),
    wing: new THREE.MeshBasicMaterial({ color: '#050707', side: THREE.DoubleSide }),
  }), []);
  const bats = useMemo(() => Array.from({ length: compact ? 5 : qualityTier === 'cinematic' ? 6 : 4 }, (_, index) => ({
    phase: seeded(index + 4),
    y: 9.2 + seeded(index + 11) * 5.8,
    z: 4.5 + seeded(index + 19) * 7.5,
    scale: 0.17 + seeded(index + 29) * 0.16,
    arc: 1.4 + seeded(index + 37) * 2.2,
  })), [compact, qualityTier]);

  useLayoutEffect(() => {
    [bodyRef.current, leftWingRef.current, rightWingRef.current].forEach((mesh) => {
      mesh?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    });
  }, [bats.length]);

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  useFrame(() => {
    const bodies = bodyRef.current;
    const leftWings = leftWingRef.current;
    const rightWings = rightWingRef.current;
    if (!bodies || !leftWings || !rightWings) return;

    const flight = smooth(range(progressRef.current, 0.003, 0.048));
    const departure = smooth(range(progressRef.current, 0.04, 0.064));
    bats.forEach((bat, index) => {
      rootTransform.position.set(
        -4 + bat.phase * 12 + flight * (10 + bat.phase * 5),
        bat.y
        + Math.sin((flight * 1.6 + bat.phase) * Math.PI * 2) * 0.42
        + flight * bat.arc,
        bat.z,
      );
      rootTransform.rotation.set(0, 0, Math.sin((flight + bat.phase) * Math.PI * 2) * 0.12);
      rootTransform.scale.setScalar(bat.scale * (1 - departure));
      rootTransform.updateMatrix();

      childTransform.position.set(0, 0, 0);
      childTransform.rotation.set(0, 0, 0);
      childTransform.scale.set(0.32, 0.82, 0.32);
      childTransform.updateMatrix();
      composedMatrix.multiplyMatrices(rootTransform.matrix, childTransform.matrix);
      bodies.setMatrixAt(index, composedMatrix);

      let flap = flapValuesRef.current[index] ?? 0;
      if (!reducedMotion) {
        flap = Math.sin((flight * 6.4 + bat.phase + index * 0.08) * Math.PI * 2) * 0.62;
        flapValuesRef.current[index] = flap;
      }
      childTransform.rotation.set(0, flap, 0);
      childTransform.scale.set(1, 1, 1);
      childTransform.updateMatrix();
      composedMatrix.multiplyMatrices(rootTransform.matrix, childTransform.matrix);
      leftWings.setMatrixAt(index, composedMatrix);

      childTransform.rotation.set(0, -flap, 0);
      childTransform.updateMatrix();
      composedMatrix.multiplyMatrices(rootTransform.matrix, childTransform.matrix);
      rightWings.setMatrixAt(index, composedMatrix);
    });

    bodies.instanceMatrix.needsUpdate = true;
    leftWings.instanceMatrix.needsUpdate = true;
    rightWings.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={bodyRef} args={[geometries.body, materials.body, bats.length]} frustumCulled={false} />
      <instancedMesh ref={leftWingRef} args={[geometries.leftWing, materials.wing, bats.length]} frustumCulled={false} />
      <instancedMesh ref={rightWingRef} args={[geometries.rightWing, materials.wing, bats.length]} frustumCulled={false} />
    </>
  );
}

type TimberDoorResources = {
  geometries: {
    panel: THREE.BoxGeometry;
    plank: THREE.BoxGeometry;
    band: THREE.BoxGeometry;
    ring: THREE.TorusGeometry;
  };
  materials: {
    panel: THREE.MeshStandardMaterial;
    plank: THREE.MeshStandardMaterial;
    band: THREE.MeshStandardMaterial;
    ring: THREE.MeshStandardMaterial;
  };
};

function TimberDoor({ side, resources }: { side: -1 | 1; resources: TimberDoorResources }) {
  const plankRef = useRef<THREE.InstancedMesh>(null);
  const bandRef = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    for (let index = 0; index < 5; index += 1) {
      setInstanceTransform(
        plankRef.current,
        index,
        scratch,
        [side * (-0.42 - index * 0.64), 4.05, 0.2],
      );
    }
    [1.65, 4.15, 6.55].forEach((y, index) => {
      setInstanceTransform(bandRef.current, index, scratch, [side * -1.68, y, 0.23]);
    });
    markInstanceMatrixDirty(plankRef.current);
    markInstanceMatrixDirty(bandRef.current);
  }, [scratch, side]);

  return (
    <group>
      <mesh
        position={[side * -1.68, 4.05, 0]}
        geometry={resources.geometries.panel}
        material={resources.materials.panel}
      />
      <instancedMesh
        ref={plankRef}
        args={[resources.geometries.plank, resources.materials.plank, 5]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={bandRef}
        args={[resources.geometries.band, resources.materials.band, 3]}
        frustumCulled={false}
      />
      <mesh
        position={[side * -0.62, 4.05, 0.28]}
        geometry={resources.geometries.ring}
        material={resources.materials.ring}
      />
    </group>
  );
}

export function CarpathianThreshold({ progressRef, qualityTier, reducedMotion }: CarpathianThresholdProps) {
  const rootRef = useRef<THREE.Group>(null);
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);
  const portcullisRef = useRef<THREE.Group>(null);
  const portcullisBarRef = useRef<THREE.InstancedMesh>(null);
  const portcullisSpikeRef = useRef<THREE.InstancedMesh>(null);
  const portcullisRailRef = useRef<THREE.InstancedMesh>(null);
  const torchHandleRef = useRef<THREE.InstancedMesh>(null);
  const flameRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const archShape = useMemo(createGothicArchShape, []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const doorResources = useMemo<TimberDoorResources>(() => ({
    geometries: {
      panel: new THREE.BoxGeometry(3.32, 8.1, 0.34),
      plank: new THREE.BoxGeometry(0.045, 7.72, 0.045),
      band: new THREE.BoxGeometry(3.08, 0.14, 0.08),
      ring: new THREE.TorusGeometry(0.24, 0.045, 8, 24),
    },
    materials: {
      panel: new THREE.MeshStandardMaterial({
        color: '#231713',
        emissive: '#100705',
        emissiveIntensity: 0.22,
        roughness: 0.87,
        metalness: 0.03,
      }),
      plank: new THREE.MeshStandardMaterial({ color: '#5c3928', roughness: 0.9 }),
      band: new THREE.MeshStandardMaterial({ color: '#171918', metalness: 0.72, roughness: 0.34 }),
      ring: new THREE.MeshStandardMaterial({ color: '#a18752', metalness: 0.84, roughness: 0.26 }),
    },
  }), []);
  const gateResources = useMemo(() => ({
    geometries: {
      portcullisBar: new THREE.CylinderGeometry(0.075, 0.075, 8.7, 8),
      portcullisSpike: new THREE.ConeGeometry(0.18, 0.72, 6),
      portcullisRail: new THREE.BoxGeometry(6.7, 0.14, 0.14),
      torchHandle: new THREE.CylinderGeometry(0.08, 0.08, 0.74, 8),
    },
    materials: {
      portcullis: new THREE.MeshStandardMaterial({ color: '#151918', metalness: 0.78, roughness: 0.32 }),
      portcullisRail: new THREE.MeshStandardMaterial({ color: '#151918', metalness: 0.8, roughness: 0.3 }),
      torchHandle: new THREE.MeshStandardMaterial({ color: '#1c1c19', metalness: 0.72, roughness: 0.36 }),
    },
  }), []);

  useLayoutEffect(() => {
    for (let index = 0; index < 8; index += 1) {
      const x = -3.05 + index * 0.87;
      setInstanceTransform(portcullisBarRef.current, index, scratch, [x, 4.35, 0]);
      setInstanceTransform(
        portcullisSpikeRef.current,
        index,
        scratch,
        [x, 0.05, 0],
        [1, 1, 1],
        [0, 0, Math.PI],
      );
    }
    [2.2, 5.4, 8.25].forEach((y, index) => {
      setInstanceTransform(portcullisRailRef.current, index, scratch, [0, y, 0]);
    });
    [-1, 1].forEach((side, index) => {
      setInstanceTransform(
        torchHandleRef.current,
        index,
        scratch,
        [side * 4.48, 4.6, 15.57],
        [1, 1, 1],
        [0, 0, Math.PI / 2],
      );
    });
    [portcullisBarRef.current, portcullisSpikeRef.current, portcullisRailRef.current, torchHandleRef.current]
      .forEach(markInstanceMatrixDirty);
  }, [scratch]);

  useEffect(() => () => {
    Object.values(doorResources.geometries).forEach((geometry) => geometry.dispose());
    Object.values(doorResources.materials).forEach((material) => material.dispose());
    Object.values(gateResources.geometries).forEach((geometry) => geometry.dispose());
    Object.values(gateResources.materials).forEach((material) => material.dispose());
  }, [doorResources, gateResources]);

  useFrame(({ clock }, delta) => {
    const doorOpening = smooth(range(progressRef.current, 0.006, 0.04));
    const gateLift = smooth(range(progressRef.current, 0.006, 0.035));
    const departure = smooth(range(progressRef.current, 0.056, 0.096));

    if (rootRef.current) {
      rootRef.current.visible = departure < 0.995;
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -18 * departure, 5.2, delta);
    }
    if (leftDoorRef.current) {
      leftDoorRef.current.rotation.y = THREE.MathUtils.damp(leftDoorRef.current.rotation.y, doorOpening * 1.34, 6.4, delta);
    }
    if (rightDoorRef.current) {
      rightDoorRef.current.rotation.y = THREE.MathUtils.damp(rightDoorRef.current.rotation.y, doorOpening * -1.34, 6.4, delta);
    }
    if (portcullisRef.current) {
      portcullisRef.current.position.y = THREE.MathUtils.damp(portcullisRef.current.position.y, gateLift * 10.2, 7.2, delta);
      portcullisRef.current.visible = gateLift < 0.96;
    }
    flameRefs.current.forEach((material, index) => {
      if (!material) return;
      material.emissiveIntensity = 3.6 + Math.sin(clock.elapsedTime * 8.2 + index * 1.7) * 0.65;
    });
  });

  return (
    <group ref={rootRef}>
      <group position={[-9.3, 12.8, 4.2]}>
        <mesh position={[0, 0, -0.08]}>
          <circleGeometry args={[4.35, 48]} />
          <meshBasicMaterial color="#9eb0aa" transparent opacity={0.055} depthWrite={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[3.05, 48]} />
          <meshBasicMaterial color="#c8d0c5" transparent opacity={0.72} fog={false} />
        </mesh>
      </group>

      <BatFlock progressRef={progressRef} qualityTier={qualityTier} reducedMotion={reducedMotion} />
      <FortressTowers />
      <GatePassage qualityTier={qualityTier} progressRef={progressRef} />

      <mesh position={[0, 0, 14.05]}>
        <extrudeGeometry args={[archShape, { depth: 0.92, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.08, bevelSegments: 3 }]} />
        <meshStandardMaterial color="#494a42" emissive="#121a17" emissiveIntensity={0.34} roughness={0.94} metalness={0.02} />
      </mesh>

      <mesh position={[0, 9.72, 15.03]}>
        <boxGeometry args={[12.8, 0.38, 0.32]} />
        <meshStandardMaterial color="#806c43" metalness={0.66} roughness={0.42} />
      </mesh>

      <BearCrest />
      <GuardianBear position={[-5.15, 0.05, 15.38]} />
      <GuardianBear position={[5.15, 0.05, 15.38]} mirror />

      <group ref={leftDoorRef} position={[-3.42, 0, 15.05]}>
        <TimberDoor side={-1} resources={doorResources} />
      </group>
      <group ref={rightDoorRef} position={[3.42, 0, 15.05]}>
        <TimberDoor side={1} resources={doorResources} />
      </group>

      <group ref={portcullisRef} position={[0, 0, 15.48]}>
        <instancedMesh
          ref={portcullisBarRef}
          args={[gateResources.geometries.portcullisBar, gateResources.materials.portcullis, 8]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={portcullisSpikeRef}
          args={[gateResources.geometries.portcullisSpike, gateResources.materials.portcullis, 8]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={portcullisRailRef}
          args={[gateResources.geometries.portcullisRail, gateResources.materials.portcullisRail, 3]}
          frustumCulled={false}
        />
      </group>

      <instancedMesh
        ref={torchHandleRef}
        args={[gateResources.geometries.torchHandle, gateResources.materials.torchHandle, 2]}
        frustumCulled={false}
      />
      {[-1, 1].map((side, index) => (
        <group key={side} position={[side * 4.48, 5.15, 15.62]}>
          <mesh>
            <coneGeometry args={[0.18, 0.7, 9]} />
            <meshStandardMaterial
              ref={(material) => { flameRefs.current[index] = material; }}
              color="#ffd08a"
              emissive="#e76e36"
              emissiveIntensity={3.6}
              roughness={0.18}
            />
          </mesh>
          <pointLight position={[0, 0, 0.25]} intensity={22} distance={9} color="#e88449" />
        </group>
      ))}
    </group>
  );
}
