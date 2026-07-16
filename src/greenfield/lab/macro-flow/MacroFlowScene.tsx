import { PerformanceMonitor, useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { Suspense, useMemo, useRef, type MutableRefObject } from 'react';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import type { QualityTier } from '../../experience/quality';
import { CarpathianThreshold } from './CarpathianThreshold';
import { FirstLightLayer } from './FirstLightLayer';
import { NexusActScene } from './NexusActScene';
import { SchoolActScene } from './SchoolActScene';
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
  if (progress < 0.6) return 0.8 + smooth(range(progress, 0.43, 0.6)) * 0.055;
  if (progress < 0.68) return 0.855 + smooth(range(progress, 0.6, 0.68)) * 0.065;
  if (progress < 0.77) return 0.92 + smooth(range(progress, 0.68, 0.77)) * 0.01;
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
    const worldProgress = progressRef.current;
    const progress = cameraProgress(worldProgress);
    const schoolFocus = smooth(range(worldProgress, 0.365, 0.43))
      * (1 - smooth(range(worldProgress, 0.445, 0.505)));
    const lookDistance = THREE.MathUtils.lerp(0.11, 0.035, schoolFocus);
    const lookAhead = Math.min(1, progress + lookDistance);
    const cameraPath = size.width <= 820 ? MOBILE_CAMERA_PATH : CAMERA_PATH;
    cameraPath.getPoint(progress, targetPosition);
    cameraPath.getPoint(lookAhead, lookTarget);
    lookTarget.x += schoolFocus * (size.width <= 820 ? 0.72 : 1.65);
    lookTarget.y -= schoolFocus * (size.width <= 820 ? 3.1 : 4.35);

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
    const departure = smooth(range(progressRef.current, 0.055, 0.095));
    rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -18 * departure, 5.2, delta);
    rootRef.current.rotation.y = THREE.MathUtils.damp(rootRef.current.rotation.y, departure * -0.018, 4.2, delta);
  });

  return <primitive ref={rootRef} object={model} />;
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
    pulseRef.current.visible = reveal > 0.01 && reveal < 0.82;
    if (rootRef.current) {
      const departure = smooth(range(progressRef.current, 0.058, 0.098));
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
        <sphereGeometry args={[0.105, 16, 10]} />
        <meshStandardMaterial color="#9de6e1" emissive="#72d9d6" emissiveIntensity={4.8} roughness={0.14} />
      </mesh>
    </group>
  );
}

