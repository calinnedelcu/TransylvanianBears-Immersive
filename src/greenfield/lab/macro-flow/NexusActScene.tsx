import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import type { EvidenceCoreId } from '../../experience/evidenceCores';
import type { QualityTier } from '../../experience/quality';
import type { LensPointerState, MacroLensMode, NexusFlightInput } from './macroFlowTypes';

type NexusActSceneProps = {
  progressRef: MutableRefObject<number>;
  lensMode: MacroLensMode;
  lensPointerRef: MutableRefObject<LensPointerState>;
  nexusFlightInputRef: MutableRefObject<NexusFlightInput>;
  collectedEvidenceCores: EvidenceCoreId[];
  onCollectEvidenceCore: (core: EvidenceCoreId) => void;
  qualityTier: QualityTier;
  compactLens: boolean;
};

type FieldMass = {
  position: [number, number, number];
  scale: [number, number, number];
  row: number;
};

const LENS_ACCENTS: Record<MacroLensMode, string> = {
  raw: '#72d9d6',
  segmentation: '#e1bd67',
  detection: '#df6553',
};

const FIELD_MASSES: FieldMass[] = Array.from({ length: 24 }, (_, index) => {
  const side = (index % 2 === 0 ? -1 : 1) as -1 | 1;
  const row = Math.floor(index / 2);
  const width = 3.6 + ((index * 7) % 4) * 0.72;
  const height = 0.82 + ((index * 11) % 5) * 0.34;
  const depth = 3.2 + ((index * 5) % 4) * 0.68;

  return {
    position: [side * (8.4 + ((index * 3) % 4) * 1.28), 0, 4 - row * 4.55],
    scale: [width, height, depth],
    row,
  };
});

const DRONE_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(1.8, 8.5, 5),
  new THREE.Vector3(-3.8, 8.1, -5),
  new THREE.Vector3(3.9, 8.4, -15),
  new THREE.Vector3(-2.8, 7.25, -27),
  new THREE.Vector3(-2.1, 7.45, -40),
]);

const NEXUS_CORE_SPECS: Record<MacroLensMode, {
  id: EvidenceCoreId;
  color: string;
  offset: [number, number];
}> = {
  raw: { id: 'source', color: '#72d9d6', offset: [-1.85, 0.18] },
  segmentation: { id: 'structure', color: '#e1bd67', offset: [1.95, -0.22] },
  detection: { id: 'decision', color: '#df6553', offset: [0.08, 1.38] },
};

const NEXUS_CORE_IDS: EvidenceCoreId[] = ['source', 'structure', 'decision'];

