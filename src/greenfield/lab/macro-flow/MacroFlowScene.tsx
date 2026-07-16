import { PerformanceMonitor, useGLTF, useTexture } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { Suspense, useMemo, useRef, type MutableRefObject } from 'react';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import type { QualityTier } from '../../experience/quality';
import { FirstLightLayer } from './FirstLightLayer';
import { NexusActScene } from './NexusActScene';
import type { LensPointerState, MacroLensMode, MacroTraceOutcome } from './macroFlowTypes';

export type { MacroLensMode, MacroTraceOutcome } from './macroFlowTypes';

type MacroFlowSceneProps = {
  progressRef: MutableRefObject<number>;
  lensPointerRef: MutableRefObject<LensPointerState>;
  lensMode: MacroLensMode;
  traceStep: number;
  traceOutcome: MacroTraceOutcome;
  buriedDiscoveries: number;
  reducedMotion: boolean;
  qualityTier: QualityTier;
  velocityRef: MutableRefObject<number>;
  onPerformanceFactor: (factor: number) => void;
  onPerformanceFallback: () => void;
};

const CAMERA_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(18, 11.5, 38),
  new THREE.Vector3(13, 10.2, 33),
  new THREE.Vector3(7, 8.2, 27),
  new THREE.Vector3(2.2, 6.4, 21),
  new THREE.Vector3(0, 5.3, 16.5),
  new THREE.Vector3(0, 4.8, 11.4),
  new THREE.Vector3(0.5, 4.5, 3),
  new THREE.Vector3(-2.4, 4.2, -6),
  new THREE.Vector3(1.7, 5.1, -18),
  new THREE.Vector3(-3.2, 5.5, -31),
  new THREE.Vector3(0.8, 5.2, -43),
  new THREE.Vector3(0.3, 5.8, -54),
  new THREE.Vector3(0, 5.3, -64),
  new THREE.Vector3(1.8, 4.6, -72),
  new THREE.Vector3(-1.5, 4.9, -84),
  new THREE.Vector3(0, 7.2, -99),
  new THREE.Vector3(1.4, 4.8, -112),
  new THREE.Vector3(0, 3.8, -128),
]);

const MOBILE_CAMERA_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(7.5, 9.2, 34),
  new THREE.Vector3(5.4, 8.3, 30),
  new THREE.Vector3(2.8, 7.1, 25.5),
  new THREE.Vector3(1.2, 6.1, 20.5),
  new THREE.Vector3(0, 5.3, 16.5),
  new THREE.Vector3(0, 4.8, 11.4),
  new THREE.Vector3(0.5, 4.5, 3),
  new THREE.Vector3(-1.2, 4.2, -6),
  new THREE.Vector3(0.8, 5.1, -18),
  new THREE.Vector3(-1.4, 5.5, -31),
  new THREE.Vector3(0.5, 5.2, -43),
  new THREE.Vector3(0.2, 5.8, -54),
  new THREE.Vector3(0, 5.3, -64),
  new THREE.Vector3(0.8, 4.6, -72),
  new THREE.Vector3(-0.7, 4.9, -84),
  new THREE.Vector3(0, 7.2, -99),
  new THREE.Vector3(0.7, 4.8, -112),
  new THREE.Vector3(0, 3.8, -128),
]);

const FIRST_LIGHT_MODEL = '/assets/world/first-light-citadel.glb';

const MATERIAL_COLORS: Record<string, string> = {
  'Worn stone path': '#343a35',
  'Mountain far': '#091416',
  'Limestone light': '#817a6b',
  'Oxidized brass': '#6d6042',
  'Blackened timber': '#0e1110',
  Limestone: '#625d52',
  'Charcoal roof': '#171c1b',
  'Mineral plaster': '#8f8979',
  'Mountain near': '#14201f',
  'Night earth': '#151a17',
};

