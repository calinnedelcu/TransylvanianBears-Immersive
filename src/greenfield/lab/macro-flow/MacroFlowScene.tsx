import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';

export type MacroLensMode = 'raw' | 'segmentation' | 'detection';
export type MacroTraceOutcome = 'idle' | 'running' | 'allowed' | 'expired' | 'used';

type MacroFlowSceneProps = {
  progressRef: MutableRefObject<number>;
  lensMode: MacroLensMode;
  traceStep: number;
  traceOutcome: MacroTraceOutcome;
  reducedMotion: boolean;
};

const CAMERA_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 4.6, 24),
  new THREE.Vector3(-2.4, 4.2, 13),
  new THREE.Vector3(1.7, 5.1, -1),
  new THREE.Vector3(-3.2, 5.5, -17),
  new THREE.Vector3(0.8, 5.2, -31),
  new THREE.Vector3(0.3, 5.8, -43),
  new THREE.Vector3(0, 5.3, -60),
  new THREE.Vector3(1.8, 4.6, -71),
  new THREE.Vector3(-1.5, 4.9, -84),
  new THREE.Vector3(0, 7.2, -99),
]);

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

function cameraProgress(progress: number) {
  if (progress < 0.36) return range(progress, 0, 0.36) * 0.64;
  if (progress < 0.49) return 0.64 + range(progress, 0.36, 0.49) * 0.025;
  if (progress < 0.62) return 0.665 + range(progress, 0.49, 0.62) * 0.12;
  if (progress < 0.75) return 0.785 + range(progress, 0.62, 0.75) * 0.14;
  if (progress < 0.9) return 0.925 + range(progress, 0.75, 0.9) * 0.02;
  return 0.945 + range(progress, 0.9, 1) * 0.055;
}

function CameraDirector({
  progressRef,
  reducedMotion,
}: Pick<MacroFlowSceneProps, 'progressRef' | 'reducedMotion'>) {
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const orientation = useMemo(() => new THREE.PerspectiveCamera(), []);

  useFrame(({ camera }, delta) => {
    const progress = cameraProgress(progressRef.current);
    const lookAhead = Math.min(1, progress + 0.11);
    CAMERA_PATH.getPoint(progress, targetPosition);
    CAMERA_PATH.getPoint(lookAhead, lookTarget);

    const damping = reducedMotion ? 1 : 1 - Math.exp(-delta * 5.4);
    camera.position.lerp(targetPosition, damping);

    orientation.position.copy(camera.position);
    orientation.lookAt(lookTarget);
    camera.quaternion.slerp(orientation.quaternion, damping);
  });

  return null;
}

function Aperture({ progressRef }: Pick<MacroFlowSceneProps, 'progressRef'>) {
  const bladeRefs = useRef<Array<THREE.Mesh | null>>([]);
  const haloRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const opening = smooth(range(progressRef.current, 0.055, 0.22));
    bladeRefs.current.forEach((blade, index) => {
      if (!blade) return;
      const angle = (index / 6) * Math.PI * 2;
      const radius = 2.25 + opening * 3.25;
      blade.position.set(Math.cos(angle) * radius, 4.2 + Math.sin(angle) * radius, 7.8);
      blade.rotation.z = angle + Math.PI / 2 + opening * 0.62;
    });
    if (haloRef.current) haloRef.current.rotation.z += delta * (0.025 + opening * 0.08);
  });

  return (
    <group>
      <mesh position={[-6.8, 4.1, 8.15]}>
        <boxGeometry args={[7.8, 9.6, 2.5]} />
        <meshStandardMaterial color="#202526" roughness={0.92} />
      </mesh>
      <mesh position={[6.8, 4.1, 8.15]}>
        <boxGeometry args={[7.8, 9.6, 2.5]} />
        <meshStandardMaterial color="#202526" roughness={0.92} />
      </mesh>
      <group ref={haloRef} position={[0, 0, 0]}>
        <mesh position={[0, 4.2, 8.05]}>
          <torusGeometry args={[4.7, 0.12, 8, 64]} />
          <meshStandardMaterial color="#928568" emissive="#493f2c" emissiveIntensity={0.75} />
        </mesh>
      </group>
      {Array.from({ length: 6 }, (_, index) => (
        <mesh
          key={index}
          ref={(node) => { bladeRefs.current[index] = node; }}
          position={[0, 4.2, 7.8]}
        >
          <boxGeometry args={[3.7, 1.38, 0.5]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? '#b8b1a1' : '#8d877b'}
            emissive={index % 2 === 0 ? '#353127' : '#282723'}
            emissiveIntensity={0.42}
            roughness={0.58}
            metalness={0.24}
          />
        </mesh>
      ))}
    </group>
  );
}

