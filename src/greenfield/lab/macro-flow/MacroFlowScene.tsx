import { Environment, Lightformer, PerformanceMonitor, useTexture } from '@react-three/drei';
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
import { prepareNexusActAssets, prepareSchoolActAssets } from './actAssetPreload';

import { BuriedActPackage } from './buried-act/BuriedActPackage';
import { prepareBuriedActAssets } from './buried-act/buriedActAssets';
import {
  sampleBuriedActCamera,
  useBuriedActCamera,
  type BuriedActCameraCurve,
} from './buried-act/buriedActCamera';

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
import { CitadelSequence } from '../hero-plan/CitadelScene';
import type { HeroOpening } from '../hero-plan/useHeroOpening';
import { ThresholdResponseSequence } from './ThresholdResponseSequence';
import {
  sampleVerticalSliceCamera,
  useVerticalSliceCameraCurves,
  type VerticalSliceCameraCurves,
} from './verticalSliceCamera';

export type { MacroLensMode, MacroTraceOutcome } from './macroFlowTypes';

type MacroFlowSceneProps = {
  activeChapter: JourneyChapter;
  progressRef: MutableRefObject<number>;
  /** The opening on its own clock. World progress runs to chapter eleven. */
  heroProgressRef: MutableRefObject<number>;
  /** The scroll that carries the reader out of the citadel and into the story. */
  heroHandoffRef: MutableRefObject<number>;
  /** The drawing's measured frame and the state the sequence shares with it. */
  opening: HeroOpening;
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

const FIRST_LIGHT_SKY_URL = '/assets/world/first-light-sky.webp';
const FIRST_LIGHT_COUNTRY_URL = '/assets/world/first-light-country.webp';
useTexture.preload(FIRST_LIGHT_SKY_URL);
useTexture.preload(FIRST_LIGHT_COUNTRY_URL);

const CAMERA_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(16, 20, 52),
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
  new THREE.Vector3(4.0, 16.5, 42),
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
      ? 1 - smooth(range(worldProgress, 0.002, 0.052))
      : 0;
    if (thresholdIdle > 0) {
      const idleTime = sceneTime;
      targetPosition.x += Math.sin(idleTime * 0.07) * 0.12 * thresholdIdle;
      targetPosition.y += Math.sin(idleTime * 0.09 + 0.6) * 0.06 * thresholdIdle;
      lookTarget.y += Math.sin(idleTime * 0.08) * 0.04 * thresholdIdle;
      directedRoll = (directedRoll ?? genericRoll) + Math.sin(idleTime * 0.06) * 0.002 * thresholdIdle;
    }

    const parallax = reducedMotion || isBuriedChapter
      ? 0
      : activeChapter === 'threshold'
        ? 0.06
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
  monumental = false,
}: Pick<MacroFlowSceneProps, 'progressRef' | 'qualityTier' | 'reducedMotion'> & {
  monumental?: boolean;
}) {
  const skyRef = useRef<THREE.Mesh>(null);
  const skyMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const dustRef = useRef<THREE.Points>(null);
  const monumentalRef = useRef(monumental);
  monumentalRef.current = monumental;
  const skyUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uFlash: { value: 0 },
    uMonumental: { value: monumental ? 1 : 0 },
  }), [monumental]);
  const dustGeometry = useMemo(() => {
    const count = reducedMotion || qualityTier === 'editorial' ? 0 : qualityTier === 'cinematic' ? 420 : 180;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const seed = index * 12.9898;
      const unitA = Math.abs(Math.sin(seed) * 43758.5453) % 1;
      const unitB = Math.abs(Math.sin(seed + 17.17) * 24634.6345) % 1;
      const unitC = Math.abs(Math.sin(seed + 41.73) * 12414.1545) % 1;
      const radius = 48 + unitC * 70;
      const phi = unitA * Math.PI * 2;
      const theta = 0.18 + unitB * 1.15;
      positions[index * 3] = Math.cos(phi) * Math.sin(theta) * radius;
      positions[index * 3 + 1] = Math.cos(theta) * radius * 0.72 + 8;
      positions[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [qualityTier, reducedMotion]);

  useEffect(() => () => dustGeometry.dispose(), [dustGeometry]);

  useFrame(({ camera, clock }) => {
    if (skyRef.current) skyRef.current.position.copy(camera.position);
    if (skyMaterialRef.current) {
      const cycle = clock.elapsedTime % 11.8;
      const flashA = reducedMotion ? 0 : Math.max(0, 1 - Math.abs(cycle - 2.1) / 0.07);
      const flashB = reducedMotion ? 0 : Math.max(0, 1 - Math.abs(cycle - 2.32) / 0.045);
      skyMaterialRef.current.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
      skyMaterialRef.current.uniforms.uFlash.value = Math.max(flashA, flashB * 0.72);
      skyMaterialRef.current.uniforms.uMonumental.value = monumentalRef.current ? 1 : 0;
    }
    if (dustRef.current) {
      dustRef.current.rotation.y = progressRef.current * 0.018 + clock.elapsedTime * 0.006;
      dustRef.current.position.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.16) * 0.16;
    }
  });

  return (
    <>
      {/* The opening owns its own backdrop.
          ThresholdNightSky was authored to sit behind a painted horizon that
          covered the lower half of the frame. That horizon belonged to the old
          castle and went with it, which left the bare dome and its dust showing
          across the whole view as blue haze. The sequence arrives with a sky, a
          terrain, ridges and a forest of its own, so at the threshold the story
          simply stands back. */}
      {monumental ? null : (
      <mesh ref={skyRef} renderOrder={-100}>
        <sphereGeometry args={[145, 36, 20]} />
        <shaderMaterial
          ref={skyMaterialRef}
          uniforms={skyUniforms}
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
            uniform float uTime;
            uniform float uFlash;
            uniform float uMonumental;
            varying vec3 vDirection;
            void main() {
              float horizon = pow(1.0 - abs(vDirection.y), mix(3.2, 6.2, uMonumental));
              float upper = smoothstep(-0.08, 0.82, vDirection.y);
              vec3 ember = mix(vec3(0.18, 0.08, 0.06), vec3(0.08, 0.12, 0.2), uMonumental);
              vec3 low = mix(vec3(0.07, 0.09, 0.09), vec3(0.055, 0.08, 0.12), uMonumental);
              vec3 high = mix(vec3(0.012, 0.02, 0.03), vec3(0.018, 0.04, 0.09), uMonumental);
              vec3 color = mix(low, high, upper);
              color += ember * pow(horizon, 2.1) * mix(0.28, 0.18, uMonumental);
              color += vec3(0.02, 0.03, 0.06) * horizon;

              float longitude = atan(vDirection.z, vDirection.x);
              float cloudField = 0.5
                + 0.22 * sin(longitude * 2.4 + vDirection.y * 10.0 + uTime * 0.016)
                + 0.14 * sin(longitude * 5.8 - vDirection.y * 16.0 - uTime * 0.024);
              float cloudAltitude = smoothstep(-0.04, 0.22, vDirection.y)
                * (1.0 - smoothstep(0.36, 0.86, vDirection.y));
              float cloudVeil = smoothstep(0.48, 0.72, cloudField) * cloudAltitude;
              color = mix(color, vec3(0.05, 0.07, 0.11), cloudVeil * mix(0.48, 0.62, uMonumental));
              color += vec3(0.22, 0.24, 0.28) * uFlash * (0.18 + cloudVeil * 0.35);

              float sky = smoothstep(0.08, 0.62, vDirection.y);
              vec2 starCell = floor(vDirection.xz * mix(110.0, 160.0, uMonumental));
              float starHash = fract(sin(dot(starCell, vec2(12.9898, 78.233))) * 43758.5453);
              float star = step(mix(0.991, 0.968, uMonumental), starHash) * sky * (0.45 + 0.55 * fract(starHash * 17.0));
              color += vec3(0.9, 0.94, 1.0) * star * mix(1.0, 1.35, uMonumental);
              float milky = pow(max(0.0, 1.0 - abs(vDirection.x * 0.55 + vDirection.z * 0.84)), 8.0) * sky;
              color += vec3(0.22, 0.28, 0.42) * milky * uMonumental * 0.32;
              gl_FragColor = vec4(color, 1.0);
            }
          `}
        />
      </mesh>
      )}
      {!monumental && dustGeometry.getAttribute('position').count > 0 ? (
        <points ref={dustRef} geometry={dustGeometry} frustumCulled={false}>
          <pointsMaterial
            color="#d7e6ee"
            size={0.085}
            transparent
            opacity={0.42}
            depthWrite={false}
            sizeAttenuation
          />
        </points>
      ) : null}
    </>
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

function PostEffects({
  qualityTier,
  activeChapter,
}: Pick<MacroFlowSceneProps, 'qualityTier' | 'activeChapter'>) {
  if (activeChapter === 'lens' || activeChapter === 'proof') return null;
  if (qualityTier !== 'cinematic' && activeChapter !== 'threshold') return null;

  // The opening used to be a castle with warm windows on a dark horizon, and the
  // grade was pushed hard to make those windows carry. That scene is gone. What
  // stands here now is a drawing: fine luminous lines and, later, glass. A low
  // bloom threshold does not flatter linework, it dissolves it, and the stars in
  // the sky bloom into blobs long before anything on the citadel does.
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom intensity={0.42} luminanceThreshold={0.82} luminanceSmoothing={0.32} mipmapBlur />
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
  if ((!showThreshold && !showNexus) || (qualityTier === 'editorial')) return null;

  return (
    <Environment resolution={showThreshold ? 64 : 128} frames={1} background={false} environmentIntensity={showThreshold ? 0.68 : 0.82}>
      <group rotation={[0, showThreshold ? -0.28 : 0.18, 0]}>
        <Lightformer
          form="rect"
          color={showThreshold ? '#c5d4e0' : '#8fe0dc'}
          intensity={showThreshold ? 3.4 : 4.2}
          position={showThreshold ? [14, 22, 16] : [-7, 8, -5]}
          rotation={[0, 0.62, 0]}
          scale={[7, 3.5, 1]}
        />
        <Lightformer
          form="rect"
          color={showThreshold ? '#6f8496' : '#d5b263'}
          intensity={showThreshold ? 1.2 : 3.4}
          position={[8, 1.5, 2]}
          rotation={[0, -1.1, 0]}
          scale={[3.5, 6.5, 1]}
        />
        <Lightformer
          form="ring"
          color={showThreshold ? '#d7c09a' : '#74d9d5'}
          intensity={showThreshold ? 0.7 : 2.2}
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
  schoolActProgressRef,
}: Readonly<{
  handoffProgressRef: MutableRefObject<number>;
  schoolActProgressRef: MutableRefObject<number>;
}>) {
  const entryRef = useRef<THREE.PointLight>(null);
  const accessRef = useRef<THREE.PointLight>(null);
  const corridorRef = useRef<THREE.PointLight>(null);
  const cyan = useMemo(() => new THREE.Color('#75dcda'), []);
  const warm = useMemo(() => new THREE.Color('#e0c27a'), []);

  useFrame(() => {
    const intensity = 1 - smooth(range(handoffProgressRef.current, 0.52, 0.96));
    const occupied = smooth(range(schoolActProgressRef.current, 0.34, 0.66));
    if (entryRef.current) entryRef.current.intensity = 30 * intensity;
    if (accessRef.current) {
      accessRef.current.intensity = (22 + occupied * 10) * intensity;
      accessRef.current.color.copy(cyan).lerp(warm, occupied);
    }
    if (corridorRef.current) {
      corridorRef.current.intensity = (18 + occupied * 28) * intensity;
      corridorRef.current.color.copy(cyan).lerp(warm, occupied);
    }
  });

  return (
    <>
      <pointLight ref={entryRef} position={[0, 5, -54]} intensity={30} distance={24} color="#c0a66b" />
      <pointLight ref={accessRef} position={[0, 5, -79]} intensity={24} distance={22} color="#75dcda" />
      <pointLight ref={corridorRef} position={[0, 6, -99]} intensity={38} distance={26} color="#8dded8" />
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

/**
 * Whether the reader has finished walking through the citadel gate.
 *
 * Read off the handoff, not off the chapter, because the two do not line up. The
 * chapter triggers fire when a section's top passes 46% of the viewport, which for
 * the first chapter is around 150px before the camera reaches the wall - so the
 * citadel was being dropped, and the city put up in its place, in the middle of the
 * crossing. The whole opening builds towards going through that gate and the going
 * through was the part happening off screen.
 */
function useThresholdCrossed(
  handoffRef: MutableRefObject<number>,
  activeChapter: JourneyChapter,
) {
  const [crossed, setCrossed] = useState(() => handoffRef.current >= 0.999);
  useFrame(() => {
    const done = handoffRef.current >= 0.999;
    setCrossed((was) => (was === done ? was : done));
  });
  // Past the first chapter the reader is through by definition, so a handoff
  // trigger that never armed can never strand them in an empty citadel.
  return crossed || (activeChapter !== 'threshold' && activeChapter !== 'field');
}

const NEXUS_CHAPTERS = new Set<JourneyChapter>(['field', 'lens', 'proof']);
const SCHOOL_CHAPTERS = new Set<JourneyChapter>(['passage', 'access', 'schoolmate', 'descent']);
const SCHOOL_CAMERA_CHAPTERS = new Set<JourneyChapter>(['passage', 'access', 'schoolmate', 'descent']);
// The breach is not the mausoleum. It was grouped with it because the two used to
// run back to back in one reel, and grouping them meant a one bit interlude was
// drawn over a fogged tomb with the tomb's lighting on it.
const BURIED_CHAPTERS = new Set<JourneyChapter>(['descent', 'lamp', 'build']);
// The opening drives its own camera: the pose is solved every frame from where
// the drawing actually sits on screen, which is what lets the model land on top
// of the plan instead of cutting to it. The authored threshold curve framed the
// castle that used to stand here, so leaving it in place meant two rigs writing
// the camera and the old framing winning - pointing the view at empty world
// while the citadel assembled itself off screen.
const VERTICAL_SLICE_CAMERA_CHAPTERS = new Set<JourneyChapter>(['field', 'lens', 'proof']);
type FirstActPresence = {
  threshold: boolean;
};

function resolveFirstActPresence(
  activeChapter: JourneyChapter,
): FirstActPresence {
  return {
    threshold: activeChapter === 'threshold' || activeChapter === 'field',
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

function ThresholdExposure() {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const previous = gl.toneMappingExposure;
    gl.toneMappingExposure = 1.12;
    return () => {
      gl.toneMappingExposure = previous;
    };
  }, [gl]);

  return null;
}

type WorldProps = MacroFlowSceneProps & {
  authoredCameraCurves: VerticalSliceCameraCurves;
  schoolCameraCurve: SchoolActCameraCurve | null;
  buriedCameraCurve: BuriedActCameraCurve | null;
};

/**
 * The mausoleum brings its own world.
 *
 * Every act used to be drawn by one rig with ternaries in it: one sky dome, one
 * hemisphere, one key light from the same corner, the same fog model, and colours
 * swapped per chapter. That is why the acts read as one place wearing different
 * paint - the structure of the light was identical everywhere, and structure is
 * what the eye reads first.
 *
 * A sealed tomb two hundred metres under a hill has no sun in the corner, no sky
 * to bounce off and no dust in the air it could see. It has one flame, carried,
 * and it has the dark. So this act has no key, no hemisphere and no dome: it is
 * lit by the lamp the craftsman is holding, and everything the reader can see is
 * something that lamp reached.
 */
function BuriedWorld() {
  const lampRef = useRef<THREE.PointLight>(null);

  useFrame(({ camera, clock }) => {
    const lamp = lampRef.current;
    if (!lamp) return;
    // The lamp is carried, so it is where the reader is rather than where a
    // lighting plan put it.
    lamp.position.copy(camera.position);
    // Two frequencies, because one reads as a pulse and oil does not pulse.
    const t = clock.elapsedTime;
    lamp.intensity = 30 * (1 + Math.sin(t * 11.3) * 0.055 + Math.sin(t * 6.7) * 0.032);
  });

  return (
    <>
      <color attach="background" args={['#040303']} />
      {/* Close and heavy: the far wall of a corridor should be a rumour. */}
      <fog attach="fog" args={['#0a0705', 5, 38]} />
      {/* Not ambience so much as the refusal to be perfectly black. */}
      <ambientLight intensity={0.05} color="#6b5946" />
      <pointLight ref={lampRef} distance={28} decay={2} color="#ffb271" />
    </>
  );
}

/**
 * The synthetic field brings its own world.
 *
 * Nexus is not a place the reader visits, it is a capture: a city built so a
 * machine can be shown eleven scenarios, nine and a half thousand frames and a
 * hundred and forty thousand annotations of them. Its own copy says so.
 *
 * Lighting it like the citadel - one warm key from a corner, atmospheric haze,
 * shadows for drama - is lighting a measuring instrument like a landscape. A
 * dataset render is the opposite of dramatic on purpose: even, repeatable, and
 * free of anything that would put mood between the sensor and the thing measured.
 *
 * So there is no key from a corner here. There is a flat overhead rig, a neutral
 * fill, and a fog that reads as sensor range rather than weather: linear, cold,
 * and far enough back that the street stays legible to the end of the block.
 */
function NexusWorld({ compact }: { compact: boolean }) {
  return (
    <>
      <color attach="background" args={['#05080b']} />
      {/* Far and cold. Haze in a dataset is noise, not mood. */}
      <fog attach="fog" args={['#080f13', 44, 150]} />
      {/* Even illumination, because the point is that every frame matches. */}
      <ambientLight intensity={0.42} color="#c4d4dc" />
      {/* Directly above and soft: a light rig over a capture volume, not a sun. */}
      <directionalLight position={[0, 40, 6]} intensity={0.72} color="#dfe9ee" />
      {/* The instrument's own colour, which is the only thing here allowed to be
          expressive: reticles, annotations, the lens looking. */}
      <pointLight
        position={compact ? [0, 4.2, -8] : [-1, 5, -11]}
        intensity={compact ? 26 : 38}
        distance={compact ? 22 : 36}
        color="#72d9d6"
      />
    </>
  );
}

function World({
  activeChapter,
  progressRef,
  heroProgressRef,
  heroHandoffRef,
  opening,
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
  const mountThreshold = firstAct.presence.threshold;
  // The citadel holds the frame until the reader is through the gate, and the city
  // waits until they are. Both hang off the crossing rather than off the chapter.
  const crossed = useThresholdCrossed(heroHandoffRef, activeChapter);
  const showThreshold = activeChapter === 'threshold' || (activeChapter === 'field' && !crossed);
  const showNexus = NEXUS_CHAPTERS.has(activeChapter) && (activeChapter !== 'field' || crossed);
  const showSchool = SCHOOL_CHAPTERS.has(activeChapter);
  const showBuried = BURIED_CHAPTERS.has(activeChapter);
  const showHemisphere = !(showNexus && (compact || showThreshold));
  const keyLightRef = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    const light = keyLightRef.current;
    if (!light) return;
    if (showThreshold) {
      light.intensity = compact ? 1.95 : 1.75;
      light.position.set(14, 26, 22);
      light.color.set('#c8d6de');
      return;
    }
    light.intensity = showBuried ? 0.58 : 1.75;
    light.position.set(10, 18, 18);
    light.color.set(showBuried ? '#bbae98' : '#dae3d9');
  });

  return (
    <>
      {/* An act that brings its own world takes it instead of this one, rather
          than adding another branch to a rig that already has too many. The rest
          still share this until each has been given its own. */}
      {showBuried ? <BuriedWorld /> : null}
      {showNexus && !showThreshold ? <NexusWorld compact={compact} /> : null}

      {showBuried || (showNexus && !showThreshold) ? null : (
      <>
      <color attach="background" args={[showSchool ? '#0c1211' : showThreshold ? '#071018' : '#071011']} />
      <fog attach="fog" args={[showSchool ? '#141916' : showThreshold ? '#15222c' : '#0a1719', showSchool ? 18 : showThreshold ? 110 : 26, showSchool ? 78 : showThreshold ? 280 : 94]} />
      <WorldAtmosphere
        progressRef={progressRef}
        qualityTier={qualityTier}
        reducedMotion={reducedMotion}
        monumental={showThreshold}
      />
      <WorldLookdevRig
        qualityTier={qualityTier}
        showThreshold={showThreshold}
        showNexus={showNexus}
      />
      {showHemisphere ? (
        <hemisphereLight
          intensity={showBuried ? 0.16 : showThreshold ? (compact ? 0.78 : 0.68) : showSchool ? 0.46 : 0.38}
          color={showBuried ? '#b8ac98' : showThreshold ? '#b7c8d6' : showSchool ? '#d2c6a4' : '#b9cfcd'}
          groundColor={showBuried ? '#130f0d' : showThreshold ? '#0b1012' : showSchool ? '#1b1712' : '#191b17'}
        />
      ) : null}
      <directionalLight
        ref={keyLightRef}
        castShadow={qualityTier === 'cinematic' && !showBuried && !showThreshold && !showNexus}
        position={showThreshold ? [14, 26, 22] : [10, 18, 18]}
        intensity={showBuried ? 0.58 : showThreshold ? (compact ? 1.95 : 1.75) : 1.75}
        color={showBuried ? '#bbae98' : showThreshold ? '#c8d6de' : '#dae3d9'}
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
      </>
      )}
      {showSchool ? (
        <SchoolTransitionLights
          handoffProgressRef={descentHandoffProgressRef}
          schoolActProgressRef={schoolActProgressRef}
        />
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
      {mountThreshold ? (
        <group ref={firstAct.thresholdGroupRef} visible>
          {/* The opening: the plan the studio drew standing itself up. It brings
              its own sky, terrain and key, because the pose, the ground clipping
              and the pour were all authored against them. */}
          {showThreshold ? (
            <CitadelSequence
              progressRef={heroProgressRef}
              planFrameRef={opening.planFrameRef}
              reducedMotion={reducedMotion}
              activeSlug={opening.activeSlug}
              focusSlug={opening.focusSlug}
              handoffRef={heroHandoffRef}
              visited={opening.visited}
              onHover={opening.setHoverSlug}
              onSelect={opening.selectNode}
              tagsRef={opening.tagsRef}
            />
          ) : null}
          {showThreshold ? <ThresholdExposure /> : null}
          <ThresholdResponseSequence
            progressRef={progressRef}
            qualityTier={qualityTier}
            reducedMotion={reducedMotion}
          />
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
          reducedMotion={reducedMotion}
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

      <mesh visible={!showBuried && !showThreshold} position={[0, -0.08, -56]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36, 190]} />
        <meshStandardMaterial color="#101516" roughness={0.98} />
      </mesh>
      {!compact ? <PostEffects qualityTier={qualityTier} activeChapter={activeChapter} /> : null}
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
  const verticalSliceCameraChapter = VERTICAL_SLICE_CAMERA_CHAPTERS.has(props.activeChapter)
    ? props.activeChapter as 'threshold' | 'field' | 'lens' | 'proof'
    : null;
  const schoolCameraEnabled = SCHOOL_CAMERA_CHAPTERS.has(props.activeChapter);
  const buriedCameraEnabled = BURIED_CHAPTERS.has(props.activeChapter);
  const authoredCameraCurves = useVerticalSliceCameraCurves(compact, verticalSliceCameraChapter);
  const schoolCamera = useSchoolActCamera(schoolCompact, schoolCameraEnabled);
  const buriedCamera = useBuriedActCamera(compact, buriedCameraEnabled);
  const buriedCameraSettled = buriedCamera.ready || buriedCamera.error !== null;
  const verticalSliceCameraReady = verticalSliceCameraChapter === null
    || Boolean(authoredCameraCurves[verticalSliceCameraChapter]);
  const cameraReady = verticalSliceCameraReady
    && (!schoolCameraEnabled || schoolCamera.ready || schoolCamera.error !== null)
    && (!buriedCameraEnabled || buriedCameraSettled);
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
    const schedule = window.requestIdleCallback
      ? (callback: () => void) => window.requestIdleCallback(callback, { timeout: 1_600 })
      : (callback: () => void) => window.setTimeout(callback, 900);
    const cancel = window.cancelIdleCallback
      ? (handle: number) => window.cancelIdleCallback(handle)
      : (handle: number) => window.clearTimeout(handle);
    let handle: number | null = null;

    if (props.activeChapter === 'threshold') {
      handle = schedule(prepareNexusActAssets);
    } else if (
      props.activeChapter === 'field'
      || props.activeChapter === 'lens'
      || props.activeChapter === 'proof'
    ) {
      handle = schedule(prepareSchoolActAssets);
    }

    return () => {
      if (handle !== null) cancel(handle);
    };
  }, [props.activeChapter]);

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
        camera={{ fov: 48, near: 0.1, far: 480, position: [16, 20, 52] }}
        gl={{ antialias: props.qualityTier !== 'cinematic', alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.12;
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
