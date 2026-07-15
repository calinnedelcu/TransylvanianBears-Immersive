import { Line, PerformanceMonitor, useTexture } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CITADEL_PROJECTS,
  CITADEL_ROUTES,
  EVIDENCE_ARTIFACTS,
  type CitadelRoute,
  type EvidenceArtifact,
} from './evidenceData';

type EvidenceWeaveSceneProps = {
  progressRef: React.MutableRefObject<number>;
  activeId: EvidenceArtifact['id'];
  onSelect: (id: EvidenceArtifact['id']) => void;
  activeRoute: CitadelRoute['id'];
  onSelectRoute: (id: CitadelRoute['id']) => void;
  reducedMotion: boolean;
};

const NODE_LAYOUT: Record<EvidenceArtifact['id'], { position: [number, number, number]; tilt: number }> = {
  nexus: { position: [-4.7, 1.7, 0.8], tilt: -0.045 },
  aegis: { position: [4.6, 0.25, -0.3], tilt: 0.04 },
  infect: { position: [-0.3, -3.35, 0.35], tilt: -0.025 },
};

const RING_ROTATIONS: Array<[number, number, number]> = [
  [-0.58, 0, 0],
  [0.76, 0.42, 0.31],
  [-0.58, 0.84, 0.62],
  [0.76, 1.26, 0.93],
];

function makeLabelTexture(artifact: EvidenceArtifact) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(5, 9, 10, 0.94)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = artifact.color;
  context.fillRect(0, 0, 13, canvas.height);
  context.font = '600 24px monospace';
  context.fillStyle = 'rgba(231, 232, 224, 0.54)';
  context.fillText(`${artifact.index} / ${artifact.year} / ${artifact.status.toUpperCase()}`, 48, 63);
  context.font = '700 42px sans-serif';
  context.fillStyle = '#e7e8e0';
  context.fillText(artifact.title, 48, 132);
  context.font = '700 28px monospace';
  context.fillStyle = artifact.color;
  context.fillText(artifact.result, 48, 194);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function makeMapLabelTexture(label: string, meta: string, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);
  context.fillStyle = 'rgba(3, 7, 8, 0.92)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.fillRect(0, 0, 9, canvas.height);
  context.font = '700 34px sans-serif';
  context.fillStyle = '#e7e8e0';
  context.fillText(label, 38, 84);
  context.font = '500 20px monospace';
  context.fillStyle = color;
  context.fillText(meta, 38, 130);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function CameraDirector({ progressRef, reducedMotion }: Pick<EvidenceWeaveSceneProps, 'progressRef' | 'reducedMotion'>) {
  const { camera, size } = useThree();
  const cameraPath = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.4, 15.5),
    new THREE.Vector3(5.8, 2.4, 10.5),
    new THREE.Vector3(-6.7, 2.1, 8.5),
    new THREE.Vector3(6.4, 0.3, 8.2),
    new THREE.Vector3(-0.5, -5.2, 8.8),
    new THREE.Vector3(0, 3.2, 13.5),
    new THREE.Vector3(0, 12.4, 4.2),
  ], false, 'catmullrom', 0.32), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const progress = reducedMotion ? 1 : progressRef.current;
    const mobile = size.width < 760;
    cameraPath.getPointAt(THREE.MathUtils.clamp(progress, 0, 1), desired);
    if (mobile) {
      desired.x *= 0.42;
      desired.z += 3.2;
    }
    const damping = reducedMotion ? 1 : 1 - Math.exp(-delta * 4.8);
    camera.position.lerp(desired, damping);

    if (progress < 0.37) target.set(mobile ? -1.6 : -2.2 * progress, 0.45, 0);
    else if (progress < 0.64) target.set(mobile ? 3.55 : 2.1, 0.1, 0);
    else if (progress < 0.82) target.set(-0.2, mobile ? -2.5 : -1.75, 0);
    else target.set(0, 0, 0);
    look.lerp(target, damping);
    camera.lookAt(look);
  });

  return null;
}