const NEXUS_FIELD_TEXTURE = '/assets/projects/nexus-ue5-aerial.webp';
const NEXUS_EVIDENCE_TEXTURES: Record<MacroLensMode, string> = {
  raw: NEXUS_FIELD_TEXTURE,
  segmentation: '/assets/projects/nexus-segmentation.webp',
  detection: '/assets/projects/nexus-detection.webp',
};
const NEXUS_EVIDENCE_LABELS: Record<MacroLensMode, readonly [string, string]> = {
  raw: ['SYNTHETIC FIELD / UE5', 'SOURCE SURFACE / PROJECT NEXUS'],
  segmentation: ['SEGMENTATION EXPORT / UE5', 'STRUCTURE SURFACE / PROJECT NEXUS'],
  detection: ['DETECTION EXPORT / AIRSIM', 'DECISION SURFACE / PROJECT NEXUS'],
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

function motionRange(value: number, start: number, end: number, reducedMotion: boolean) {
  return reducedMotion ? Number(value >= end) : smooth(range(value, start, end));
}

function seeded(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function setInstanceTransform(
  mesh: THREE.InstancedMesh | null,
  index: number,
  scratch: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0,
) {
  if (!mesh) return;
  scratch.position.set(x, y, z);
  scratch.rotation.set(rotationX, rotationY, rotationZ);
  scratch.scale.set(scaleX, scaleY, scaleZ);
  scratch.updateMatrix();
  mesh.setMatrixAt(index, scratch.matrix);
}

function markInstanceMatrixDirty(mesh: THREE.InstancedMesh | null) {
  if (mesh) mesh.instanceMatrix.needsUpdate = true;
}

function createSemanticMaterial(
  raw: string,
  segment: string,
  semanticClass: 0 | 1 | 2 | 3 | 4 | 5 = 0,
  detection = '#df6553',
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uRaw: { value: new THREE.Color(raw) },
      uSegment: { value: new THREE.Color(segment) },
      uDetection: { value: new THREE.Color(detection) },
      uLens: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2(1440, 900) },
      uMode: { value: 0 },
      uLensMix: { value: 0 },
      uRadius: { value: 0.18 },
      uSemanticClass: { value: semanticClass },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vWorldPosition;
      varying vec3 vInstanceTint;
      varying float vDepth;

      void main() {
        vec4 localPosition = vec4(position, 1.0);
        vec3 objectNormal = normal;
        vInstanceTint = vec3(1.0);
        #ifdef USE_INSTANCING
          localPosition = instanceMatrix * localPosition;
          objectNormal = mat3(instanceMatrix) * objectNormal;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vInstanceTint = instanceColor;
        #endif
        vec4 worldPosition = modelMatrix * localPosition;
        vec4 viewPosition = viewMatrix * worldPosition;
        vWorldPosition = worldPosition.xyz;
        vNormalView = normalize(normalMatrix * objectNormal);
        vDepth = -viewPosition.z;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uRaw;
      uniform vec3 uSegment;
      uniform vec3 uDetection;
      uniform vec2 uLens;
      uniform vec2 uResolution;
      uniform float uMode;
      uniform float uLensMix;
      uniform float uRadius;
      uniform float uSemanticClass;
      varying vec3 vNormalView;
      varying vec3 vWorldPosition;
      varying vec3 vInstanceTint;
      varying float vDepth;

      float hash21(vec2 value) {
        return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453);
      }

      float jointLine(float value, float density, float width) {
        float cell = abs(fract(value * density) - 0.5);
        return 1.0 - smoothstep(width, width + 0.035, cell);
      }

      void main() {
        vec2 screenUv = gl_FragCoord.xy / uResolution;
        vec2 lensDelta = screenUv - uLens;
        lensDelta.x *= uResolution.x / max(1.0, uResolution.y);
        float lensDistance = length(lensDelta);
        float lensMask = (1.0 - smoothstep(uRadius, uRadius + 0.018, lensDistance)) * uLensMix;
        float lensEdge = (1.0 - smoothstep(0.012, 0.026, abs(lensDistance - uRadius))) * uLensMix;

        vec3 normalView = normalize(vNormalView);
        vec3 lightDirection = normalize(vec3(-0.46, 0.82, 0.34));
        float diffuse = 0.4 + max(0.0, dot(normalView, lightDirection)) * 0.6;
        float materialGrain = 0.94 + hash21(floor(vWorldPosition.xz * 2.6)) * 0.09;
        float surfacePattern = 1.0;

        if (uSemanticClass > 0.5 && uSemanticClass < 1.5) {
          float course = max(
            jointLine(vWorldPosition.x, 0.9, 0.055),
            jointLine(vWorldPosition.z + floor(vWorldPosition.x * 0.9) * 0.34, 1.35, 0.05)
          );
          surfacePattern = mix(1.0, 0.52, course);
        } else if (uSemanticClass > 1.5 && uSemanticClass < 2.5) {
          float slab = max(
            jointLine(vWorldPosition.x, 0.45, 0.04),
            jointLine(vWorldPosition.z, 0.5, 0.045)
          );
          surfacePattern = mix(1.0, 0.72, slab);
        } else if (uSemanticClass < 0.5) {
          float plasterWear = 0.96 + sin(vWorldPosition.y * 2.8 + vWorldPosition.z * 0.38) * 0.035;
          surfacePattern = plasterWear;
        }

        vec3 rawColor = uRaw * vInstanceTint * diffuse * materialGrain * surfacePattern;
        vec3 inspected = rawColor;
        float silhouette = pow(1.0 - abs(normalView.z), 3.2);
        float structuralBand = uSemanticClass < 0.5
          ? jointLine(vWorldPosition.y, 0.42, 0.042) * 0.42
          : 0.0;

        if (uMode > 0.5 && uMode < 1.5) {
          inspected = uSegment * mix(vec3(1.0), vInstanceTint, 0.2)
            * (0.68 + diffuse * 0.38) * mix(0.92, 1.0, surfacePattern);
          inspected += vec3(0.08) * max(silhouette * 0.28, structuralBand * 0.32);
        } else if (uMode >= 1.5) {
          float semanticEdge = clamp(silhouette * 1.35 + structuralBand, 0.0, 1.0);
          inspected = mix(rawColor * 0.47, uDetection, semanticEdge * 0.82);
        } else {
          inspected = rawColor * 1.12;
        }

        vec3 color = mix(rawColor, inspected, lensMask);
        vec3 modeAccent = uMode > 1.5 ? uDetection : (uMode > 0.5 ? uSegment : vec3(0.447, 0.851, 0.839));
        color += modeAccent * lensEdge * 0.42;
        float fogAmount = smoothstep(28.0, 74.0, vDepth);
        color = mix(color, vec3(0.025, 0.055, 0.058), fogAmount * 0.72);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

function updateSemanticMaterials(
  materials: THREE.ShaderMaterial[],
  lensMode: MacroLensMode,
  lensPointerRef: MutableRefObject<LensPointerState> | undefined,
  width: number,
  height: number,
  pixelRatio: number,
  lensMix: number,
) {
  const mode = lensMode === 'segmentation' ? 1 : lensMode === 'detection' ? 2 : 0;
  const lensPointer = lensPointerRef?.current;
  const lensX = lensPointer?.x ?? 0.76;
  const lensY = lensPointer?.y ?? 0.54;
  materials.forEach((material) => {
    material.uniforms.uLens.value.set(lensX, lensY);
    material.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
    material.uniforms.uMode.value = mode;
    material.uniforms.uLensMix.value = lensMix;
    material.uniforms.uRadius.value = width <= 820 ? 0.28 : 0.2;
  });
}

function createPointCloudGeometry(pointMultiplier: number) {
  const pointsPerMass = 8 * pointMultiplier;
  const positions = new Float32Array(FIELD_MASSES.length * pointsPerMass * 3);
  let cursor = 0;

  FIELD_MASSES.forEach((mass, massIndex) => {
    for (let point = 0; point < pointsPerMass; point += 1) {
      const seed = massIndex * 101 + point * 7;
      positions[cursor] = mass.position[0] + (seeded(seed) - 0.5) * mass.scale[0];
      positions[cursor + 1] = 0.06 + seeded(seed + 1) * mass.scale[1];
      positions[cursor + 2] = mass.position[2] + (seeded(seed + 2) - 0.5) * mass.scale[2];
      cursor += 3;
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function createMountainShape(seedOffset: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-18, 0);
  for (let index = 0; index <= 12; index += 1) {
    const x = -18 + index * 3;
    const ridge = index % 2 === 0 ? 2.2 : 5.2;
    const height = ridge + seeded(seedOffset + index) * 2.8;
    shape.lineTo(x, height);
  }
  shape.lineTo(18, 0);
  shape.closePath();
  return shape;
}

const DATA_STREAMS = [
  new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.45, 0.08, 3.5),
    new THREE.Vector3(-2.45, 0.08, -10),
    new THREE.Vector3(-2.45, 0.08, -24),
    new THREE.Vector3(-2.45, 0.08, -36.5),
  ]),
  new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.085, 3.5),
    new THREE.Vector3(0, 0.085, -10),
    new THREE.Vector3(0, 0.085, -24),
    new THREE.Vector3(0, 0.085, -36.5),
  ]),
  new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.45, 0.08, 3.5),
    new THREE.Vector3(2.45, 0.08, -10),
    new THREE.Vector3(2.45, 0.08, -24),
    new THREE.Vector3(2.45, 0.08, -36.5),
  ]),
];

const DATA_STREAM_SEGMENTS = 56;

