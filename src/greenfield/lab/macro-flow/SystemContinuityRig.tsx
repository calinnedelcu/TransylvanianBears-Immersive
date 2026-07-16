import { useFrame } from '@react-three/fiber';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from 'react';
import * as THREE from 'three';
import type { QualityTier } from '../../experience/quality';

type SystemContinuityRigProps = {
  progressRef: MutableRefObject<number>;
  qualityTier: QualityTier;
  reducedMotion: boolean;
};

type SourceLight = {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
};

type ContinuityElement = {
  sourcePosition: THREE.Vector3;
  sourceScale: THREE.Vector3;
  sourceCoreScale: THREE.Vector3;
  controlA: THREE.Vector3;
  controlB: THREE.Vector3;
  railPosition: THREE.Vector3;
  railScale: THREE.Vector3;
  railCoreScale: THREE.Vector3;
};

const ELEMENT_COUNT = 6;
const RELEASE_START = 0.045;
const RAIL_LOCK = 0.13;
const INTEGRATION_START = 0.158;
const INTEGRATION_END = 0.19;

// These positions mirror FirstLightLayer's six authored WORKSHOP_LIGHTS.
const WORKSHOP_SOURCES: readonly SourceLight[] = [
  { position: [-8.25, 4.3, 15.8], scale: [0.9, 1.15, 0.9] },
  { position: [-5.82, 6.65, 15.84], scale: [0.82, 1.08, 0.82] },
  { position: [-2.88, 5.55, 16.08], scale: [0.78, 1, 0.78] },
  { position: [2.94, 6.1, 16.08], scale: [0.78, 1, 0.78] },
  { position: [5.92, 5.05, 15.84], scale: [0.86, 1.08, 0.86] },
  { position: [8.32, 4.72, 15.8], scale: [0.92, 1.18, 0.92] },
] as const;

const RAIL_X = [-4.15, -2.5, -0.84, 0.84, 2.5, 4.15] as const;
const SOURCE_ROTATION = new THREE.Quaternion();
const RAIL_ROTATION = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(Math.PI / 2, 0, 0),
);

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

function cubicBezier(
  target: THREE.Vector3,
  start: THREE.Vector3,
  controlA: THREE.Vector3,
  controlB: THREE.Vector3,
  end: THREE.Vector3,
  progress: number,
) {
  const inverse = 1 - progress;
  const a = inverse * inverse * inverse;
  const b = 3 * inverse * inverse * progress;
  const c = 3 * inverse * progress * progress;
  const d = progress * progress * progress;

  target.set(
    start.x * a + controlA.x * b + controlB.x * c + end.x * d,
    start.y * a + controlA.y * b + controlB.y * c + end.y * d,
    start.z * a + controlA.z * b + controlB.z * c + end.z * d,
  );
}

function reducedMotionOpacity(progress: number) {
  if (progress < 0.088) {
    return 1 - smooth(range(progress, RELEASE_START, 0.068));
  }

  return smooth(range(progress, 0.112, RAIL_LOCK))
    * (1 - smooth(range(progress, INTEGRATION_START, INTEGRATION_END)));
}