const LEGACY_WORLD_END = 0.8;

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
  if (progress < 0.08) return smooth(range(progress, 0, 0.08)) * 0.2;
  if (progress < 0.15) return 0.2 + smooth(range(progress, 0.08, 0.15)) * 0.18;
  if (progress < 0.23) return 0.38 + smooth(range(progress, 0.15, 0.23)) * 0.12;
  if (progress < 0.35) return 0.5 + smooth(range(progress, 0.23, 0.35)) * 0.15;
  if (progress < 0.43) return 0.65 + smooth(range(progress, 0.35, 0.43)) * 0.15;
  if (progress < 0.7) return 0.8 + smooth(range(progress, 0.43, 0.7)) * 0.08;
  if (progress < 0.77) return 0.88 + smooth(range(progress, 0.7, 0.77)) * 0.05;
  if (progress < 0.9) return 0.93 + smooth(range(progress, 0.77, 0.9)) * 0.02;
  return 0.95 + smooth(range(progress, 0.9, 1)) * 0.05;
}

function legacyProgress(progress: number) {
  return clamp01(progress / LEGACY_WORLD_END);
}

function CameraDirector({
  progressRef,
  reducedMotion,
  qualityTier,
  velocityRef,
}: Pick<MacroFlowSceneProps, 'progressRef' | 'reducedMotion' | 'qualityTier' | 'velocityRef'>) {
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const orientation = useMemo(() => new THREE.PerspectiveCamera(), []);

  useFrame(({ camera, pointer, size }, delta) => {
    const progress = cameraProgress(progressRef.current);
    const lookAhead = Math.min(1, progress + 0.11);
    const cameraPath = size.width <= 820 ? MOBILE_CAMERA_PATH : CAMERA_PATH;
    cameraPath.getPoint(progress, targetPosition);
    cameraPath.getPoint(lookAhead, lookTarget);

    const parallax = reducedMotion ? 0 : qualityTier === 'cinematic' ? 0.42 : 0.16;
    targetPosition.x += pointer.x * parallax;
    targetPosition.y += pointer.y * parallax * 0.35;
    lookTarget.x += pointer.x * parallax * 0.55;
    lookTarget.y += pointer.y * parallax * 0.24;

    const damping = reducedMotion ? 1 : 1 - Math.exp(-delta * 5.4);
    camera.position.lerp(targetPosition, damping);

    orientation.position.copy(camera.position);
    orientation.lookAt(lookTarget);
    orientation.rotateZ(THREE.MathUtils.clamp(-velocityRef.current * 0.012, -0.018, 0.018));
    camera.quaternion.slerp(orientation.quaternion, damping);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.damp(
        camera.fov,
        (size.width <= 820 ? 57 : 48) + Math.min(1, Math.abs(velocityRef.current)) * 1.4,
        4.5,
        delta,
      );
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

function createMineralTexture() {
  const size = 128;
  const data = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const broad = Math.sin(x * 0.31 + Math.sin(y * 0.17) * 1.8);
      const grain = Math.sin(x * 1.37 + y * 1.91) * 0.42;
      const vein = Math.sin((x + y) * 0.08) * 0.28;
      data[y * size + x] = Math.round(128 + broad * 17 + grain * 14 + vein * 12);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.5, 3.5);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function WorldAtmosphere({ qualityTier }: Pick<MacroFlowSceneProps, 'qualityTier'>) {
  const skyRef = useRef<THREE.Mesh>(null);
  const skyMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const dustRef = useRef<THREE.Points>(null);
  const dustGeometry = useMemo(() => {
    const count = qualityTier === 'cinematic' ? 560 : 220;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const seed = index * 12.9898;
      const unitA = Math.abs(Math.sin(seed) * 43758.5453) % 1;
      const unitB = Math.abs(Math.sin(seed + 17.17) * 24634.6345) % 1;
      const unitC = Math.abs(Math.sin(seed + 41.73) * 12414.1545) % 1;
      positions[index * 3] = (unitA - 0.5) * 34;
      positions[index * 3 + 1] = 0.4 + unitB * 13;
      positions[index * 3 + 2] = 38 - unitC * 175;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [qualityTier]);

  useFrame(({ camera, clock }, delta) => {
    if (skyRef.current) skyRef.current.position.copy(camera.position);
    if (skyMaterialRef.current) skyMaterialRef.current.uniforms.uTime.value = clock.elapsedTime;
    if (dustRef.current) dustRef.current.rotation.y += delta * 0.0015;
  });

  return (
    <>
      <mesh ref={skyRef} renderOrder={-100}>
        <sphereGeometry args={[145, 36, 20]} />
        <shaderMaterial
          ref={skyMaterialRef}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
          toneMapped={false}
          uniforms={{ uTime: { value: 0 } }}
          vertexShader={`
            varying vec3 vDirection;
            void main() {
              vDirection = normalize(position);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float uTime;
            varying vec3 vDirection;
            void main() {
              float horizon = pow(1.0 - abs(vDirection.y), 3.2);
              float upper = smoothstep(-0.18, 0.72, vDirection.y);
              vec3 low = vec3(0.035, 0.075, 0.078);
              vec3 high = vec3(0.012, 0.024, 0.027);
              vec3 color = mix(low, high, upper);
              color += vec3(0.025, 0.045, 0.042) * horizon;
              float moonAlignment = dot(normalize(vDirection), normalize(vec3(-0.18, 0.52, -0.84)));
              float moon = smoothstep(0.986, 0.994, moonAlignment);
              float moonHalo = smoothstep(0.94, 0.992, moonAlignment) * 0.11;
              color += vec3(0.48, 0.62, 0.6) * moonHalo;
              color = mix(color, vec3(0.68, 0.75, 0.71), moon * 0.28);
              float shimmer = sin(vDirection.x * 38.0 + vDirection.z * 31.0 + uTime * 0.02) * 0.002;
              gl_FragColor = vec4(color + shimmer, 1.0);
            }
          `}
        />
      </mesh>
      <points ref={dustRef} geometry={dustGeometry} frustumCulled={false}>
        <pointsMaterial color="#a8cfca" size={0.028} transparent opacity={0.22} depthWrite={false} sizeAttenuation />
      </points>
    </>
  );
}

function FirstLightCitadel({
  progressRef,
  qualityTier,
}: Pick<MacroFlowSceneProps, 'progressRef' | 'qualityTier'>) {
  const rootRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(FIRST_LIGHT_MODEL, false, true);
  const mineralTexture = useMemo(createMineralTexture, []);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = qualityTier === 'cinematic';
      child.receiveShadow = qualityTier === 'cinematic';
      child.frustumCulled = true;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const tuned = materials.map((source) => {
        const material = source.clone() as THREE.MeshStandardMaterial;
        const color = MATERIAL_COLORS[material.name];
        if (color) material.color.set(color);
        material.envMapIntensity = 0.32;
        if (/Limestone|plaster|stone|earth/.test(material.name)) {
          material.bumpMap = mineralTexture;
          material.bumpScale = material.name === 'Mineral plaster' ? 0.035 : 0.07;
          material.roughness = Math.max(material.roughness, 0.82);
        }
        if (material.name === 'Occupied light') {
          material.color.set('#d7b871');
          material.emissive.set('#e1b96d');
          material.emissiveIntensity = 3.8;
        }
        if (material.name === 'Signal anchor') {
          material.color.set('#72d9d6');
          material.emissive.set('#72d9d6');
          material.emissiveIntensity = 5.2;
        }
        material.needsUpdate = true;
        return material;
      });
      child.material = Array.isArray(child.material) ? tuned : tuned[0];
    });
    return clone;
  }, [mineralTexture, qualityTier, scene]);

  useFrame((_, delta) => {
    if (!rootRef.current) return;
    const departure = smooth(range(progressRef.current, 0.072, 0.112));
    rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -18 * departure, 5.2, delta);
    rootRef.current.rotation.y = THREE.MathUtils.damp(rootRef.current.rotation.y, departure * -0.018, 4.2, delta);
  });

  return <primitive ref={rootRef} object={model} />;
}

function gateBladeShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0.12, -0.42);
  shape.lineTo(2.62, -0.96);
  shape.lineTo(2.18, 0.62);
  shape.lineTo(0.12, 0.48);
  shape.closePath();
  return shape;
}

function GateApparatus({ progressRef }: Pick<MacroFlowSceneProps, 'progressRef'>) {
  const rootRef = useRef<THREE.Group>(null);
  const bladeRefs = useRef<Array<THREE.Mesh | null>>([]);
  const anchorMaterials = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const glassRef = useRef<THREE.MeshStandardMaterial>(null);
  const shape = useMemo(gateBladeShape, []);

  useFrame((_, delta) => {
    const localProgress = legacyProgress(progressRef.current);
    const opening = smooth(range(localProgress, 0.085, 0.205));
    const response = range(localProgress, 0.045, 0.115);
    const departure = smooth(range(progressRef.current, 0.075, 0.115));

    bladeRefs.current.forEach((blade, index) => {
      if (!blade) return;
      const angle = (index / 6) * Math.PI * 2;
      const radius = opening * 3.65;
      blade.position.x = Math.cos(angle) * radius;
      blade.position.y = Math.sin(angle) * radius;
      blade.rotation.z = angle + opening * 0.44;
      const material = blade.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.18 + Math.max(0, response * 6 - index) * 0.18;
    });

    anchorMaterials.current.forEach((material, index) => {
      if (!material) return;
      const lit = smooth(range(response, index / 7, (index + 1.5) / 7));
      material.emissiveIntensity = 0.25 + lit * 4.2;
    });

    if (glassRef.current) {
      glassRef.current.opacity = 0.09 + opening * 0.2;
      glassRef.current.emissiveIntensity = 0.1 + opening * 0.8;
    }
    if (rootRef.current) {
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, 4.82 - departure * 18, 5.2, delta);
      rootRef.current.rotation.z += delta * opening * 0.015;
    }
  });

  return (
    <group ref={rootRef} position={[0, 4.82, 14.72]}>
      <mesh position={[0, 0, 0.13]}>
        <circleGeometry args={[2.46, 48]} />
        <meshStandardMaterial
          ref={glassRef}
          color="#31595a"
          emissive="#3b9f9d"
          emissiveIntensity={0.1}
          roughness={0.18}
          metalness={0.1}
          transparent
          opacity={0.09}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <torusGeometry args={[3.02, 0.1, 10, 64]} />
        <meshStandardMaterial color="#887955" emissive="#3e3727" emissiveIntensity={0.52} roughness={0.38} metalness={0.72} />
      </mesh>
      {Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * Math.PI * 2;
        return (
          <group key={index}>
            <mesh
              ref={(node) => { bladeRefs.current[index] = node; }}
              rotation={[0, 0, angle]}
            >
              <extrudeGeometry args={[shape, { depth: 0.2, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.04, bevelSegments: 2 }]} />
              <meshStandardMaterial
                color={index % 2 === 0 ? '#aaa28f' : '#777166'}
                emissive="#756b51"
                emissiveIntensity={0.18}
                roughness={0.5}
                metalness={0.28}
              />
            </mesh>
            <mesh position={[Math.cos(angle) * 3.03, Math.sin(angle) * 3.03, 0.24]}>
              <sphereGeometry args={[0.11, 12, 8]} />
              <meshStandardMaterial
                ref={(material) => { anchorMaterials.current[index] = material; }}
                color="#6edbd7"
                emissive="#6edbd7"
                emissiveIntensity={0.25}
                roughness={0.24}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

const APPROACH_SIGNAL = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-5.8, 0.32, 28),
  new THREE.Vector3(-3.4, 0.38, 24),
  new THREE.Vector3(1.7, 0.42, 21),
  new THREE.Vector3(-1.1, 0.48, 18.2),
  new THREE.Vector3(0, 0.72, 15.7),
]);

