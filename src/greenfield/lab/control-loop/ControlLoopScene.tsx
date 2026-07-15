import { Canvas, type ThreeEvent, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { LensMode, LoopStage, TargetId } from './controlLoopMachine';

export type LookState = {
  yaw: number;
  pitch: number;
};

type ControlLoopSceneProps = {
  stage: LoopStage;
  lensMode: LensMode;
  selectedTarget: TargetId | null;
  evidenceUnlocked: boolean;
  reducedMotion: boolean;
  lookRef: MutableRefObject<LookState>;
  onSelectMission: () => void;
  onSelectTarget: (target: TargetId) => void;
  onArriveMission: () => void;
  onArriveHub: () => void;
};

const HUB_CAMERA = new THREE.Vector3(0, 5.4, 15.5);
const HUB_TARGET = new THREE.Vector3(0, 1.4, 0);
const MISSION_CAMERA = new THREE.Vector3(0, 6.3, -14.2);
const MISSION_TARGET = new THREE.Vector3(0, 2, -25.5);
const MOBILE_HUB_CAMERA = new THREE.Vector3(0, 7.2, 24);
const MOBILE_MISSION_CAMERA = new THREE.Vector3(0, 7, -5.5);
const MOBILE_HUB_OFFSET = MOBILE_HUB_CAMERA.clone().sub(HUB_CAMERA);
const MOBILE_MISSION_OFFSET = MOBILE_MISSION_CAMERA.clone().sub(MISSION_CAMERA);

const OUTBOUND_PATH = new THREE.CatmullRomCurve3([
  HUB_CAMERA,
  new THREE.Vector3(6.8, 7.3, 7.5),
  new THREE.Vector3(8.4, 5.4, -4.5),
  new THREE.Vector3(4.5, 7.1, -13.8),
  MISSION_CAMERA,
]);

const RETURN_PATH = new THREE.CatmullRomCurve3([
  MISSION_CAMERA,
  new THREE.Vector3(-4.8, 7, -14.5),
  new THREE.Vector3(-8.2, 5.7, -3.2),
  new THREE.Vector3(-6.2, 7.2, 7.8),
  HUB_CAMERA,
]);

function smoothStep(value: number) {
  return value * value * (3 - 2 * value);
}

function CameraDirector({
  stage,
  reducedMotion,
  lookRef,
  onArriveMission,
  onArriveHub,
}: Pick<
  ControlLoopSceneProps,
  'stage' | 'reducedMotion' | 'lookRef' | 'onArriveMission' | 'onArriveHub'
>) {
  const transitionStart = useRef<number | null>(null);
  const reported = useRef(false);
  const orientation = useMemo(() => new THREE.PerspectiveCamera(), []);
  const offset = useMemo(() => new THREE.Quaternion(), []);
  const offsetEuler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const transitionTarget = useMemo(() => new THREE.Vector3(), []);
  const mobileOffset = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    transitionStart.current = null;
    reported.current = false;
  }, [stage]);

  useFrame(({ camera, clock, size }, delta) => {
    const travellingOut = stage === 'travel-out';
    const travellingBack = stage === 'travel-back';
    const portrait = size.width / size.height < 0.72;

    if (travellingOut || travellingBack) {
      const start = transitionStart.current ?? clock.elapsedTime;
      transitionStart.current = start;
      const elapsed = clock.elapsedTime - start;
      const progress = reducedMotion ? 1 : THREE.MathUtils.clamp(elapsed / 3.15, 0, 1);
      const eased = smoothStep(progress);
      const path = travellingOut ? OUTBOUND_PATH : RETURN_PATH;
      const fromTarget = travellingOut ? HUB_TARGET : MISSION_TARGET;
      const toTarget = travellingOut ? MISSION_TARGET : HUB_TARGET;

      camera.position.copy(path.getPoint(eased));
      if (portrait) {
        mobileOffset.lerpVectors(
          travellingOut ? MOBILE_HUB_OFFSET : MOBILE_MISSION_OFFSET,
          travellingOut ? MOBILE_MISSION_OFFSET : MOBILE_HUB_OFFSET,
          eased,
        );
        camera.position.add(mobileOffset);
      }
      transitionTarget.lerpVectors(fromTarget, toTarget, eased);
      camera.lookAt(transitionTarget);

      if (progress >= 1 && !reported.current) {
        reported.current = true;
        window.setTimeout(travellingOut ? onArriveMission : onArriveHub, 0);
      }
      return;
    }

    const inMission = stage === 'mission' || stage === 'proof';
    const anchor = inMission
      ? portrait ? MOBILE_MISSION_CAMERA : MISSION_CAMERA
      : portrait ? MOBILE_HUB_CAMERA : HUB_CAMERA;
    const target = inMission ? MISSION_TARGET : HUB_TARGET;
    const damping = reducedMotion ? 1 : 1 - Math.exp(-delta * 7);

    camera.position.lerp(anchor, damping);
    orientation.position.copy(camera.position);
    orientation.lookAt(target);
    offsetEuler.set(lookRef.current.pitch, lookRef.current.yaw, 0);
    offset.setFromEuler(offsetEuler);
    orientation.quaternion.multiply(offset);
    camera.quaternion.slerp(orientation.quaternion, damping);
  });

  return null;
}

