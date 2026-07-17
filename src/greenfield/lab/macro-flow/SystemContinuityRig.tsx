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

type ContinuityElement = {
  sourcePosition: THREE.Vector3;
  sourceRotation: THREE.Quaternion;
  sourceShellScale: THREE.Vector3;
  sourceCoreScale: THREE.Vector3;
  controlA: THREE.Vector3;
  controlB: THREE.Vector3;
  railPosition: THREE.Vector3;
  railRotation: THREE.Quaternion;
  railShellScale: THREE.Vector3;
  railCoreScale: THREE.Vector3;
  dockPosition: THREE.Vector3;
  dockRotation: THREE.Quaternion;
  dockShellScale: THREE.Vector3;
  dockCoreScale: THREE.Vector3;
  absorbPosition: THREE.Vector3;
  absorbShellScale: THREE.Vector3;
  absorbCoreScale: THREE.Vector3;
  mineralColor: THREE.Color;
  mineralCoreColor: THREE.Color;
  technicalColor: THREE.Color;
};

const ELEMENT_COUNT = 7;
const SEAL_CENTER = new THREE.Vector3(0, 5.1, 15.76);
const INSTRUMENT_CENTER = new THREE.Vector3(0.3, 5.08, -35.28);
const UNIT_Y = new THREE.Vector3(0, 1, 0);
const RELEASE_START = 0.045;
const RAIL_FORM_START = 0.058;
const RAIL_LOCK = 0.09;
const DOCK_START = 0.09;
const DOCK_END = 0.118;
const ABSORB_START = 0.116;
const ABSORB_END = 0.138;

const MINERAL_COLORS = [
  '#6d6656',
  '#8d7347',
  '#55594f',
  '#9a7e4e',
  '#59605c',
  '#a1844f',
  '#696154',
] as const;

const MINERAL_CORE_COLORS = [
  '#9b7b45',
  '#b28f50',
  '#867044',
  '#c09a55',
  '#8c7748',
  '#bb9550',
  '#967b48',
] as const;

const TECHNICAL_COLORS = [
  '#5bb8b4',
  '#70d0ca',
  '#86e2db',
  '#b4f5ec',
  '#86e2db',
  '#70d0ca',
  '#5bb8b4',
] as const;

const WARM_EMISSIVE = new THREE.Color('#24180d');
const CYAN_EMISSIVE = new THREE.Color('#1b8e8a');
const CORE_WARM_EMISSIVE = new THREE.Color('#5a3818');
const CORE_CYAN_EMISSIVE = new THREE.Color('#35cbc6');

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

function createVoussoirGeometry(qualityTier: QualityTier) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.45, -0.48);
  shape.lineTo(0.45, -0.48);
  shape.lineTo(0.66, 0.48);
  shape.lineTo(-0.66, 0.48);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.3,
    steps: 1,
    bevelEnabled: true,
    bevelSize: 0.035,
    bevelThickness: 0.045,
    bevelSegments: qualityTier === 'cinematic' ? 2 : 1,
  });
  geometry.translate(0, 0, -0.15);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createCoreGeometry() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  geometry.translate(0, 0, 0.19);
  return geometry;
}