export function SystemContinuityRig({
  progressRef,
  qualityTier,
  reducedMotion,
}: SystemContinuityRigProps) {
  const rootRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const cinematic = qualityTier === 'cinematic';

  const elements = useMemo<ContinuityElement[]>(() => WORKSHOP_SOURCES.map((source, index) => {
    const sourcePosition = new THREE.Vector3(...source.position);
    const sourceScale = new THREE.Vector3(...source.scale);
    const railPosition = new THREE.Vector3(RAIL_X[index], 0.075, -27.2);

    return {
      sourcePosition,
      sourceScale,
      sourceCoreScale: sourceScale.clone().multiply(new THREE.Vector3(0.72, 1.05, 0.72)),
      controlA: new THREE.Vector3(
        THREE.MathUtils.lerp(source.position[0], RAIL_X[index], 0.18),
        source.position[1] + 2.25 + (index % 2) * 0.28,
        source.position[2] - 5.8,
      ),
      controlB: new THREE.Vector3(
        THREE.MathUtils.lerp(source.position[0], RAIL_X[index], 0.82),
        2.15 + (5 - index) * 0.07,
        -12.4,
      ),
      railPosition,
      railScale: new THREE.Vector3(0.78, 155, 0.62),
      railCoreScale: new THREE.Vector3(0.88, 195, 0.68),
    };
  }), []);

  const shellGeometry = useMemo(
    () => new THREE.CapsuleGeometry(0.07, 0.2, cinematic ? 8 : 5, cinematic ? 12 : 8),
    [cinematic],
  );
  const coreGeometry = useMemo(
    () => new THREE.CapsuleGeometry(0.025, 0.22, cinematic ? 7 : 4, cinematic ? 10 : 6),
    [cinematic],
  );
  const shellMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#9d7b43',
    emissive: '#21170c',
    emissiveIntensity: cinematic ? 0.32 : 0.2,
    metalness: 0.88,
    roughness: 0.23,
    clearcoat: cinematic ? 0.72 : 0.35,
    clearcoatRoughness: 0.18,
    transparent: true,
    depthWrite: false,
  }), [cinematic]);
  const coreMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#83eee7',
    emissive: '#35cbc6',
    emissiveIntensity: cinematic ? 2.65 : 1.75,
    metalness: 0.34,
    roughness: 0.16,
    clearcoat: cinematic ? 0.9 : 0.48,
    clearcoatRoughness: 0.12,
    transparent: true,
    depthWrite: false,
  }), [cinematic]);

  const scratch = useMemo(() => ({
    shell: new THREE.Object3D(),
    core: new THREE.Object3D(),
    position: new THREE.Vector3(),
    corePosition: new THREE.Vector3(),
    shellScale: new THREE.Vector3(),
    coreScale: new THREE.Vector3(),
    orientation: new THREE.Quaternion(),
  }), []);

  const writeMatrices = useCallback((progress: number) => {
    const shell = shellRef.current;
    const core = coreRef.current;
    const root = rootRef.current;
    if (!shell || !core || !root) return;

    const integration = smooth(range(progress, INTEGRATION_START, INTEGRATION_END));
    const morph = reducedMotion
      ? Number(progress >= 0.088)
      : smooth(range(progress, RELEASE_START, RAIL_LOCK));
    const extension = reducedMotion ? morph : smooth(range(morph, 0.34, 1));
    const opacity = reducedMotion
      ? reducedMotionOpacity(progress)
      : 1 - integration;

    root.visible = opacity > 0.001 && progress < INTEGRATION_END;
    shellMaterial.opacity = opacity * 0.94;
    coreMaterial.opacity = opacity;

    if (!root.visible) return;

    elements.forEach((element, index) => {
      cubicBezier(
        scratch.position,
        element.sourcePosition,
        element.controlA,
        element.controlB,
        element.railPosition,
        morph,
      );
      scratch.position.y -= integration * 0.095;
      scratch.orientation.slerpQuaternions(SOURCE_ROTATION, RAIL_ROTATION, morph);
      scratch.shellScale.lerpVectors(element.sourceScale, element.railScale, extension);
      scratch.coreScale.lerpVectors(element.sourceCoreScale, element.railCoreScale, extension);

      scratch.shell.position.copy(scratch.position);
      scratch.shell.quaternion.copy(scratch.orientation);
      scratch.shell.scale.copy(scratch.shellScale);
      scratch.shell.updateMatrix();
      shell.setMatrixAt(index, scratch.shell.matrix);

      scratch.corePosition.copy(scratch.position);
      scratch.corePosition.z += (1 - morph) * 0.046;
      scratch.corePosition.y += morph * 0.052;
      scratch.core.position.copy(scratch.corePosition);
      scratch.core.quaternion.copy(scratch.orientation);
      scratch.core.scale.copy(scratch.coreScale);
      scratch.core.updateMatrix();
      core.setMatrixAt(index, scratch.core.matrix);
    });

    shell.instanceMatrix.needsUpdate = true;
    core.instanceMatrix.needsUpdate = true;
  }, [coreMaterial, elements, reducedMotion, scratch, shellMaterial]);

  useLayoutEffect(() => {
    shellRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    coreRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    writeMatrices(progressRef.current);
  }, [progressRef, writeMatrices]);

  useFrame(() => {
    writeMatrices(progressRef.current);
  });

  useEffect(() => () => {
    shellGeometry.dispose();
    coreGeometry.dispose();
    shellMaterial.dispose();
    coreMaterial.dispose();
  }, [coreGeometry, coreMaterial, shellGeometry, shellMaterial]);

  return (
    <group ref={rootRef}>
      <instancedMesh
        ref={shellRef}
        args={[shellGeometry, shellMaterial, ELEMENT_COUNT]}
        frustumCulled={false}
        renderOrder={4}
      />
      <instancedMesh
        ref={coreRef}
        args={[coreGeometry, coreMaterial, ELEMENT_COUNT]}
        frustumCulled={false}
        renderOrder={5}
      />
    </group>
  );
}