function StarDust() {
  const points = useMemo(() => {
    const values = new Float32Array(420 * 3);
    for (let index = 0; index < 420; index += 1) {
      const radius = 5 + Math.random() * 19;
      const angle = Math.random() * Math.PI * 2;
      values[index * 3] = Math.cos(angle) * radius;
      values[index * 3 + 1] = (Math.random() - 0.5) * 18;
      values[index * 3 + 2] = Math.sin(angle) * radius - 4;
    }
    return values;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#9cc7c3" size={0.028} transparent opacity={0.36} sizeAttenuation />
    </points>
  );
}

function ArtifactScreen({
  artifact,
  active,
  onSelect,
  progressRef,
}: {
  artifact: EvidenceArtifact;
  active: boolean;
  onSelect: () => void;
  progressRef: EvidenceWeaveSceneProps['progressRef'];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { size } = useThree();
  const imageTexture = useTexture(artifact.image);
  const labelTexture = useMemo(() => makeLabelTexture(artifact), [artifact]);
  const layout = NODE_LAYOUT[artifact.id];

  useEffect(() => {
    imageTexture.colorSpace = THREE.SRGBColorSpace;
    imageTexture.anisotropy = 4;
    return () => labelTexture.dispose();
  }, [imageTexture, labelTexture]);

  useFrame(({ camera, clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;
    group.lookAt(camera.position);
    group.rotateZ(layout.tilt);
    const mobile = size.width < 760;
    const mapVisibility = 1 - THREE.MathUtils.smoothstep(progressRef.current, 0.78, 0.91);
    const baseScale = active ? (mobile ? 0.88 : 1.12) : (mobile ? 0.68 : 0.88);
    const targetScale = Math.max(0.001, baseScale * mapVisibility);
    const next = THREE.MathUtils.damp(group.scale.x, targetScale, 6, delta);
    group.scale.setScalar(next);
    group.position.y = layout.position[1] + Math.sin(clock.elapsedTime * 0.65 + Number(artifact.index)) * 0.08;
  });

  const imageAspect = artifact.id === 'infect' ? 925 / 362 : 4 / 3;
  const width = 3.7;
  const height = width / imageAspect;

  return (
    <group ref={groupRef} position={layout.position} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <mesh position={[0, 0, -0.11]}>
        <boxGeometry args={[width + 0.2, height + 0.2, 0.16]} />
        <meshStandardMaterial color="#151b1c" metalness={0.72} roughness={0.3} />
      </mesh>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={imageTexture} toneMapped={false} />
      </mesh>
      <mesh position={[0, -height / 2 - 0.55, 0]}>
        <planeGeometry args={[width, 0.92]} />
        <meshBasicMaterial map={labelTexture} transparent toneMapped={false} />
      </mesh>
      <mesh position={[-width / 2 - 0.13, 0, 0.02]}>
        <boxGeometry args={[0.035, height + 1.25, 0.035]} />
        <meshBasicMaterial color={artifact.color} transparent opacity={active ? 1 : 0.42} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 1.5]} color={artifact.color} intensity={active ? 6 : 1.4} distance={4.8} />
    </group>
  );
}

function CitadelPlan({
  progressRef,
  activeRoute,
  onSelectRoute,
  reducedMotion,
}: Pick<EvidenceWeaveSceneProps, 'progressRef' | 'activeRoute' | 'onSelectRoute' | 'reducedMotion'>) {
  const groupRef = useRef<THREE.Group>(null);
  const buildingRefs = useRef<Array<THREE.Mesh | null>>([]);
  const labelTextures = useMemo(() => [
    ...CITADEL_PROJECTS.map((project) => makeMapLabelTexture(project.label, project.group, project.color)),
    ...CITADEL_ROUTES.map((route) => makeMapLabelTexture(route.label, route.detail.toUpperCase(), route.color)),
  ], []);

  useEffect(() => () => labelTextures.forEach((texture) => texture.dispose()), [labelTextures]);

  useFrame((_, delta) => {
    const progress = reducedMotion ? 1 : progressRef.current;
    const reveal = THREE.MathUtils.smoothstep(progress, 0.81, 0.97);
    if (groupRef.current) {
      const scale = THREE.MathUtils.damp(groupRef.current.scale.x, Math.max(0.001, reveal), 5, delta);
      groupRef.current.scale.setScalar(scale);
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, reveal * 0.16, 5, delta);
    }
    buildingRefs.current.forEach((building, index) => {
      if (!building) return;
      const delay = index * 0.018;
      const localReveal = THREE.MathUtils.smoothstep(progress, 0.84 + delay, 0.96 + delay);
      building.scale.z = THREE.MathUtils.damp(building.scale.z, Math.max(0.025, localReveal), 7, delta);
    });
  });

  return (
    <group ref={groupRef} scale={0.001}>
      <mesh position={[0, 0, -0.16]}>
        <circleGeometry args={[6.72, 72]} />
        <meshStandardMaterial color="#071011" metalness={0.82} roughness={0.38} transparent opacity={0.82} />
      </mesh>
      <mesh position={[0, 0, -0.13]}>
        <ringGeometry args={[1.2, 6.45, 72, 1]} />
        <meshBasicMaterial color="#17413f" transparent opacity={0.16} side={THREE.DoubleSide} />
      </mesh>

      {CITADEL_PROJECTS.map((project, index) => {
        const [x, y, height] = project.position;
        return (
          <group key={project.id} position={[x, y, 0]}>
            <mesh ref={(node) => { buildingRefs.current[index] = node; }} position={[0, 0, height / 2]}>
              <boxGeometry args={[1.05, 0.72, height]} />
              <meshStandardMaterial color="#132122" emissive={project.color} emissiveIntensity={0.28} metalness={0.86} roughness={0.27} />
            </mesh>
            <mesh position={[0, -0.66, 0.04]}>
              <planeGeometry args={[1.62, 0.4]} />
              <meshBasicMaterial map={labelTextures[index]} transparent toneMapped={false} />
            </mesh>
          </group>
        );
      })}

      {CITADEL_ROUTES.map((route, index) => {
        const active = route.id === activeRoute;
        const [x, y, z] = route.position;
        const angle = Math.atan2(y, x);
        return (
          <group
            key={route.id}
            position={[x, y, z]}
            rotation={[0, 0, angle - Math.PI / 2]}
            onClick={(event) => { event.stopPropagation(); onSelectRoute(route.id); }}
          >
            <mesh position={[0, 0, 0.42]}>
              <boxGeometry args={[1.5, 0.46, 0.84]} />
              <meshStandardMaterial
                color="#111b1c"
                emissive={route.color}
                emissiveIntensity={active ? 1.15 : 0.32}
                metalness={0.84}
                roughness={0.22}
              />
            </mesh>
            <mesh position={[0, -0.58, 0.06]}>
              <planeGeometry args={[2.4, 0.6]} />
              <meshBasicMaterial map={labelTextures[CITADEL_PROJECTS.length + index]} transparent toneMapped={false} />
            </mesh>
            <pointLight position={[0, 0, 1.5]} intensity={active ? 6 : 1.2} distance={4} color={route.color} />
          </group>
        );
      })}

      {CITADEL_ROUTES.map((route) => (
        <Line
          key={route.id}
          points={[
            new THREE.Vector3(0, 0, 0.03),
            new THREE.Vector3(route.position[0] * 0.5, route.position[1] * 0.5, 0.04),
            new THREE.Vector3(route.position[0], route.position[1], 0.05),
          ]}
          color={route.color}
          lineWidth={route.id === activeRoute ? 1.7 : 0.5}
          transparent
          opacity={route.id === activeRoute ? 0.92 : 0.24}
        />
      ))}

      <mesh position={[0, 0, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.78, 1.1, 1.44, 12]} />
        <meshStandardMaterial color="#132324" emissive="#72d9d6" emissiveIntensity={0.58} metalness={0.92} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 1.455]}>
        <ringGeometry args={[0.3, 0.68, 12]} />
        <meshBasicMaterial color="#071011" transparent opacity={0.82} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 1.47]}>
        <circleGeometry args={[0.16, 12]} />
        <meshBasicMaterial color="#d9bd72" toneMapped={false} />
      </mesh>
    </group>
  );
}

