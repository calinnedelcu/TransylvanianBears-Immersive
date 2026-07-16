import { PerformanceMonitor, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import type { JourneyChapter } from '../../experience/chapters';
import type { EvidenceCoreId } from '../../experience/evidenceCores';
import type { QualityTier } from '../../experience/quality';
import { CarpathianThreshold } from './CarpathianThreshold';
import { FirstLightLayer } from './FirstLightLayer';
import { NexusActScene } from './NexusActScene';
import { SchoolActScene } from './SchoolActScene';
import { SystemContinuityRig } from './SystemContinuityRig';
import { VerticalSliceLoader } from './VerticalSliceLoader';
import { VerticalSliceLoadingGate } from './VerticalSliceLoadingGate';
import type { LensPointerState, MacroLensMode, MacroTraceOutcome, NexusFlightInput } from './macroFlowTypes';
import { getVerticalSliceAsset, resolveVerticalSliceAsset } from './verticalSliceAssets';
import {
  sampleVerticalSliceCamera,
  useVerticalSliceCameraCurves,
  type VerticalSliceCameraCurves,
} from './verticalSliceCamera';

export type { MacroLensMode, MacroTraceOutcome } from './macroFlowTypes';

type MacroFlowSceneProps = {
  activeChapter: JourneyChapter;
  progressRef: MutableRefObject<number>;
  lensPointerRef: MutableRefObject<LensPointerState>;
  nexusFlightInputRef: MutableRefObject<NexusFlightInput>;
  lensMode: MacroLensMode;
  collectedEvidenceCores: EvidenceCoreId[];
  onCollectEvidenceCore: (core: EvidenceCoreId) => void;
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

function resolvedAssetUrl(assetId: 'thresholdSceneDesktop' | 'thresholdSceneMobile', fallback: string) {
  const asset = resolveVerticalSliceAsset(getVerticalSliceAsset(assetId));
  return asset?.kind === 'url' ? asset.url : fallback;
}

const FIRST_LIGHT_MODEL_DESKTOP = resolvedAssetUrl(
  'thresholdSceneDesktop',
  '/assets/world/first-light-citadel.glb',
);
const FIRST_LIGHT_MODEL_MOBILE = resolvedAssetUrl(
  'thresholdSceneMobile',
  '/assets/world/first-light-citadel.glb',
);

const FALLBACK_MATERIAL_COLORS: Record<string, string> = {
  'Mountain far': '#14272b',
  'Mountain near': '#213532',
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
  authoredCurves,
}: Pick<MacroFlowSceneProps, 'progressRef' | 'reducedMotion' | 'qualityTier' | 'velocityRef'> & {
  authoredCurves: VerticalSliceCameraCurves;
}) {
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const orientation = useMemo(() => new THREE.PerspectiveCamera(), []);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.mf-lab');
    if (!root) return;
    root.dataset.cameraCurves = String(Object.keys(authoredCurves).length);
  }, [authoredCurves]);

  useFrame(({ camera, pointer, size }, delta) => {
    const worldProgress = progressRef.current;
    const authoredCamera = sampleVerticalSliceCamera(
      authoredCurves,
      worldProgress,
      targetPosition,
      lookTarget,
    );
    const schoolFocus = smooth(range(worldProgress, 0.365, 0.43))
      * (1 - smooth(range(worldProgress, 0.445, 0.505)));
    if (!authoredCamera) {
      const progress = cameraProgress(worldProgress);
      const lookDistance = THREE.MathUtils.lerp(0.11, 0.035, schoolFocus);
      const lookAhead = Math.min(1, progress + lookDistance);
      const cameraPath = size.width <= 820 ? MOBILE_CAMERA_PATH : CAMERA_PATH;
      cameraPath.getPoint(progress, targetPosition);
      cameraPath.getPoint(lookAhead, lookTarget);
      lookTarget.x += schoolFocus * (size.width <= 820 ? 0.72 : 1.65);
      lookTarget.y -= schoolFocus * (size.width <= 820 ? 3.1 : 4.35);
    }

    const parallax = reducedMotion ? 0 : qualityTier === 'cinematic' ? 0.42 : 0.16;
    targetPosition.x += pointer.x * parallax;
    targetPosition.y += pointer.y * parallax * 0.35;
    lookTarget.x += pointer.x * parallax * 0.55;
    lookTarget.y += pointer.y * parallax * 0.24;

    const damping = reducedMotion ? 1 : 1 - Math.exp(-delta * 5.4);
    camera.position.lerp(targetPosition, damping);

    orientation.position.copy(camera.position);
    orientation.lookAt(lookTarget);
    orientation.rotateZ(
      authoredCamera?.rollRadians
        ?? THREE.MathUtils.clamp(-velocityRef.current * 0.012, -0.018, 0.018),
    );
    camera.quaternion.slerp(orientation.quaternion, damping);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.damp(
        camera.fov,
        authoredCamera?.fovDegrees
          ?? (size.width <= 820 ? 57 : 48) + Math.min(1, Math.abs(velocityRef.current)) * 1.4,
        4.5,
        delta,
      );
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

function WorldAtmosphere({
  progressRef,
  qualityTier,
  reducedMotion,
}: Pick<MacroFlowSceneProps, 'progressRef' | 'qualityTier' | 'reducedMotion'>) {
  const skyRef = useRef<THREE.Mesh>(null);
  const dustRef = useRef<THREE.Points>(null);
  const dustGeometry = useMemo(() => {
    const count = qualityTier === 'cinematic' && !reducedMotion ? 280 : 0;
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
  }, [qualityTier, reducedMotion]);

  useEffect(() => () => dustGeometry.dispose(), [dustGeometry]);

  useFrame(({ camera }) => {
    if (skyRef.current) skyRef.current.position.copy(camera.position);
    if (dustRef.current) dustRef.current.rotation.y = progressRef.current * 0.018;
  });

  return (
    <>
      <mesh ref={skyRef} renderOrder={-100}>
        <sphereGeometry args={[145, 36, 20]} />
        <shaderMaterial
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
          toneMapped={false}
          vertexShader={`
            varying vec3 vDirection;
            void main() {
              vDirection = normalize(position);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec3 vDirection;
            void main() {
              float horizon = pow(1.0 - abs(vDirection.y), 3.2);
              float upper = smoothstep(-0.18, 0.72, vDirection.y);
              vec3 low = vec3(0.064, 0.108, 0.112);
              vec3 high = vec3(0.018, 0.039, 0.047);
              vec3 color = mix(low, high, upper);
              color += vec3(0.038, 0.062, 0.058) * horizon;
              float moonAlignment = dot(normalize(vDirection), normalize(vec3(-0.18, 0.52, -0.84)));
              float moon = smoothstep(0.986, 0.994, moonAlignment);
              float moonHalo = smoothstep(0.94, 0.992, moonAlignment) * 0.13;
              color += vec3(0.48, 0.62, 0.6) * moonHalo;
              color = mix(color, vec3(0.7, 0.77, 0.73), moon * 0.32);
              gl_FragColor = vec4(color, 1.0);
            }
          `}
        />
      </mesh>
      {dustGeometry.getAttribute('position').count > 0 ? (
        <points ref={dustRef} geometry={dustGeometry} frustumCulled={false}>
          <pointsMaterial
            color="#a8cfca"
            size={0.026}
            transparent
            opacity={0.16}
            depthWrite={false}
            sizeAttenuation
          />
        </points>
      ) : null}
    </>
  );
}

function FirstLightCitadel({
  progressRef,
  qualityTier,
}: Pick<MacroFlowSceneProps, 'progressRef' | 'qualityTier'>) {
  const rootRef = useRef<THREE.Group>(null);
  const viewportWidth = useThree((state) => state.size.width);
  const modelUrl = viewportWidth <= 820 ? FIRST_LIGHT_MODEL_MOBILE : FIRST_LIGHT_MODEL_DESKTOP;
  const { scene } = useGLTF(modelUrl, false, true);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const materialCache = new Map<string, THREE.Material>();
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const assetLabel = `${child.name} ${child.geometry.name} ${child.parent?.name ?? ''}`;
      if (/bat flight/i.test(assetLabel)) {
        child.visible = false;
        const hiddenMaterials = materials.map((source) => {
          const cached = materialCache.get(source.uuid);
          if (cached) return cached;
          const material = source.clone();
          materialCache.set(source.uuid, material);
          return material;
        });
        child.material = Array.isArray(child.material) ? hiddenMaterials : hiddenMaterials[0];
        return;
      }
      const structuralMaterial = materials.some((material) => (
        /Limestone|plaster|stone|earth|timber/.test(material.name)
      ));
      child.castShadow = qualityTier === 'cinematic'
        && structuralMaterial
        && !(child instanceof THREE.InstancedMesh);
      child.receiveShadow = qualityTier === 'cinematic';
      child.frustumCulled = true;
      const tuned = materials.map((source) => {
        const cached = materialCache.get(source.uuid);
        if (cached) return cached;
        const material = source.clone();
        materialCache.set(source.uuid, material);
        if (!(material instanceof THREE.MeshStandardMaterial)) return material;

        const hasAuthoredPbrMaps = Boolean(
          material.map
          || material.normalMap
          || material.roughnessMap
          || material.metalnessMap,
        );
        const fallbackColor = FALLBACK_MATERIAL_COLORS[material.name];
        if (!hasAuthoredPbrMaps && fallbackColor) material.color.set(fallbackColor);
        material.envMapIntensity = structuralMaterial ? 0.52 : 0.4;
        if (material.name === 'Occupied light') {
          material.color.set('#d9ba73');
          material.emissive.set('#e4b96c');
          material.emissiveIntensity = Math.max(material.emissiveIntensity, 3.4);
        }
        if (material.name === 'Signal anchor') {
          material.color.set('#72d9d6');
          material.emissive.set('#72d9d6');
          material.emissiveIntensity = Math.max(material.emissiveIntensity, 4.8);
        }
        material.needsUpdate = true;
        return material;
      });
      child.material = Array.isArray(child.material) ? tuned : tuned[0];
    });
    return clone;
  }, [qualityTier, scene]);

  useEffect(() => () => {
    const materials = new Set<THREE.Material>();
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
      meshMaterials.forEach((material) => materials.add(material));
    });
    materials.forEach((material) => material.dispose());
  }, [model]);

  useFrame(() => {
    if (!rootRef.current) return;
    const departure = smooth(range(progressRef.current, 0.055, 0.095));
    rootRef.current.visible = departure < 0.995;
    rootRef.current.position.y = -18 * departure;
    rootRef.current.rotation.y = departure * -0.018;
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
  const beadRef = useRef<THREE.InstancedMesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const pulsePosition = useMemo(() => new THREE.Vector3(), []);
  const beadTransform = useMemo(() => new THREE.Object3D(), []);
  const inactiveColor = useMemo(() => new THREE.Color('#18312f'), []);
  const activeColor = useMemo(() => new THREE.Color('#72d9d6'), []);
  const currentColor = useMemo(() => new THREE.Color(), []);
  const beadGeometry = useMemo(() => new THREE.OctahedronGeometry(0.085, 0), []);
  const beadMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff' }), []);
  const beadCount = 34;

  useLayoutEffect(() => {
    beadRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  useEffect(() => () => {
    beadGeometry.dispose();
    beadMaterial.dispose();
  }, [beadGeometry, beadMaterial]);

  useFrame(() => {
    const reveal = smooth(range(legacyProgress(progressRef.current), 0.018, 0.09));
    if (beadRef.current) {
      for (let index = 0; index < beadCount; index += 1) {
        const position = APPROACH_SIGNAL.getPoint(index / (beadCount - 1));
        const threshold = index / (beadCount - 1);
        const activation = 1 - smooth(range(threshold, reveal - 0.035, reveal + 0.015));
        beadTransform.position.copy(position);
        beadTransform.rotation.set(0, index * 0.31, 0);
        beadTransform.scale.setScalar(0.52 + activation * 0.48);
        beadTransform.updateMatrix();
        beadRef.current.setMatrixAt(index, beadTransform.matrix);
        currentColor.lerpColors(inactiveColor, activeColor, 0.18 + activation * 0.82);
        beadRef.current.setColorAt(index, currentColor);
      }
      beadRef.current.instanceMatrix.needsUpdate = true;
      if (beadRef.current.instanceColor) beadRef.current.instanceColor.needsUpdate = true;
    }
    if (!pulseRef.current) return;
    APPROACH_SIGNAL.getPoint(reveal, pulsePosition);
    pulseRef.current.position.copy(pulsePosition);
    pulseRef.current.visible = reveal > 0.01 && reveal < 0.82;
    if (rootRef.current) {
      const departure = smooth(range(progressRef.current, 0.058, 0.098));
      rootRef.current.visible = departure < 0.995;
      rootRef.current.position.y = -18 * departure;
    }
  });

  return (
    <group ref={rootRef}>
      <instancedMesh
        ref={beadRef}
        args={[beadGeometry, beadMaterial, beadCount]}
        frustumCulled={false}
      />
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
      <Vignette offset={0.22} darkness={0.5} eskil={false} />
    </EffectComposer>
  );
}

function RenderBudgetMonitor() {
  const gl = useThree((state) => state.gl);
  const frameRef = useRef(0);

  useEffect(() => {
    const previousAutoReset = gl.info.autoReset;
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = previousAutoReset;
      gl.info.reset();
    };
  }, [gl]);

  useFrame(() => {
    frameRef.current += 1;
    gl.info.reset();
    const shouldSample = frameRef.current % 12 === 0;
    queueMicrotask(() => {
      if (!shouldSample) return;
      const root = document.querySelector<HTMLElement>('.mf-lab');
      if (!root) return;
      root.dataset.renderCalls = String(gl.info.render.calls);
      root.dataset.renderTriangles = String(gl.info.render.triangles);
    });
  });

  return null;
}

const THRESHOLD_CHAPTERS = new Set<JourneyChapter>(['threshold', 'field']);
const NEXUS_CHAPTERS = new Set<JourneyChapter>(['field', 'lens', 'proof', 'passage']);
const SCHOOL_CHAPTERS = new Set<JourneyChapter>(['proof', 'passage', 'access', 'schoolmate', 'descent']);
const BURIED_CHAPTERS = new Set<JourneyChapter>(['schoolmate', 'descent', 'lamp', 'build']);

type WorldProps = MacroFlowSceneProps & {
  authoredCameraCurves: VerticalSliceCameraCurves;
};

function World({
  activeChapter,
  progressRef,
  lensPointerRef,
  nexusFlightInputRef,
  lensMode,
  collectedEvidenceCores,
  onCollectEvidenceCore,
  traceStep,
  traceOutcome,
  buriedDiscoveries,
  reducedMotion,
  qualityTier,
  velocityRef,
  authoredCameraCurves,
}: WorldProps) {
  const showThreshold = THRESHOLD_CHAPTERS.has(activeChapter);
  const showNexus = NEXUS_CHAPTERS.has(activeChapter);
  const showSchool = SCHOOL_CHAPTERS.has(activeChapter);
  const showBuried = BURIED_CHAPTERS.has(activeChapter);

  return (
    <>
      <color attach="background" args={['#071011']} />
      <fog attach="fog" args={['#0a1719', 26, 94]} />
      <WorldAtmosphere
        progressRef={progressRef}
        qualityTier={qualityTier}
        reducedMotion={reducedMotion}
      />
      <hemisphereLight
        intensity={showThreshold ? 0.62 : 0.38}
        color={showThreshold ? '#b8cecd' : '#b9cfcd'}
        groundColor={showThreshold ? '#263029' : '#191b17'}
      />
      <directionalLight
        castShadow={qualityTier === 'cinematic'}
        position={showThreshold ? [-12, 19, 24] : [10, 18, 18]}
        intensity={showThreshold ? 2.15 : 1.75}
        color={showThreshold ? '#d7e1dc' : '#dae3d9'}
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
      {showThreshold ? (
        <directionalLight position={[14, 10, 28]} intensity={0.52} color="#789e9e" />
      ) : null}
      {showThreshold ? (
        <>
          <pointLight position={[-7, 7.5, 22]} intensity={20} distance={28} color="#c5a06e" />
          <pointLight position={[0, 4.9, 15.5]} intensity={16} distance={18} color="#cf8251" />
          <pointLight position={[-2.4, 10.8, 21]} intensity={13} distance={17} color="#abc3c0" />
        </>
      ) : null}
      {showNexus ? (
        <>
          <pointLight position={[-3, 5.2, 1]} intensity={42} distance={28} color="#72d9d6" />
          <pointLight position={[3, 4.4, -13]} intensity={34} distance={27} color="#d0ad68" />
          <pointLight position={[0, 5, -33]} intensity={36} distance={24} color="#6fd8d6" />
        </>
      ) : null}
      {showSchool ? (
        <>
          <pointLight position={[0, 5, -54]} intensity={30} distance={24} color="#c0a66b" />
          <pointLight position={[0, 5, -79]} intensity={24} distance={22} color="#75dcda" />
          <pointLight position={[0, 6, -99]} intensity={38} distance={24} color="#8dded8" />
        </>
      ) : null}
      {showBuried ? <pointLight position={[0, 4, -120]} intensity={30} distance={28} color="#d88538" /> : null}

      <CameraDirector
        progressRef={progressRef}
        reducedMotion={reducedMotion}
        qualityTier={qualityTier}
        velocityRef={velocityRef}
        authoredCurves={authoredCameraCurves}
      />
      <RenderBudgetMonitor />
      <SystemContinuityRig
        progressRef={progressRef}
        qualityTier={qualityTier}
        reducedMotion={reducedMotion}
      />
      {showThreshold ? (
        <>
          <FirstLightCitadel progressRef={progressRef} qualityTier={qualityTier} />
          <FirstLightLayer
            progressRef={progressRef}
            qualityTier={qualityTier}
            reducedMotion={reducedMotion}
          />
          <CarpathianThreshold progressRef={progressRef} qualityTier={qualityTier} reducedMotion={reducedMotion} />
          <ApproachSignal progressRef={progressRef} />
        </>
      ) : null}
      {showNexus ? (
        <NexusActScene
          progressRef={progressRef}
          lensMode={lensMode}
          lensPointerRef={lensPointerRef}
          nexusFlightInputRef={nexusFlightInputRef}
          collectedEvidenceCores={collectedEvidenceCores}
          onCollectEvidenceCore={onCollectEvidenceCore}
          qualityTier={qualityTier}
        />
      ) : null}
      {showSchool ? (
        <SchoolActScene
          progressRef={progressRef}
          traceStep={traceStep}
          traceOutcome={traceOutcome}
          qualityTier={qualityTier}
        />
      ) : null}
      {showBuried ? (
        <>
          <DescentVault progressRef={progressRef} qualityTier={qualityTier} />
          <DescentLayers progressRef={progressRef} />
          <BuriedChamber progressRef={progressRef} buriedDiscoveries={buriedDiscoveries} />
        </>
      ) : null}

      <mesh position={[0, -0.08, -56]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36, 190]} />
        <meshStandardMaterial color="#101516" roughness={0.98} />
      </mesh>
      <PostEffects qualityTier={qualityTier} />
    </>
  );
}

export function MacroFlowScene(props: MacroFlowSceneProps) {
  const [compact, setCompact] = useState(() => window.innerWidth <= 820);
  const authoredCameraCurves = useVerticalSliceCameraCurves(compact);
  const cameraReady = Object.keys(authoredCameraCurves).length === 4;
  const dpr: [number, number] | number = props.qualityTier === 'cinematic' ? [1, 1.5] : 1;

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth <= 820);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <>
      <VerticalSliceLoadingGate cameraReady={cameraReady} />
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
        fallback={<VerticalSliceLoader unavailable />}
      >
        <PerformanceMonitor
          flipflops={3}
          onChange={({ factor }) => props.onPerformanceFactor(factor)}
          onFallback={props.onPerformanceFallback}
        >
          <Suspense fallback={null}>
            <World {...props} authoredCameraCurves={authoredCameraCurves} />
          </Suspense>
        </PerformanceMonitor>
      </Canvas>
    </>
  );
}

useGLTF.preload(FIRST_LIGHT_MODEL_DESKTOP, false, true);
if (FIRST_LIGHT_MODEL_MOBILE !== FIRST_LIGHT_MODEL_DESKTOP) {
  useGLTF.preload(FIRST_LIGHT_MODEL_MOBILE, false, true);
}