function createDataStreamGeometry() {
  const verticesPerStream = DATA_STREAM_SEGMENTS * 2;
  const positions = new Float32Array(DATA_STREAMS.length * verticesPerStream * 3);
  const colors = new Float32Array(positions.length);
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  let cursor = 0;

  DATA_STREAMS.forEach((curve) => {
    for (let segment = 0; segment < DATA_STREAM_SEGMENTS; segment += 1) {
      curve.getPoint(segment / DATA_STREAM_SEGMENTS, from);
      curve.getPoint((segment + 1) / DATA_STREAM_SEGMENTS, to);
      positions.set([from.x, from.y, from.z, to.x, to.y, to.z], cursor);
      cursor += 6;
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function updateDataStreamColors(geometry: THREE.BufferGeometry, colors: string[]) {
  const colorAttribute = geometry.getAttribute('color') as THREE.BufferAttribute;
  const color = new THREE.Color();
  let vertex = 0;

  colors.forEach((value) => {
    color.set(value);
    for (let index = 0; index < DATA_STREAM_SEGMENTS * 2; index += 1) {
      colorAttribute.setXYZ(vertex, color.r, color.g, color.b);
      vertex += 1;
    }
  });
  colorAttribute.needsUpdate = true;
}

function CarpathianDataHorizon({
  progressRef,
  reducedMotion,
}: Pick<NexusActSceneProps, 'progressRef'> & { reducedMotion: boolean }) {
  const rootRef = useRef<THREE.Group>(null);
  const nearShape = useMemo(() => createMountainShape(31), []);
  const farShape = useMemo(() => createMountainShape(91), []);

  useFrame(() => {
    const root = rootRef.current;
    if (!root) return;
    const presence = motionRange(progressRef.current, 0.058, 0.088, reducedMotion)
      * (1 - motionRange(progressRef.current, 0.142, 0.16, reducedMotion));
    root.visible = presence > 0.005;
    if (!root.visible) return;
    root.position.y = -(1 - presence) * 0.9;
  });

  return (
    <group ref={rootRef} visible={false}>
      <mesh position={[-5, -0.1, -51]}>
        <shapeGeometry args={[farShape]} />
        <meshBasicMaterial color="#0d191a" fog />
      </mesh>
      <mesh position={[5, -0.18, -48.5]} scale={[1.15, 0.72, 1]}>
        <shapeGeometry args={[nearShape]} />
        <meshBasicMaterial color="#142423" fog />
      </mesh>
    </group>
  );
}

function DataStreams({
  progressRef,
  lensMode,
  reducedMotion,
}: Pick<NexusActSceneProps, 'progressRef' | 'lensMode'> & { reducedMotion: boolean }) {
  const rootRef = useRef<THREE.Group>(null);
  const packetRef = useRef<THREE.InstancedMesh>(null);
  const packetPosition = useMemo(() => new THREE.Vector3(), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const streamGeometry = useMemo(createDataStreamGeometry, []);
  const packetGeometry = useMemo(() => new THREE.OctahedronGeometry(0.13, 0), []);
  const streamMaterial = useMemo(() => new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.16,
    toneMapped: false,
  }), []);
  const packetMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    emissive: '#567b78',
    emissiveIntensity: 1.8,
    roughness: 0.24,
  }), []);

  useEffect(() => () => {
    streamGeometry.dispose();
    packetGeometry.dispose();
    streamMaterial.dispose();
    packetMaterial.dispose();
  }, [packetGeometry, packetMaterial, streamGeometry, streamMaterial]);

  useEffect(() => {
    const colors = lensMode === 'segmentation'
      ? ['#bd6555', '#d8b75e', '#559f9a']
      : lensMode === 'detection'
        ? ['#496967', '#df6553', '#496967']
        : ['#4f6866', '#c4a55f', '#4f6866'];
    updateDataStreamColors(streamGeometry, colors);
    colors.forEach((value, index) => packetRef.current?.setColorAt(index, new THREE.Color(value)));
    if (packetRef.current?.instanceColor) packetRef.current.instanceColor.needsUpdate = true;
  }, [lensMode, streamGeometry]);

  useLayoutEffect(() => {
    packetRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  useFrame(() => {
    const reveal = motionRange(progressRef.current, 0.075, 0.135, reducedMotion);
    const departure = motionRange(progressRef.current, 0.14, 0.158, reducedMotion);
    const root = rootRef.current;
    if (!root) return;
    const presence = reveal * (1 - departure);
    root.visible = presence > 0.005;
    if (!root.visible) return;
    root.scale.setScalar(presence);
    DATA_STREAMS.forEach((curve, index) => {
      const travel = reducedMotion
        ? (0.28 + index * 0.27) % 1
        : (progressRef.current * (2.2 + index * 0.16) + index * 0.28) % 1;
      curve.getPoint(travel, packetPosition);
      setInstanceTransform(
        packetRef.current,
        index,
        scratch,
        packetPosition.x,
        packetPosition.y,
        packetPosition.z,
        index === 1 ? 1.25 : 1,
        index === 1 ? 1.25 : 1,
        index === 1 ? 1.25 : 1,
        progressRef.current * 8 + index,
        progressRef.current * 11 + index,
      );
    });
    markInstanceMatrixDirty(packetRef.current);
  });

  return (
    <group ref={rootRef} scale={0.001}>
      <lineSegments geometry={streamGeometry} material={streamMaterial} />
      <instancedMesh
        ref={packetRef}
        args={[packetGeometry, packetMaterial, DATA_STREAMS.length]}
        frustumCulled={false}
      />
    </group>
  );
}

function DataKeep({
  progressRef,
  lensMode,
  collectedEvidenceCores,
  reducedMotion,
}: Pick<NexusActSceneProps, 'progressRef' | 'lensMode' | 'collectedEvidenceCores'> & { reducedMotion: boolean }) {
  const rootRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const detailRef = useRef<THREE.InstancedMesh>(null);
  const tickRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const geometries = useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1),
    ring: new THREE.TorusGeometry(0.76, 0.025, 8, 36),
    core: new THREE.OctahedronGeometry(0.16, 0),
  }), []);
  const materials = useMemo(() => ({
    detail: new THREE.MeshStandardMaterial({ color: '#344541', roughness: 0.74, metalness: 0.18 }),
    ring: new THREE.MeshBasicMaterial({ color: '#7ba09c', transparent: true, opacity: 0.8, toneMapped: false }),
    core: new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true, toneMapped: false }),
  }), []);
  const evidenceCount = collectedEvidenceCores.length;

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  useLayoutEffect(() => {
    const labStructure: Array<[
      number,
      number,
      number,
      number,
      number,
      number,
    ]> = [
      [-4.4, 4.2, 0.18, 0.48, 8.4, 0.62],
      [4.4, 4.2, 0.18, 0.48, 8.4, 0.62],
      [0, 8.3, 0.18, 9.2, 0.38, 0.62],
      [0, 1.02, 0.18, 7.1, 0.25, 0.5],
      [-4.4, 0.2, 0.18, 1.2, 0.4, 1.7],
      [4.4, 0.2, 0.18, 1.2, 0.4, 1.7],
      [-3.2, 1.58, 0.38, 1.25, 1.45, 1.18],
      [3.2, 1.58, 0.38, 1.25, 1.45, 1.18],
      [-1.92, 7.62, 0.54, 0.12, 1.0, 0.88],
      [1.92, 7.62, 0.54, 0.12, 1.0, 0.88],
      [0, 6.15, 0.18, 3.65, 3.35, 0.18],
      [0, 0.08, 0.18, 10.2, 0.16, 3.2],
    ];
    labStructure.forEach(([x, y, z, scaleX, scaleY, scaleZ], index) => {
      setInstanceTransform(detailRef.current, index, scratch, x, y, z, scaleX, scaleY, scaleZ);
    });

    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4;
      setInstanceTransform(
        tickRef.current,
        index,
        scratch,
        Math.cos(angle) * 1.34,
        6.15 + Math.sin(angle) * 1.34,
        0.92,
        0.24,
        0.045,
        0.035,
        0,
        0,
        angle,
      );
    }
    [detailRef.current, tickRef.current].forEach(markInstanceMatrixDirty);
    coreRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, [scratch]);

  useFrame((_, delta) => {
    const reveal = motionRange(progressRef.current, 0.085, 0.138, reducedMotion);
    const departure = motionRange(progressRef.current, 0.142, 0.162, reducedMotion);
    const root = rootRef.current;
    if (!root) return;
    const presence = reveal * (1 - departure);
    root.visible = presence > 0.005;
    if (!root.visible) return;
    root.position.y = THREE.MathUtils.damp(root.position.y, -0.2 + presence * 0.2, 14, delta);
    root.scale.y = THREE.MathUtils.damp(root.scale.y, presence, 14, delta);
    if (ringRef.current) {
      ringRef.current.rotation.z = progressRef.current * (5.2 + evidenceCount * 0.4);
      ringRef.current.scale.setScalar(1 + Math.sin(progressRef.current * 18) * 0.018 * evidenceCount);
    }
    NEXUS_CORE_IDS.forEach((_, index) => {
      const collected = collectedEvidenceCores.includes(NEXUS_CORE_IDS[index]);
      const angle = progressRef.current * (4.2 + index * 0.2) + index * Math.PI * 2 / 3;
      const scale = collected ? 1 : 0.42;
      setInstanceTransform(
        coreRef.current,
        index,
        scratch,
        Math.cos(angle) * 1.84,
        6.15 + Math.sin(angle) * 1.84,
        1.02,
        scale,
        scale,
        scale,
        angle * 0.72,
        angle,
      );
      coreRef.current?.setColorAt(
        index,
        scratchColor.set(collected ? ['#72d9d6', '#e1bd67', '#df6553'][index] : '#42504f'),
      );
    });
    markInstanceMatrixDirty(coreRef.current);
    if (coreRef.current?.instanceColor) coreRef.current.instanceColor.needsUpdate = true;

    materials.ring.color.set(LENS_ACCENTS[lensMode]);
  });

  return (
    <group ref={rootRef} position={[0, -0.2, -37.5]} scale={[1.04, 0.001, 1.04]}>
      <instancedMesh ref={detailRef} args={[geometries.box, materials.detail, 12]} frustumCulled={false} />
      <mesh
        ref={ringRef}
        geometry={geometries.ring}
        material={materials.ring}
        position={[0, 6.15, 0.9]}
        scale={1.82}
      />
      <instancedMesh ref={tickRef} args={[geometries.box, materials.ring, 8]} frustumCulled={false} />
      <instancedMesh ref={coreRef} args={[geometries.core, materials.core, 3]} frustumCulled={false} />
    </group>
  );
}

