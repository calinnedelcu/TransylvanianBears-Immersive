import { useTexture } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { QualityTier } from '../../../experience/quality';

type ResearchLens = 'economy' | 'automation';

type ResearchActSceneProps = Readonly<{
  progressRef: MutableRefObject<number>;
  lensRef: MutableRefObject<ResearchLens>;
  pointerRef: MutableRefObject<{ x: number; y: number; active: boolean }>;
  qualityTier: QualityTier;
  reducedMotion: boolean;
}>;

const ECONOMY_COLOR = new THREE.Color('#1a4fd0');
const AUTOMATION_LOW = new THREE.Color('#3e6f48');
const AUTOMATION_MID = new THREE.Color('#1a1d1c');
const AUTOMATION_HIGH = new THREE.Color('#d23728');
const PAPER = '#e7e2d4';

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function ease(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function hash(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function range(progress: number, start: number, end: number) {
  return ease((progress - start) / Math.max(0.0001, end - start));
}

function pointCount(qualityTier: QualityTier, compact: boolean, kind: 'economy' | 'automation') {
  if (kind === 'economy') {
    if (compact || qualityTier !== 'cinematic') return 420;
    return 920;
  }
  if (compact || qualityTier !== 'cinematic') return 260;
  return 654;
}

function writePoint(
  target: Float32Array,
  index: number,
  x: number,
  y: number,
  z: number,
) {
  const offset = index * 3;
  target[offset] = x;
  target[offset + 1] = y;
  target[offset + 2] = z;
}

function buildEconomyField(count: number) {
  const collect = new Float32Array(count * 3);
  const compare = new Float32Array(count * 3);
  const qualify = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const column = index % 48;
    const row = Math.floor(index / 48) % 6;
    writePoint(collect, index, (column - 23.5) * 0.07, 1.15 + (row - 2.5) * 0.07, 0.08);
    const u = hash(index, 1);
    const v = hash(index, 2);
    writePoint(
      compare,
      index,
      -4.6 + u * 3.6,
      0.82 + Math.sin(u * Math.PI * 7) * 0.42 + (v - 0.5) * 0.55,
      -0.4 + (v - 0.5) * 1.8,
    );
    writePoint(
      qualify,
      index,
      -2.55 + (u - 0.5) * 2.7,
      1.18 + (v - 0.5) * 1.15,
      -0.15 + Math.sin(u * 9) * 0.12,
    );
  }

  return { collect, compare, qualify };
}

function buildAutomationField(count: number) {
  const collect = new Float32Array(count * 3);
  const compare = new Float32Array(count * 3);
  const qualify = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const column = index % 48;
    const row = Math.floor(index / 48) % 6;
    writePoint(collect, index, (column - 23.5) * 0.07, 1.15 + (row - 2.5) * 0.07, 0.08);
    const u = hash(index, 3);
    const v = hash(index, 4);
    const risk = index / count < 0.505 ? 0 : index / count < 0.991 ? 1 : 2;
    const color = risk === 2 ? AUTOMATION_HIGH : risk === 1 ? AUTOMATION_MID : AUTOMATION_LOW;
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
    const shelf = [0.72, 1.12, 1.58][risk];
    writePoint(
      compare,
      index,
      1.15 + u * 3.7,
      0.7 + (v - 0.5) * 0.85,
      -0.55 + (risk - 1) * 0.55 + (v - 0.5) * 0.7,
    );
    writePoint(
      qualify,
      index,
      2.45 + (u - 0.5) * 2.55,
      shelf + (v - 0.5) * 0.18,
      -0.12 + Math.cos(u * 8) * 0.1,
    );
  }

  return { collect, compare, qualify, colors };
}

function mixFields(
  out: THREE.Vector3,
  collect: Float32Array,
  compare: Float32Array,
  qualify: Float32Array,
  index: number,
  assemble: number,
  cross: number,
  settle: number,
) {
  const offset = index * 3;
  const x1 = collect[offset] + (compare[offset] - collect[offset]) * assemble;
  const y1 = collect[offset + 1] + (compare[offset + 1] - collect[offset + 1]) * assemble;
  const z1 = collect[offset + 2] + (compare[offset + 2] - collect[offset + 2]) * assemble;
  const x2 = x1 + (qualify[offset] - x1) * cross;
  const y2 = y1 + (qualify[offset + 1] - y1) * cross;
  const z2 = z1 + (qualify[offset + 2] - z1) * cross;
  out.set(
    x2 + (qualify[offset] - x2) * settle * 0.18,
    y2 + (qualify[offset + 1] - y2) * settle * 0.18,
    z2 + (qualify[offset + 2] - z2) * settle * 0.18,
  );
}