function createContinuityElements() {
  return Array.from({ length: ELEMENT_COUNT }, (_, index): ContinuityElement => {
    const archRotation = (index - 3) * Math.PI / ELEMENT_COUNT;
    const archAngle = Math.PI / 2 + archRotation;
    const sourcePosition = SEAL_CENTER.clone().add(new THREE.Vector3(
      Math.cos(archAngle) * 2.55,
      Math.sin(archAngle) * 2.55,
      0,
    ));
    const sourceRotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, archRotation),
    );

    const railOffset = index - 3;
    const railNear = new THREE.Vector3(railOffset * 1.62, 0.12, 4.8);
    const railFar = new THREE.Vector3(0.3 + railOffset * 0.68, 0.1, -34.2);
    const railDirection = railFar.clone().sub(railNear);
    const railLength = railDirection.length();
    const railPosition = railNear.clone().add(railFar).multiplyScalar(0.5);
    const railRotation = new THREE.Quaternion().setFromUnitVectors(
      UNIT_Y,
      railDirection.normalize(),
    );

    const shutterAngle = index * Math.PI * 2 / ELEMENT_COUNT;
    const shutterDirection = new THREE.Vector3(
      Math.cos(shutterAngle),
      Math.sin(shutterAngle),
      0,
    );
    const dockPosition = INSTRUMENT_CENTER.clone().add(new THREE.Vector3(
      shutterDirection.x * 2.18 * 1.14,
      shutterDirection.y * 2.18 * 0.86,
      0,
    ));
    const absorbPosition = INSTRUMENT_CENTER.clone().add(new THREE.Vector3(
      shutterDirection.x * 0.62,
      shutterDirection.y * 0.52,
      -0.035,
    ));
    const dockRotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, shutterAngle - Math.PI / 2),
    );

    return {
      sourcePosition,
      sourceRotation,
      sourceShellScale: new THREE.Vector3(0.96 + (index % 2) * 0.035, 0.9, 1),
      sourceCoreScale: new THREE.Vector3(0.58, 0.075, 0.07),
      controlA: sourcePosition.clone().add(new THREE.Vector3(
        railOffset * 0.12,
        1.15 + (index % 2) * 0.22,
        -5.6,
      )),
      controlB: new THREE.Vector3(
        THREE.MathUtils.lerp(sourcePosition.x, railPosition.x, 0.78),
        2.2 + Math.abs(railOffset) * 0.08,
        -9.8 - Math.abs(railOffset) * 0.24,
      ),
      railPosition,
      railRotation,
      railShellScale: new THREE.Vector3(0.46, Math.min(1.8, railLength / 22), 0.5),
      railCoreScale: new THREE.Vector3(0.18, Math.min(1.35, railLength / 28), 0.055),
      dockPosition,
      dockRotation,
      dockShellScale: new THREE.Vector3(0.34, 2.28, 0.22),
      dockCoreScale: new THREE.Vector3(0.12, 1.92, 0.045),
      absorbPosition,
      absorbShellScale: new THREE.Vector3(0.055, 0.24, 0.045),
      absorbCoreScale: new THREE.Vector3(0.025, 0.18, 0.018),
      mineralColor: new THREE.Color(MINERAL_COLORS[index]),
      mineralCoreColor: new THREE.Color(MINERAL_CORE_COLORS[index]),
      technicalColor: new THREE.Color(TECHNICAL_COLORS[index]),
    };
  });
}