function NexusField({
  progressRef,
  lensMode,
  lensPointerRef,
}: Pick<NexusActSceneProps, 'progressRef' | 'lensMode' | 'lensPointerRef'>) {
  const fieldRef = useRef<THREE.InstancedMesh>(null);
  const bandRef = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const bandGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const material = useMemo(
    () => createSemanticMaterial('#ffffff', '#4f9692', 2, '#df6553'),
    [],
  );
  const bandMaterial = useMemo(
    () => createSemanticMaterial('#d2d5c8', '#e1bd67', 3, '#df6553'),
    [],
  );

  useEffect(() => () => {
    geometry.dispose();
    bandGeometry.dispose();
    material.dispose();
    bandMaterial.dispose();
  }, [bandGeometry, bandMaterial, geometry, material]);

  useLayoutEffect(() => {
    fieldRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    FIELD_MASSES.forEach((mass, index) => {
      setInstanceTransform(
        fieldRef.current,
        index,
        scratch,
        mass.position[0],
        0,
        mass.position[2],
        mass.scale[0],
        0.001,
        mass.scale[2],
      );
      fieldRef.current?.setColorAt(index, scratchColor.set('#24322f'));
    });

    let instance = FIELD_MASSES.length;
    setInstanceTransform(fieldRef.current, instance, scratch, 0, -0.045, -20, 7.4, 0.08, 58);
    fieldRef.current?.setColorAt(instance, scratchColor.set('#69746d'));
    instance += 1;
    [-6.5, 6.5].forEach((x) => {
      setInstanceTransform(fieldRef.current, instance, scratch, x, -0.02, -20, 4.8, 0.08, 58);
      fieldRef.current?.setColorAt(instance, scratchColor.set('#46524c'));
      instance += 1;
    });
    [-4.02, 4.02].forEach((x) => {
      setInstanceTransform(fieldRef.current, instance, scratch, x, 0.025, -20, 0.1, 0.12, 58);
      fieldRef.current?.setColorAt(instance, scratchColor.set('#89918a'));
      instance += 1;
    });
    [-2.45, 0, 2.45].forEach((x, index) => {
      setInstanceTransform(
        bandRef.current,
        index,
        scratch,
        x,
        0.022,
        -20,
        x === 0 ? 0.028 : 0.045,
        56,
        1,
        -Math.PI / 2,
      );
      bandRef.current?.setColorAt(index, scratchColor.set(x === 0 ? '#d8b75e' : '#5eaaa5'));
    });
    for (let index = 0; index < 10; index += 1) {
      const bandIndex = index + 3;
      setInstanceTransform(
        bandRef.current,
        bandIndex,
        scratch,
        0,
        0.024,
        3 - index * 5.4,
        7.05,
        index % 3 === 0 ? 0.08 : 0.035,
        1,
        -Math.PI / 2,
      );
      bandRef.current?.setColorAt(
        bandIndex,
        scratchColor.set(index % 3 === 0 ? '#d8b75e' : index % 3 === 1 ? '#5eaaa5' : '#78817b'),
      );
    }
    for (let index = 0; index < 6; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const z = -4 - Math.floor(index / 2) * 15.5;
      setInstanceTransform(fieldRef.current, instance, scratch, side * 4.72, 1.18, z, 0.07, 2.36, 0.07);
      fieldRef.current?.setColorAt(instance, scratchColor.set('#263835'));
      instance += 1;
      setInstanceTransform(fieldRef.current, instance, scratch, side * 4.72, 2.4, z, 0.4, 0.12, 0.4);
      fieldRef.current?.setColorAt(instance, scratchColor.set(LENS_ACCENTS[lensMode]));
      instance += 1;
    }
    markInstanceMatrixDirty(fieldRef.current);
    markInstanceMatrixDirty(bandRef.current);
    if (fieldRef.current?.instanceColor) fieldRef.current.instanceColor.needsUpdate = true;
    if (bandRef.current?.instanceColor) bandRef.current.instanceColor.needsUpdate = true;
  }, [lensMode, scratch, scratchColor]);

  useFrame(({ gl, size }) => {
    const lensPresence = smooth(range(progressRef.current, 0.13, 0.16))
      * (1 - smooth(range(progressRef.current, 0.285, 0.318)));
    updateSemanticMaterials(
      [material, bandMaterial],
      lensMode,
      lensPointerRef,
      size.width,
      size.height,
      gl.getPixelRatio(),
      lensPresence,
    );

    FIELD_MASSES.forEach((mass, index) => {
      const reveal = Math.max(
        0.001,
        smooth(range(progressRef.current, 0.078 + mass.row * 0.002, 0.13 + mass.row * 0.002)),
      );
      setInstanceTransform(
        fieldRef.current,
        index,
        scratch,
        mass.position[0],
        reveal * mass.scale[1] * 0.5 - (1 - reveal) * 0.2,
        mass.position[2],
        mass.scale[0],
        reveal * mass.scale[1],
        mass.scale[2],
      );
    });
    markInstanceMatrixDirty(fieldRef.current);
  });

  return (
    <>
      <instancedMesh
        ref={fieldRef}
        args={[geometry, material, FIELD_MASSES.length + 17]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={bandRef}
        args={[bandGeometry, bandMaterial, 13]}
        frustumCulled={false}
      />
    </>
  );
}

function NexusCity({
  progressRef,
  lensMode,
  lensPointerRef,
  qualityTier,
  collectedEvidenceCores,
  reducedMotion,
  compactLens,
}: NexusActSceneProps & { reducedMotion: boolean }) {
  const rootRef = useRef<THREE.Group>(null);
  const pointRef = useRef<THREE.Points>(null);
  const pointMaterialRef = useRef<THREE.PointsMaterial>(null);
  const pointGeometry = useMemo(
    () => createPointCloudGeometry(qualityTier === 'cinematic' ? 2 : 1),
    [qualityTier],
  );

  useEffect(() => () => {
    pointGeometry.dispose();
  }, [pointGeometry]);

  useFrame((_, delta) => {
    const progress = progressRef.current;
    const fieldReveal = motionRange(progress, 0.062, 0.135, reducedMotion);
    const solidReveal = motionRange(progress, 0.092, 0.165, reducedMotion);

    if (pointMaterialRef.current) {
      const opacity = reducedMotion
        ? 0
        : fieldReveal * (1 - solidReveal * 0.9) * 0.62;
      pointMaterialRef.current.opacity = opacity;
      pointMaterialRef.current.size = 0.028 + fieldReveal * 0.025;
      if (pointRef.current) pointRef.current.visible = opacity > 0.08 && progress < 0.158;
    }

    if (rootRef.current) {
      const departure = motionRange(progress, 0.205, 0.235, reducedMotion);
      rootRef.current.visible = departure < 0.995;
      if (!rootRef.current.visible) return;
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -departure * 6.5, 14, delta);
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, -7]}>
      {!compactLens ? (
        <>
          <CarpathianDataHorizon progressRef={progressRef} reducedMotion={reducedMotion} />
          <DataStreams progressRef={progressRef} lensMode={lensMode} reducedMotion={reducedMotion} />
          <DataKeep
            progressRef={progressRef}
            lensMode={lensMode}
            collectedEvidenceCores={collectedEvidenceCores}
            reducedMotion={reducedMotion}
          />

          <points ref={pointRef} geometry={pointGeometry} frustumCulled={false} visible={false}>
            <pointsMaterial ref={pointMaterialRef} color="#8be3df" size={0.04} transparent opacity={0} depthWrite={false} sizeAttenuation />
          </points>
        </>
      ) : null}

      <NexusField
        progressRef={progressRef}
        lensMode={lensMode}
        lensPointerRef={lensPointerRef}
      />
    </group>
  );
}

