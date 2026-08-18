import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { QualityTier } from '../../experience/quality';

type CarpathianThresholdProps = {
  progressRef: MutableRefObject<number>;
  qualityTier: QualityTier;
  reducedMotion: boolean;
  atmosphereEnabled?: boolean;
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

function applyVertexColor<T extends THREE.BufferGeometry>(geometry: T, color: THREE.ColorRepresentation) {
  const tint = new THREE.Color(color);
  const colors = new Float32Array(geometry.getAttribute('position').count * 3);
  for (let index = 0; index < colors.length; index += 3) {
    colors[index] = tint.r;
    colors[index + 1] = tint.g;
    colors[index + 2] = tint.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

type TimberDoorResources = {
  geometries: Record<-1 | 1, THREE.BufferGeometry>;
  material: THREE.MeshStandardMaterial;
};

function TimberDoor({ side, resources }: { side: -1 | 1; resources: TimberDoorResources }) {
  return <mesh geometry={resources.geometries[side]} material={resources.material} />;
}

function createTimberDoorGeometry(side: -1 | 1) {
  const parts: THREE.BufferGeometry[] = [];
  const addPart = (
    geometry: THREE.BufferGeometry,
    color: THREE.ColorRepresentation,
    position: [number, number, number],
  ) => {
    applyVertexColor(geometry, color);
    geometry.translate(...position);
    parts.push(geometry);
  };

  addPart(new THREE.BoxGeometry(3.32, 8.1, 0.34), '#231713', [side * -1.68, 4.05, 0]);
  for (let index = 0; index < 5; index += 1) {
    addPart(
      new THREE.BoxGeometry(0.045, 7.72, 0.045),
      '#5c3928',
      [side * (-0.42 - index * 0.64), 4.05, 0.2],
    );
  }
  [1.65, 4.15, 6.55].forEach((y) => {
    addPart(new THREE.BoxGeometry(3.08, 0.14, 0.08), '#171918', [side * -1.68, y, 0.23]);
  });
  addPart(new THREE.TorusGeometry(0.24, 0.045, 8, 24), '#a18752', [side * -0.62, 4.05, 0.28]);

  const merged = mergeGeometries(parts, false);
  parts.forEach((geometry) => geometry.dispose());
  if (!merged) throw new Error('Unable to batch timber door geometry');
  return merged;
}

export function CarpathianThreshold({
  progressRef,
  reducedMotion,
  realtimeLightEnabled = true,
}: CarpathianThresholdProps) {
  const rootRef = useRef<THREE.Group>(null);
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);
  const portcullisRef = useRef<THREE.Group>(null);
  const portcullisBarRef = useRef<THREE.InstancedMesh>(null);
  const portcullisSpikeRef = useRef<THREE.InstancedMesh>(null);
  const portcullisRailRef = useRef<THREE.InstancedMesh>(null);
  const torchHandleRef = useRef<THREE.InstancedMesh>(null);
  const gateLightRef = useRef<THREE.PointLight>(null);
  const flameGroupRefs = useRef<Array<THREE.Group | null>>([]);
  const flameRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const introStartTimeRef = useRef<number | null>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const doorResources = useMemo<TimberDoorResources>(() => ({
    geometries: {
      [-1]: createTimberDoorGeometry(-1),
      [1]: createTimberDoorGeometry(1),
    },
    material: new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: '#100705',
      emissiveIntensity: 0.16,
      roughness: 0.74,
      metalness: 0.18,
    }),
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
    doorResources.material.dispose();
    Object.values(gateResources.geometries).forEach((geometry) => geometry.dispose());
    Object.values(gateResources.materials).forEach((material) => material.dispose());
  }, [doorResources, gateResources]);

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const doorOpening = smooth(range(progressRef.current, 0.0405, 0.051));
    const gateLift = smooth(range(progressRef.current, 0.04, 0.047));
    const departure = smooth(range(progressRef.current, 0.044, 0.072));
    if (introStartTimeRef.current === null) introStartTimeRef.current = clock.elapsedTime;
    const introTime = clock.elapsedTime - introStartTimeRef.current;

    root.visible = departure < 0.995;
    if (!root.visible) return;
    root.position.y = 0;
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
      const ignition = smooth(range(introTime, 0.38 + index * 0.22, 1.28 + index * 0.22));
      const flicker = Math.sin(clock.elapsedTime * 8.2 + index * 1.7) * 0.62
        + Math.sin(clock.elapsedTime * 17.4 + index) * 0.28;
      material.emissiveIntensity = 0.2 + ignition * (4.2 + flicker);
      material.color.setRGB(
        0.1 + ignition * 0.9,
        0.055 + ignition * 0.76,
        0.025 + ignition * 0.52,
      );
      const flame = flameGroupRefs.current[index];
      if (flame) {
        flame.scale.set(
          ignition * (0.92 + (reducedMotion ? 0 : flicker * 0.035)),
          ignition * (1.08 + (reducedMotion ? 0 : flicker * 0.11)),
          ignition * (0.92 + (reducedMotion ? 0 : flicker * 0.035)),
        );
        flame.rotation.z = reducedMotion ? 0 : flicker * 0.025;
      }
    });
    if (gateLightRef.current) {
      const ignition = smooth(range(introTime, 0.45, 1.85));
      const lowPulse = Math.sin(clock.elapsedTime * 1.15) * 2.8;
      const flamePulse = Math.sin(clock.elapsedTime * 8.2) * 1.6
        + Math.sin(clock.elapsedTime * 17.4) * 0.7;
      gateLightRef.current.intensity = ignition * (30 + lowPulse + flamePulse) * (1 - departure);
      gateLightRef.current.position.x = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.72) * 0.42;
    }
  });

  return (
    <group ref={rootRef}>
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
        <group
          key={side}
          ref={(node) => { flameGroupRefs.current[index] = node; }}
          position={[side * 4.48, 5.15, 15.62]}
        >
          <mesh>
            <coneGeometry args={[0.18, 0.7, 9]} />
            <meshStandardMaterial
              ref={(material) => { flameRefs.current[index] = material; }}
              color="#ffd08a"
              emissive="#e76e36"
              emissiveIntensity={4.4}
              roughness={0.18}
            />
          </mesh>
        </group>
      ))}
      {realtimeLightEnabled ? (
        <pointLight
          ref={gateLightRef}
          position={[0, 5.15, 15.9]}
          intensity={30}
          distance={15}
          decay={2}
          color="#ee8b4f"
        />
      ) : null}
    </group>
  );
}
