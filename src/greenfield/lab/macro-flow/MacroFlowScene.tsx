import { Environment, Lightformer, PerformanceMonitor, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import {
  Suspense,
  useCallback,
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
import { BuriedActPackage } from './buried-act/BuriedActPackage';
import { prepareBuriedActAssets } from './buried-act/buriedActAssets';
import {
  sampleBuriedActCamera,
  useBuriedActCamera,
  type BuriedActCameraCurve,
} from './buried-act/buriedActCamera';
import { FirstLightLayer } from './FirstLightLayer';
import { NexusActScene } from './NexusActScene';
import { VerticalSliceLoader } from './VerticalSliceLoader';
import { VerticalSliceLoadingGate } from './VerticalSliceLoadingGate';
import type { LensPointerState, MacroLensMode, MacroTraceOutcome, NexusFlightInput } from './macroFlowTypes';
import { SchoolActPackage } from './school-act/SchoolActPackage';
import {
  sampleSchoolActCamera,
  useSchoolActCamera,
  type SchoolActCameraCurve,
} from './school-act/schoolActCamera';
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
  schoolActProgressRef: MutableRefObject<number>;
  buriedActProgressRef: MutableRefObject<number>;
  schoolEntranceHandoffProgressRef: MutableRefObject<number>;
  descentHandoffProgressRef: MutableRefObject<number>;
  lensPointerRef: MutableRefObject<LensPointerState>;
  nexusFlightInputRef: MutableRefObject<NexusFlightInput>;
  lensMode: MacroLensMode;
  collectedEvidenceCores: EvidenceCoreId[];
  onCollectEvidenceCore: (core: EvidenceCoreId) => void;
  traceProgress: number;
  traceOutcome: MacroTraceOutcome;
  lampRaised: boolean;
  reducedMotion: boolean;
  qualityTier: QualityTier;
  velocityRef: MutableRefObject<number>;
  onPerformanceFactor: (factor: number) => void;
  onPerformanceFallback: () => void;
  onRendererFailure: () => void;
  onBuriedPixelHandoffRendered: () => void;
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

const BURIED_FALLBACK_CAMERA_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 3.8, -120),
  new THREE.Vector3(-0.7, 2.9, -134),
  new THREE.Vector3(-2.5, 1.7, -149),
  new THREE.Vector3(2.6, 1.4, -158),
  new THREE.Vector3(-1.8, 1.8, -170),
  new THREE.Vector3(1.3, 1.2, -183),
  new THREE.Vector3(0, -0.45, -191.85),
]);

const BURIED_FALLBACK_TARGET_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 1.65, -128),
  new THREE.Vector3(0, 1.5, -143),
  new THREE.Vector3(-2.8, 1.1, -153),
  new THREE.Vector3(2.8, 0.9, -162),
  new THREE.Vector3(-2.1, 1.3, -174),
  new THREE.Vector3(0, 0.2, -188),
  new THREE.Vector3(0, -0.52, -195.35),
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
  if (progress < 0.6) return 0.8 + smooth(range(progress, 0.43, 0.6)) * 0.11;
  if (progress < 0.68) return 0.91 + smooth(range(progress, 0.6, 0.68)) * 0.06;
  if (progress < 0.77) return 0.97 + smooth(range(progress, 0.68, 0.77)) * 0.015;
  if (progress < 0.9) return 0.985 + smooth(range(progress, 0.77, 0.9)) * 0.01;
  return 0.995 + smooth(range(progress, 0.9, 1)) * 0.005;
}