function SurveyDrone({
  progressRef,
  lensMode,
  nexusFlightInputRef,
  dronePositionRef,
  reducedMotion,
  settled,
  compactLens,
}: Pick<NexusActSceneProps, 'progressRef' | 'lensMode' | 'nexusFlightInputRef' | 'compactLens'> & {
  dronePositionRef: MutableRefObject<THREE.Vector3>;
  reducedMotion: boolean;
  settled: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.InstancedMesh>(null);
  const motorRef = useRef<THREE.InstancedMesh>(null);
  const rotorBladeRef = useRef<THREE.InstancedMesh>(null);
  const skidRef = useRef<THREE.InstancedMesh>(null);
  const beamMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const position = useMemo(() => new THREE.Vector3(), []);
  const lookAhead = useMemo(() => new THREE.Vector3(), []);
  const orientation = useMemo(() => new THREE.Object3D(), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const rotorAnchors = useMemo<Array<[number, number]>>(() => [
    [-0.82, -0.62],
    [0.82, -0.62],
    [-0.82, 0.62],
    [0.82, 0.62],
  ], []);
  const geometries = useMemo(() => ({
    body: new THREE.CapsuleGeometry(0.34, 0.7, 8, 16),
    sensor: new THREE.SphereGeometry(0.22, 18, 12),
    arm: new THREE.CylinderGeometry(0.045, 0.055, 1, 8),
    motor: new THREE.CylinderGeometry(0.2, 0.26, 0.18, 12),
    box: new THREE.BoxGeometry(1, 1, 1),
    beam: new THREE.ConeGeometry(1.52, 3.8, 24, 1, true),
  }), []);
  const materials = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ color: '#c8cdc5', metalness: 0.58, roughness: 0.32 }),
    sensor: new THREE.MeshStandardMaterial({
      color: '#152324',
      emissive: '#72d9d6',
      emissiveIntensity: 1.7,
      metalness: 0.36,
      roughness: 0.2,
    }),
    frame: new THREE.MeshStandardMaterial({ color: '#435154', metalness: 0.64, roughness: 0.35 }),
    motor: new THREE.MeshStandardMaterial({ color: '#1b292a', metalness: 0.68, roughness: 0.32 }),
    rotor: new THREE.MeshBasicMaterial({
      color: '#91ded9',
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      toneMapped: false,
    }),
  }), []);

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  useLayoutEffect(() => {
    rotorAnchors.forEach(([x, z], index) => {
      setInstanceTransform(
        armRef.current,
        index,
        scratch,
        x / 2,
        0,
        z / 2,
        1,
        Math.hypot(x, z),
        1,
        0,
        Math.atan2(x, z),
        Math.PI / 2,
      );
      setInstanceTransform(motorRef.current, index, scratch, x, 0, z, 1, 1, 1);
    });
    [-1, 1].forEach((side, index) => {
      setInstanceTransform(skidRef.current, index, scratch, side * 0.38, -0.52, 0.08, 0.07, 0.07, 1.12);
    });
    [armRef.current, motorRef.current, skidRef.current].forEach(markInstanceMatrixDirty);
    rotorBladeRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, [rotorAnchors, scratch]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;
    if (settled) {
      root.visible = false;
      dronePositionRef.current.set(999, 999, 999);
      return;
    }
    const local = motionRange(progressRef.current, 0.076, 0.285, reducedMotion);
    const visibility = motionRange(progressRef.current, 0.064, 0.092, reducedMotion)
      * (1 - motionRange(progressRef.current, 0.205, 0.235, reducedMotion));
    root.visible = visibility > 0.005;
    if (!root.visible) return;
    DRONE_PATH.getPoint(local, position);
    DRONE_PATH.getPoint(Math.min(1, local + 0.025), lookAhead);
    const flightInput = nexusFlightInputRef?.current;
    const flightActive = flightInput?.active ?? false;
    const flightX = flightActive ? (flightInput?.x ?? 0) * 2.65 : 0;
    const flightY = flightActive ? (flightInput?.y ?? 0) * 1.7 : 0;
    position.x += flightX;
    position.y += flightY;
    lookAhead.x += flightX * 0.82;
    lookAhead.y += flightY * 0.82;
    position.y += reducedMotion ? 0 : Math.sin(local * Math.PI * 5) * 0.08;
    root.position.lerp(position, reducedMotion ? 1 : 1 - Math.exp(-delta * 15));
    orientation.position.copy(root.position);
    orientation.lookAt(lookAhead);
    orientation.rotateZ(flightActive ? -(flightInput?.x ?? 0) * 0.12 : 0);
    root.quaternion.slerp(orientation.quaternion, reducedMotion ? 1 : 1 - Math.exp(-delta * 15));
    root.scale.setScalar(visibility * 0.68);
    dronePositionRef.current.copy(root.position);

    const rotorPhase = reducedMotion
      ? 0
      : progressRef.current * 210 + (flightActive ? (flightInput?.x ?? 0) * 2.4 + (flightInput?.y ?? 0) * 1.7 : 0);
    rotorAnchors.forEach(([x, z], rotorIndex) => {
      for (let blade = 0; blade < 2; blade += 1) {
        setInstanceTransform(
          rotorBladeRef.current,
          rotorIndex * 2 + blade,
          scratch,
          x,
          0.15,
          z,
          1.12,
          0.022,
          0.07,
          0,
          rotorPhase + rotorIndex * 0.47 + blade * Math.PI / 2,
        );
      }
    });
    markInstanceMatrixDirty(rotorBladeRef.current);
    if (beamMaterialRef.current) {
      beamMaterialRef.current.opacity = visibility * (lensMode === 'raw' ? 0.045 : 0.11);
      beamMaterialRef.current.color.set(LENS_ACCENTS[lensMode]);
    }
  });

  return (
    <group ref={rootRef} scale={0.001}>
      <mesh geometry={geometries.body} material={materials.body} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={geometries.sensor} material={materials.sensor} position={[0, -0.34, 0.28]} />
      <instancedMesh ref={armRef} args={[geometries.arm, materials.frame, 4]} frustumCulled={false} />
      <instancedMesh ref={motorRef} args={[geometries.motor, materials.motor, 4]} frustumCulled={false} />
      <instancedMesh ref={rotorBladeRef} args={[geometries.box, materials.rotor, 8]} frustumCulled={false} />
      {!compactLens ? (
        <>
          <instancedMesh ref={skidRef} args={[geometries.box, materials.frame, 2]} frustumCulled={false} />
          <mesh position={[0, -2.38, 0]}>
            <primitive object={geometries.beam} attach="geometry" />
            <meshBasicMaterial
              ref={beamMaterialRef}
              color="#72d9d6"
              transparent
              opacity={0.1}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

function EvidenceCoreField({
  progressRef,
  lensMode,
  nexusFlightInputRef,
  collectedEvidenceCores,
  onCollectEvidenceCore,
  dronePositionRef,
  reducedMotion,
  compactLens,
}: Pick<
  NexusActSceneProps,
  'progressRef' | 'lensMode' | 'nexusFlightInputRef' | 'collectedEvidenceCores' | 'onCollectEvidenceCore' | 'compactLens'
> & {
  dronePositionRef: MutableRefObject<THREE.Vector3>;
  reducedMotion: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const haloMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const collectedLatchRef = useRef(false);
  const captureTimeRef = useRef(Number.NEGATIVE_INFINITY);
  const spec = NEXUS_CORE_SPECS[lensMode];
  const previousSpecIdRef = useRef<EvidenceCoreId>(spec.id);
  const collected = collectedEvidenceCores.includes(spec.id);

  useEffect(() => {
    collectedLatchRef.current = collected;
    if (previousSpecIdRef.current !== spec.id) {
      previousSpecIdRef.current = spec.id;
      captureTimeRef.current = Number.NEGATIVE_INFINITY;
    }
  }, [collected, spec.id]);

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;
    if (collectedEvidenceCores.length >= NEXUS_CORE_IDS.length) {
      root.visible = false;
      return;
    }
    const local = motionRange(progressRef.current, 0.076, 0.285, reducedMotion);
    const presence = motionRange(progressRef.current, 0.11, 0.145, reducedMotion)
      * (1 - motionRange(progressRef.current, 0.205, 0.235, reducedMotion));
    root.visible = presence > 0.005 && (!collected || captureTimeRef.current > Number.NEGATIVE_INFINITY);
    if (presence <= 0.005) return;
    DRONE_PATH.getPoint(local, targetPosition);
    targetPosition.x += spec.offset[0];
    targetPosition.y += spec.offset[1] + (reducedMotion ? 0 : Math.sin(local * Math.PI * 4) * 0.07);
    root.position.lerp(targetPosition, reducedMotion ? 1 : 1 - Math.exp(-delta * 15));
    root.rotation.set(local * 4.2 + 0.3, local * 6.4 + 0.6, 0);
    const distance = dronePositionRef.current.distanceTo(targetPosition);
    const proximity = clamp01(1 - distance / 4.6);
    const captureAge = clock.elapsedTime - captureTimeRef.current;
    const captureProgress = clamp01(captureAge / 0.72);
    const captureBurst = !reducedMotion && collected && captureAge >= 0 && captureAge < 0.72;
    const visibleScale = collected
      ? captureBurst ? presence * (1 - captureProgress) * (1 + captureProgress * 2.4) : 0
      : presence;
    root.scale.setScalar(THREE.MathUtils.damp(root.scale.x, Math.max(0.001, visibleScale * 0.72), 15, delta));
    root.visible = !collected || captureBurst;

    if (haloRef.current) {
      haloRef.current.rotation.z = -progressRef.current * 8.4;
      const lockScale = 1.32 - proximity * 0.34;
      haloRef.current.scale.setScalar(captureBurst ? 1 + captureProgress * 2.8 : lockScale);
    }
    if (haloMaterialRef.current) {
      haloMaterialRef.current.opacity = captureBurst
        ? 1 - captureProgress
        : 0.28 + proximity * 0.68;
    }
    const canCollect = presence > 0.72
      && Boolean(nexusFlightInputRef?.current?.active)
      && distance < 1.18;
    if (canCollect && !collectedLatchRef.current) {
      collectedLatchRef.current = true;
      captureTimeRef.current = clock.elapsedTime;
      onCollectEvidenceCore(spec.id);
    }
  });

  return (
    <group ref={rootRef} visible={false} scale={0.001}>
      <mesh>
        <octahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial color={spec.color} emissive={spec.color} emissiveIntensity={4.6} roughness={0.12} metalness={0.2} />
      </mesh>
      {!compactLens ? (
        <>
          <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.58, 0.028, 8, 36]} />
            <meshBasicMaterial ref={haloMaterialRef} color={spec.color} transparent opacity={0.28} toneMapped={false} depthWrite={false} />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.43, 0.014, 6, 32]} />
            <meshBasicMaterial color="#e8e5dc" transparent opacity={0.56} toneMapped={false} depthWrite={false} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

function paintEvidenceSurfaceTexture(
  texture: THREE.CanvasTexture,
  mode: MacroLensMode,
  source?: THREE.Texture,
) {
  const canvas = texture.image as HTMLCanvasElement;
  const context = canvas.getContext('2d');
  if (!context) return;
  const [title, sourceLabel] = NEXUS_EVIDENCE_LABELS[mode];
  const accent = LENS_ACCENTS[mode];
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#071011';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const sourceImage = source?.image as CanvasImageSource | undefined;
  if (sourceImage) {
    const image = source?.image as { width?: number; height?: number };
    const imageWidth = image.width ?? canvas.width;
    const imageHeight = image.height ?? canvas.height;
    const sourceAspect = imageWidth / Math.max(1, imageHeight);
    const canvasAspect = canvas.width / canvas.height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = imageWidth;
    let sourceHeight = imageHeight;
    if (sourceAspect > canvasAspect) {
      sourceWidth = imageHeight * canvasAspect;
      sourceX = (imageWidth - sourceWidth) / 2;
    } else {
      sourceHeight = imageWidth / canvasAspect;
      sourceY = (imageHeight - sourceHeight) / 2;
    }
    context.drawImage(
      sourceImage,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }

  const shade = context.createLinearGradient(0, canvas.height * 0.58, 0, canvas.height);
  shade.addColorStop(0, 'rgba(4, 10, 11, 0)');
  shade.addColorStop(0.64, 'rgba(4, 10, 11, 0.74)');
  shade.addColorStop(1, 'rgba(4, 10, 11, 0.96)');
  context.fillStyle = shade;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = accent;
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(270, 650);
  context.lineTo(754, 650);
  context.stroke();
  context.fillStyle = '#e7e3d8';
  context.font = '600 31px ui-monospace, monospace';
  context.textAlign = 'center';
  context.fillText(title, canvas.width / 2, 696);
  context.fillStyle = accent;
  context.font = '500 20px ui-monospace, monospace';
  context.fillText(sourceLabel, canvas.width / 2, 733);
  texture.needsUpdate = true;
}

function createEvidenceSurfaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  paintEvidenceSurfaceTexture(texture, 'raw');
  return texture;
}

function createSealBezelGeometry() {
  const shape = new THREE.Shape();
  const hole = new THREE.Path();
  const sides = 7;
  for (let index = 0; index < sides; index += 1) {
    const angle = Math.PI / 2 - index * Math.PI * 2 / sides;
    const x = Math.cos(angle) * 3.42;
    const y = Math.sin(angle) * 3.42;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  for (let index = 0; index < sides; index += 1) {
    const angle = Math.PI / 2 + index * Math.PI * 2 / sides;
    const x = Math.cos(angle) * 2.78;
    const y = Math.sin(angle) * 2.78;
    if (index === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  hole.closePath();
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.08,
    bevelThickness: 0.08,
  });
  geometry.translate(0, 0, -0.17);
  return geometry;
}

function createSealBladeGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.92, -0.18);
  shape.lineTo(1.46, -0.78);
  shape.lineTo(2.82, -1.25);
  shape.lineTo(3.38, -0.5);
  shape.lineTo(3.2, 0.64);
  shape.lineTo(1.82, 0.92);
  shape.lineTo(1.05, 0.3);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 1);
}