function DescentLayers({ progressRef }: Pick<MacroFlowSceneProps, 'progressRef'>) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const coreRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const fold = smooth(range(progressRef.current, 0.605, 0.67));
    refs.current.forEach((layer, index) => {
      if (!layer) return;
      layer.rotation.x = -Math.PI / 2 + fold * (0.05 + index * 0.018);
      layer.position.y = -5.6 - index * 0.16 + fold * (4.65 + index * 0.18);
      layer.position.z = -101 - index * 3.6;
    });
    if (coreRef.current) {
      coreRef.current.position.y = -3.5 + fold * 7;
      coreRef.current.rotation.x = fold * Math.PI * 0.5;
      coreRef.current.rotation.z = clock.elapsedTime * (0.08 + fold * 0.12);
      coreRef.current.scale.setScalar(0.2 + fold * 0.8);
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
      <group ref={coreRef} position={[0, -3.5, -129]} scale={0.2}>
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

function DescentVault({
  progressRef,
  qualityTier,
}: Pick<MacroFlowSceneProps, 'progressRef' | 'qualityTier'>) {
  const rootRef = useRef<THREE.Group>(null);
  const archRefs = useRef<Array<THREE.Group | null>>([]);
  const seamMaterials = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const lampMaterials = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const portalRef = useRef<THREE.Group>(null);
  const archCount = qualityTier === 'cinematic' ? 9 : 7;

  useFrame(({ clock }, delta) => {
    const reveal = smooth(range(progressRef.current, 0.59, 0.628));
    const mineralize = smooth(range(progressRef.current, 0.608, 0.675));

    if (rootRef.current) {
      rootRef.current.position.y = THREE.MathUtils.damp(
        rootRef.current.position.y,
        -6.4 + reveal * 6.4,
        6.4,
        delta,
      );
    }

    archRefs.current.forEach((arch, index) => {
      if (!arch) return;
      const stagger = smooth(range(reveal, index * 0.025, 0.7 + index * 0.025));
      arch.scale.x = THREE.MathUtils.damp(arch.scale.x, 0.86 + stagger * 0.14, 7, delta);
      arch.scale.y = THREE.MathUtils.damp(arch.scale.y, 0.24 + stagger * 0.76, 7, delta);
      arch.position.y = THREE.MathUtils.damp(arch.position.y, (1 - stagger) * -1.4, 7, delta);
      arch.rotation.z = THREE.MathUtils.damp(
        arch.rotation.z,
        (1 - stagger) * (index % 2 === 0 ? -0.045 : 0.045),
        6,
        delta,
      );

      const seam = seamMaterials.current[index];
      if (seam) {
        seam.opacity = 0.12 + stagger * 0.58;
        seam.emissiveIntensity = 0.7 + stagger * 1.4 + mineralize * (index / archCount) * 1.1;
        seam.color.lerpColors(
          new THREE.Color('#72d9d6'),
          new THREE.Color('#d49a4e'),
          mineralize * (0.35 + index / archCount * 0.65),
        );
        seam.emissive.copy(seam.color);
      }

      const lamp = lampMaterials.current[index];
      if (lamp) {
        lamp.emissiveIntensity = 1.1 + stagger * 2.2 + Math.sin(clock.elapsedTime * 1.6 + index) * 0.18;
      }
    });

    if (portalRef.current) {
      portalRef.current.rotation.z = clock.elapsedTime * 0.055 + mineralize * 0.18;
      portalRef.current.scale.setScalar(0.62 + reveal * 0.38);
    }
  });

  return (
    <group ref={rootRef} position={[0, -6.4, 0]}>
      <mesh position={[0, -0.025, -116.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10.4, 33]} />
        <meshStandardMaterial color="#232421" emissive="#122321" emissiveIntensity={0.3} roughness={0.96} metalness={0.02} />
      </mesh>

      {Array.from({ length: archCount }, (_, index) => {
        const z = -103 - index * (27 / Math.max(1, archCount - 1));
        const isWarm = index > archCount * 0.55;
        return (
          <group
            key={`descent-arch-${index}`}
            ref={(node) => { archRefs.current[index] = node; }}
            position={[Math.sin(index * 0.72) * 0.18, 0, z]}
          >
            <mesh position={[-5.2, 2.95, 0]}>
              <boxGeometry args={[0.72, 5.9, 0.82]} />
              <meshStandardMaterial
                color={index % 2 === 0 ? '#463c31' : '#32413f'}
                emissive={isWarm ? '#3a2415' : '#183533'}
                emissiveIntensity={0.42}
                roughness={0.94}
              />
            </mesh>
            <mesh position={[5.2, 2.95, 0]}>
              <boxGeometry args={[0.72, 5.9, 0.82]} />
              <meshStandardMaterial
                color={index % 2 === 0 ? '#463c31' : '#32413f'}
                emissive={isWarm ? '#3a2415' : '#183533'}
                emissiveIntensity={0.42}
                roughness={0.94}
              />
            </mesh>
            <mesh position={[0, 2.95, 0]}>
              <torusGeometry args={[5.2, 0.36, 10, 56, Math.PI]} />
              <meshStandardMaterial
                color={index % 2 === 0 ? '#514536' : '#394947'}
                emissive={isWarm ? '#3a2415' : '#183533'}
                emissiveIntensity={0.5}
                roughness={0.9}
              />
            </mesh>
            <mesh position={[0, 2.95, 0.43]}>
              <torusGeometry args={[4.82, 0.035, 6, 56, Math.PI]} />
              <meshStandardMaterial
                ref={(material) => { seamMaterials.current[index] = material; }}
                color={isWarm ? '#d49a4e' : '#72d9d6'}
                emissive={isWarm ? '#d49a4e' : '#72d9d6'}
                emissiveIntensity={0.7}
                transparent
                opacity={0.12}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, 0.035, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[8.7, 0.16]} />
              <meshBasicMaterial color={isWarm ? '#c28b45' : '#65bab8'} transparent opacity={0.62} />
            </mesh>
            {index % 2 === 1 ? (
              <mesh position={[index % 4 === 1 ? -4.58 : 4.58, 3.1, 0.5]}>
                <octahedronGeometry args={[0.18, 0]} />
                <meshStandardMaterial
                  ref={(material) => { lampMaterials.current[index] = material; }}
                  color={isWarm ? '#ffc06a' : '#b8ffff'}
                  emissive={isWarm ? '#ef8e36' : '#72d9d6'}
                  emissiveIntensity={1.1}
                  roughness={0.18}
                />
              </mesh>
            ) : null}
          </group>
        );
      })}

      {Array.from({ length: archCount - 1 }, (_, index) => (
        <group key={`descent-vein-${index}`}>
          <mesh position={[-5.35, 1.1, -105.2 - index * (27 / Math.max(1, archCount - 1))]} rotation={[0, 0.04, 0]}>
            <boxGeometry args={[0.06, 0.06, 4.5]} />
            <meshBasicMaterial color={index > archCount * 0.5 ? '#b78345' : '#4f9694'} transparent opacity={0.52} />
          </mesh>
          <mesh position={[5.35, 1.8, -105.2 - index * (27 / Math.max(1, archCount - 1))]} rotation={[0, -0.04, 0]}>
            <boxGeometry args={[0.06, 0.06, 4.5]} />
            <meshBasicMaterial color={index > archCount * 0.5 ? '#b78345' : '#4f9694'} transparent opacity={0.42} />
          </mesh>
        </group>
      ))}

      <group ref={portalRef} position={[0, 4.65, -132]} scale={0.62}>
        <mesh>
          <torusGeometry args={[2.75, 0.16, 8, 64]} />
          <meshStandardMaterial color="#6d5b3e" emissive="#d49a4e" emissiveIntensity={1.15} roughness={0.46} metalness={0.42} />
        </mesh>
        <mesh>
          <torusGeometry args={[2.28, 0.035, 6, 64]} />
          <meshBasicMaterial color="#f1b75f" transparent opacity={0.7} />
        </mesh>
        <mesh>
          <circleGeometry args={[2.5, 48]} />
          <meshStandardMaterial color="#100d0c" emissive="#392113" emissiveIntensity={0.64} roughness={0.98} />
        </mesh>
        <mesh position={[0, 0, 0.16]}>
          <icosahedronGeometry args={[0.34, 1]} />
          <meshStandardMaterial color="#ffd28a" emissive="#e8973d" emissiveIntensity={4.4} roughness={0.14} />
        </mesh>
      </group>

      <pointLight position={[0, 4.5, -111]} intensity={48} distance={22} color="#72d9d6" />
      <pointLight position={[0, 4.6, -127]} intensity={64} distance={24} color="#e89b48" />
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
    const reveal = smooth(range(progressRef.current, 0.635, 0.685));
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
      <pointLight position={[0, 5.2, 14]} intensity={34} distance={21} color="#d78b52" />
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
      <CarpathianThreshold progressRef={progressRef} qualityTier={qualityTier} reducedMotion={reducedMotion} />
      <ApproachSignal progressRef={progressRef} />
      <NexusActScene
        progressRef={progressRef}
        lensMode={lensMode}
        lensPointerRef={lensPointerRef}
        qualityTier={qualityTier}
      />
      <SchoolActScene
        progressRef={progressRef}
        traceStep={traceStep}
        traceOutcome={traceOutcome}
        qualityTier={qualityTier}
      />
      <DescentVault progressRef={progressRef} qualityTier={qualityTier} />
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