function CameraDirector({
  activeChapter,
  progressRef,
  schoolActProgressRef,
  buriedActProgressRef,
  schoolEntranceHandoffProgressRef,
  descentHandoffProgressRef,
  reducedMotion,
  qualityTier,
  velocityRef,
  authoredCurves,
  schoolCameraCurve,
  buriedCameraCurve,
}: Pick<MacroFlowSceneProps, 'activeChapter' | 'progressRef' | 'schoolActProgressRef' | 'buriedActProgressRef' | 'schoolEntranceHandoffProgressRef' | 'descentHandoffProgressRef' | 'reducedMotion' | 'qualityTier' | 'velocityRef'> & {
  authoredCurves: VerticalSliceCameraCurves;
  schoolCameraCurve: SchoolActCameraCurve | null;
  buriedCameraCurve: BuriedActCameraCurve | null;
}) {
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const genericPosition = useMemo(() => new THREE.Vector3(), []);
  const genericLookTarget = useMemo(() => new THREE.Vector3(), []);
  const schoolPosition = useMemo(() => new THREE.Vector3(), []);
  const schoolLookTarget = useMemo(() => new THREE.Vector3(), []);
  const buriedPosition = useMemo(() => new THREE.Vector3(), []);
  const buriedLookTarget = useMemo(() => new THREE.Vector3(), []);
  const orientation = useMemo(() => new THREE.PerspectiveCamera(), []);
  const firstFrameRef = useRef(true);
  const introStartTimeRef = useRef<number | null>(null);
  const previousBuriedProgressRef = useRef<number | null>(null);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.mf-lab');
    if (!root) return;
    root.dataset.cameraCurves = String(Object.keys(authoredCurves).length);
  }, [authoredCurves]);

  useFrame(({ camera, clock, pointer, size }, delta) => {
    if (introStartTimeRef.current === null) introStartTimeRef.current = clock.elapsedTime;
    const sceneTime = clock.elapsedTime - introStartTimeRef.current;
    const worldProgress = progressRef.current;
    const authoredCamera = sampleVerticalSliceCamera(
      authoredCurves,
      worldProgress,
      targetPosition,
      lookTarget,
    );
    const schoolCamera = SCHOOL_CAMERA_CHAPTERS.has(activeChapter)
      ? sampleSchoolActCamera(
          schoolCameraCurve,
          schoolActProgressRef.current,
          schoolPosition,
          schoolLookTarget,
        )
      : null;
    const isBuriedChapter = BURIED_CHAPTERS.has(activeChapter);
    const buriedCamera = isBuriedChapter
      ? sampleBuriedActCamera(
          buriedCameraCurve,
          buriedActProgressRef.current,
          buriedPosition,
          buriedLookTarget,
        )
      : null;
    const schoolFocus = smooth(range(worldProgress, 0.365, 0.43))
      * (1 - smooth(range(worldProgress, 0.445, 0.505)));
    const compact = size.width <= 820;
    const genericFov = (compact ? 57 : 48) + Math.min(1, Math.abs(velocityRef.current)) * 1.4;
    const genericRoll = THREE.MathUtils.clamp(-velocityRef.current * 0.012, -0.018, 0.018);
    let directedFov = authoredCamera?.fovDegrees;
    let directedRoll = authoredCamera?.rollRadians;
    let hasDirectedCamera = Boolean(authoredCamera);

    if (isBuriedChapter) {
      if (buriedCamera) {
        targetPosition.copy(buriedPosition);
        lookTarget.copy(buriedLookTarget);
        directedFov = buriedCamera.fovDegrees;
        directedRoll = buriedCamera.rollRadians;
      } else {
        const fallbackProgress = clamp01(buriedActProgressRef.current);
        BURIED_FALLBACK_CAMERA_PATH.getPoint(fallbackProgress, targetPosition);
        BURIED_FALLBACK_TARGET_PATH.getPoint(fallbackProgress, lookTarget);
        directedFov = THREE.MathUtils.lerp(compact ? 60 : 50, compact ? 54 : 42, fallbackProgress);
        directedRoll = 0;
      }
      hasDirectedCamera = true;

      if (activeChapter === 'descent' && schoolCamera) {
        const handoff = smooth(range(descentHandoffProgressRef.current, 0, 0.2));
        targetPosition.lerpVectors(schoolPosition, targetPosition, handoff);
        lookTarget.lerpVectors(schoolLookTarget, lookTarget, handoff);
        directedFov = THREE.MathUtils.lerp(
          schoolCamera.fovDegrees,
          directedFov,
          handoff,
        );
        directedRoll = THREE.MathUtils.lerp(
          schoolCamera.rollRadians,
          directedRoll,
          handoff,
        );
      }
    } else if (schoolCamera) {
      const entranceHandoff = activeChapter === 'passage'
        ? smooth(clamp01(schoolEntranceHandoffProgressRef.current))
        : 1;
      if (authoredCamera && entranceHandoff < 0.999) {
        targetPosition.lerp(schoolPosition, entranceHandoff);
        lookTarget.lerp(schoolLookTarget, entranceHandoff);
        directedFov = THREE.MathUtils.lerp(
          authoredCamera.fovDegrees,
          schoolCamera.fovDegrees,
          entranceHandoff,
        );
        directedRoll = THREE.MathUtils.lerp(
          authoredCamera.rollRadians,
          schoolCamera.rollRadians,
          entranceHandoff,
        );
      } else {
        targetPosition.copy(schoolPosition);
        lookTarget.copy(schoolLookTarget);
        directedFov = schoolCamera.fovDegrees;
        directedRoll = schoolCamera.rollRadians;
      }
      hasDirectedCamera = true;
    }

    if (!hasDirectedCamera) {
      const progress = cameraProgress(worldProgress);
      const lookDistance = THREE.MathUtils.lerp(0.11, 0.035, schoolFocus);
      const lookAhead = Math.min(1, progress + lookDistance);
      const cameraPath = compact ? MOBILE_CAMERA_PATH : CAMERA_PATH;
      cameraPath.getPoint(progress, genericPosition);
      cameraPath.getPoint(lookAhead, genericLookTarget);
      genericLookTarget.x += schoolFocus * (compact ? 0.72 : 1.65);
      genericLookTarget.y -= schoolFocus * (compact ? 3.1 : 4.35);

      targetPosition.copy(genericPosition);
      lookTarget.copy(genericLookTarget);
      directedFov = genericFov;
      directedRoll = genericRoll;
    }

    const thresholdIdle = activeChapter === 'threshold' && !reducedMotion
      ? 1 - smooth(range(worldProgress, 0.002, 0.038))
      : 0;
    if (thresholdIdle > 0) {
      const idleTime = sceneTime;
      const arrival = 1 - smooth(range(idleTime, 0.15, 3.4));
      targetPosition.x += arrival * 1.4 * thresholdIdle;
      targetPosition.y += arrival * 0.72 * thresholdIdle;
      targetPosition.z += arrival * 4.2 * thresholdIdle;
      targetPosition.x += Math.sin(idleTime * 0.16) * 0.2 * thresholdIdle;
      targetPosition.y += Math.sin(idleTime * 0.21 + 0.7) * 0.12 * thresholdIdle;
      targetPosition.z += Math.sin(idleTime * 0.11 + 1.2) * 0.16 * thresholdIdle;
      lookTarget.x += Math.sin(idleTime * 0.13 + 0.5) * 0.26 * thresholdIdle;
      lookTarget.y += Math.sin(idleTime * 0.18) * 0.1 * thresholdIdle;
      directedRoll = (directedRoll ?? genericRoll) + Math.sin(idleTime * 0.12) * 0.0035 * thresholdIdle;
      directedFov = (directedFov ?? genericFov)
        + arrival * 2.1 * thresholdIdle
        + Math.sin(idleTime * 0.1) * 0.32 * thresholdIdle;
    }

    const parallax = reducedMotion || isBuriedChapter
      ? 0
      : qualityTier === 'cinematic'
        ? 0.42
        : 0.16;
    targetPosition.x += pointer.x * parallax;
    targetPosition.y += pointer.y * parallax * 0.35;
    lookTarget.x += pointer.x * parallax * 0.55;
    lookTarget.y += pointer.y * parallax * 0.24;

    const buriedProgress = buriedActProgressRef.current;
    const buriedProgressJump = isBuriedChapter
      && previousBuriedProgressRef.current !== null
      && Math.abs(buriedProgress - previousBuriedProgressRef.current) >= 0.08;
    const applyImmediately = firstFrameRef.current || reducedMotion || buriedProgressJump;
    const damping = applyImmediately ? 1 : 1 - Math.exp(-delta * 5.4);
    camera.position.lerp(targetPosition, damping);

    orientation.position.copy(camera.position);
    orientation.lookAt(lookTarget);
    orientation.rotateZ(
      directedRoll ?? genericRoll,
    );
    camera.quaternion.slerp(orientation.quaternion, damping);

    if (camera instanceof THREE.PerspectiveCamera) {
      const nextFov = directedFov ?? genericFov;
      camera.fov = applyImmediately
        ? nextFov
        : THREE.MathUtils.damp(camera.fov, nextFov, 4.5, delta);
      camera.updateProjectionMatrix();
    }
    firstFrameRef.current = false;
    previousBuriedProgressRef.current = isBuriedChapter ? buriedProgress : null;
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

  useFrame(({ camera, clock }) => {
    if (skyRef.current) skyRef.current.position.copy(camera.position);
    if (dustRef.current) {
      dustRef.current.rotation.y = progressRef.current * 0.018 + clock.elapsedTime * 0.006;
      dustRef.current.position.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.16) * 0.16;
    }
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

              float longitude = atan(vDirection.z, vDirection.x);
              float cloudField = 0.5
                + 0.24 * sin(longitude * 3.2 + vDirection.y * 15.0)
                + 0.16 * sin(longitude * 7.4 - vDirection.y * 23.0)
                + 0.1 * sin(longitude * 13.0 + vDirection.y * 41.0);
              float cloudAltitude = smoothstep(-0.2, 0.12, vDirection.y)
                * (1.0 - smoothstep(0.24, 0.62, vDirection.y));
              float cloudVeil = smoothstep(0.54, 0.76, cloudField) * cloudAltitude;
              color = mix(color, vec3(0.12, 0.17, 0.17), cloudVeil * 0.2);

              float gateGlow = pow(
                max(0.0, dot(normalize(vDirection), normalize(vec3(0.24, -0.08, -0.96)))),
                8.0
              ) * horizon;
              color += vec3(0.12, 0.045, 0.022) * gateGlow;
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
  const occupiedLightMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const introStartTimeRef = useRef<number | null>(null);
  const occupiedDark = useMemo(() => new THREE.Color('#211f1b'), []);
  const occupiedLit = useMemo(() => new THREE.Color('#d9ba73'), []);
  const viewportWidth = useThree((state) => state.size.width);
  const compact = viewportWidth <= 820;
  const modelUrl = compact ? FIRST_LIGHT_MODEL_MOBILE : FIRST_LIGHT_MODEL_DESKTOP;
  const { scene } = useGLTF(modelUrl, false, true);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    occupiedLightMaterialsRef.current = [];
    const materialCache = new Map<string, THREE.Material>();
    const pointA = new THREE.Vector3();
    const pointB = new THREE.Vector3();
    const pointC = new THREE.Vector3();
    const centroid = new THREE.Vector3();
    clone.updateMatrixWorld(true);
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const assetLabel = `${child.name} ${child.geometry.name} ${child.parent?.name ?? ''}`;
      if (/bat flight|bear|crest|emblem|herald|far carpathians|near ridge/i.test(assetLabel)) {
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

      const index = child.geometry.getIndex();
      const position = child.geometry.getAttribute('position');
      if (index && position) {
        const retained: number[] = [];
        let removedTriangles = 0;
        for (let offset = 0; offset < index.count; offset += 3) {
          const indexA = index.getX(offset);
          const indexB = index.getX(offset + 1);
          const indexC = index.getX(offset + 2);
          pointA.fromBufferAttribute(position, indexA).applyMatrix4(child.matrixWorld);
          pointB.fromBufferAttribute(position, indexB).applyMatrix4(child.matrixWorld);
          pointC.fromBufferAttribute(position, indexC).applyMatrix4(child.matrixWorld);
          centroid.copy(pointA).add(pointB).add(pointC).multiplyScalar(1 / 3);
          const materialName = materials[0]?.name ?? '';
          const isCrestStructure = materialName === 'Blackened timber'
            || materialName === 'Limestone light'
            || materialName === 'Limestone mobile';
          const isCrestAccent = materialName === 'Occupied light'
            || materialName === 'Oxidized brass'
            || materialName === 'Polished brass edge';
          const structuralX = centroid.x / 1.7;
          const structuralY = (centroid.y - 10.95) / 1.8;
          const accentX = centroid.x / 2.2;
          const accentY = (centroid.y - 10.95) / 2.2;
          const belongsToCrest = (
            isCrestStructure
              && structuralX * structuralX + structuralY * structuralY < 1
              && centroid.z > 15.35
          ) || (
            isCrestAccent
              && accentX * accentX + accentY * accentY < 1
              && centroid.z > 12
          );
          if (belongsToCrest) {
            removedTriangles += 1;
          } else {
            retained.push(indexA, indexB, indexC);
          }
        }
        if (removedTriangles > 0) {
          const geometry = child.geometry.clone();
          geometry.setIndex(retained);
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();
          child.geometry = geometry;
          child.userData.mfOwnsGeometry = true;
        }
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
        material.envMapIntensity = structuralMaterial ? (compact ? 0.68 : 0.58) : (compact ? 0.5 : 0.44);
        if (structuralMaterial) {
          material.color.offsetHSL(0, -0.012, compact ? 0.042 : 0.024);
          if (material.emissiveIntensity < 0.2) {
            material.emissive.set('#111b19');
            material.emissiveIntensity = compact ? 0.28 : 0.16;
          }
        }
        if (compact && structuralMaterial) {
          material.emissive.set('#101a19');
          material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.62);
        }
        if (compact && /brass|iron/i.test(material.name)) {
          material.emissive.set('#24190d');
          material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.46);
        }
        if (material.name === 'Occupied light') {
          material.color.set('#d9ba73');
          material.emissive.set('#e4b96c');
          material.emissiveIntensity = Math.max(material.emissiveIntensity, 5.4);
          occupiedLightMaterialsRef.current.push(material);
        }
        if (material.name === 'Signal anchor') {
          material.color.set('#72d9d6');
          material.emissive.set('#72d9d6');
          material.emissiveIntensity = Math.max(material.emissiveIntensity, 4.8);
        }
        if (material.name === 'Worn stone path') {
          material.emissive.set('#17211d');
          material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.34);
        }
        material.needsUpdate = true;
        return material;
      });
      child.material = Array.isArray(child.material) ? tuned : tuned[0];
    });
    return clone;
  }, [compact, qualityTier, scene]);

  useEffect(() => () => {
    const materials = new Set<THREE.Material>();
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (child.userData.mfOwnsGeometry) child.geometry.dispose();
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
      meshMaterials.forEach((material) => materials.add(material));
    });
    materials.forEach((material) => material.dispose());
  }, [model]);

  useFrame(({ clock }) => {
    const root = rootRef.current;
    if (!root) return;
    const departure = smooth(range(progressRef.current, 0.045, 0.072));
    root.visible = departure < 0.995;
    if (!root.visible) return;
    root.position.y = -18 * departure;
    root.rotation.y = departure * -0.018;
    if (introStartTimeRef.current === null) introStartTimeRef.current = clock.elapsedTime;
    const introTime = clock.elapsedTime - introStartTimeRef.current;
    const ignition = smooth(range(introTime, 0.45, 2.25));
    occupiedLightMaterialsRef.current.forEach((material, index) => {
      const stagger = smooth(range(ignition, index * 0.08, 0.68 + index * 0.08));
      const flicker = Math.sin(clock.elapsedTime * (2.1 + index * 0.17) + index * 1.4) * 0.42;
      material.color.lerpColors(occupiedDark, occupiedLit, stagger);
      material.emissiveIntensity = (0.12 + stagger * (6 + flicker)) * (1 - departure);
    });
  });

  return <primitive ref={rootRef} object={model} />;
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
}: {
  progressRef: MutableRefObject<number>;
  buriedDiscoveries: number;
}) {
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

function WorldLookdevRig({
  qualityTier,
  showThreshold,
  showNexus,
}: Readonly<{
  qualityTier: QualityTier;
  showThreshold: boolean;
  showNexus: boolean;
}>) {
  if (qualityTier !== 'cinematic' || (!showThreshold && !showNexus)) return null;

  return (
    <Environment resolution={128} frames={1} background={false} environmentIntensity={0.82}>
      <group rotation={[0, showThreshold ? -0.28 : 0.18, 0]}>
        <Lightformer
          form="rect"
          color={showThreshold ? '#c9d5d0' : '#8fe0dc'}
          intensity={showThreshold ? 3.2 : 4.2}
          position={[-7, 8, -5]}
          rotation={[0, 0.62, 0]}
          scale={[7, 3.5, 1]}
        />
        <Lightformer
          form="rect"
          color={showThreshold ? '#b86b45' : '#d5b263'}
          intensity={showThreshold ? 4.6 : 3.4}
          position={[8, 1.5, 2]}
          rotation={[0, -1.1, 0]}
          scale={[3.5, 6.5, 1]}
        />
        <Lightformer
          form="ring"
          color={showThreshold ? '#f1e3bd' : '#74d9d5'}
          intensity={2.2}
          position={[0, 9, -12]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={3.5}
        />
        <Lightformer
          form="rect"
          color="#171e1d"
          intensity={1.1}
          position={[0, -5, 3]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[12, 8, 1]}
        />
      </group>
    </Environment>
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
    if (frameRef.current % 12 !== 0) return;
    queueMicrotask(() => {
      const root = document.querySelector<HTMLElement>('.mf-lab');
      if (!root) return;
      root.dataset.renderCalls = String(gl.info.render.calls);
      root.dataset.renderTriangles = String(gl.info.render.triangles);
    });
  });

  return null;
}

function SchoolTransitionLights({
  handoffProgressRef,
}: Readonly<{ handoffProgressRef: MutableRefObject<number> }>) {
  const entryRef = useRef<THREE.PointLight>(null);
  const accessRef = useRef<THREE.PointLight>(null);
  const corridorRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const intensity = 1 - smooth(range(handoffProgressRef.current, 0.52, 0.96));
    if (entryRef.current) entryRef.current.intensity = 30 * intensity;
    if (accessRef.current) accessRef.current.intensity = 24 * intensity;
    if (corridorRef.current) corridorRef.current.intensity = 38 * intensity;
  });

  return (
    <>
      <pointLight ref={entryRef} position={[0, 5, -54]} intensity={30} distance={24} color="#c0a66b" />
      <pointLight ref={accessRef} position={[0, 5, -79]} intensity={24} distance={22} color="#75dcda" />
      <pointLight ref={corridorRef} position={[0, 6, -99]} intensity={38} distance={24} color="#8dded8" />
    </>
  );
}