function createEvidencePanelFrameGeometry() {
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const pieces: THREE.BufferGeometry[] = [];
  const bezelSource = createSealBezelGeometry();
  const bezel = bezelSource.index ? bezelSource.toNonIndexed() : bezelSource.clone();
  bezelSource.dispose();
  matrix.compose(
    position.set(0, 0, 0.08),
    quaternion.identity(),
    scale.set(1.14, 0.86, 1),
  );
  bezel.applyMatrix4(matrix);
  pieces.push(bezel);

  const supportSpecs: Array<[
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]> = [
    [-2.42, -4.08, -0.22, 0.18, 2.18, 0.28, 0],
    [2.42, -4.08, -0.22, 0.18, 2.18, 0.28, 0],
    [-2.42, -5.18, -0.12, 1.16, 0.14, 0.92, 0],
    [2.42, -5.18, -0.12, 1.16, 0.14, 0.92, 0],
    [0, -3.08, -0.24, 5.28, 0.16, 0.3, 0],
  ];
  for (let index = 0; index < 7; index += 1) {
    const angle = Math.PI / 2 + index * Math.PI * 2 / 7;
    supportSpecs.push([
      Math.cos(angle) * 3.55 * 1.14,
      Math.sin(angle) * 3.55 * 0.86,
      -0.05,
      0.48,
      0.14,
      0.24,
      angle + Math.PI / 2,
    ]);
  }

  const boxSource = new THREE.BoxGeometry(1, 1, 1);
  supportSpecs.forEach(([x, y, z, scaleX, scaleY, scaleZ, rotationZ]) => {
    const box = boxSource.toNonIndexed();
    quaternion.setFromEuler(new THREE.Euler(0, 0, rotationZ));
    matrix.compose(position.set(x, y, z), quaternion, scale.set(scaleX, scaleY, scaleZ));
    box.applyMatrix4(matrix);
    pieces.push(box);
  });
  boxSource.dispose();

  const frame = mergeGeometries(pieces, false);
  pieces.forEach((piece) => piece.dispose());
  if (!frame) throw new Error('Unable to merge the Nexus evidence panel frame.');
  frame.computeBoundingSphere();
  return frame;
}