function CentralCore({ completed, reducedMotion }: { completed: boolean; reducedMotion: boolean }) {
  const ringRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!ringRef.current || reducedMotion) return;
    ringRef.current.rotation.y += delta * (completed ? 0.28 : 0.08);
  });

  return (
    <group>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[3.1, 3.8, 0.7, 8]} />
        <meshStandardMaterial color="#26343a" roughness={0.7} metalness={0.45} />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <octahedronGeometry args={[1.15, 0]} />
        <meshStandardMaterial
          color={completed ? '#79e2df' : '#68747a'}
          emissive={completed ? '#38aeb1' : '#131b1f'}
          emissiveIntensity={completed ? 2.6 : 0.35}
          roughness={0.28}
          metalness={0.58}
        />
      </mesh>
      <group ref={ringRef} position={[0, 1.7, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.25, 0.055, 8, 64]} />
          <meshBasicMaterial color={completed ? '#79e2df' : '#46555c'} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[1.75, 0.035, 8, 48]} />
          <meshBasicMaterial color={completed ? '#e9bd68' : '#37434a'} />
        </mesh>
      </group>
      {completed && (
        <mesh position={[0, 6.8, 0]}>
          <cylinderGeometry args={[0.025, 0.18, 10, 12]} />
          <meshBasicMaterial color="#79e2df" transparent opacity={0.62} />
        </mesh>
      )}
    </group>
  );
}

type WingNodeProps = {
  kind: 'observe' | 'protect' | 'imagine' | 'measure';
  position: [number, number, number];
  rotation: number;
  active?: boolean;
  completed?: boolean;
  onSelect?: () => void;
};

const WING_COLORS: Record<WingNodeProps['kind'], string> = {
  observe: '#79e2df',
  protect: '#df6553',
  imagine: '#bd8ccf',
  measure: '#e9bd68',
};

function WingSymbol({ kind, color }: { kind: WingNodeProps['kind']; color: string }) {
  if (kind === 'observe') {
    return (
      <>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.9, 0.12, 10, 48]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
        </mesh>
        <mesh position={[0, 0, 0.08]}>
          <sphereGeometry args={[0.25, 20, 20]} />
          <meshBasicMaterial color="#e7ffff" />
        </mesh>
      </>
    );
  }

  if (kind === 'protect') {
    return (
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.82, 0]} />
        <meshStandardMaterial color={color} wireframe />
      </mesh>
    );
  }

  if (kind === 'imagine') {
    return (
      <group>
        <mesh position={[-0.38, 0.18, 0]}>
          <sphereGeometry args={[0.42, 16, 16]} />
          <meshStandardMaterial color={color} wireframe />
        </mesh>
        <mesh position={[0.38, -0.18, 0]}>
          <sphereGeometry args={[0.42, 16, 16]} />
          <meshStandardMaterial color={color} wireframe />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {[-0.52, 0, 0.52].map((x, index) => (
        <mesh key={x} position={[x, -0.32 + index * 0.3, 0]}>
          <boxGeometry args={[0.23, 0.72 + index * 0.5, 0.23]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

function WingNode({ kind, position, rotation, active = false, completed = false, onSelect }: WingNodeProps) {
  const color = WING_COLORS[kind];
  const interactive = active && Boolean(onSelect);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta < 8) onSelect?.();
  };

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    event.stopPropagation();
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    if (interactive) document.body.style.cursor = '';
  };

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[2.7, 0.24, 3.8]} />
        <meshStandardMaterial color="#111a1f" roughness={0.78} metalness={0.28} />
      </mesh>
      <mesh position={[0, 2.55, -1.25]}>
        <boxGeometry args={[2.4, 3.2, 0.28]} />
        <meshStandardMaterial color={active ? '#22363d' : '#171e22'} roughness={0.72} />
      </mesh>
      <group position={[0, 2.65, -1.05]}>
        <WingSymbol kind={kind} color={active || completed ? color : '#586269'} />
      </group>
      <mesh
        position={[0, 2.3, 0]}
        onClick={interactive ? handleClick : undefined}
        onPointerOver={interactive ? handlePointerOver : undefined}
        onPointerOut={interactive ? handlePointerOut : undefined}
      >
        <boxGeometry args={[3.2, 3.4, 4.3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {active && (
        <pointLight position={[0, 3, 0]} color={color} intensity={completed ? 18 : 9} distance={8} />
      )}
    </group>
  );
}

function HubWorld({
  active,
  completed,
  reducedMotion,
  onSelectMission,
}: {
  active: boolean;
  completed: boolean;
  reducedMotion: boolean;
  onSelectMission: () => void;
}) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[11.8, 64]} />
        <meshStandardMaterial color="#101a1f" roughness={0.9} metalness={0.12} />
      </mesh>
      <CentralCore completed={completed} reducedMotion={reducedMotion} />
      <WingNode
        kind="observe"
        position={[0, 0, -7.1]}
        rotation={0}
        active={active}
        completed={completed}
        onSelect={onSelectMission}
      />
      <WingNode kind="protect" position={[-7.1, 0, 0]} rotation={Math.PI / 2} />
      <WingNode kind="imagine" position={[7.1, 0, 0]} rotation={-Math.PI / 2} />
      <WingNode kind="measure" position={[0, 0, 7.1]} rotation={Math.PI} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[5, 5.08, 64]} />
        <meshBasicMaterial color={completed ? '#79e2df' : '#2d3b42'} transparent opacity={0.72} />
      </mesh>
    </group>
  );
}