function BuriedTransitionLight({
  handoffProgressRef,
}: Readonly<{ handoffProgressRef: MutableRefObject<number> }>) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (!lightRef.current) return;
    lightRef.current.intensity = 30 * smooth(range(handoffProgressRef.current, 0.04, 0.5));
  });

  return <pointLight ref={lightRef} position={[0, 4, -120]} intensity={0} distance={28} color="#d88538" />;
}

const NEXUS_CHAPTERS = new Set<JourneyChapter>(['field', 'lens', 'proof']);
const SCHOOL_CHAPTERS = new Set<JourneyChapter>(['passage', 'access', 'schoolmate', 'descent']);
const SCHOOL_CAMERA_CHAPTERS = new Set<JourneyChapter>(['passage', 'access', 'schoolmate', 'descent']);
const BURIED_CHAPTERS = new Set<JourneyChapter>(['descent', 'lamp', 'build', 'infect']);
type FirstActPresence = {
  threshold: boolean;
};

function resolveFirstActPresence(
  activeChapter: JourneyChapter,
): FirstActPresence {
  return {
    threshold: activeChapter === 'threshold',
  };
}

function sameFirstActPresence(left: FirstActPresence, right: FirstActPresence) {
  return left.threshold === right.threshold;
}

function useFirstActLifecycle(
  activeChapter: JourneyChapter,
) {
  const [presence, setPresence] = useState<FirstActPresence>(() => (
    resolveFirstActPresence(activeChapter)
  ));
  const presenceRef = useRef(presence);
  const thresholdGroupRef = useRef<THREE.Group>(null);

  const commitPresence = useCallback((next: FirstActPresence) => {
    const current = presenceRef.current;
    if (sameFirstActPresence(current, next)) return;

    if (current.threshold && !next.threshold && thresholdGroupRef.current) {
      thresholdGroupRef.current.visible = false;
    }
    presenceRef.current = next;
    setPresence(next);
  }, []);

  useLayoutEffect(() => {
    commitPresence(resolveFirstActPresence(activeChapter));
  }, [activeChapter, commitPresence]);

  useFrame(() => {
    if (activeChapter !== 'threshold' && activeChapter !== 'field') return;
    commitPresence(resolveFirstActPresence(activeChapter));
  });

  return {
    presence,
    thresholdGroupRef,
  };
}