function reducedMotionState(progress: number) {
  const sourceOpacity = smooth(range(progress, 0.014, 0.026))
    * (1 - smooth(range(progress, 0.05, 0.072)));
  const railOpacity = smooth(range(progress, 0.082, 0.096))
    * (1 - smooth(range(progress, ABSORB_START, ABSORB_END)));
  const showRail = progress >= 0.078;

  return {
    opacity: showRail ? railOpacity : sourceOpacity,
    showRail,
  };
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

  const elements = useMemo(createContinuityElements, []);
  const shellGeometry = useMemo(
    () => createVoussoirGeometry(qualityTier),
    [qualityTier],
  );
  const coreGeometry = useMemo(createCoreGeometry, []);
  const shellMaterial = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial({
      name: 'Seven-system mineral continuity',
      color: '#ffffff',
      emissive: WARM_EMISSIVE,
      emissiveIntensity: cinematic ? 0.34 : 0.22,
      metalness: 0.48,
      roughness: 0.68,
      clearcoat: cinematic ? 0.3 : 0.12,
      clearcoatRoughness: 0.42,
      envMapIntensity: cinematic ? 0.72 : 0.48,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      dithering: true,
    });
    material.forceSinglePass = true;
    return material;
  }, [cinematic]);
  const coreMaterial = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial({
      name: 'Seven-system conductive inlay',
      color: '#ffffff',
      emissive: CORE_WARM_EMISSIVE,
      emissiveIntensity: cinematic ? 1.5 : 1.05,
      metalness: 0.72,
      roughness: 0.22,
      clearcoat: cinematic ? 0.78 : 0.4,
      clearcoatRoughness: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    material.forceSinglePass = true;
    return material;
  }, [cinematic]);

  const scratch = useMemo(() => ({
    shell: new THREE.Object3D(),
    core: new THREE.Object3D(),
    position: new THREE.Vector3(),
    shellScale: new THREE.Vector3(),
    coreScale: new THREE.Vector3(),
    orientation: new THREE.Quaternion(),
    shellColor: new THREE.Color(),
    coreColor: new THREE.Color(),
    emissive: new THREE.Color(),
  }), []);

  const writeMatrices = useCallback((rawProgress: number) => {
    const shell = shellRef.current;
    const core = coreRef.current;
    const root = rootRef.current;
    if (!shell || !core || !root) return;

    const progress = clamp01(rawProgress);
    const reducedState = reducedMotion ? reducedMotionState(progress) : null;
    const opacity = reducedState
      ? reducedState.opacity
      : smooth(range(progress, 0.014, 0.03))
        * (1 - smooth(range(progress, ABSORB_START, ABSORB_END)));
    const technicalMigration = reducedState
      ? Number(reducedState.showRail)
      : smooth(range(progress, 0.072, 0.148));

    root.visible = opacity > 0.001 && progress < ABSORB_END;
    shellMaterial.opacity = opacity * 0.86;
    coreMaterial.opacity = opacity * 0.96;
    shellMaterial.emissive.copy(
      scratch.emissive.lerpColors(WARM_EMISSIVE, CYAN_EMISSIVE, technicalMigration),
    );
    coreMaterial.emissive.copy(
      scratch.emissive.lerpColors(CORE_WARM_EMISSIVE, CORE_CYAN_EMISSIVE, technicalMigration),
    );
    shellMaterial.emissiveIntensity = THREE.MathUtils.lerp(
      cinematic ? 0.34 : 0.22,
      cinematic ? 0.82 : 0.58,
      technicalMigration,
    );
    shellMaterial.metalness = THREE.MathUtils.lerp(0.48, 0.78, technicalMigration);
    shellMaterial.roughness = THREE.MathUtils.lerp(0.68, 0.28, technicalMigration);
    coreMaterial.emissiveIntensity = THREE.MathUtils.lerp(
      cinematic ? 1.5 : 1.05,
      cinematic ? 2.7 : 1.9,
      technicalMigration,
    );

    if (!root.visible) return;

    elements.forEach((element, index) => {
      if (reducedState) {
        if (reducedState.showRail) {
          scratch.position.copy(element.railPosition);
          scratch.orientation.copy(element.railRotation);
          scratch.shellScale.copy(element.railShellScale);
          scratch.coreScale.copy(element.railCoreScale);
        } else {
          scratch.position.copy(element.sourcePosition);
          scratch.orientation.copy(element.sourceRotation);
          scratch.shellScale.copy(element.sourceShellScale);
          scratch.coreScale.copy(element.sourceCoreScale);
        }
      } else {
        const stagger = index * 0.0012;
        const release = smooth(range(progress, RELEASE_START + stagger, RAIL_LOCK + stagger));
        const railFormation = smooth(range(
          progress,
          RAIL_FORM_START + stagger,
          RAIL_LOCK + stagger,
        ));
        const docking = smooth(range(progress, DOCK_START + stagger, DOCK_END + stagger));
        const absorption = smooth(range(progress, ABSORB_START, ABSORB_END));

        cubicBezier(
          scratch.position,
          element.sourcePosition,
          element.controlA,
          element.controlB,
          element.railPosition,
          release,
        );
        scratch.position.lerp(element.dockPosition, docking);
        scratch.position.lerp(element.absorbPosition, absorption);

        scratch.orientation.slerpQuaternions(
          element.sourceRotation,
          element.railRotation,
          railFormation,
        );
        scratch.orientation.slerp(element.dockRotation, docking);

        scratch.shellScale.lerpVectors(
          element.sourceShellScale,
          element.railShellScale,
          railFormation,
        );
        scratch.shellScale.lerp(element.dockShellScale, docking);
        scratch.shellScale.lerp(element.absorbShellScale, absorption);

        scratch.coreScale.lerpVectors(
          element.sourceCoreScale,
          element.railCoreScale,
          railFormation,
        );
        scratch.coreScale.lerp(element.dockCoreScale, docking);
        scratch.coreScale.lerp(element.absorbCoreScale, absorption);
      }

      scratch.shell.position.copy(scratch.position);
      scratch.shell.quaternion.copy(scratch.orientation);
      scratch.shell.scale.copy(scratch.shellScale);
      scratch.shell.updateMatrix();
      shell.setMatrixAt(index, scratch.shell.matrix);

      scratch.core.position.copy(scratch.position);
      scratch.core.quaternion.copy(scratch.orientation);
      scratch.core.scale.copy(scratch.coreScale);
      scratch.core.updateMatrix();
      core.setMatrixAt(index, scratch.core.matrix);

      shell.setColorAt(
        index,
        scratch.shellColor.lerpColors(
          element.mineralColor,
          element.technicalColor,
          technicalMigration,
        ),
      );
      core.setColorAt(
        index,
        scratch.coreColor.lerpColors(
          element.mineralCoreColor,
          element.technicalColor,
          technicalMigration,
        ),
      );
    });

    shell.instanceMatrix.needsUpdate = true;
    core.instanceMatrix.needsUpdate = true;
    if (shell.instanceColor) shell.instanceColor.needsUpdate = true;
    if (core.instanceColor) core.instanceColor.needsUpdate = true;
  }, [
    cinematic,
    coreMaterial,
    elements,
    reducedMotion,
    scratch,
    shellMaterial,
  ]);

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
    <group ref={rootRef} visible={false}>
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