const TARGET_POSITIONS: Record<TargetId, [number, number, number]> = {
  vehicle: [-4.1, 0, -25.6],
  human: [0, 0, -26.2],
  structure: [4.2, 0, -25.5],
};

const TARGET_COLORS: Record<TargetId, string> = {
  human: '#79e2df',
  vehicle: '#df6553',
  structure: '#e9bd68',
};

function DetectionBounds({ target, color }: { target: TargetId; color: string }) {
  const dimensions: Record<TargetId, [number, number, number]> = {
    human: [1.65, 4.25, 1.55],
    vehicle: [3.65, 2.1, 2.45],
    structure: [2.5, 5.25, 2.5],
  };
  const heights: Record<TargetId, number> = { human: 2.15, vehicle: 1.05, structure: 2.62 };

  return (
    <mesh position={[0, heights[target], 0]}>
      <boxGeometry args={dimensions[target]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.9} />
    </mesh>
  );
}

function TargetGeometry({ target, color }: { target: TargetId; color: string }) {
  const material = (
    <meshStandardMaterial color={color} roughness={0.54} metalness={0.18} emissive={color} emissiveIntensity={0.12} />
  );

  if (target === 'human') {
    return (
      <group>
        <mesh position={[0, 3.62, 0]}>
          <sphereGeometry args={[0.48, 18, 18]} />
          {material}
        </mesh>
        <mesh position={[0, 2.35, 0]}>
          <cylinderGeometry args={[0.52, 0.72, 2.05, 12]} />
          {material}
        </mesh>
        <mesh position={[-0.28, 0.75, 0]} rotation={[0, 0, 0.08]}>
          <cylinderGeometry args={[0.2, 0.24, 1.55, 10]} />
          {material}
        </mesh>
        <mesh position={[0.28, 0.75, 0]} rotation={[0, 0, -0.08]}>
          <cylinderGeometry args={[0.2, 0.24, 1.55, 10]} />
          {material}
        </mesh>
      </group>
    );
  }

  if (target === 'vehicle') {
    return (
      <group>
        <mesh position={[0, 1.25, 0]}>
          <boxGeometry args={[3.2, 1.25, 1.95]} />
          {material}
        </mesh>
        <mesh position={[0.35, 2.05, 0]}>
          <boxGeometry args={[1.45, 0.55, 1.65]} />
          {material}
        </mesh>
        {[-1.05, 1.05].map((x) => (
          <mesh key={x} position={[x, 0.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 2.08, 14]} />
            <meshStandardMaterial color="#1a2328" roughness={0.9} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, 2.55, 0]}>
        <cylinderGeometry args={[0.92, 1.22, 5.1, 6]} />
        {material}
      </mesh>
      <mesh position={[0, 5.35, 0]} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.72, 0]} />
        {material}
      </mesh>
    </group>
  );
}