function EvidencePanel({
  progressRef,
  lensMode,
  reducedMotion,
  compactLens,
}: Pick<NexusActSceneProps, 'progressRef' | 'lensMode' | 'compactLens'> & { reducedMotion: boolean }) {
  const rootRef = useRef<THREE.Group>(null);
  const shutterRef = useRef<THREE.InstancedMesh>(null);
  const transitionRef = useRef(1);
  const transitionSwappedRef = useRef(true);
  const displayedModeRef = useRef<MacroLensMode>(lensMode);
  const pendingModeRef = useRef<MacroLensMode>(lensMode);
  const hasSurfaceRef = useRef(false);
  const pendingTextureRef = useRef<THREE.Texture | null>(null);
  const loadTokenRef = useRef(0);
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);
  const surfaceTexture = useMemo(createEvidenceSurfaceTexture, []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const accent = useMemo(() => new THREE.Color(), []);
  const surfaceGeometry = useMemo(() => new THREE.CircleGeometry(2.78, 7, Math.PI / 2), []);
  const frameGeometry = useMemo(createEvidencePanelFrameGeometry, []);
  const shutterGeometry = useMemo(createSealBladeGeometry, []);
  const materials = useMemo(() => {
    const shutter = new THREE.MeshStandardMaterial({
      color: '#0c1515',
      emissive: '#10201f',
      emissiveIntensity: 0.36,
      metalness: 0.56,
      roughness: 0.38,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    shutter.forceSinglePass = true;
    return {
      surface: new THREE.MeshBasicMaterial({ map: surfaceTexture, color: '#ffffff', toneMapped: false }),
      bezel: new THREE.MeshPhysicalMaterial({
        color: '#233532',
        emissive: '#72d9d6',
        emissiveIntensity: 0.22,
        metalness: 0.44,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.16,
      }),
      shutter,
    };
  }, [surfaceTexture]);

  useEffect(() => {
    if (hasSurfaceRef.current && displayedModeRef.current === lensMode) return;

    const loadToken = loadTokenRef.current + 1;
    loadTokenRef.current = loadToken;
    pendingModeRef.current = lensMode;
    pendingTextureRef.current?.dispose();
    pendingTextureRef.current = null;
    transitionRef.current = 1;
    transitionSwappedRef.current = true;
    let cancelled = false;

    textureLoader.load(
      NEXUS_EVIDENCE_TEXTURES[lensMode],
      (loadedTexture) => {
        if (cancelled || loadTokenRef.current !== loadToken) {
          loadedTexture.dispose();
          return;
        }

        if (!hasSurfaceRef.current || reducedMotion) {
          paintEvidenceSurfaceTexture(surfaceTexture, lensMode, loadedTexture);
          hasSurfaceRef.current = true;
          displayedModeRef.current = lensMode;
          loadedTexture.dispose();
          return;
        }

        pendingTextureRef.current = loadedTexture;
        transitionRef.current = 0;
        transitionSwappedRef.current = false;
      },
      undefined,
      () => {
        if (loadTokenRef.current === loadToken) {
          transitionRef.current = 1;
          transitionSwappedRef.current = true;
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [lensMode, reducedMotion, surfaceTexture, textureLoader]);

  useEffect(() => () => {
    loadTokenRef.current += 1;
    pendingTextureRef.current?.dispose();
    surfaceTexture.dispose();
    surfaceGeometry.dispose();
    frameGeometry.dispose();
    shutterGeometry.dispose();
    Object.values(materials).forEach((material) => material.dispose());
  }, [
    frameGeometry,
    materials,
    shutterGeometry,
    surfaceGeometry,
    surfaceTexture,
  ]);

  useLayoutEffect(() => {
    shutterRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  useFrame((_, delta) => {
    if (!rootRef.current) return;
    const reveal = compactLens
      ? 1
      : motionRange(progressRef.current, 0.112, 0.14, reducedMotion);
    const departure = motionRange(progressRef.current, 0.205, 0.235, reducedMotion);
    const scale = reveal * (1 - departure);
    rootRef.current.visible = scale > 0.005;
    if (!rootRef.current.visible) return;
    rootRef.current.scale.setScalar(scale);
    rootRef.current.rotation.z = reducedMotion ? 0 : Math.sin(progressRef.current * Math.PI * 3) * 0.008;

    if (transitionRef.current < 1) {
      transitionRef.current = Math.min(1, transitionRef.current + delta * 5.2);
      if (transitionRef.current >= 0.48 && !transitionSwappedRef.current) {
        const nextMode = pendingModeRef.current;
        const nextTexture = pendingTextureRef.current;
        if (nextTexture) {
          paintEvidenceSurfaceTexture(surfaceTexture, nextMode, nextTexture);
          nextTexture.dispose();
          pendingTextureRef.current = null;
          hasSurfaceRef.current = true;
          displayedModeRef.current = nextMode;
          transitionSwappedRef.current = true;
        }
      }
    }
    const shutterClosure = reducedMotion ? 0 : Math.sin(transitionRef.current * Math.PI);
    materials.shutter.opacity = 0.2 + shutterClosure * 0.72;
    for (let index = 0; index < 7; index += 1) {
      const angle = index * Math.PI * 2 / 7;
      const inwardShift = shutterClosure * -0.68;
      setInstanceTransform(
        shutterRef.current,
        index,
        scratch,
        Math.cos(angle) * inwardShift,
        Math.sin(angle) * inwardShift,
        0.14,
        1,
        1,
        1,
        0,
        0,
        angle + shutterClosure * 0.24,
      );
    }
    markInstanceMatrixDirty(shutterRef.current);

    accent.set(LENS_ACCENTS[lensMode]);
    accent.multiplyScalar(0.16);
    materials.bezel.emissive.lerp(accent, reducedMotion ? 1 : 1 - Math.exp(-delta * 16));
    materials.bezel.emissiveIntensity = 0.08 + reveal * 0.1;
  });

  return (
    <group ref={rootRef} position={[0.3, 5.08, -35.5]} rotation={[0, -0.018, -0.008]} scale={0.001}>
      <mesh geometry={surfaceGeometry} material={materials.surface} position={[0, 0, 0.03]} scale={[1.14, 0.86, 1]} />
      <instancedMesh
        ref={shutterRef}
        args={[shutterGeometry, materials.shutter, 7]}
        scale={[1.14, 0.86, 1]}
        frustumCulled={false}
        renderOrder={3}
      />
      <mesh geometry={frameGeometry} material={materials.bezel} renderOrder={5} />
    </group>
  );
}

export function NexusActScene(props: NexusActSceneProps) {
  const rootRef = useRef<THREE.Group>(null);
  const dronePositionRef = useRef(new THREE.Vector3(999, 999, 999));
  const reducedMotion = usePrefersReducedMotion();

  useFrame(() => {
    if (!rootRef.current) return;
    const progress = props.progressRef.current;
    rootRef.current.visible = progress >= 0.052 && progress < 0.238;
  });

  return (
    <group ref={rootRef} visible={false}>
      <NexusCity {...props} reducedMotion={reducedMotion} />
      <SurveyDrone
        progressRef={props.progressRef}
        lensMode={props.lensMode}
        nexusFlightInputRef={props.nexusFlightInputRef}
        dronePositionRef={dronePositionRef}
        reducedMotion={reducedMotion}
        settled={props.collectedEvidenceCores.length >= NEXUS_CORE_IDS.length}
        compactLens={props.compactLens}
      />
      <EvidenceCoreField
        progressRef={props.progressRef}
        lensMode={props.lensMode}
        nexusFlightInputRef={props.nexusFlightInputRef}
        collectedEvidenceCores={props.collectedEvidenceCores}
        onCollectEvidenceCore={props.onCollectEvidenceCore}
        dronePositionRef={dronePositionRef}
        reducedMotion={reducedMotion}
        compactLens={props.compactLens}
      />
      <EvidencePanel
        progressRef={props.progressRef}
        lensMode={props.lensMode}
        reducedMotion={reducedMotion}
        compactLens={props.compactLens}
      />
    </group>
  );
}