function Loom({
  progressRef,
  activeId,
  onSelect,
  activeRoute,
  onSelectRoute,
  reducedMotion,
}: EvidenceWeaveSceneProps) {
  const rootRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<Array<THREE.Mesh | null>>([]);
  const hubRef = useRef<THREE.Group>(null);
  const artifactById = useMemo(() => Object.fromEntries(EVIDENCE_ARTIFACTS.map((item) => [item.id, item])), []);

  useFrame(({ clock }, delta) => {
    const progress = reducedMotion ? 1 : progressRef.current;
    const root = rootRef.current;
    if (!root) return;
    const open = THREE.MathUtils.smoothstep(progress, 0.02, 0.18);
    const flatten = THREE.MathUtils.smoothstep(progress, 0.84, 0.98);
    const mapAlignment = THREE.MathUtils.smoothstep(progress, 0.76, 0.96);
    root.rotation.y = THREE.MathUtils.damp(root.rotation.y, (1 - open) * 1.5, 5, delta);
    root.rotation.x = THREE.MathUtils.damp(root.rotation.x, flatten * -Math.PI / 2, 4, delta);
    root.rotation.z = THREE.MathUtils.damp(root.rotation.z, progress * 0.24, 3, delta);
    ringRefs.current.forEach((ring, index) => {
      if (!ring) return;
      const [initialX, initialY, initialZ] = RING_ROTATIONS[index];
      ring.rotation.x = THREE.MathUtils.damp(ring.rotation.x, initialX * (1 - mapAlignment), 5, delta);
      ring.rotation.y = THREE.MathUtils.damp(ring.rotation.y, initialY * (1 - mapAlignment), 5, delta);
      const mapRotation = index * Math.PI * 0.11;
      const targetZ = THREE.MathUtils.lerp(initialZ, mapRotation, mapAlignment);
      ring.rotation.z = THREE.MathUtils.damp(ring.rotation.z, targetZ, 4, delta);
      if (mapAlignment < 0.72) {
        ring.rotation.z += delta * (0.025 + index * 0.012) * (index % 2 === 0 ? 1 : -1) * (1 - mapAlignment);
      }
    });
    if (hubRef.current) {
      hubRef.current.rotation.z = clock.elapsedTime * 0.09 * (1 - mapAlignment);
      const hubScale = THREE.MathUtils.damp(hubRef.current.scale.x, THREE.MathUtils.lerp(1, 0.12, mapAlignment), 5, delta);
      hubRef.current.scale.setScalar(hubScale);
    }
  });

  const links = EVIDENCE_ARTIFACTS.map((artifact) => {
    const [x, y, z] = NODE_LAYOUT[artifact.id].position;
    return {
      artifact,
      points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x * 0.55, y * 0.55, z - 0.8), new THREE.Vector3(x, y, z)],
    };
  });

  return (
    <group ref={rootRef}>
      {[3.1, 4.2, 5.35, 6.3].map((radius, index) => (
        <mesh
          key={radius}
          ref={(node) => { ringRefs.current[index] = node; }}
          rotation={RING_ROTATIONS[index]}
        >
          <torusGeometry args={[radius, index === 3 ? 0.035 : 0.065, 8, 180]} />
          <meshStandardMaterial
            color={index === 1 ? '#96794a' : '#3e5554'}
            emissive={index === 1 ? '#7d612d' : '#1d4e4c'}
            emissiveIntensity={0.42}
            metalness={0.88}
            roughness={0.26}
          />
        </mesh>
      ))}

      <group ref={hubRef}>
        <mesh>
          <icosahedronGeometry args={[1.18, 2]} />
          <meshStandardMaterial color="#11191a" emissive="#275d5a" emissiveIntensity={0.7} metalness={0.95} roughness={0.18} />
        </mesh>
        <mesh scale={1.16}>
          <icosahedronGeometry args={[1.18, 1]} />
          <meshBasicMaterial color="#72d9d6" wireframe transparent opacity={0.24} />
        </mesh>
        {Array.from({ length: 8 }, (_, index) => (
          <mesh key={index} rotation={[0, 0, index * Math.PI / 4]} position={[0, 0, -0.2]}>
            <boxGeometry args={[0.055, 3.2, 0.055]} />
            <meshBasicMaterial color="#bfa96f" transparent opacity={0.32} />
          </mesh>
        ))}
      </group>

      {links.map(({ artifact, points }) => (
        <Line
          key={artifact.id}
          points={points}
          color={artifact.color}
          lineWidth={activeId === artifact.id ? 1.35 : 0.42}
          transparent
          opacity={activeId === artifact.id ? 0.94 : 0.3}
        />
      ))}

      {EVIDENCE_ARTIFACTS.map((artifact) => (
        <ArtifactScreen
          key={artifact.id}
          artifact={artifactById[artifact.id]}
          active={artifact.id === activeId}
          onSelect={() => onSelect(artifact.id)}
          progressRef={progressRef}
        />
      ))}

      <CitadelPlan
        progressRef={progressRef}
        activeRoute={activeRoute}
        onSelectRoute={onSelectRoute}
        reducedMotion={reducedMotion}
      />

      {Array.from({ length: 18 }, (_, index) => {
        const angle = index / 18 * Math.PI * 2;
        const radius = index % 2 ? 5.35 : 4.2;
        return (
          <mesh key={index} position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}>
            <octahedronGeometry args={[index % 3 === 0 ? 0.13 : 0.07, 0]} />
            <meshBasicMaterial color={index % 3 === 0 ? '#d5b66e' : '#78cfca'} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

function World(props: EvidenceWeaveSceneProps) {
  return (
    <>
      <color attach="background" args={['#030708']} />
      <fog attach="fog" args={['#030708', 15, 34]} />
      <ambientLight intensity={0.48} color="#9ab2b0" />
      <directionalLight position={[7, 8, 9]} intensity={2.4} color="#d8cfb7" />
      <pointLight position={[0, 0, 4]} intensity={16} distance={14} color="#62cfca" />
      <pointLight position={[0, 5, -3]} intensity={11} distance={13} color="#c9a85e" />
      <CameraDirector progressRef={props.progressRef} reducedMotion={props.reducedMotion} />
      <Loom {...props} />
      <StarDust />
    </>
  );
}

export default function EvidenceWeaveScene(props: EvidenceWeaveSceneProps) {
  const [dpr, setDpr] = useState(1.25);

  return (
    <Canvas
      className="ew-canvas"
      dpr={dpr}
      camera={{ fov: 47, near: 0.1, far: 60, position: [0, 0.4, 15.5] }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      fallback={<div className="ew-fallback">Evidence scene unavailable</div>}
    >
      <Suspense fallback={null}>
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(Math.min(window.devicePixelRatio, 1.5))}
          onFallback={() => setDpr(1)}
        >
          <World {...props} />
        </PerformanceMonitor>
      </Suspense>
    </Canvas>
  );
}