function MissionTarget({
  target,
  lensMode,
  selected,
  interactive,
  onSelect,
}: {
  target: TargetId;
  lensMode: LensMode;
  selected: boolean;
  interactive: boolean;
  onSelect: (target: TargetId) => void;
}) {
  const semanticColor = TARGET_COLORS[target];
  const color = lensMode === 'segmentation' ? semanticColor : selected ? semanticColor : '#6f7b80';

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta < 8 && interactive) onSelect(target);
  };

  return (
    <group position={TARGET_POSITIONS[target]}>
      <TargetGeometry target={target} color={color} />
      {lensMode === 'detection' && <DetectionBounds target={target} color={semanticColor} />}
      <mesh position={[0, 2.5, 0]} onClick={handleClick}>
        <boxGeometry args={[3.8, 5.8, 3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {selected && <pointLight position={[0, 3.2, 1]} color={semanticColor} intensity={12} distance={6} />}
    </group>
  );
}

function MissionWorld({
  stage,
  lensMode,
  selectedTarget,
  onSelectTarget,
}: Pick<ControlLoopSceneProps, 'stage' | 'lensMode' | 'selectedTarget' | 'onSelectTarget'>) {
  const interactive = stage === 'mission';

  return (
    <group>
      <mesh position={[0, -0.25, -25.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[9.6, 48]} />
        <meshStandardMaterial color="#0d1519" roughness={0.88} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0, -25.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[8.1, 8.18, 64]} />
        <meshBasicMaterial color="#3b5961" transparent opacity={0.7} />
      </mesh>
      {(['vehicle', 'human', 'structure'] as TargetId[]).map((target) => (
        <MissionTarget
          key={target}
          target={target}
          lensMode={lensMode}
          selected={selectedTarget === target}
          interactive={interactive}
          onSelect={onSelectTarget}
        />
      ))}
      <mesh position={[0, 5.7, -30.1]}>
        <boxGeometry args={[12.5, 0.12, 0.12]} />
        <meshBasicMaterial color={lensMode === 'raw' ? '#44535a' : '#79e2df'} />
      </mesh>
      <pointLight position={[0, 7, -21]} color="#79e2df" intensity={8} distance={16} />
    </group>
  );
}

function TransitMarkers() {
  return (
    <group>
      {[-5, -10, -15, -20].map((z, index) => (
        <group key={z} position={[index % 2 === 0 ? 7.4 : -7.4, 1.25, z]}>
          <mesh>
            <octahedronGeometry args={[0.34, 0]} />
            <meshBasicMaterial color={index % 2 === 0 ? '#79e2df' : '#e9bd68'} />
          </mesh>
          <pointLight color={index % 2 === 0 ? '#79e2df' : '#e9bd68'} intensity={3} distance={5} />
        </group>
      ))}
    </group>
  );
}

function SceneContent(props: ControlLoopSceneProps) {
  const hubInteractive = props.stage === 'hub' || props.stage === 'complete';
  const missionVisible =
    props.stage === 'travel-out' ||
    props.stage === 'mission' ||
    props.stage === 'proof' ||
    props.stage === 'travel-back';

  return (
    <>
      <color attach="background" args={['#05080a']} />
      <fog attach="fog" args={['#05080a', 18, 62]} />
      <ambientLight intensity={1.05} color="#a8b9bd" />
      <directionalLight position={[8, 14, 10]} intensity={3.2} color="#d7e2df" />
      <pointLight position={[-9, 4, 5]} intensity={7} distance={18} color="#df6553" />
      <pointLight position={[9, 4, 3]} intensity={6} distance={18} color="#bd8ccf" />
      <gridHelper args={[78, 78, '#31484f', '#101a1e']} position={[0, -0.28, -12]} />
      <HubWorld
        active={hubInteractive}
        completed={props.evidenceUnlocked}
        reducedMotion={props.reducedMotion}
        onSelectMission={props.onSelectMission}
      />
      {missionVisible && (
        <MissionWorld
          stage={props.stage}
          lensMode={props.lensMode}
          selectedTarget={props.selectedTarget}
          onSelectTarget={props.onSelectTarget}
        />
      )}
      <TransitMarkers />
      <CameraDirector
        stage={props.stage}
        reducedMotion={props.reducedMotion}
        lookRef={props.lookRef}
        onArriveMission={props.onArriveMission}
        onArriveHub={props.onArriveHub}
      />
    </>
  );
}

export function ControlLoopScene(props: ControlLoopSceneProps) {
  return (
    <Canvas
      className="cl-canvas"
      camera={{ position: [0, 5.4, 15.5], fov: 52, near: 0.1, far: 100 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      fallback={<div className="cl-webgl-fallback">WebGL is unavailable in this browser.</div>}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