function ApproachSignal({ progressRef }: Pick<MacroFlowSceneProps, 'progressRef'>) {
  const rootRef = useRef<THREE.Group>(null);
  const beadRefs = useRef<Array<THREE.Mesh | null>>([]);
  const pulseRef = useRef<THREE.Mesh>(null);
  const pulsePosition = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const reveal = smooth(range(legacyProgress(progressRef.current), 0.018, 0.09));
    beadRefs.current.forEach((bead, index) => {
      if (!bead) return;
      const active = index / Math.max(1, beadRefs.current.length - 1) <= reveal;
      const material = bead.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = THREE.MathUtils.damp(material.emissiveIntensity, active ? 3.8 : 0.16, 8, delta);
      bead.scale.setScalar(THREE.MathUtils.damp(bead.scale.x, active ? 1 : 0.55, 8, delta));
    });
    if (!pulseRef.current) return;
    APPROACH_SIGNAL.getPoint(reveal, pulsePosition);
    pulseRef.current.position.copy(pulsePosition);
    pulseRef.current.visible = reveal > 0.01 && reveal < 0.995;
    if (rootRef.current) {
      const departure = smooth(range(progressRef.current, 0.075, 0.115));
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -18 * departure, 5.2, delta);
    }
  });

  return (
    <group ref={rootRef}>
      {Array.from({ length: 34 }, (_, index) => {
        const position = APPROACH_SIGNAL.getPoint(index / 33);
        return (
          <mesh key={index} ref={(node) => { beadRefs.current[index] = node; }} position={position}>
            <octahedronGeometry args={[0.085, 0]} />
            <meshStandardMaterial color="#72d9d6" emissive="#72d9d6" emissiveIntensity={0.16} roughness={0.2} />
          </mesh>
        );
      })}
      <mesh ref={pulseRef} visible={false}>
        <sphereGeometry args={[0.21, 18, 12]} />
        <meshStandardMaterial color="#d6ffff" emissive="#72d9d6" emissiveIntensity={6.5} roughness={0.1} />
      </mesh>
    </group>
  );
}