type WorldProps = MacroFlowSceneProps & {
  authoredCameraCurves: VerticalSliceCameraCurves;
  schoolCameraCurve: SchoolActCameraCurve | null;
  buriedCameraCurve: BuriedActCameraCurve | null;
};

function World({
  activeChapter,
  progressRef,
  schoolActProgressRef,
  buriedActProgressRef,
  schoolEntranceHandoffProgressRef,
  descentHandoffProgressRef,
  lensPointerRef,
  nexusFlightInputRef,
  lensMode,
  collectedEvidenceCores,
  onCollectEvidenceCore,
  traceProgress,
  traceOutcome,
  lampRaised,
  reducedMotion,
  qualityTier,
  velocityRef,
  authoredCameraCurves,
  schoolCameraCurve,
  buriedCameraCurve,
  onBuriedPixelHandoffRendered,
}: WorldProps) {
  const compact = useThree((state) => state.size.width <= 820);
  const firstAct = useFirstActLifecycle(activeChapter);
  const showThreshold = firstAct.presence.threshold;
  const showNexus = NEXUS_CHAPTERS.has(activeChapter);
  const showSchool = SCHOOL_CHAPTERS.has(activeChapter);
  const showBuried = BURIED_CHAPTERS.has(activeChapter);
  const showHemisphere = !(showNexus && (compact || showThreshold));
  const showNexusAccent = showNexus && (!showThreshold || compact);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);

  useFrame(({ clock }) => {
    const light = keyLightRef.current;
    if (!light) return;
    if (showThreshold) {
      const cycle = clock.elapsedTime % 11.8;
      const flashA = reducedMotion ? 0 : Math.max(0, 1 - Math.abs(cycle - 2.1) / 0.07);
      const flashB = reducedMotion ? 0 : Math.max(0, 1 - Math.abs(cycle - 2.32) / 0.045);
      const weatherPulse = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.72) * 0.12;
      light.intensity = (compact ? 2.45 : 2.18) + weatherPulse + flashA * 3.6 + flashB * 2.4;
      light.position.x = -18 + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.1) * 3.4);
      light.position.y = 13 + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.14) * 1.2);
      light.color.set(flashA + flashB > 0.05 ? '#dcebea' : '#c9d9d5');
      return;
    }
    light.intensity = showBuried ? 0.58 : 1.75;
    light.position.set(10, 18, 18);
    light.color.set(showBuried ? '#bbae98' : '#dae3d9');
  });

  return (
    <>
      <color attach="background" args={[showBuried ? '#070707' : '#071011']} />
      <fog attach="fog" args={[showBuried ? '#0b0908' : '#0a1719', showBuried ? 12 : 26, showBuried ? 70 : 94]} />
      <WorldAtmosphere
        progressRef={progressRef}
        qualityTier={qualityTier}
        reducedMotion={reducedMotion}
      />
      <WorldLookdevRig
        qualityTier={qualityTier}
        showThreshold={showThreshold}
        showNexus={showNexus}
      />
      {showHemisphere ? (
        <hemisphereLight
          intensity={showBuried ? 0.16 : showThreshold ? (compact ? 0.82 : 0.68) : 0.38}
          color={showBuried ? '#b8ac98' : showThreshold ? '#b8cecd' : '#b9cfcd'}
          groundColor={showBuried ? '#130f0d' : showThreshold ? '#263029' : '#191b17'}
        />
      ) : null}
      <directionalLight
        ref={keyLightRef}
        castShadow={qualityTier === 'cinematic' && !showBuried && !showThreshold && !showNexus}
        position={showThreshold ? [-18, 13, 10] : [10, 18, 18]}
        intensity={showBuried ? 0.58 : showThreshold ? (compact ? 2.45 : 2.18) : 1.75}
        color={showBuried ? '#bbae98' : showThreshold ? '#d7e1dc' : '#dae3d9'}
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
      {showNexusAccent ? (
        <pointLight
          position={compact ? [0, 4.2, -8] : [-1, 5, -11]}
          intensity={compact ? 26 : 38}
          distance={compact ? 22 : 36}
          color="#72d9d6"
        />
      ) : null}
      {showSchool ? (
        <SchoolTransitionLights handoffProgressRef={descentHandoffProgressRef} />
      ) : null}
      {showBuried ? <BuriedTransitionLight handoffProgressRef={descentHandoffProgressRef} /> : null}

      <CameraDirector
        activeChapter={activeChapter}
        progressRef={progressRef}
        schoolActProgressRef={schoolActProgressRef}
        buriedActProgressRef={buriedActProgressRef}
        schoolEntranceHandoffProgressRef={schoolEntranceHandoffProgressRef}
        descentHandoffProgressRef={descentHandoffProgressRef}
        reducedMotion={reducedMotion}
        qualityTier={qualityTier}
        velocityRef={velocityRef}
        authoredCurves={authoredCameraCurves}
        schoolCameraCurve={schoolCameraCurve}
        buriedCameraCurve={buriedCameraCurve}
      />
      <RenderBudgetMonitor />
      {showThreshold ? (
        <group ref={firstAct.thresholdGroupRef} visible>
          <FirstLightCitadel progressRef={progressRef} qualityTier={qualityTier} />
          {!compact ? (
            <FirstLightLayer
              progressRef={progressRef}
              qualityTier={qualityTier}
              reducedMotion={reducedMotion}
            />
          ) : null}
          {!compact || activeChapter === 'threshold' ? (
            <CarpathianThreshold
              progressRef={progressRef}
              qualityTier={qualityTier}
              reducedMotion={reducedMotion}
              realtimeLightEnabled
            />
          ) : null}
        </group>
      ) : null}
      {showNexus ? (
        <group visible>
          <NexusActScene
            activeChapter={
              activeChapter === 'lens'
                ? 'lens'
                : activeChapter === 'proof'
                  ? 'proof'
                  : 'field'
            }
            progressRef={progressRef}
            lensMode={lensMode}
            lensPointerRef={lensPointerRef}
            nexusFlightInputRef={nexusFlightInputRef}
            collectedEvidenceCores={collectedEvidenceCores}
            onCollectEvidenceCore={onCollectEvidenceCore}
            qualityTier={qualityTier}
            compact={compact}
          />
        </group>
      ) : null}
      {showSchool ? (
        <SchoolActPackage
          localProgressRef={schoolActProgressRef}
          handoffProgressRef={descentHandoffProgressRef}
          traceProgress={traceProgress}
          traceOutcome={traceOutcome}
          qualityTier={qualityTier}
        />
      ) : null}
      {showBuried ? (
        <Suspense fallback={null}>
          <BuriedActPackage
            localProgressRef={buriedActProgressRef}
            lampRaised={lampRaised}
            qualityTier={qualityTier}
            reducedMotion={reducedMotion}
            onPixelHandoffRendered={onBuriedPixelHandoffRendered}
          />
        </Suspense>
      ) : null}
      {showBuried && qualityTier === 'editorial' ? (
        <>
          <DescentVault progressRef={progressRef} qualityTier={qualityTier} />
          <DescentLayers progressRef={progressRef} />
          <BuriedChamber progressRef={progressRef} buriedDiscoveries={lampRaised ? 3 : 0} />
        </>
      ) : null}

      <mesh visible={!showBuried} position={[0, -0.08, -56]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36, 190]} />
        <meshStandardMaterial color="#101516" roughness={0.98} />
      </mesh>
      {!compact ? <PostEffects qualityTier={qualityTier} /> : null}
    </>
  );
}