const FIELD_BLOCKS = Array.from({ length: 42 }, (_, index) => {
  const side = index % 2 === 0 ? -1 : 1;
  const row = Math.floor(index / 2);
  const width = 1.4 + ((index * 7) % 5) * 0.38;
  const height = 0.7 + ((index * 11) % 8) * 0.34;
  return {
    position: [side * (3.8 + ((index * 3) % 4) * 1.25), height / 2, 1.5 - row * 2.25] as [number, number, number],
    scale: [width, height, 1.4 + ((index * 5) % 4) * 0.42] as [number, number, number],
    segment: index % 3,
  };
});

function SyntheticField({ lensMode }: Pick<MacroFlowSceneProps, 'lensMode'>) {
  return (
    <group position={[0, 0, -7]}>
      <mesh position={[0, 0.03, -15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.4, 52]} />
        <meshStandardMaterial
          color={lensMode === 'segmentation' ? '#5f7270' : '#273335'}
          emissive={lensMode === 'segmentation' ? '#263837' : '#11191a'}
          emissiveIntensity={0.34}
          roughness={0.9}
        />
      </mesh>
      <mesh position={[0, 0.07, -15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, 50]} />
        <meshBasicMaterial color="#75dcda" transparent opacity={lensMode === 'raw' ? 0.22 : 0.7} />
      </mesh>
      {FIELD_BLOCKS.map((block, index) => {
        const segmentationColors = ['#cf6c57', '#d5b96a', '#6ab0aa'];
        return (
          <mesh key={index} position={block.position}>
            <boxGeometry args={block.scale} />
            <meshStandardMaterial
              color={lensMode === 'segmentation' ? segmentationColors[block.segment] : '#465456'}
              emissive={lensMode === 'segmentation' ? segmentationColors[block.segment] : '#172223'}
              emissiveIntensity={lensMode === 'segmentation' ? 0.12 : 0.28}
              roughness={0.82}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function DetectionFrame({
  position,
  scale,
  active,
  color,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  active: boolean;
  color: string;
}) {
  return (
    <mesh position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={active ? 0.92 : 0.08} />
    </mesh>
  );
}

function NexusTargets({ lensMode }: Pick<MacroFlowSceneProps, 'lensMode'>) {
  const detecting = lensMode === 'detection';
  const segmenting = lensMode === 'segmentation';

  return (
    <group position={[0, 0, -31]}>
      <group position={[-3.5, 0, 0]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[3.2, 1.1, 1.8]} />
          <meshStandardMaterial color={segmenting ? '#cf6c57' : '#545d5e'} roughness={0.58} />
        </mesh>
        <DetectionFrame position={[0, 0.65, 0]} scale={[3.8, 1.65, 2.35]} active={detecting} color="#df6553" />
      </group>
      <group position={[0, 0, -0.2]}>
        <mesh position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.34, 0.5, 2.5, 8]} />
          <meshStandardMaterial color={segmenting ? '#75dcda' : '#b6b2aa'} roughness={0.72} />
        </mesh>
        <mesh position={[0, 2.88, 0]}>
          <sphereGeometry args={[0.48, 16, 12]} />
          <meshStandardMaterial color={segmenting ? '#75dcda' : '#c7c1b6'} roughness={0.72} />
        </mesh>
        <DetectionFrame position={[0, 1.6, 0]} scale={[1.4, 4, 1.4]} active={detecting} color="#75dcda" />
      </group>
      <group position={[4.1, 0, 0.2]}>
        <mesh position={[0, 2.25, 0]}>
          <boxGeometry args={[3.4, 4.5, 2.1]} />
          <meshStandardMaterial color={segmenting ? '#d5b96a' : '#414b4c'} roughness={0.86} />
        </mesh>
        <DetectionFrame position={[0, 2.3, 0]} scale={[4, 5.2, 2.7]} active={detecting} color="#e9bd68" />
      </group>
    </group>
  );
}

function SignalBeads({ progressRef }: Pick<MacroFlowSceneProps, 'progressRef'>) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame(() => {
    const reveal = range(progressRef.current, 0.72, 0.96);
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      const active = index / refs.current.length < reveal;
      material.emissiveIntensity = active ? 2.2 : 0.12;
      mesh.scale.setScalar(active ? 1 : 0.68);
    });
  });

  return (
    <group>
      {Array.from({ length: 28 }, (_, index) => {
        const z = -37 - index * 0.92;
        const x = Math.sin(index * 0.58) * 2.2;
        const y = 0.34 + Math.sin(index * 0.27) * 0.13;
        return (
          <mesh key={index} ref={(node) => { refs.current[index] = node; }} position={[x, y, z]}>
            <octahedronGeometry args={[0.12, 0]} />
            <meshStandardMaterial color="#73dedb" emissive="#55c7c5" emissiveIntensity={0.12} />
          </mesh>
        );
      })}
    </group>
  );
}

function PassageFrame({ z, index }: { z: number; index: number }) {
  const width = 4.4 + index * 0.22;
  const height = 5.2 + index * 0.16;
  const color = index < 3 ? '#6fd8d6' : '#b8a46d';

  return (
    <group position={[Math.sin(index * 0.7) * 1.1, 0, z]} rotation={[0, Math.sin(index) * 0.08, 0]}>
      <mesh position={[-width / 2, height / 2, 0]}>
        <boxGeometry args={[0.12, height, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]}>
        <boxGeometry args={[0.12, height, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[width, 0.12, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function AegisPassage({ progressRef }: Pick<MacroFlowSceneProps, 'progressRef'>) {
  const rootRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!rootRef.current) return;
    const reveal = smooth(range(progressRef.current, 0.7, 0.9));
    rootRef.current.position.y = -3.8 + reveal * 3.8;
  });

  return (
    <group ref={rootRef}>
      {Array.from({ length: 10 }, (_, index) => (
        <PassageFrame key={index} z={-39 - index * 2.9} index={index} />
      ))}
      <mesh position={[0, 0.02, -54]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.5, 34]} />
        <meshStandardMaterial color="#171d1e" roughness={0.94} />
      </mesh>
    </group>
  );
}

const TRACE_POSITIONS: Array<[number, number, number]> = [
  [-2.7, 1.2, -67],
  [2.4, 1.45, -72.5],
  [-1.8, 1.3, -78],
  [2.25, 1.6, -83.5],
  [0, 1.35, -89],
];

function TraceNode({
  position,
  index,
  traceStep,
  traceOutcome,
}: {
  position: [number, number, number];
  index: number;
  traceStep: number;
  traceOutcome: MacroTraceOutcome;
}) {
  const reached = traceStep >= index;
  const isDecision = index === TRACE_POSITIONS.length - 1;
  const denied = isDecision && (traceOutcome === 'expired' || traceOutcome === 'used');
  const color = denied ? '#df6553' : reached ? '#75dcda' : '#4d595a';

  return (
    <group position={position}>
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.85, 1.12, 3.1, 8]} />
        <meshStandardMaterial color="#20292a" roughness={0.76} metalness={0.22} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <octahedronGeometry args={[0.48, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={reached ? 2.2 : 0.18}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[2.5, 4.5, 2.5]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={reached ? 0.54 : 0.12} />
      </mesh>
    </group>
  );
}

function AccessTrace({
  progressRef,
  traceStep,
  traceOutcome,
}: Pick<MacroFlowSceneProps, 'progressRef' | 'traceStep' | 'traceOutcome'>) {
  const tokenRef = useRef<THREE.Mesh>(null);
  const rootRef = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const reveal = smooth(range(progressRef.current, 0.58, 0.68));
    if (rootRef.current) rootRef.current.position.y = -4 + reveal * 4;
    if (!tokenRef.current) return;

    const position = TRACE_POSITIONS[Math.min(traceStep, TRACE_POSITIONS.length - 1)];
    target.set(position[0], position[1] + 3.2, position[2]);
    tokenRef.current.position.lerp(target, 1 - Math.exp(-delta * 5.8));
    tokenRef.current.rotation.x += delta * 1.1;
    tokenRef.current.rotation.y += delta * 1.45;

    const material = tokenRef.current.material as THREE.MeshStandardMaterial;
    const denied = traceOutcome === 'expired' || traceOutcome === 'used';
    const color = denied ? '#df6553' : '#75dcda';
    material.color.set(color);
    material.emissive.set(color);
  });

  return (
    <group ref={rootRef}>
      {TRACE_POSITIONS.map((position, index) => (
        <TraceNode
          key={index}
          position={position}
          index={index}
          traceStep={traceStep}
          traceOutcome={traceOutcome}
        />
      ))}
      {TRACE_POSITIONS.slice(0, -1).map((position, index) => {
        const next = TRACE_POSITIONS[index + 1];
        const midpoint: [number, number, number] = [
          (position[0] + next[0]) / 2,
          0.18,
          (position[2] + next[2]) / 2,
        ];
        const length = Math.hypot(next[0] - position[0], next[2] - position[2]);
        const rotation = Math.atan2(next[0] - position[0], next[2] - position[2]);
        return (
          <mesh key={index} position={midpoint} rotation={[0, rotation, 0]}>
            <boxGeometry args={[0.08, 0.08, length]} />
            <meshStandardMaterial
              color={traceStep > index ? '#75dcda' : '#3c4849'}
              emissive={traceStep > index ? '#75dcda' : '#1b2324'}
              emissiveIntensity={traceStep > index ? 1.5 : 0.12}
            />
          </mesh>
        );
      })}
      <mesh ref={tokenRef} position={[-2.7, 4.4, -67]}>
        <icosahedronGeometry args={[0.34, 1]} />
        <meshStandardMaterial color="#75dcda" emissive="#75dcda" emissiveIntensity={3.2} />
      </mesh>
      <mesh position={[0, 0.02, -79]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[11, 30]} />
        <meshStandardMaterial color="#12191a" roughness={0.96} />
      </mesh>
    </group>
  );
}