function SystemTerminal({
  texturePath,
  position,
  rotationY,
  accent,
}: {
  texturePath: string;
  position: [number, number, number];
  rotationY: number;
  accent: string;
}) {
  const texture = useTexture(texturePath);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, -0.13]}>
        <boxGeometry args={[4.9, 3.88, 0.28]} />
        <meshStandardMaterial color="#172021" roughness={0.44} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[4.58, 3.52]} />
        <meshBasicMaterial map={texture} color="#e6e5dd" toneMapped={false} />
      </mesh>
      <mesh position={[0, -2.08, -0.18]}>
        <boxGeometry args={[1.7, 0.26, 1.8]} />
        <meshStandardMaterial color="#1c2526" roughness={0.62} metalness={0.28} />
      </mesh>
      <mesh position={[0, -3.05, -0.18]}>
        <cylinderGeometry args={[1.22, 1.54, 0.28, 8]} />
        <meshStandardMaterial color="#12191a" roughness={0.78} />
      </mesh>
      <mesh position={[0, 2.08, 0.01]}>
        <boxGeometry args={[4.92, 0.08, 0.08]} />
        <meshBasicMaterial color={accent} />
      </mesh>
    </group>
  );
}

function SchoolSystemsTerminals({
  progressRef,
  traceOutcome,
}: Pick<MacroFlowSceneProps, 'progressRef' | 'traceOutcome'>) {
  const rootRef = useRef<THREE.Group>(null);
  const tokenRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!rootRef.current) return;
    const reveal = smooth(range(progressRef.current, 0.35, 0.42));
    const departure = smooth(range(progressRef.current, 0.48, 0.515));
    rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -6 + reveal * 8.9 - departure * 10, 5.2, delta);
    if (!tokenRef.current) return;
    tokenRef.current.rotation.x += delta * 0.45;
    tokenRef.current.rotation.y += delta * 0.72;
    const denied = traceOutcome === 'expired' || traceOutcome === 'used';
    const material = tokenRef.current.material as THREE.MeshStandardMaterial;
    material.color.set(denied ? '#df6553' : '#72d9d6');
    material.emissive.set(denied ? '#df6553' : '#72d9d6');
  });

  return (
    <group ref={rootRef} position={[0, -6, -84]}>
      <SystemTerminal texturePath="/assets/projects/aegis.webp" position={[-4.3, 0.5, 0]} rotationY={0.28} accent="#72d9d6" />
      <SystemTerminal texturePath="/assets/projects/schoolmate.webp" position={[4.3, 0.5, -1.8]} rotationY={-0.28} accent="#b8a46d" />
      <mesh ref={tokenRef} position={[0, 1.1, -0.4]}>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial color="#72d9d6" emissive="#72d9d6" emissiveIntensity={3.4} roughness={0.18} />
      </mesh>
    </group>
  );
}