function WebGLContextGuard({
  onPerformanceFallback,
  onRendererFailure,
}: Pick<MacroFlowSceneProps, 'onPerformanceFallback' | 'onRendererFailure'>) {
  const canvas = useThree((state) => state.gl.domElement);
  const contextLostHandledRef = useRef(false);

  useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (contextLostHandledRef.current) return;

      contextLostHandledRef.current = true;
      onPerformanceFallback();
      onRendererFailure();
    };
    const handleContextRestored = () => {
      contextLostHandledRef.current = false;
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [canvas, onPerformanceFallback, onRendererFailure]);

  return null;
}

export function MacroFlowScene(props: MacroFlowSceneProps) {
  const [compact, setCompact] = useState(() => window.innerWidth <= 820);
  const [schoolCompact, setSchoolCompact] = useState(() => window.innerWidth <= 840);
  const authoredCameraCurves = useVerticalSliceCameraCurves(compact);
  const schoolCamera = useSchoolActCamera(schoolCompact);
  const buriedCamera = useBuriedActCamera(compact);
  const buriedCameraSettled = buriedCamera.ready || buriedCamera.error !== null;
  const cameraReady = Object.keys(authoredCameraCurves).length === 4
    && (schoolCamera.ready || schoolCamera.error !== null)
    && (!BURIED_CHAPTERS.has(props.activeChapter) || buriedCameraSettled);
  const dpr: [number, number] | number = props.qualityTier === 'cinematic' ? [1, 1.5] : 1;

  useEffect(() => {
    const onResize = () => {
      setCompact(window.innerWidth <= 820);
      setSchoolCompact(window.innerWidth <= 840);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (
      props.activeChapter === 'schoolmate'
      || BURIED_CHAPTERS.has(props.activeChapter)
    ) {
      const root = document.querySelector<HTMLElement>('.mf-lab');
      if (root && root.dataset.buriedActModel !== 'ready') {
        root.dataset.buriedActModel = 'loading';
      }
      prepareBuriedActAssets();
    }
  }, [props.activeChapter]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.mf-lab');
    if (!root) return undefined;
    root.dataset.schoolActCamera = schoolCamera.ready
      ? 'ready'
      : schoolCamera.error
        ? 'fallback'
        : 'loading';
    return () => {
      delete root.dataset.schoolActCamera;
    };
  }, [schoolCamera.error, schoolCamera.ready]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.mf-lab');
    if (!root) return undefined;
    root.dataset.buriedActCameraVariant = buriedCamera.variant;
    root.dataset.buriedActCamera = buriedCamera.ready
      ? 'ready'
      : buriedCamera.error
        ? 'fallback'
        : 'loading';
    return () => {
      delete root.dataset.buriedActCamera;
      delete root.dataset.buriedActCameraVariant;
    };
  }, [buriedCamera.error, buriedCamera.ready, buriedCamera.variant]);

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
          gl.toneMappingExposure = 0.86;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
        fallback={<VerticalSliceLoader unavailable />}
      >
        <WebGLContextGuard
          onPerformanceFallback={props.onPerformanceFallback}
          onRendererFailure={props.onRendererFailure}
        />
        <PerformanceMonitor
          flipflops={3}
          onChange={({ factor }) => props.onPerformanceFactor(factor)}
          onFallback={props.onPerformanceFallback}
        >
          <Suspense fallback={null}>
            <World
              {...props}
              authoredCameraCurves={authoredCameraCurves}
              schoolCameraCurve={schoolCamera.curve}
              buriedCameraCurve={buriedCamera.curve}
            />
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