function DescentLayers({ progressRef }: Pick<MacroFlowSceneProps, 'progressRef'>) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame(() => {
    const fold = smooth(range(progressRef.current, 0.88, 1));
    refs.current.forEach((layer, index) => {
      if (!layer) return;
      layer.rotation.x = -Math.PI / 2 + fold * (0.2 + index * 0.075);
      layer.position.y = -0.2 - index * 0.16 + fold * index * 0.18;
      layer.position.z = -96 - index * 1.35;
    });
  });

  return (
    <group>
      {Array.from({ length: 7 }, (_, index) => (
        <mesh key={index} ref={(node) => { refs.current[index] = node; }}>
          <planeGeometry args={[16 - index * 0.9, 8]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? '#252322' : '#34302b'}
            emissive={index % 2 === 0 ? '#181616' : '#211d18'}
            emissiveIntensity={0.24}
            side={THREE.DoubleSide}
            roughness={0.94}
          />
        </mesh>
      ))}
    </group>
  );
}

function World({ progressRef, lensMode, traceStep, traceOutcome, reducedMotion }: MacroFlowSceneProps) {
  return (
    <>
      <color attach="background" args={['#070a0b']} />
      <fog attach="fog" args={['#070a0b', 14, 58]} />
      <ambientLight intensity={1.08} color="#a9bfbc" />
      <directionalLight position={[8, 14, 10]} intensity={3.1} color="#efe5cf" />
      <pointLight position={[0, 4.6, 12]} intensity={32} distance={17} color="#c4ad74" />
      <pointLight position={[0, 5, -30]} intensity={22} distance={16} color="#6fd8d6" />
      <pointLight position={[0, 5, -54]} intensity={18} distance={18} color="#c0a66b" />
      <pointLight position={[0, 5, -79]} intensity={24} distance={22} color="#75dcda" />

      <CameraDirector progressRef={progressRef} reducedMotion={reducedMotion} />
      <Aperture progressRef={progressRef} />
      <SyntheticField lensMode={lensMode} />
      <NexusTargets lensMode={lensMode} />
      <SignalBeads progressRef={progressRef} />
      <AegisPassage progressRef={progressRef} />
      <AccessTrace
        progressRef={progressRef}
        traceStep={traceStep}
        traceOutcome={traceOutcome}
      />
      <DescentLayers progressRef={progressRef} />

      <mesh position={[0, -0.08, -42]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36, 140]} />
        <meshStandardMaterial color="#101516" roughness={0.98} />
      </mesh>
    </>
  );
}

export function MacroFlowScene(props: MacroFlowSceneProps) {
  return (
    <Canvas
      className="mf-canvas"
      dpr={[1, 1.5]}
      camera={{ fov: 52, near: 0.1, far: 140, position: [0, 4.6, 24] }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      fallback={<div className="mf-canvas-fallback">3D scene unavailable</div>}
    >
      <World {...props} />
    </Canvas>
  );
}