function SignalBeads({ progressRef }: Pick<MacroFlowSceneProps, 'progressRef'>) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame(() => {
    const reveal = range(progressRef.current, 0.315, 0.425);
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
    <group position={[Math.sin(index * 0.7) * 1.1, 0, z]} rotation={[0, Math.sin(index) * 0.08, 0]} scale={0.62}>
      <mesh position={[-width / 2, height / 2, 0]}>
        <boxGeometry args={[0.12, height, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.85} roughness={0.32} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]}>
        <boxGeometry args={[0.12, height, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.85} roughness={0.32} />
      </mesh>
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[width, 0.12, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.85} roughness={0.32} />
      </mesh>
      {index % 2 === 0 ? (
        <mesh position={[0, height * 0.52, 0.05]}>
          <planeGeometry args={[width * 0.86, height * 0.78]} />
          <meshBasicMaterial color={color} transparent opacity={0.035} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
    </group>
  );
}

function AegisPassage({ progressRef }: Pick<MacroFlowSceneProps, 'progressRef'>) {
  const rootRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!rootRef.current) return;
    const reveal = smooth(range(progressRef.current, 0.305, 0.375));
    rootRef.current.position.y = -3.8 + reveal * 3.8;
  });

  return (
    <group ref={rootRef} position={[2.8, -3.8, 0]}>
      {Array.from({ length: 13 }, (_, index) => (
        <PassageFrame key={index} z={-39 - index * 2.9} index={index} />
      ))}
      <mesh position={[0, 0.02, -58]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.5, 43]} />
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
    const reveal = smooth(range(progressRef.current, 0.395, 0.465));
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
  const coreRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const fold = smooth(range(progressRef.current, 0.625, 0.715));
    refs.current.forEach((layer, index) => {
      if (!layer) return;
      layer.rotation.x = -Math.PI / 2 + fold * (0.2 + index * 0.075);
      layer.position.y = -7 - index * 0.16 + fold * (6.8 + index * 0.18);
      layer.position.z = -96 - index * 1.35;
    });
    if (coreRef.current) {
      coreRef.current.position.y = -2.5 + fold * 7.1;
      coreRef.current.rotation.x = fold * Math.PI * 0.5;
      coreRef.current.rotation.z += 0.003 + fold * 0.006;
      coreRef.current.scale.setScalar(0.3 + fold * 0.7);
    }
  });

  return (
    <group>
      {Array.from({ length: 7 }, (_, index) => (
        <mesh key={index} ref={(node) => { refs.current[index] = node; }}>
          <planeGeometry args={[16 - index * 0.9, 8 - index * 0.22]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? '#1f2b2a' : '#393328'}
            emissive={index % 2 === 0 ? '#214441' : '#4d3e20'}
            emissiveIntensity={0.42}
            side={THREE.DoubleSide}
            roughness={0.86}
            transparent
            opacity={0.9}
          />
          {[-1, 1].map((side) => (
            <mesh key={`h-${side}`} position={[0, side * (4 - index * 0.11), 0.035]}>
              <boxGeometry args={[16 - index * 0.9, 0.055, 0.055]} />
              <meshBasicMaterial color={index % 2 === 0 ? '#72d9d6' : '#d4b36b'} transparent opacity={0.72} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <mesh key={`v-${side}`} position={[side * (8 - index * 0.45), 0, 0.035]}>
              <boxGeometry args={[0.055, 8 - index * 0.22, 0.055]} />
              <meshBasicMaterial color={index % 2 === 0 ? '#72d9d6' : '#d4b36b'} transparent opacity={0.72} />
            </mesh>
          ))}
        </mesh>
      ))}
      <group ref={coreRef} position={[0, -2.5, -101.2]} scale={0.3}>
        <mesh>
          <icosahedronGeometry args={[0.72, 1]} />
          <meshStandardMaterial color="#72d9d6" emissive="#72d9d6" emissiveIntensity={3.2} roughness={0.18} />
        </mesh>
        {[1.2, 1.7, 2.25].map((radius, index) => (
          <mesh key={radius} rotation={[index * 0.62, index * 0.4, 0]}>
            <torusGeometry args={[radius, 0.035, 7, 56]} />
            <meshBasicMaterial color={index % 2 === 0 ? '#72d9d6' : '#d4b36b'} transparent opacity={0.72} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const CHAMBER_DEPTHS = [-108, -114, -120, -126];

function BuriedChamber({
  progressRef,
  buriedDiscoveries,
}: Pick<MacroFlowSceneProps, 'progressRef' | 'buriedDiscoveries'>) {
  const rootRef = useRef<THREE.Group>(null);
  const lampRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([]);

  useFrame((_, delta) => {
    const reveal = smooth(range(progressRef.current, 0.77, 0.88));
    if (rootRef.current) {
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -9 + reveal * 9, 5, delta);
    }
    lampRefs.current.forEach((material, index) => {
      if (!material) return;
      material.emissiveIntensity = 1.2 + reveal * 2.4 + (index < buriedDiscoveries ? 1.8 : 0);
    });
  });

  return (
    <group ref={rootRef}>
      {CHAMBER_DEPTHS.map((z, index) => {
        const width = 8.8 + index * 0.55;
        return (
          <group key={z} position={[Math.sin(index * 0.8) * 0.35, 0, z]}>
            <mesh position={[-width / 2, 2.8, 0]}>
              <boxGeometry args={[0.82, 5.6, 0.82]} />
              <meshStandardMaterial color="#33251f" roughness={0.92} />
            </mesh>
            <mesh position={[width / 2, 2.8, 0]}>
              <boxGeometry args={[0.82, 5.6, 0.82]} />
              <meshStandardMaterial color="#33251f" roughness={0.92} />
            </mesh>
            <mesh position={[0, 5.7, 0]}>
              <boxGeometry args={[width + 0.8, 0.62, 0.9]} />
              <meshStandardMaterial color="#403027" roughness={0.88} />
            </mesh>
            <mesh position={[index % 2 === 0 ? -2.15 : 2.15, 2.35, 0.26]}>
              <octahedronGeometry args={[0.22, 0]} />
              <meshStandardMaterial
                ref={(material) => { lampRefs.current[index] = material; }}
                color="#e7a54d"
                emissive="#ff9b38"
                emissiveIntensity={1.2}
              />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0.02, -120]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 34]} />
        <meshStandardMaterial color="#1b1412" roughness={0.98} />
      </mesh>
      <mesh position={[0, 0.46, -128]}>
        <cylinderGeometry args={[2.6, 3.1, 0.9, 18]} />
        <meshStandardMaterial color="#29201c" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.94, -128]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.3, 32]} />
        <meshStandardMaterial color="#66733c" emissive="#778641" emissiveIntensity={0.7 + buriedDiscoveries * 0.3} />
      </mesh>
    </group>
  );
}

function PostEffects({ qualityTier }: Pick<MacroFlowSceneProps, 'qualityTier'>) {
  if (qualityTier !== 'cinematic') return null;

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom intensity={0.42} luminanceThreshold={0.82} luminanceSmoothing={0.24} mipmapBlur />
      <Noise opacity={0.027} premultiply blendFunction={BlendFunction.SOFT_LIGHT} />
      <Vignette offset={0.18} darkness={0.72} eskil={false} />
    </EffectComposer>
  );
}

