import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { QualityTier } from '../../experience/quality';

type CarpathianThresholdProps = {
  progressRef: MutableRefObject<number>;
  qualityTier: QualityTier;
  reducedMotion: boolean;
  realtimeLightEnabled?: boolean;
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

const MOON_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const MOON_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  float valueNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(
      mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), local.x),
      mix(hash21(cell + vec2(0.0, 1.0)), hash21(cell + vec2(1.0)), local.x),
      local.y
    );
  }

  float crater(vec2 point, vec2 center, float radius) {
    float distanceToCenter = length(point - center);
    float bowl = 1.0 - smoothstep(radius * 0.25, radius, distanceToCenter);
    float rim = smoothstep(radius * 0.58, radius * 0.82, distanceToCenter)
      * (1.0 - smoothstep(radius * 0.82, radius, distanceToCenter));
    return rim * 0.42 - bowl * 0.3;
  }

  void main() {
    vec2 point = vUv - 0.5;
    float radius = length(point) * 2.0;
    float limb = 1.0 - smoothstep(0.69, 1.0, radius);
    float terrain = valueNoise(vUv * 8.0) * 0.12 + valueNoise(vUv * 19.0) * 0.055;
    terrain += crater(vUv, vec2(0.31, 0.63), 0.18);
    terrain += crater(vUv, vec2(0.62, 0.7), 0.1);
    terrain += crater(vUv, vec2(0.68, 0.37), 0.15);
    terrain += crater(vUv, vec2(0.43, 0.29), 0.085);
    float cloudVeil = smoothstep(0.46, 0.72, valueNoise(vec2(vUv.x * 3.2, vUv.y * 14.0 + 2.7)));
    vec3 coldStone = vec3(0.61, 0.67, 0.64);
    vec3 litStone = vec3(0.82, 0.84, 0.78);
    vec3 color = mix(coldStone, litStone, 0.52 + terrain);
    color *= 0.72 + limb * 0.34;
    color = mix(color, vec3(0.43, 0.52, 0.51), cloudVeil * 0.2);
    gl_FragColor = vec4(color, limb * 0.86);
  }
`;

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

function BatFlock({ progressRef, qualityTier, reducedMotion }: CarpathianThresholdProps) {
  const rootRef = useRef<THREE.Group>(null);
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
    const departure = smooth(range(progressRef.current, 0.04, 0.064));
    if (rootRef.current) rootRef.current.visible = departure < 0.995;
    if (departure >= 0.995) return;

    const bodies = bodyRef.current;
    const leftWings = leftWingRef.current;
    const rightWings = rightWingRef.current;
    if (!bodies || !leftWings || !rightWings) return;

    const flight = smooth(range(progressRef.current, 0.003, 0.048));
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
    <group ref={rootRef}>
      <instancedMesh ref={bodyRef} args={[geometries.body, materials.body, bats.length]} frustumCulled={false} />
      <instancedMesh ref={leftWingRef} args={[geometries.leftWing, materials.wing, bats.length]} frustumCulled={false} />
      <instancedMesh ref={rightWingRef} args={[geometries.rightWing, materials.wing, bats.length]} frustumCulled={false} />
    </group>
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

export function CarpathianThreshold({
  progressRef,
  qualityTier,
  reducedMotion,
  realtimeLightEnabled = true,
}: CarpathianThresholdProps) {
  const compact = useThree((state) => state.size.width <= 820);
  const rootRef = useRef<THREE.Group>(null);
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);
  const portcullisRef = useRef<THREE.Group>(null);
  const portcullisBarRef = useRef<THREE.InstancedMesh>(null);
  const portcullisSpikeRef = useRef<THREE.InstancedMesh>(null);
  const portcullisRailRef = useRef<THREE.InstancedMesh>(null);
  const torchHandleRef = useRef<THREE.InstancedMesh>(null);
  const flameRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
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
    const root = rootRef.current;
    if (!root) return;
    const doorOpening = smooth(range(progressRef.current, 0.006, 0.04));
    const gateLift = smooth(range(progressRef.current, 0.006, 0.035));
    const departure = smooth(range(progressRef.current, 0.044, 0.072));

    root.visible = departure < 0.995;
    if (!root.visible) return;
    root.position.y = -18 * departure;
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
      <group position={compact ? [-7.2, 13.15, 4.2] : [-9.3, 12.8, 4.2]} scale={compact ? 0.5 : 1}>
        <mesh position={[0, 0, -0.08]}>
          <circleGeometry args={[4.35, 48]} />
          <meshBasicMaterial color="#9eb0aa" transparent opacity={0.055} depthWrite={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[3.05, 48]} />
          <shaderMaterial
            vertexShader={MOON_VERTEX_SHADER}
            fragmentShader={MOON_FRAGMENT_SHADER}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      <BatFlock progressRef={progressRef} qualityTier={qualityTier} reducedMotion={reducedMotion} />
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
        </group>
      ))}
      {realtimeLightEnabled ? (
        <pointLight position={[0, 5.15, 15.9]} intensity={20} distance={11} decay={2.1} color="#e88449" />
      ) : null}
    </group>
  );
}