function ObservationField({
  progressRef,
  lensRef,
  pointerRef,
  qualityTier,
  reducedMotion,
}: ResearchActSceneProps) {
  const compact = useThree((state) => state.size.width <= 820);
  const economyRef = useRef<THREE.InstancedMesh>(null);
  const automationRef = useRef<THREE.InstancedMesh>(null);
  const bitsRef = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const economyCount = pointCount(qualityTier, compact, 'economy');
  const automationCount = pointCount(qualityTier, compact, 'automation');
  const economy = useMemo(() => buildEconomyField(economyCount), [economyCount]);
  const automation = useMemo(() => buildAutomationField(automationCount), [automationCount]);

  useLayoutEffect(() => {
    const mesh = automationRef.current;
    if (!mesh) return;
    const color = new THREE.Color();
    for (let index = 0; index < automationCount; index += 1) {
      color.fromArray(automation.colors, index * 3);
      mesh.setColorAt(index, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [automation.colors, automationCount]);

  useFrame(() => {
    const progress = reducedMotion ? 1 : clamp01(progressRef.current);
    const assemble = range(progress, 0, 0.3);
    const cross = range(progress, 0.26, 0.68);
    const settle = range(progress, 0.66, 1);
    const lens = lensRef.current;
    const pointer = pointerRef.current;
    const economyScale = lens === 'economy' ? 1 : 0.72;
    const automationScale = lens === 'automation' ? 1 : 0.72;

    if (economyRef.current) {
      for (let index = 0; index < economyCount; index += 1) {
        mixFields(scratch.position, economy.collect, economy.compare, economy.qualify, index, assemble, cross, settle);
        if (pointer.active) {
          scratch.position.x += (pointer.x - 0.5) * 0.18;
          scratch.position.y += (0.5 - pointer.y) * 0.12;
        }
        scratch.scale.setScalar(economyScale * (0.7 + assemble * 0.45));
        scratch.updateMatrix();
        economyRef.current.setMatrixAt(index, scratch.matrix);
      }
      economyRef.current.instanceMatrix.needsUpdate = true;
      const material = economyRef.current.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = 0.22 + (lens === 'economy' ? 0.7 : 0.12);
      }
    }

    if (automationRef.current) {
      for (let index = 0; index < automationCount; index += 1) {
        mixFields(
          scratch.position,
          automation.collect,
          automation.compare,
          automation.qualify,
          index,
          assemble,
          cross,
          settle,
        );
        if (pointer.active) {
          scratch.position.x += (pointer.x - 0.5) * 0.16;
          scratch.position.y += (0.5 - pointer.y) * 0.1;
        }
        scratch.scale.setScalar(automationScale * (0.72 + assemble * 0.42));
        scratch.updateMatrix();
        automationRef.current.setMatrixAt(index, scratch.matrix);
      }
      automationRef.current.instanceMatrix.needsUpdate = true;
      const material = automationRef.current.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = 0.2 + (lens === 'automation' ? 0.72 : 0.12);
      }
    }

    if (bitsRef.current) {
      const bitVisible = 1 - assemble;
      for (let index = 0; index < 48; index += 1) {
        const column = index % 8;
        const row = Math.floor(index / 8);
        scratch.position.set((column - 3.5) * 0.16, 1.16 + (row - 2.5) * 0.16, 0.04);
        scratch.scale.setScalar(bitVisible > 0.04 ? 1 : 0.001);
        scratch.updateMatrix();
        bitsRef.current.setMatrixAt(index, scratch.matrix);
      }
      bitsRef.current.instanceMatrix.needsUpdate = true;
      bitsRef.current.visible = bitVisible > 0.04;
    }
  });

  return (
    <group>
      <instancedMesh ref={economyRef} args={[undefined, undefined, economyCount]} frustumCulled={false}>
        <boxGeometry args={[0.045, 0.045, 0.045]} />
        <meshBasicMaterial color={ECONOMY_COLOR} transparent opacity={0.86} depthWrite={false} />
      </instancedMesh>
      <instancedMesh
        ref={automationRef}
        args={[undefined, undefined, automationCount]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial vertexColors transparent opacity={0.84} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={bitsRef} args={[undefined, undefined, 48]} frustumCulled={false}>
        <boxGeometry args={[0.09, 0.09, 0.04]} />
        <meshBasicMaterial color="#111214" />
      </instancedMesh>
    </group>
  );
}

function Instrument({
  progressRef,
  lensRef,
}: Pick<ResearchActSceneProps, 'progressRef' | 'lensRef'>) {
  const [economyMap, shapMap] = useTexture([
    '/assets/projects/research-crossing/economy-event-timeline.webp',
    '/assets/projects/research-crossing/automation-shap.webp',
  ]);
  const economyPlate = useRef<THREE.MeshStandardMaterial>(null);
  const automationPlate = useRef<THREE.MeshStandardMaterial>(null);

  useMemo(() => {
    economyMap.colorSpace = THREE.SRGBColorSpace;
    shapMap.colorSpace = THREE.SRGBColorSpace;
    economyMap.anisotropy = 4;
    shapMap.anisotropy = 4;
  }, [economyMap, shapMap]);

  useFrame(() => {
    const progress = clamp01(progressRef.current);
    const reveal = range(progress, 0.28, 0.62);
    const lens = lensRef.current;
    if (economyPlate.current) {
      economyPlate.current.opacity = 0.08 + reveal * (lens === 'economy' ? 0.82 : 0.28);
      economyPlate.current.emissiveIntensity = 0.12 + reveal * (lens === 'economy' ? 0.38 : 0.08);
    }
    if (automationPlate.current) {
      automationPlate.current.opacity = 0.08 + reveal * (lens === 'automation' ? 0.82 : 0.28);
      automationPlate.current.emissiveIntensity = 0.1 + reveal * (lens === 'automation' ? 0.32 : 0.08);
    }
  });

  return (
    <group>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[28, 22]} />
        <meshStandardMaterial color={PAPER} roughness={0.96} metalness={0} />
      </mesh>
      <mesh position={[0, 0.34, -0.2]}>
        <boxGeometry args={[9.4, 0.16, 4.2]} />
        <meshStandardMaterial color="#d8d0be" roughness={0.78} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.46, -0.2]}>
        <boxGeometry args={[8.8, 0.04, 3.7]} />
        <meshStandardMaterial color="#cfc6b0" roughness={0.62} metalness={0.08} />
      </mesh>
      <mesh position={[-2.1, 0.58, -1.85]}>
        <boxGeometry args={[3.6, 0.08, 0.08]} />
        <meshStandardMaterial color="#8a7344" roughness={0.38} metalness={0.62} />
      </mesh>
      <mesh position={[2.1, 0.58, -1.85]}>
        <boxGeometry args={[3.6, 0.08, 0.08]} />
        <meshStandardMaterial color="#8a7344" roughness={0.38} metalness={0.62} />
      </mesh>
      <mesh position={[-2.45, 1.22, -0.18]} rotation={[-0.42, 0.16, 0]}>
        <planeGeometry args={[3.35, 1.62]} />
        <meshStandardMaterial
          ref={economyPlate}
          map={economyMap}
          emissiveMap={economyMap}
          emissive="#ffffff"
          emissiveIntensity={0.16}
          roughness={0.28}
          metalness={0.04}
          transparent
          opacity={0.16}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[2.45, 1.22, -0.18]} rotation={[-0.42, -0.16, 0]}>
        <planeGeometry args={[3.2, 1.5]} />
        <meshStandardMaterial
          ref={automationPlate}
          map={shapMap}
          emissiveMap={shapMap}
          emissive="#ffffff"
          emissiveIntensity={0.12}
          roughness={0.3}
          metalness={0.04}
          transparent
          opacity={0.16}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function CameraDirector({
  progressRef,
  pointerRef,
  reducedMotion,
}: Pick<ResearchActSceneProps, 'progressRef' | 'pointerRef' | 'reducedMotion'>) {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const progress = reducedMotion ? 1 : clamp01(progressRef.current);
    const collect = 1 - range(progress, 0, 0.3);
    const qualify = range(progress, 0.62, 1);
    const pointer = pointerRef.current;
    const px = pointer.active ? pointer.x - 0.5 : 0;
    const py = pointer.active ? pointer.y - 0.5 : 0;

    camera.position.set(
      THREE.MathUtils.lerp(0, 1.35, qualify) + px * 0.55,
      THREE.MathUtils.lerp(1.28, 2.15, 1 - collect) + 0.35 * qualify - py * 0.28,
      THREE.MathUtils.lerp(3.4, 7.4, 1 - collect * 0.35),
    );
    look.set(px * 0.8, 1.05 - py * 0.25, -0.15);
    camera.lookAt(look);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(38, 46, 1 - collect);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

function World(props: ResearchActSceneProps) {
  return (
    <>
      <color attach="background" args={['#e6e1d3']} />
      <fog attach="fog" args={['#e6e1d3', 10, 22]} />
      <hemisphereLight intensity={0.82} color="#f3eee2" groundColor="#c8c0ad" />
      <directionalLight position={[4.5, 7, 5]} intensity={1.15} color="#fff4df" />
      <directionalLight position={[-5, 3.2, 2]} intensity={0.28} color="#9bb0d6" />
      <CameraDirector
        progressRef={props.progressRef}
        pointerRef={props.pointerRef}
        reducedMotion={props.reducedMotion}
      />
      <Instrument progressRef={props.progressRef} lensRef={props.lensRef} />
      <ObservationField {...props} />
    </>
  );
}

export default function ResearchActScene(props: ResearchActSceneProps) {
  return (
    <Canvas
      className="rc-world-canvas"
      dpr={[1, 1.5]}
      camera={{ fov: 42, near: 0.1, far: 40, position: [0, 1.3, 3.6] }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      fallback={null}
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
}