function World({
  progressRef,
  lensPointerRef,
  lensMode,
  traceStep,
  traceOutcome,
  buriedDiscoveries,
  reducedMotion,
  qualityTier,
  velocityRef,
}: MacroFlowSceneProps) {
  return (
    <>
      <color attach="background" args={['#071011']} />
      <fog attach="fog" args={['#071011', 24, 92]} />
      <WorldAtmosphere qualityTier={qualityTier} />
      <hemisphereLight intensity={0.38} color="#b9cfcd" groundColor="#191b17" />
      <directionalLight
        castShadow={qualityTier === 'cinematic'}
        position={[10, 18, 18]}
        intensity={1.75}
        color="#dae3d9"
        shadow-mapSize-width={qualityTier === 'cinematic' ? 1536 : 512}
        shadow-mapSize-height={qualityTier === 'cinematic' ? 1536 : 512}
        shadow-camera-near={2}
        shadow-camera-far={70}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={24}
        shadow-camera-bottom={-12}
        shadow-bias={-0.00035}
        shadow-normalBias={0.055}
      />
      <pointLight position={[-7, 8, 24]} intensity={38} distance={34} color="#c9ad72" />
      <pointLight position={[0, 5.2, 14]} intensity={26} distance={20} color="#64cfcb" />
      <pointLight position={[-3, 5.2, 1]} intensity={42} distance={28} color="#72d9d6" />
      <pointLight position={[3, 4.4, -13]} intensity={34} distance={27} color="#d0ad68" />
      <pointLight position={[0, 5, -33]} intensity={36} distance={24} color="#6fd8d6" />
      <pointLight position={[0, 5, -54]} intensity={30} distance={24} color="#c0a66b" />
      <pointLight position={[0, 5, -79]} intensity={24} distance={22} color="#75dcda" />
      <pointLight position={[0, 6, -99]} intensity={38} distance={24} color="#8dded8" />
      <pointLight position={[0, 4, -120]} intensity={30} distance={28} color="#d88538" />

      <CameraDirector
        progressRef={progressRef}
        reducedMotion={reducedMotion}
        qualityTier={qualityTier}
        velocityRef={velocityRef}
      />
      <FirstLightCitadel progressRef={progressRef} qualityTier={qualityTier} />
      <FirstLightLayer progressRef={progressRef} qualityTier={qualityTier} />
      <ApproachSignal progressRef={progressRef} />
      <GateApparatus progressRef={progressRef} />
      <NexusActScene
        progressRef={progressRef}
        lensMode={lensMode}
        lensPointerRef={lensPointerRef}
        qualityTier={qualityTier}
      />
      <SignalBeads progressRef={progressRef} />
      <AegisPassage progressRef={progressRef} />
      <AccessTrace
        progressRef={progressRef}
        traceStep={traceStep}
        traceOutcome={traceOutcome}
      />
      <SchoolSystemsTerminals progressRef={progressRef} traceOutcome={traceOutcome} />
      <DescentLayers progressRef={progressRef} />
      <BuriedChamber progressRef={progressRef} buriedDiscoveries={buriedDiscoveries} />

      <mesh position={[0, -0.08, -56]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36, 190]} />
        <meshStandardMaterial color="#101516" roughness={0.98} />
      </mesh>
      <PostEffects qualityTier={qualityTier} />
    </>
  );
}

export function MacroFlowScene(props: MacroFlowSceneProps) {
  const dpr: [number, number] | number = props.qualityTier === 'cinematic' ? [1, 1.5] : 1;

  return (
    <Canvas
      className="mf-canvas"
      dpr={dpr}
      shadows={props.qualityTier === 'cinematic'}
      camera={{ fov: 48, near: 0.1, far: 190, position: [18, 11.5, 38] }}
      gl={{ antialias: props.qualityTier !== 'cinematic', alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.78;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
      fallback={<div className="mf-canvas-fallback">3D scene unavailable</div>}
    >
      <PerformanceMonitor
        flipflops={3}
        onChange={({ factor }) => props.onPerformanceFactor(factor)}
        onFallback={props.onPerformanceFallback}
      >
        <Suspense fallback={null}>
          <World {...props} />
        </Suspense>
      </PerformanceMonitor>
    </Canvas>
  );
}

useGLTF.preload(FIRST_LIGHT_MODEL, false, true);
