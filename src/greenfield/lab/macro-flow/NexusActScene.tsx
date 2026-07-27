import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import type { EvidenceCoreId } from '../../experience/evidenceCores';
import type { QualityTier } from '../../experience/quality';
import type { LensPointerState, MacroLensMode, NexusFlightInput } from './macroFlowTypes';

type NexusActSceneProps = {
  activeChapter: 'field' | 'lens' | 'proof';
  progressRef: MutableRefObject<number>;
  lensMode: MacroLensMode;
  lensPointerRef: MutableRefObject<LensPointerState>;
  nexusFlightInputRef: MutableRefObject<NexusFlightInput>;
  collectedEvidenceCores: EvidenceCoreId[];
  onCollectEvidenceCore: (core: EvidenceCoreId) => void;
  qualityTier: QualityTier;
  compact: boolean;
};

type CityBlock = {
  position: [number, number, number];
  scale: [number, number, number];
  segment: number;
  side: -1 | 1;
  row: number;
};

const RAW_COLORS = ['#586763', '#68706a', '#495b59'];
const SEGMENT_COLORS = ['#c96554', '#d8b75e', '#559f9a'];
const LENS_ACCENTS: Record<MacroLensMode, string> = {
  raw: '#72d9d6',
  segmentation: '#e1bd67',
  detection: '#df6553',
};

const CITY_BLOCKS: CityBlock[] = Array.from({ length: 38 }, (_, index) => {
  const side = (index % 2 === 0 ? -1 : 1) as -1 | 1;
  const row = Math.floor(index / 2);
  const width = 1.75 + ((index * 7) % 5) * 0.42;
  const height = 2.35 + ((index * 11) % 9) * 0.38;
  const depth = 1.65 + ((index * 5) % 4) * 0.36;

  return {
    position: [side * (5.35 + ((index * 3) % 3) * 1.12 + (row % 4) * 0.08), 0, 4 - row * 2.95],
    scale: [width, height, depth],
    segment: index % 3,
    side,
    row,
  };
});

const CITY_SEGMENT_COUNTS = RAW_COLORS.map((_, segment) => (
  CITY_BLOCKS.reduce((count, block) => count + Number(block.segment === segment), 0)
));
const CITY_CHIMNEY_COUNT = CITY_BLOCKS.reduce((count, _, index) => count + Number(index % 4 === 0), 0);
const CITY_SIGN_COUNT = Math.min(12, CITY_BLOCKS.length);

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

        float architectureLift = uSemanticClass < 0.5 ? 1.22 : 1.0;
        vec3 rawColor = uRaw * vInstanceTint * diffuse * materialGrain * surfacePattern * architectureLift;
        vec3 inspected = rawColor;
        float silhouette = pow(1.0 - abs(normalView.z), 3.2);
        float structuralBand = uSemanticClass < 0.5
          ? jointLine(vWorldPosition.y, 0.42, 0.042) * 0.42
          : 0.0;

        if (uMode > 0.5 && uMode < 1.5) {
          inspected = uSegment * (0.68 + diffuse * 0.38) * mix(0.92, 1.0, surfacePattern);
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
        color = mix(color, vec3(0.035, 0.072, 0.071), fogAmount * 0.62);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

function createCityMaterial(raw: string, segment: string) {
  return createSemanticMaterial(raw, segment, 0);
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
  const pointsPerBlock = 12 * pointMultiplier;
  const positions = new Float32Array(CITY_BLOCKS.length * pointsPerBlock * 3);
  let cursor = 0;

  CITY_BLOCKS.forEach((block, blockIndex) => {
    for (let point = 0; point < pointsPerBlock; point += 1) {
      const seed = blockIndex * 101 + point * 7;
      positions[cursor] = block.position[0] + (seeded(seed) - 0.5) * block.scale[0];
      positions[cursor + 1] = 0.08 + seeded(seed + 1) * block.scale[1];
      positions[cursor + 2] = block.position[2] + (seeded(seed + 2) - 0.5) * block.scale[2];
      cursor += 3;
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function createDataKeepShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-5.8, 0);
  shape.lineTo(5.8, 0);
  shape.lineTo(5.8, 7.1);
  shape.lineTo(3.7, 7.1);
  shape.lineTo(3.7, 8.8);
  shape.lineTo(1.75, 8.8);
  shape.lineTo(0, 10.5);
  shape.lineTo(-1.75, 8.8);
  shape.lineTo(-3.7, 8.8);
  shape.lineTo(-3.7, 7.1);
  shape.lineTo(-5.8, 7.1);
  shape.closePath();

  const passage = new THREE.Path();
  passage.moveTo(-2.3, 0);
  passage.lineTo(2.3, 0);
  passage.lineTo(2.3, 3.7);
  passage.quadraticCurveTo(1.65, 5.3, 0, 6.2);
  passage.quadraticCurveTo(-1.65, 5.3, -2.3, 3.7);
  passage.closePath();
  shape.holes.push(passage);
  return shape;
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
    new THREE.Vector3(-2.4, 0.22, 3.5),
    new THREE.Vector3(-3.1, 2.8, -9),
    new THREE.Vector3(-1.2, 5.6, -24),
    new THREE.Vector3(-2.2, 7.2, -36.5),
  ]),
  new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.24, 3.5),
    new THREE.Vector3(1.6, 3.5, -10),
    new THREE.Vector3(-1.1, 6.4, -27),
    new THREE.Vector3(0, 8.1, -36.5),
  ]),
  new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.4, 0.22, 3.5),
    new THREE.Vector3(3.2, 2.6, -8),
    new THREE.Vector3(2.4, 5.1, -23),
    new THREE.Vector3(2.2, 7.2, -36.5),
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

function CarpathianDataHorizon() {
  const nearShape = useMemo(() => createMountainShape(31), []);
  const farShape = useMemo(() => createMountainShape(91), []);

  return (
    <group>
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
    opacity: 0.48,
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
    const reveal = motionRange(progressRef.current, 0.052, 0.098, reducedMotion);
    const departure = motionRange(progressRef.current, 0.285, 0.325, reducedMotion);
    if (rootRef.current) {
      rootRef.current.scale.setScalar(Math.max(0.001, reveal * (1 - departure)));
    }
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
  const towerRef = useRef<THREE.InstancedMesh>(null);
  const towerRoofRef = useRef<THREE.InstancedMesh>(null);
  const windowRef = useRef<THREE.InstancedMesh>(null);
  const detailRef = useRef<THREE.InstancedMesh>(null);
  const tickRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const keepShape = useMemo(createDataKeepShape, []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const geometries = useMemo(() => ({
    keep: new THREE.ExtrudeGeometry(keepShape, {
      depth: 1.3,
      bevelEnabled: true,
      bevelSize: 0.09,
      bevelThickness: 0.08,
      bevelSegments: 2,
    }),
    tower: new THREE.CylinderGeometry(1.15, 1.35, 4.7, 8),
    roof: new THREE.ConeGeometry(1.72, 3.2, 8),
    box: new THREE.BoxGeometry(1, 1, 1),
    crown: new THREE.ConeGeometry(1, 2.5, 4),
    beacon: new THREE.OctahedronGeometry(0.18, 0),
    socket: new THREE.TorusGeometry(1.12, 0.09, 10, 40),
    ring: new THREE.TorusGeometry(0.76, 0.025, 8, 36),
    core: new THREE.OctahedronGeometry(0.16, 0),
  }), [keepShape]);
  const materials = useMemo(() => ({
    keep: new THREE.MeshStandardMaterial({
      color: '#3d4945',
      emissive: '#111c1c',
      emissiveIntensity: 0.34,
      roughness: 0.9,
      metalness: 0.06,
    }),
    tower: new THREE.MeshStandardMaterial({ color: '#47514c', roughness: 0.92 }),
    roof: new THREE.MeshStandardMaterial({ color: '#202625', roughness: 0.84 }),
    window: new THREE.MeshBasicMaterial({ color: '#d2a968', toneMapped: false }),
    detail: new THREE.MeshStandardMaterial({ color: '#263431', roughness: 0.74, metalness: 0.18 }),
    crown: new THREE.MeshStandardMaterial({
      color: '#4d2226',
      emissive: '#1f0c0e',
      emissiveIntensity: 0.28,
      roughness: 0.82,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: '#7ba09c',
      emissive: '#7ba09c',
      emissiveIntensity: 2.1,
      metalness: 0.36,
      roughness: 0.25,
    }),
    ring: new THREE.MeshBasicMaterial({ color: '#7ba09c', transparent: true, opacity: 0.8, toneMapped: false }),
    core: new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true, toneMapped: false }),
  }), []);
  const evidenceCount = collectedEvidenceCores.length;

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  useLayoutEffect(() => {
    [-4.55, 4.55].forEach((x, index) => {
      setInstanceTransform(towerRef.current, index, scratch, x, 7.35, 0.08, 1, 1, 1);
      setInstanceTransform(towerRoofRef.current, index, scratch, x, 10.5, 0.08, 1, 1, 1, 0, Math.PI / 8);
      for (let row = 0; row < 3; row += 1) {
        setInstanceTransform(
          windowRef.current,
          index * 3 + row,
          scratch,
          x,
          6.35 + row * 0.92,
          1.28,
          0.24,
          0.48,
          0.06,
        );
      }
    });

    let detailIndex = 0;
    [-3.72, -1.86, 1.86, 3.72].forEach((x) => {
      setInstanceTransform(detailRef.current, detailIndex, scratch, x, 4.25, 0.73, 0.18, 5.7, 0.2);
      detailIndex += 1;
    });
    [-4.7, -3.35, -2, 2, 3.35, 4.7].forEach((x) => {
      setInstanceTransform(detailRef.current, detailIndex, scratch, x, 7.5, 0.76, 0.42, 0.6, 0.38);
      detailIndex += 1;
    });
    [-4.55, 4.55].forEach((x) => {
      setInstanceTransform(detailRef.current, detailIndex, scratch, x, 5.25, 1.18, 1.72, 0.16, 0.18);
      detailIndex += 1;
    });

    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4;
      setInstanceTransform(
        tickRef.current,
        index,
        scratch,
        Math.cos(angle) * 0.76,
        8.05 + Math.sin(angle) * 0.76,
        0.92,
        0.18,
        0.035,
        0.035,
        0,
        0,
        angle,
      );
    }
    [towerRef.current, towerRoofRef.current, windowRef.current, detailRef.current, tickRef.current]
      .forEach(markInstanceMatrixDirty);
    coreRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, [scratch]);

  useFrame((_, delta) => {
    const reveal = motionRange(progressRef.current, 0.08, 0.122, reducedMotion);
    if (rootRef.current) {
      rootRef.current.visible = reveal > 0.005;
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -0.2 + reveal * 0.2, 14, delta);
      rootRef.current.scale.y = THREE.MathUtils.damp(rootRef.current.scale.y, Math.max(0.001, reveal), 14, delta);
    }
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
        Math.cos(angle) * 1.34,
        8.05 + Math.sin(angle) * 1.34,
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

    const accent = LENS_ACCENTS[lensMode];
    materials.accent.color.set(accent);
    materials.accent.emissive.set(accent);
    materials.ring.color.set(accent);
  });

  return (
    <group ref={rootRef} position={[0, -0.2, -37.5]} scale={[1.04, 0.001, 1.04]}>
      <mesh geometry={geometries.keep} material={materials.keep} position={[0, 0, -0.65]} />
      <instancedMesh ref={towerRef} args={[geometries.tower, materials.tower, 2]} frustumCulled={false} />
      <instancedMesh ref={towerRoofRef} args={[geometries.roof, materials.roof, 2]} frustumCulled={false} />
      <instancedMesh ref={windowRef} args={[geometries.box, materials.window, 6]} frustumCulled={false} />
      <instancedMesh ref={detailRef} args={[geometries.box, materials.detail, 12]} frustumCulled={false} />
      <mesh geometry={geometries.crown} material={materials.crown} position={[0, 11.45, -0.1]} rotation={[0, Math.PI / 4, 0]} scale={[2.35, 1, 2.05]} />
      <mesh geometry={geometries.beacon} material={materials.accent} position={[0, 13.2, -0.1]} />
      <mesh geometry={geometries.socket} material={materials.accent} position={[0, 8.05, 0.78]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh ref={ringRef} geometry={geometries.ring} material={materials.ring} position={[0, 8.05, 0.9]} />
      <instancedMesh ref={tickRef} args={[geometries.box, materials.ring, 8]} frustumCulled={false} />
      <instancedMesh ref={coreRef} args={[geometries.core, materials.core, 3]} frustumCulled={false} />
    </group>
  );
}

function NexusLivingSignals({
  progressRef,
  lensMode,
  reducedMotion,
  compact,
}: Pick<NexusActSceneProps, 'progressRef' | 'lensMode' | 'compact'> & {
  reducedMotion: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const poolRef = useRef<THREE.InstancedMesh>(null);
  const beaconRef = useRef<THREE.InstancedMesh>(null);
  const sweepRef = useRef<THREE.Mesh>(null);
  const sweepMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const poolCount = compact ? 8 : 12;
  const beaconCount = compact ? 12 : 18;
  const geometries = useMemo(() => ({
    pool: new THREE.CircleGeometry(1, 28),
    beacon: new THREE.BoxGeometry(1, 1, 1),
    sweep: new THREE.PlaneGeometry(7.15, 3.8),
  }), []);
  const materials = useMemo(() => ({
    pool: new THREE.MeshBasicMaterial({
      color: '#ffffff',
      vertexColors: true,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
    beacon: new THREE.MeshBasicMaterial({
      color: '#ffffff',
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      toneMapped: false,
    }),
  }), []);

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  useLayoutEffect(() => {
    for (let index = 0; index < poolCount; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const row = Math.floor(index / 2);
      setInstanceTransform(
        poolRef.current,
        index,
        scratch,
        side * 3.62,
        0.035,
        1.5 - row * 9.1,
        1.35,
        0.62,
        1,
        -Math.PI / 2,
      );
      poolRef.current?.setColorAt(
        index,
        scratchColor.set(index % 3 === 1 ? '#e1bd67' : '#72d9d6'),
      );
    }
    for (let index = 0; index < beaconCount; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const row = Math.floor(index / 2);
      setInstanceTransform(
        beaconRef.current,
        index,
        scratch,
        side * (6.34 + (row % 3) * 0.16),
        1.8,
        3 - row * 6.2,
        0.045,
        0.8,
        0.045,
      );
      beaconRef.current?.setColorAt(
        index,
        scratchColor.set(index % 4 === 0 ? '#e1bd67' : '#72d9d6'),
      );
    }
    [poolRef.current, beaconRef.current].forEach(markInstanceMatrixDirty);
    [poolRef.current, beaconRef.current].forEach((mesh) => {
      if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    beaconRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, [beaconCount, poolCount, scratch, scratchColor]);

  useFrame(({ clock }, delta) => {
    const progress = progressRef.current;
    const reveal = motionRange(progress, 0.048, 0.086, reducedMotion);
    const departure = motionRange(progress, 0.285, 0.325, reducedMotion);
    const presence = reveal * (1 - departure);
    if (rootRef.current) {
      rootRef.current.visible = presence > 0.005;
      rootRef.current.scale.y = THREE.MathUtils.damp(
        rootRef.current.scale.y,
        Math.max(0.001, presence),
        12,
        delta,
      );
    }

    const accent = LENS_ACCENTS[lensMode];
    materials.pool.opacity = presence * (lensMode === 'raw' ? 0.1 : 0.18);
    materials.beacon.opacity = presence * (lensMode === 'raw' ? 0.58 : 0.86);
    for (let index = 0; index < beaconCount; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const row = Math.floor(index / 2);
      const pulse = reducedMotion
        ? 0.62
        : 0.46 + Math.sin(clock.elapsedTime * 2.1 + index * 0.73) * 0.22;
      setInstanceTransform(
        beaconRef.current,
        index,
        scratch,
        side * (6.34 + (row % 3) * 0.16),
        1.2 + pulse * 0.9,
        3 - row * 6.2,
        0.045,
        0.35 + pulse * 1.25,
        0.045,
      );
    }
    markInstanceMatrixDirty(beaconRef.current);

    if (sweepRef.current) {
      const cycle = reducedMotion
        ? 0.42
        : (clock.elapsedTime * 0.092 + progress * 1.8) % 1;
      sweepRef.current.position.z = THREE.MathUtils.lerp(7, -48, cycle);
      sweepRef.current.visible = presence > 0.2;
    }
    if (sweepMaterialRef.current) {
      sweepMaterialRef.current.color.set(accent);
      sweepMaterialRef.current.opacity = presence * (lensMode === 'raw' ? 0.065 : 0.14);
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, -7]} scale={[1, 0.001, 1]} visible={false}>
      <instancedMesh
        ref={poolRef}
        args={[geometries.pool, materials.pool, poolCount]}
        frustumCulled={false}
        renderOrder={2}
      />
      <instancedMesh
        ref={beaconRef}
        args={[geometries.beacon, materials.beacon, beaconCount]}
        frustumCulled={false}
        renderOrder={3}
      />
      <mesh
        ref={sweepRef}
        geometry={geometries.sweep}
        position={[0, 0.047, 7]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={4}
      >
        <meshBasicMaterial
          ref={sweepMaterialRef}
          color="#72d9d6"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function NexusThresholdEcho({
  progressRef,
  reducedMotion,
}: Pick<NexusActSceneProps, 'progressRef'> & { reducedMotion: boolean }) {
  const rootRef = useRef<THREE.Group>(null);
  const latticeRef = useRef<THREE.InstancedMesh>(null);
  const archMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const geometries = useMemo(() => ({
    lattice: new THREE.BoxGeometry(1, 1, 1),
    arch: new THREE.TorusGeometry(4.35, 0.055, 8, 64, Math.PI),
  }), []);
  const latticeMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#72d9d6',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }), []);

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    latticeMaterial.dispose();
  }, [geometries, latticeMaterial]);

  useLayoutEffect(() => {
    [
      [-4.18, 4.25, 0.06, 8.5],
      [4.18, 4.25, 0.06, 8.5],
      [-3.2, 7.5, 0.06, 1.5],
      [3.2, 7.5, 0.06, 1.5],
      [-3.72, 1.45, 0.06, 1.65],
      [3.72, 1.45, 0.06, 1.65],
    ].forEach(([x, y, width, height], index) => {
      setInstanceTransform(latticeRef.current, index, scratch, x, y, 0, width, height, 0.06);
    });
    markInstanceMatrixDirty(latticeRef.current);
  }, [scratch]);

  useFrame(({ clock }) => {
    const exit = motionRange(progressRef.current, 0.064, 0.105, reducedMotion);
    const presence = 1 - exit;
    if (rootRef.current) {
      rootRef.current.visible = presence > 0.005;
      rootRef.current.position.z = 14.85 - exit * 7.5;
      rootRef.current.scale.setScalar(0.96 + exit * 0.08);
      rootRef.current.rotation.z = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.5) * 0.0025;
    }
    latticeMaterial.opacity = presence * 0.16;
    if (archMaterialRef.current) {
      archMaterialRef.current.opacity = presence * 0.3;
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, 14.85]}>
      <instancedMesh
        ref={latticeRef}
        args={[geometries.lattice, latticeMaterial, 6]}
        frustumCulled={false}
        renderOrder={5}
      />
      <mesh geometry={geometries.arch} position={[0, 4.2, 0]} renderOrder={5}>
        <meshBasicMaterial
          ref={archMaterialRef}
          color="#e1bd67"
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function createSurveyCableGeometry() {
  const positions: number[] = [];
  const rows = [2, -7, -16, -25, -34, -43];

  ([-1, 1] as const).forEach((side) => {
    for (let index = 0; index < rows.length - 1; index += 1) {
      const fromZ = rows[index];
      const toZ = rows[index + 1];
      const fromY = 4.8 + seeded(index + side * 13) * 0.55;
      const toY = 4.8 + seeded(index + 1 + side * 17) * 0.55;
      const midpointZ = (fromZ + toZ) / 2;
      const midpointY = Math.min(fromY, toY) - 0.3;
      const x = side * 6.95;
      positions.push(
        x, fromY, fromZ,
        x, midpointY, midpointZ,
        x, midpointY, midpointZ,
        x, toY, toZ,
      );
    }
  });

  [-7, -25].forEach((z, index) => {
    const y = 5.05 + index * 0.22;
    positions.push(-6.95, y, z, 0, y - 0.42, z, 0, y - 0.42, z, 6.95, y, z);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function StreetFurniture({
  progressRef,
  lensMode,
  lensPointerRef,
  qualityTier,
}: Pick<NexusActSceneProps, 'progressRef' | 'lensMode' | 'lensPointerRef' | 'qualityTier'>) {
  const sidewalkRef = useRef<THREE.InstancedMesh>(null);
  const curbRef = useRef<THREE.InstancedMesh>(null);
  const gutterRef = useRef<THREE.InstancedMesh>(null);
  const markingRef = useRef<THREE.InstancedMesh>(null);
  const drainRef = useRef<THREE.InstancedMesh>(null);
  const streetFrameRef = useRef<THREE.InstancedMesh>(null);
  const lampHeadRef = useRef<THREE.InstancedMesh>(null);
  const surveyPostRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const shrubRef = useRef<THREE.InstancedMesh>(null);
  const occupancyRef = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const rockCount = qualityTier === 'cinematic' ? 16 : 9;
  const shrubCount = qualityTier === 'cinematic' ? 8 : 5;
  const markingCount = 34;
  const cableGeometry = useMemo(createSurveyCableGeometry, []);
  const geometries = useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1),
    plane: new THREE.PlaneGeometry(1, 1),
    rock: new THREE.IcosahedronGeometry(0.5, 0),
    shrub: new THREE.ConeGeometry(0.44, 1, 7),
  }), []);
  const semanticMaterials = useMemo(() => ({
    road: createSemanticMaterial('#58615b', '#4f9692', 1, '#df6553'),
    sidewalk: createSemanticMaterial('#74786f', '#d0ae60', 2, '#df6553'),
    curb: createSemanticMaterial('#b5ad96', '#e1bd67', 2, '#df6553'),
    marking: createSemanticMaterial('#d8d2bd', '#e9dfb5', 3, '#df6553'),
    mineral: createSemanticMaterial('#596050', '#6f956c', 4, '#72d9d6'),
  }), []);
  const materials = useMemo(() => ({
    gutter: new THREE.MeshStandardMaterial({ color: '#303a37', metalness: 0.15, roughness: 0.88 }),
    drain: new THREE.MeshStandardMaterial({ color: '#151e1e', metalness: 0.62, roughness: 0.46 }),
    streetFrame: new THREE.MeshStandardMaterial({ color: '#1b2929', metalness: 0.7, roughness: 0.36 }),
    lampHead: new THREE.MeshStandardMaterial({
      color: '#d5cba9',
      emissive: '#c9ad69',
      emissiveIntensity: 1.7,
      metalness: 0.24,
      roughness: 0.34,
    }),
    cable: new THREE.LineBasicMaterial({ color: '#314d4c', transparent: true, opacity: 0.66 }),
    occupancy: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      vertexColors: true,
      roughness: 0.78,
      metalness: 0.08,
    }),
  }), []);

  useEffect(() => () => {
    cableGeometry.dispose();
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(semanticMaterials).forEach((material) => material.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [cableGeometry, geometries, materials, semanticMaterials]);

  useLayoutEffect(() => {
    [-5.05, 5.05].forEach((x, index) => {
      setInstanceTransform(sidewalkRef.current, index, scratch, x, 0.07, -20, 2.58, 0.14, 58);
      setInstanceTransform(
        curbRef.current,
        index,
        scratch,
        x + (x < 0 ? 1.29 : -1.29),
        0.15,
        -20,
        0.14,
        0.3,
        58,
      );
      setInstanceTransform(
        curbRef.current,
        index + 2,
        scratch,
        x + (x < 0 ? -1.22 : 1.22),
        0.1,
        -20,
        0.1,
        0.2,
        58,
      );
      setInstanceTransform(
        gutterRef.current,
        index,
        scratch,
        x + (x < 0 ? 1.48 : -1.48),
        0.018,
        -20,
        0.42,
        0.035,
        58,
      );
    });

    let markingIndex = 0;
    [-2.52, 2.52].forEach((x) => {
      setInstanceTransform(
        markingRef.current,
        markingIndex,
        scratch,
        x,
        0.025,
        -20,
        0.032,
        56,
        1,
        -Math.PI / 2,
      );
      markingIndex += 1;
    });
    for (let index = 0; index < 14; index += 1) {
      setInstanceTransform(
        markingRef.current,
        markingIndex,
        scratch,
        0,
        0.028,
        4 - index * 3.9,
        0.065,
        1.85,
        1,
        -Math.PI / 2,
      );
      markingIndex += 1;
    }
    [-9, -29].forEach((crossingZ) => {
      for (let index = 0; index < 7; index += 1) {
        setInstanceTransform(
          markingRef.current,
          markingIndex,
          scratch,
          0,
          0.034,
          crossingZ - 1.2 + index * 0.4,
          5.15,
          0.22,
          1,
          -Math.PI / 2,
        );
        markingIndex += 1;
      }
    });
    [-7.45, -10.55, -27.45, -30.55].forEach((z, index) => {
      setInstanceTransform(
        markingRef.current,
        markingIndex,
        scratch,
        index % 2 === 0 ? -1.35 : 1.35,
        0.036,
        z,
        2.2,
        0.11,
        1,
        -Math.PI / 2,
      );
      markingIndex += 1;
    });

    for (let index = 0; index < 12; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const z = 2 - Math.floor(index / 2) * 8.8;
      setInstanceTransform(
        streetFrameRef.current,
        index * 2,
        scratch,
        side * 4.22,
        1.62,
        z,
        0.075,
        3.24,
        0.075,
      );
      setInstanceTransform(
        streetFrameRef.current,
        index * 2 + 1,
        scratch,
        side * 3.91,
        3.2,
        z,
        0.66,
        0.07,
        0.07,
        0,
        0,
        side * 0.62,
      );
      setInstanceTransform(lampHeadRef.current, index, scratch, side * 3.63, 3.06, z, 0.34, 0.13, 0.22);
    }

    for (let index = 0; index < 18; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const z = 3 - Math.floor(index / 2) * 6.1;
      setInstanceTransform(drainRef.current, index, scratch, side * 3.55, 0.055, z, 0.34, 0.055, 0.62);
    }

    for (let index = 0; index < 6; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const z = -3 - index * 7.4;
      setInstanceTransform(surveyPostRef.current, index * 2, scratch, side * 5.82, 0.75, z, 0.055, 1.5, 0.055);
      setInstanceTransform(surveyPostRef.current, index * 2 + 1, scratch, side * 5.82, 1.52, z, 0.28, 0.08, 0.28);
    }

    for (let index = 0; index < rockCount; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const scale = 0.22 + seeded(index + 331) * 0.28;
      setInstanceTransform(
        rockRef.current,
        index,
        scratch,
        side * (6.25 + seeded(index + 117) * 0.85),
        scale * 0.42,
        3 - index * 3.1,
        scale * (0.8 + seeded(index + 77) * 0.4),
        scale * 0.7,
        scale,
        seeded(index + 93),
        seeded(index + 43) * Math.PI,
      );
    }

    for (let index = 0; index < shrubCount; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const scale = 0.45 + seeded(index + 411) * 0.28;
      setInstanceTransform(
        shrubRef.current,
        index,
        scratch,
        side * (6.4 + seeded(index + 219) * 0.58),
        scale * 0.48,
        -4 - index * 5.8,
        scale,
        scale,
        scale,
        0,
        seeded(index + 32) * Math.PI,
      );
    }

    for (let index = 0; index < 10; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      setInstanceTransform(
        occupancyRef.current,
        index,
        scratch,
        side * 5.72,
        index % 3 === 0 ? 0.38 : 0.22,
        -1 - index * 4.7,
        index % 3 === 0 ? 1.08 : 0.46,
        index % 3 === 0 ? 0.18 : 0.44,
        index % 3 === 0 ? 0.4 : 0.54,
        0,
        index % 2 === 0 ? 0.08 : -0.08,
      );
      occupancyRef.current?.setColorAt(
        index,
        scratchColor.set(index % 3 === 0 ? '#3b504c' : index % 3 === 1 ? '#6d5345' : '#726b55'),
      );
    }

    [
      sidewalkRef.current,
      curbRef.current,
      gutterRef.current,
      markingRef.current,
      drainRef.current,
      streetFrameRef.current,
      lampHeadRef.current,
      surveyPostRef.current,
      rockRef.current,
      shrubRef.current,
      occupancyRef.current,
    ].forEach(markInstanceMatrixDirty);
    if (occupancyRef.current?.instanceColor) occupancyRef.current.instanceColor.needsUpdate = true;
  }, [markingCount, qualityTier, rockCount, scratch, scratchColor, shrubCount]);

  useFrame(({ gl, size }) => {
    const lensPresence = smooth(range(progressRef.current, 0.13, 0.16))
      * (1 - smooth(range(progressRef.current, 0.285, 0.318)));
    updateSemanticMaterials(
      Object.values(semanticMaterials),
      lensMode,
      lensPointerRef,
      size.width,
      size.height,
      gl.getPixelRatio(),
      lensPresence,
    );
  });

  return (
    <>
      <mesh position={[0, -0.045, -20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.4, 58]} />
        <primitive object={semanticMaterials.road} attach="material" />
      </mesh>
      <instancedMesh ref={sidewalkRef} args={[geometries.box, semanticMaterials.sidewalk, 2]} frustumCulled={false} />
      <instancedMesh ref={curbRef} args={[geometries.box, semanticMaterials.curb, 4]} frustumCulled={false} />
      <instancedMesh ref={gutterRef} args={[geometries.box, materials.gutter, 2]} frustumCulled={false} />
      <instancedMesh ref={markingRef} args={[geometries.plane, semanticMaterials.marking, markingCount]} frustumCulled={false} />
      <instancedMesh ref={drainRef} args={[geometries.box, materials.drain, 18]} frustumCulled={false} />
      <instancedMesh ref={streetFrameRef} args={[geometries.box, materials.streetFrame, 24]} frustumCulled={false} />
      <instancedMesh ref={lampHeadRef} args={[geometries.box, materials.lampHead, 12]} frustumCulled={false} />
      <instancedMesh ref={surveyPostRef} args={[geometries.box, materials.streetFrame, 12]} frustumCulled={false} />
      <instancedMesh ref={rockRef} args={[geometries.rock, semanticMaterials.mineral, rockCount]} frustumCulled={false} />
      <instancedMesh ref={shrubRef} args={[geometries.shrub, semanticMaterials.mineral, shrubCount]} frustumCulled={false} />
      <instancedMesh ref={occupancyRef} args={[geometries.box, materials.occupancy, 10]} frustumCulled={false} />
      <lineSegments geometry={cableGeometry} material={materials.cable} />
    </>
  );
}

function Traffic({
  progressRef,
  lensMode,
  lensPointerRef,
  reducedMotion,
}: Pick<NexusActSceneProps, 'progressRef' | 'lensMode' | 'lensPointerRef'> & { reducedMotion: boolean }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const cabinRef = useRef<THREE.InstancedMesh>(null);
  const wheelRef = useRef<THREE.InstancedMesh>(null);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const transforms = useMemo(() => ({
    parent: new THREE.Object3D(),
    child: new THREE.Object3D(),
    composed: new THREE.Matrix4(),
  }), []);
  const geometries = useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1),
    wheel: new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12),
  }), []);
  const materials = useMemo(() => ({
    body: createSemanticMaterial('#ffffff', '#cf6554', 5),
    cabin: createSemanticMaterial('#324345', '#72d9d6', 5),
    wheel: new THREE.MeshStandardMaterial({ color: '#0a0e0f', roughness: 0.88 }),
  }), []);

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  useLayoutEffect(() => {
    [bodyRef.current, cabinRef.current, wheelRef.current].forEach((mesh) => {
      mesh?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    });
    const bodies = bodyRef.current;
    if (!bodies) return;
    for (let index = 0; index < 6; index += 1) {
      const color = index % 3 === 0 ? '#a75346' : index % 3 === 1 ? '#d1b669' : '#627879';
      bodies.setColorAt(index, scratchColor.set(color));
    }
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
  }, [scratchColor]);

  useFrame(({ clock, gl, size }) => {
    const bodies = bodyRef.current;
    const cabins = cabinRef.current;
    const wheels = wheelRef.current;
    if (!bodies || !cabins || !wheels) return;
    const lensPresence = smooth(range(progressRef.current, 0.13, 0.16))
      * (1 - smooth(range(progressRef.current, 0.285, 0.318)));
    updateSemanticMaterials(
      [materials.body, materials.cabin],
      lensMode,
      lensPointerRef,
      size.width,
      size.height,
      gl.getPixelRatio(),
      lensPresence,
    );
    let wheelIndex = 0;

    for (let index = 0; index < 6; index += 1) {
      const direction = index % 2 === 0 ? -1 : 1;
      const travel = (
        index * 9.35
        + (reducedMotion ? 0 : clock.elapsedTime * 4.8 + progressRef.current * 82)
      ) % 56;
      const lane = index % 2 === 0 ? -1.35 : 1.35;
      const z = direction < 0 ? 8 - travel : -48 + travel;

      transforms.parent.position.set(lane, 0.18, z);
      transforms.parent.rotation.set(0, direction < 0 ? 0 : Math.PI, 0);
      transforms.parent.scale.set(1, 1, 1);
      transforms.parent.updateMatrix();

      transforms.child.position.set(0, 0.24, 0);
      transforms.child.rotation.set(0, 0, 0);
      transforms.child.scale.set(1.05, 0.4, 1.78);
      transforms.child.updateMatrix();
      transforms.composed.multiplyMatrices(transforms.parent.matrix, transforms.child.matrix);
      bodies.setMatrixAt(index, transforms.composed);

      transforms.child.position.set(0, 0.53, -0.08);
      transforms.child.scale.set(0.82, 0.32, 0.92);
      transforms.child.updateMatrix();
      transforms.composed.multiplyMatrices(transforms.parent.matrix, transforms.child.matrix);
      cabins.setMatrixAt(index, transforms.composed);

      [-0.47, 0.47].forEach((x) => {
        [-0.56, 0.56].forEach((wheelZ) => {
          transforms.child.position.set(x, 0.14, wheelZ);
          transforms.child.rotation.set(0, 0, Math.PI / 2);
          transforms.child.scale.set(1, 1, 1);
          transforms.child.updateMatrix();
          transforms.composed.multiplyMatrices(transforms.parent.matrix, transforms.child.matrix);
          wheels.setMatrixAt(wheelIndex, transforms.composed);
          wheelIndex += 1;
        });
      });
    }

    markInstanceMatrixDirty(bodies);
    markInstanceMatrixDirty(cabins);
    markInstanceMatrixDirty(wheels);
  });

  return (
    <>
      <instancedMesh ref={bodyRef} args={[geometries.box, materials.body, 6]} frustumCulled={false} />
      <instancedMesh ref={cabinRef} args={[geometries.box, materials.cabin, 6]} frustumCulled={false} />
      <instancedMesh ref={wheelRef} args={[geometries.wheel, materials.wheel, 24]} frustumCulled={false} />
    </>
  );
}

function TrackedSubjects({
  progressRef,
  lensMode,
  lensPointerRef,
  reducedMotion,
}: Pick<NexusActSceneProps, 'progressRef' | 'lensMode' | 'lensPointerRef'> & {
  reducedMotion: boolean;
}) {
  const pedestrianCount = 28;
  const detectionCount = 12;
  const solidRef = useRef<THREE.InstancedMesh>(null);
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const legRef = useRef<THREE.InstancedMesh>(null);
  const armRef = useRef<THREE.InstancedMesh>(null);
  const boundaryRef = useRef<THREE.InstancedMesh>(null);
  const transforms = useMemo(() => ({
    parent: new THREE.Object3D(),
    child: new THREE.Object3D(),
    composed: new THREE.Matrix4(),
  }), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const pedestrians = useMemo(() => Array.from({ length: pedestrianCount }, (_, index) => ({
    phase: seeded(index + 711),
    speed: 0.92 + seeded(index + 811) * 0.76,
    side: index % 2 === 0 ? -1 : 1,
    cross: index % 5 === 0,
    crossingZ: index % 10 === 0 ? -9 : -29,
    offset: (seeded(index + 911) - 0.5) * 0.58,
    color: ['#b7b3a8', '#8e9d98', '#aa765d', '#d0b86f', '#687b7b'][index % 5],
  })), []);
  const geometries = useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1),
    body: new THREE.CapsuleGeometry(0.2, 0.5, 4, 8),
    head: new THREE.SphereGeometry(0.2, 10, 8),
    limb: new THREE.CapsuleGeometry(0.075, 0.42, 3, 7),
  }), []);
  const materials = useMemo(() => ({
    solid: createSemanticMaterial('#ffffff', '#cf6554', 5),
    body: createSemanticMaterial('#ffffff', '#72d9d6', 5),
    head: createSemanticMaterial('#b7aa96', '#72d9d6', 5),
    limb: createSemanticMaterial('#ffffff', '#72d9d6', 5),
    boundary: new THREE.MeshBasicMaterial({
      color: '#df6553',
      wireframe: true,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      toneMapped: false,
    }),
  }), []);

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  useLayoutEffect(() => {
    setInstanceTransform(solidRef.current, 0, transforms.parent, -2.15, 0.38, -32, 1.5, 0.66, 2.25);
    setInstanceTransform(solidRef.current, 1, transforms.parent, 2.8, 1.2, -32.35, 1.9, 2.4, 1.7);
    solidRef.current?.setColorAt(0, scratchColor.set('#6c7675'));
    solidRef.current?.setColorAt(1, scratchColor.set('#465557'));
    if (solidRef.current?.instanceColor) solidRef.current.instanceColor.needsUpdate = true;

    pedestrians.forEach((pedestrian, index) => {
      bodyRef.current?.setColorAt(index, scratchColor.set(pedestrian.color));
      headRef.current?.setColorAt(index, scratchColor.set(index % 3 === 0 ? '#8c654f' : '#b9a58a'));
      [0, 1].forEach((side) => {
        legRef.current?.setColorAt(index * 2 + side, scratchColor.set(index % 4 === 0 ? '#273638' : '#202829'));
        armRef.current?.setColorAt(index * 2 + side, scratchColor.set(pedestrian.color));
      });
    });
    if (bodyRef.current?.instanceColor) bodyRef.current.instanceColor.needsUpdate = true;
    if (headRef.current?.instanceColor) headRef.current.instanceColor.needsUpdate = true;
    if (legRef.current?.instanceColor) legRef.current.instanceColor.needsUpdate = true;
    if (armRef.current?.instanceColor) armRef.current.instanceColor.needsUpdate = true;
    [bodyRef.current, headRef.current, legRef.current, armRef.current, boundaryRef.current].forEach((mesh) => {
      mesh?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    });
  }, [pedestrians, scratchColor, transforms]);

  useFrame(({ clock, gl, size }) => {
    const lensPresence = smooth(range(progressRef.current, 0.13, 0.16))
      * (1 - smooth(range(progressRef.current, 0.285, 0.318)));
    updateSemanticMaterials(
      [materials.solid, materials.body, materials.head, materials.limb],
      lensMode,
      lensPointerRef,
      size.width,
      size.height,
      gl.getPixelRatio(),
      lensPresence,
    );

    pedestrians.forEach((pedestrian, index) => {
      const travel = (
        pedestrian.phase
        + (reducedMotion ? 0 : clock.elapsedTime * pedestrian.speed * 0.028 + progressRef.current * 0.72)
      ) % 1;
      const direction = index % 4 < 2 ? 1 : -1;
      const directedTravel = direction > 0 ? travel : 1 - travel;
      const x = pedestrian.cross
        ? THREE.MathUtils.lerp(-3.05, 3.05, directedTravel)
        : pedestrian.side * (2.75 + pedestrian.offset);
      const z = pedestrian.cross
        ? pedestrian.crossingZ + Math.sin(directedTravel * Math.PI) * 0.08
        : THREE.MathUtils.lerp(6, -49, directedTravel);
      const bob = reducedMotion ? 0 : Math.sin((travel * 10 + index) * Math.PI) * 0.035;

      transforms.parent.position.set(x, bob, z);
      transforms.parent.rotation.set(0, pedestrian.cross
        ? (direction > 0 ? Math.PI / 2 : -Math.PI / 2)
        : (direction > 0 ? Math.PI : 0), 0);
      transforms.parent.scale.setScalar(0.86 + seeded(index + 1011) * 0.22);
      transforms.parent.updateMatrix();

      transforms.child.position.set(0, 1.02, 0);
      transforms.child.rotation.set(0, 0, 0);
      transforms.child.scale.set(1, 1, 1);
      transforms.child.updateMatrix();
      transforms.composed.multiplyMatrices(transforms.parent.matrix, transforms.child.matrix);
      bodyRef.current?.setMatrixAt(index, transforms.composed);

      transforms.child.position.set(0, 1.58, 0);
      transforms.child.scale.setScalar(1);
      transforms.child.updateMatrix();
      transforms.composed.multiplyMatrices(transforms.parent.matrix, transforms.child.matrix);
      headRef.current?.setMatrixAt(index, transforms.composed);

      const stride = reducedMotion ? 0 : Math.sin((travel * 10 + index) * Math.PI) * 0.34;
      [-1, 1].forEach((side, sideIndex) => {
        transforms.child.position.set(side * 0.105, 0.42, 0);
        transforms.child.rotation.set(side * stride, 0, 0);
        transforms.child.scale.set(1, 1.08, 1);
        transforms.child.updateMatrix();
        transforms.composed.multiplyMatrices(transforms.parent.matrix, transforms.child.matrix);
        legRef.current?.setMatrixAt(index * 2 + sideIndex, transforms.composed);

        transforms.child.position.set(side * 0.275, 1.05, 0);
        transforms.child.rotation.set(-side * stride * 0.78, 0, side * -0.07);
        transforms.child.scale.set(0.9, 0.94, 0.9);
        transforms.child.updateMatrix();
        transforms.composed.multiplyMatrices(transforms.parent.matrix, transforms.child.matrix);
        armRef.current?.setMatrixAt(index * 2 + sideIndex, transforms.composed);
      });

      if (index < detectionCount) {
        transforms.child.position.set(0, 0.92, 0);
        transforms.child.scale.set(0.72, 1.86, 0.72);
        transforms.child.updateMatrix();
        transforms.composed.multiplyMatrices(transforms.parent.matrix, transforms.child.matrix);
        boundaryRef.current?.setMatrixAt(index, transforms.composed);
      }
    });
    [bodyRef.current, headRef.current, legRef.current, armRef.current, boundaryRef.current]
      .forEach(markInstanceMatrixDirty);
  });

  return (
    <group>
      <instancedMesh ref={solidRef} args={[geometries.box, materials.solid, 2]} frustumCulled={false} />
      <instancedMesh ref={bodyRef} args={[geometries.body, materials.body, pedestrianCount]} frustumCulled={false} />
      <instancedMesh ref={headRef} args={[geometries.head, materials.head, pedestrianCount]} frustumCulled={false} />
      <instancedMesh ref={legRef} args={[geometries.limb, materials.limb, pedestrianCount * 2]} frustumCulled={false} />
      <instancedMesh ref={armRef} args={[geometries.limb, materials.limb, pedestrianCount * 2]} frustumCulled={false} />
      <instancedMesh
        ref={boundaryRef}
        args={[geometries.box, materials.boundary, detectionCount]}
        visible={lensMode === 'detection'}
        frustumCulled={false}
        renderOrder={4}
      />
    </group>
  );
}

function createGableRoofGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, 0, -0.5,
    0.5, 0, -0.5,
    0, 0.5, -0.5,
    -0.5, 0, 0.5,
    0.5, 0, 0.5,
    0, 0.5, 0.5,
  ], 3));
  geometry.setIndex([
    0, 1, 2,
    5, 4, 3,
    0, 3, 4, 0, 4, 1,
    0, 2, 5, 0, 5, 3,
    1, 4, 5, 1, 5, 2,
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

type BatchedCityBuildingsProps = Pick<
  NexusActSceneProps,
  'progressRef' | 'lensMode' | 'lensPointerRef' | 'qualityTier'
> & {
  cityMaterials: THREE.ShaderMaterial[];
};

function BatchedCityBuildings({
  progressRef,
  lensMode,
  lensPointerRef,
  qualityTier,
  cityMaterials,
}: BatchedCityBuildingsProps) {
  const bodyRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const pitchedRoofRef = useRef<THREE.InstancedMesh>(null);
  const flatRoofRef = useRef<THREE.InstancedMesh>(null);
  const structuralDetailRef = useRef<THREE.InstancedMesh>(null);
  const windowRecessRef = useRef<THREE.InstancedMesh>(null);
  const windowLightRef = useRef<THREE.InstancedMesh>(null);
  const entranceRef = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const geometries = useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1),
    roof: createGableRoofGeometry(),
  }), []);
  const materials = useMemo(() => ({
    roof: createSemanticMaterial('#ffffff', '#b95e50', 0),
    structure: createSemanticMaterial('#3e4b48', '#bd6555', 0),
    opening: createSemanticMaterial('#182423', '#4d8e8a', 0),
    window: createSemanticMaterial('#ffffff', '#4d8e8a', 0),
    occupancy: createSemanticMaterial('#ffffff', '#d8b75e', 0),
  }), []);
  const windowRows = qualityTier === 'cinematic' ? 3 : 2;
  const windowColumns = qualityTier === 'cinematic' ? 3 : 2;
  const windowCount = CITY_BLOCKS.length * windowRows * windowColumns;
  const pitchedRoofCount = CITY_BLOCKS.reduce((count, _, index) => count + Number(index % 3 !== 1), 0);
  const flatRoofCount = CITY_BLOCKS.length - pitchedRoofCount;
  const shutterCount = (Math.floor((windowCount - 1) / 5) + 1) * 2;
  const balconyCount = CITY_BLOCKS.reduce((count, _, index) => count + Number(index % 7 === 0), 0);
  const structuralDetailCount = CITY_BLOCKS.length * 3
    + CITY_CHIMNEY_COUNT
    + shutterCount
    + balconyCount * 5;

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  useLayoutEffect(() => {
    bodyRefs.current.forEach((mesh) => mesh?.instanceMatrix.setUsage(THREE.DynamicDrawUsage));
    [
      pitchedRoofRef.current,
      flatRoofRef.current,
      structuralDetailRef.current,
      windowRecessRef.current,
      windowLightRef.current,
      entranceRef.current,
    ]
      .forEach((mesh) => mesh?.instanceMatrix.setUsage(THREE.DynamicDrawUsage));
  }, [structuralDetailCount, windowCount]);

  useLayoutEffect(() => {
    let pitchedIndex = 0;
    let flatIndex = 0;
    let windowIndex = 0;
    let entranceIndex = 0;
    CITY_BLOCKS.forEach((_, index) => {
      const roofColor = index % 5 === 0 ? '#5a292b' : index % 3 === 0 ? '#273735' : '#202827';
      if (index % 3 !== 1) {
        pitchedRoofRef.current?.setColorAt(pitchedIndex, scratchColor.set(roofColor));
        pitchedIndex += 1;
      } else {
        for (let part = 0; part < 3; part += 1) {
          flatRoofRef.current?.setColorAt(flatIndex, scratchColor.set(part === 0 ? roofColor : '#38433f'));
          flatIndex += 1;
        }
      }

      for (let row = 0; row < windowRows; row += 1) {
        for (let column = 0; column < windowColumns; column += 1) {
          const windowColor = (index + row + column) % 5 === 0
            ? '#253432'
            : (index + column) % 3 === 0 ? '#8ab6ad' : '#d0aa68';
          windowLightRef.current?.setColorAt(windowIndex, scratchColor.set(windowColor));
          windowIndex += 1;
        }
      }

      if (index < CITY_SIGN_COUNT) {
        const occupationColors = ['#4b2d2d', '#756746', '#315856'];
        for (let part = 0; part < 3; part += 1) {
          entranceRef.current?.setColorAt(
            entranceIndex,
            scratchColor.set(occupationColors[(index + part) % occupationColors.length]),
          );
          entranceIndex += 1;
        }
      }
    });

    [pitchedRoofRef.current, flatRoofRef.current, windowLightRef.current, entranceRef.current]
      .forEach((mesh) => {
        if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true;
      });
  }, [scratchColor, windowColumns, windowRows]);

  useFrame(({ gl, size }) => {
    const lensPresence = smooth(range(progressRef.current, 0.13, 0.16))
      * (1 - smooth(range(progressRef.current, 0.285, 0.318)));
    updateSemanticMaterials(
      Object.values(materials),
      lensMode,
      lensPointerRef,
      size.width,
      size.height,
      gl.getPixelRatio(),
      lensPresence,
    );

    const segmentIndices = [0, 0, 0];
    let pitchedIndex = 0;
    let flatIndex = 0;
    let detailIndex = 0;
    let windowIndex = 0;
    let entranceIndex = 0;

    CITY_BLOCKS.forEach((block, index) => {
      const stagger = block.row * 0.0018;
      const revealTarget = Math.max(0.001, smooth(range(progressRef.current, 0.045 + stagger, 0.091 + stagger)));
      const revealScale = revealTarget;
      const yOffset = (1 - revealTarget) * -0.32;
      const [x, , z] = block.position;
      const [width, height, depth] = block.scale;
      const facadeX = x - block.side * (width / 2 + 0.035);
      const bodyIndex = segmentIndices[block.segment];
      segmentIndices[block.segment] += 1;

      setInstanceTransform(
        bodyRefs.current[block.segment],
        bodyIndex,
        scratch,
        x,
        yOffset + revealScale * height / 2,
        z,
        width,
        revealScale * height,
        depth,
      );

      if (index % 3 !== 1) {
        setInstanceTransform(
          pitchedRoofRef.current,
          pitchedIndex,
          scratch,
          x,
          yOffset + revealScale * height,
          z,
          width * 1.08,
          revealScale * (1.45 + (index % 4) * 0.12),
          depth * 1.08,
        );
        pitchedIndex += 1;
      } else {
        setInstanceTransform(
          flatRoofRef.current,
          flatIndex,
          scratch,
          x,
          yOffset + revealScale * (height + 0.08),
          z,
          width * 1.03,
          revealScale * 0.16,
          depth * 1.03,
        );
        flatIndex += 1;
        [-1, 1].forEach((edge) => {
          setInstanceTransform(
            flatRoofRef.current,
            flatIndex,
            scratch,
            x,
            yOffset + revealScale * (height + 0.26),
            z + edge * depth * 0.46,
            width,
            revealScale * 0.38,
            0.12,
          );
          flatIndex += 1;
        });
      }

      setInstanceTransform(
        structuralDetailRef.current,
        detailIndex,
        scratch,
        facadeX,
        yOffset + revealScale * 0.28,
        z,
        0.12,
        revealScale * 0.56,
        depth * 0.9,
      );
      detailIndex += 1;
      [-1, 1].forEach((edge) => {
        setInstanceTransform(
          structuralDetailRef.current,
          detailIndex,
          scratch,
          facadeX - block.side * 0.025,
          yOffset + revealScale * height * 0.5,
          z + edge * depth * 0.43,
          0.14,
          revealScale * height * 0.92,
          0.12,
        );
        detailIndex += 1;
      });

      if (index % 4 === 0) {
        setInstanceTransform(
          structuralDetailRef.current,
          detailIndex,
          scratch,
          x + width * 0.16,
          yOffset + revealScale * (height + 0.82),
          z - depth * 0.08,
          0.24,
          revealScale * 1.08,
          0.28,
        );
        detailIndex += 1;
      }

      if (index < CITY_SIGN_COUNT) {
        const doorZ = z - depth * 0.18;
        setInstanceTransform(
          entranceRef.current,
          entranceIndex,
          scratch,
          facadeX - block.side * 0.04,
          yOffset + revealScale * 0.62,
          doorZ,
          0.12,
          revealScale * 1.22,
          Math.min(0.7, depth * 0.3),
        );
        entranceIndex += 1;
        setInstanceTransform(
          entranceRef.current,
          entranceIndex,
          scratch,
          facadeX - block.side * 0.34,
          yOffset + revealScale * 1.3,
          doorZ,
          0.68,
          revealScale * 0.1,
          Math.min(0.82, depth * 0.34),
          0,
          0,
          block.side * 0.12,
        );
        entranceIndex += 1;
        setInstanceTransform(
          entranceRef.current,
          entranceIndex,
          scratch,
          facadeX - block.side * 0.055,
          yOffset + revealScale * Math.min(height - 0.45, 1.78),
          z + depth * 0.19,
          0.1,
          revealScale * 0.5,
          Math.min(0.92, depth * 0.38),
        );
        entranceIndex += 1;
      }

      for (let row = 0; row < windowRows; row += 1) {
        for (let column = 0; column < windowColumns; column += 1) {
          const columnUnit = column / (windowColumns - 1) - 0.5;
          const windowZ = z + columnUnit * Math.min(depth * 0.66, 1.55);
          const windowY = Math.min(height - 0.38, 0.72 + row * 0.88);
          setInstanceTransform(
            windowRecessRef.current,
            windowIndex,
            scratch,
            facadeX - block.side * 0.045,
            yOffset + revealScale * windowY,
            windowZ,
            0.13,
            revealScale * 0.54,
            0.46,
          );
          setInstanceTransform(
            windowLightRef.current,
            windowIndex,
            scratch,
            facadeX - block.side * 0.12,
            yOffset + revealScale * windowY,
            windowZ,
            0.045,
            revealScale * 0.36,
            0.3,
          );
          if (windowIndex % 5 === 0) {
            [-1, 1].forEach((edge) => {
              setInstanceTransform(
                structuralDetailRef.current,
                detailIndex,
                scratch,
                facadeX - block.side * 0.14,
                yOffset + revealScale * windowY,
                windowZ + edge * 0.3,
                0.055,
                revealScale * 0.56,
                0.16,
                0,
                edge * block.side * 0.08,
              );
              detailIndex += 1;
            });
          }
          windowIndex += 1;
        }
      }

      if (index % 7 === 0) {
        const balconyY = Math.min(height - 0.3, 2.05);
        setInstanceTransform(
          structuralDetailRef.current,
          detailIndex,
          scratch,
          facadeX - block.side * 0.32,
          yOffset + revealScale * balconyY,
          z,
          0.64,
          revealScale * 0.1,
          Math.min(1.15, depth * 0.64),
        );
        detailIndex += 1;
        setInstanceTransform(
          structuralDetailRef.current,
          detailIndex,
          scratch,
          facadeX - block.side * 0.58,
          yOffset + revealScale * (balconyY + 0.36),
          z,
          0.07,
          revealScale * 0.08,
          Math.min(1.12, depth * 0.62),
        );
        detailIndex += 1;
        [-1, 1].forEach((edge) => {
          setInstanceTransform(
            structuralDetailRef.current,
            detailIndex,
            scratch,
            facadeX - block.side * 0.58,
            yOffset + revealScale * (balconyY + 0.28),
            z + edge * Math.min(0.5, depth * 0.28),
            0.065,
            revealScale * 0.56,
            0.065,
          );
          detailIndex += 1;
        });
        setInstanceTransform(
          structuralDetailRef.current,
          detailIndex,
          scratch,
          facadeX - block.side * 0.58,
          yOffset + revealScale * (balconyY + 0.28),
          z,
          0.065,
          revealScale * 0.56,
          0.065,
        );
        detailIndex += 1;
      }
    });

    bodyRefs.current.forEach(markInstanceMatrixDirty);
    markInstanceMatrixDirty(pitchedRoofRef.current);
    markInstanceMatrixDirty(flatRoofRef.current);
    markInstanceMatrixDirty(structuralDetailRef.current);
    markInstanceMatrixDirty(windowRecessRef.current);
    markInstanceMatrixDirty(windowLightRef.current);
    markInstanceMatrixDirty(entranceRef.current);
  });

  return (
    <>
      {cityMaterials.map((material, segment) => (
        <instancedMesh
          key={segment}
          ref={(node) => { bodyRefs.current[segment] = node; }}
          args={[geometries.box, material, CITY_SEGMENT_COUNTS[segment]]}
          frustumCulled={false}
        />
      ))}
      <instancedMesh
        ref={pitchedRoofRef}
        args={[geometries.roof, materials.roof, pitchedRoofCount]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={flatRoofRef}
        args={[geometries.box, materials.roof, flatRoofCount * 3]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={structuralDetailRef}
        args={[geometries.box, materials.structure, structuralDetailCount]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={windowRecessRef}
        args={[geometries.box, materials.opening, windowCount]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={windowLightRef}
        args={[geometries.box, materials.window, windowCount]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={entranceRef}
        args={[geometries.box, materials.occupancy, CITY_SIGN_COUNT * 3]}
        frustumCulled={false}
      />
    </>
  );
}

const COMPACT_PEDESTRIAN_COUNT = 24;
const COMPACT_TRAFFIC_COUNT = 6;

function CompactNexusCity({
  progressRef,
  lensMode,
  lensPointerRef,
  reducedMotion,
}: Pick<NexusActSceneProps, 'progressRef' | 'lensMode' | 'lensPointerRef'> & {
  reducedMotion: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const cityRef = useRef<THREE.Group>(null);
  const streetRef = useRef<THREE.InstancedMesh>(null);
  const buildingRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const windowRef = useRef<THREE.InstancedMesh>(null);
  const personRef = useRef<THREE.InstancedMesh>(null);
  const trafficRef = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const pedestrians = useMemo(() => Array.from({ length: COMPACT_PEDESTRIAN_COUNT }, (_, index) => ({
    phase: seeded(index + 1201),
    speed: 0.82 + seeded(index + 1301) * 0.72,
    side: index % 2 === 0 ? -1 : 1,
    cross: index % 6 === 0,
    crossingZ: index % 12 === 0 ? -9 : -29,
    offset: (seeded(index + 1401) - 0.5) * 0.52,
    color: ['#b7b3a8', '#8e9d98', '#aa765d', '#d0b86f', '#687b7b'][index % 5],
  })), []);
  const geometries = useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1),
    roof: createGableRoofGeometry(),
    person: new THREE.CapsuleGeometry(0.19, 0.82, 3, 6),
    horizon: new THREE.ShapeGeometry(createMountainShape(67)),
  }), []);
  const materials = useMemo(() => ({
    architecture: createSemanticMaterial('#ffffff', '#c96554', 0),
    street: createSemanticMaterial('#74786f', '#4f9692', 1),
    opening: createSemanticMaterial('#ffffff', '#d0ae60', 3),
    person: createSemanticMaterial('#ffffff', '#72d9d6', 5),
    traffic: createSemanticMaterial('#ffffff', '#e1bd67', 5),
    horizon: new THREE.MeshBasicMaterial({ color: '#112120', fog: true }),
  }), []);

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  useLayoutEffect(() => {
    setInstanceTransform(streetRef.current, 0, scratch, 0, -0.045, -20, 7.4, 0.09, 58);
    setInstanceTransform(streetRef.current, 1, scratch, -5.05, 0.07, -20, 2.58, 0.14, 58);
    setInstanceTransform(streetRef.current, 2, scratch, 5.05, 0.07, -20, 2.58, 0.14, 58);
    setInstanceTransform(streetRef.current, 3, scratch, -3.76, 0.15, -20, 0.14, 0.3, 58);
    setInstanceTransform(streetRef.current, 4, scratch, 3.76, 0.15, -20, 0.14, 0.3, 58);

    let windowIndex = 0;
    CITY_BLOCKS.forEach((block, index) => {
      const [x, , z] = block.position;
      const [width, height, depth] = block.scale;
      const facadeX = x - block.side * (width / 2 + 0.04);
      setInstanceTransform(
        buildingRef.current,
        index,
        scratch,
        x,
        height / 2,
        z,
        width,
        height,
        depth,
      );
      setInstanceTransform(
        roofRef.current,
        index,
        scratch,
        x,
        height,
        z,
        width * 1.08,
        1.25 + (index % 4) * 0.11,
        depth * 1.08,
      );
      buildingRef.current?.setColorAt(
        index,
        scratchColor.set(['#586763', '#68706a', '#495b59'][index % 3]),
      );
      roofRef.current?.setColorAt(
        index,
        scratchColor.set(index % 5 === 0 ? '#5a292b' : '#202827'),
      );

      [-0.24, 0.24].forEach((columnOffset, column) => {
        setInstanceTransform(
          windowRef.current,
          windowIndex,
          scratch,
          facadeX - block.side * 0.07,
          Math.min(height - 0.42, 1.05 + column * 0.88),
          z + columnOffset * Math.min(depth, 2.2),
          0.08,
          0.46,
          0.38,
        );
        windowRef.current?.setColorAt(
          windowIndex,
          scratchColor.set((index + column) % 4 === 0 ? '#8ab6ad' : '#d0aa68'),
        );
        windowIndex += 1;
      });
    });

    pedestrians.forEach((pedestrian, index) => {
      personRef.current?.setColorAt(index, scratchColor.set(pedestrian.color));
    });
    for (let index = 0; index < COMPACT_TRAFFIC_COUNT; index += 1) {
      trafficRef.current?.setColorAt(
        index,
        scratchColor.set(index % 3 === 0 ? '#a75346' : index % 3 === 1 ? '#d1b669' : '#627879'),
      );
    }

    [streetRef.current, buildingRef.current, roofRef.current, windowRef.current]
      .forEach(markInstanceMatrixDirty);
    [personRef.current, trafficRef.current].forEach((mesh) => {
      mesh?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    });
    [buildingRef.current, roofRef.current, windowRef.current, personRef.current, trafficRef.current]
      .forEach((mesh) => {
        if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true;
      });
  }, [pedestrians, scratch, scratchColor]);

  useFrame(({ clock, gl, size }, delta) => {
    const progress = progressRef.current;
    const reveal = motionRange(progress, 0.035, 0.062, reducedMotion);
    const departure = motionRange(progress, 0.285, 0.345, reducedMotion);
    const lensPresence = smooth(range(progress, 0.13, 0.16))
      * (1 - smooth(range(progress, 0.285, 0.318)));
    updateSemanticMaterials(
      [materials.architecture, materials.street, materials.opening, materials.person, materials.traffic],
      lensMode,
      lensPointerRef,
      size.width,
      size.height,
      gl.getPixelRatio(),
      lensPresence,
    );

    if (rootRef.current) {
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -departure * 6.5, 14, delta);
    }
    if (cityRef.current) {
      cityRef.current.scale.y = THREE.MathUtils.damp(cityRef.current.scale.y, Math.max(0.001, reveal), 14, delta);
    }

    pedestrians.forEach((pedestrian, index) => {
      const travel = (
        pedestrian.phase
        + (reducedMotion ? 0 : clock.elapsedTime * pedestrian.speed * 0.028 + progress * 0.66)
      ) % 1;
      const direction = index % 4 < 2 ? 1 : -1;
      const directedTravel = direction > 0 ? travel : 1 - travel;
      const x = pedestrian.cross
        ? THREE.MathUtils.lerp(-3.05, 3.05, directedTravel)
        : pedestrian.side * (2.75 + pedestrian.offset);
      const z = pedestrian.cross
        ? pedestrian.crossingZ
        : THREE.MathUtils.lerp(6, -49, directedTravel);
      const bob = reducedMotion ? 0 : Math.sin((travel * 10 + index) * Math.PI) * 0.035;
      setInstanceTransform(
        personRef.current,
        index,
        scratch,
        x,
        0.78 + bob,
        z,
        0.92,
        1,
        0.92,
        0,
        pedestrian.cross ? Math.PI / 2 : direction > 0 ? Math.PI : 0,
      );
    });

    for (let index = 0; index < COMPACT_TRAFFIC_COUNT; index += 1) {
      const direction = index % 2 === 0 ? -1 : 1;
      const travel = (
        index * 9.35
        + (reducedMotion ? 0 : clock.elapsedTime * 4.6 + progress * 76)
      ) % 56;
      const z = direction < 0 ? 8 - travel : -48 + travel;
      setInstanceTransform(
        trafficRef.current,
        index,
        scratch,
        index % 2 === 0 ? -1.35 : 1.35,
        0.35,
        z,
        1.05,
        0.7,
        1.78,
        0,
        direction < 0 ? 0 : Math.PI,
      );
    }
    markInstanceMatrixDirty(personRef.current);
    markInstanceMatrixDirty(trafficRef.current);
  });

  return (
    <group ref={rootRef} position={[0, 0, -7]}>
      <mesh geometry={geometries.horizon} material={materials.horizon} position={[0, -0.1, -51]} scale={[1.15, 0.82, 1]} />
      <group ref={cityRef} scale={[1, 0.001, 1]}>
        <instancedMesh ref={streetRef} args={[geometries.box, materials.street, 5]} frustumCulled={false} />
        <instancedMesh ref={buildingRef} args={[geometries.box, materials.architecture, CITY_BLOCKS.length]} frustumCulled={false} />
        <instancedMesh ref={roofRef} args={[geometries.roof, materials.architecture, CITY_BLOCKS.length]} frustumCulled={false} />
        <instancedMesh ref={windowRef} args={[geometries.box, materials.opening, CITY_BLOCKS.length * 2]} frustumCulled={false} />
        <instancedMesh ref={personRef} args={[geometries.person, materials.person, COMPACT_PEDESTRIAN_COUNT]} frustumCulled={false} />
        <instancedMesh ref={trafficRef} args={[geometries.box, materials.traffic, COMPACT_TRAFFIC_COUNT]} frustumCulled={false} />
      </group>
    </group>
  );
}

function NexusCity({
  progressRef,
  lensMode,
  lensPointerRef,
  qualityTier,
  collectedEvidenceCores,
  reducedMotion,
}: NexusActSceneProps & { reducedMotion: boolean }) {
  const rootRef = useRef<THREE.Group>(null);
  const pointMaterialRef = useRef<THREE.PointsMaterial>(null);
  const cityMaterials = useMemo(
    () => RAW_COLORS.map((raw, index) => createCityMaterial(raw, SEGMENT_COLORS[index])),
    [],
  );
  const pointGeometry = useMemo(
    () => createPointCloudGeometry(qualityTier === 'cinematic' ? 2 : 1),
    [qualityTier],
  );

  useEffect(() => () => {
    cityMaterials.forEach((material) => material.dispose());
    pointGeometry.dispose();
  }, [cityMaterials, pointGeometry]);

  useFrame(({ gl, size }, delta) => {
    const progress = progressRef.current;
    const fieldReveal = motionRange(progress, 0.045, 0.09, reducedMotion);
    const solidReveal = motionRange(progress, 0.058, 0.112, reducedMotion);
    const lensPresence = smooth(range(progress, 0.13, 0.16)) * (1 - smooth(range(progress, 0.285, 0.318)));
    updateSemanticMaterials(
      cityMaterials,
      lensMode,
      lensPointerRef,
      size.width,
      size.height,
      gl.getPixelRatio(),
      lensPresence,
    );

    if (pointMaterialRef.current) {
      pointMaterialRef.current.opacity = reducedMotion
        ? 0
        : fieldReveal * (1 - solidReveal * 0.9) * 0.62;
      pointMaterialRef.current.size = 0.028 + fieldReveal * 0.025;
    }

    if (rootRef.current) {
      const departure = motionRange(progress, 0.285, 0.345, reducedMotion);
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -departure * 6.5, 14, delta);
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, -7]}>
      <CarpathianDataHorizon />
      <DataStreams progressRef={progressRef} lensMode={lensMode} reducedMotion={reducedMotion} />
      <NexusLivingSignals
        progressRef={progressRef}
        lensMode={lensMode}
        reducedMotion={reducedMotion}
        compact={false}
      />
      <DataKeep
        progressRef={progressRef}
        lensMode={lensMode}
        collectedEvidenceCores={collectedEvidenceCores}
        reducedMotion={reducedMotion}
      />

      <points geometry={pointGeometry} frustumCulled={false}>
        <pointsMaterial ref={pointMaterialRef} color="#8be3df" size={0.04} transparent opacity={0} depthWrite={false} sizeAttenuation />
      </points>

      <StreetFurniture
        progressRef={progressRef}
        lensMode={lensMode}
        lensPointerRef={lensPointerRef}
        qualityTier={qualityTier}
      />
      <Traffic
        progressRef={progressRef}
        lensMode={lensMode}
        lensPointerRef={lensPointerRef}
        reducedMotion={reducedMotion}
      />
      <BatchedCityBuildings
        progressRef={progressRef}
        lensMode={lensMode}
        lensPointerRef={lensPointerRef}
        qualityTier={qualityTier}
        cityMaterials={cityMaterials}
      />

      <TrackedSubjects
        progressRef={progressRef}
        lensMode={lensMode}
        lensPointerRef={lensPointerRef}
        reducedMotion={reducedMotion}
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
}: Pick<NexusActSceneProps, 'progressRef' | 'lensMode' | 'nexusFlightInputRef'> & {
  dronePositionRef: MutableRefObject<THREE.Vector3>;
  reducedMotion: boolean;
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

  useFrame(({ clock }, delta) => {
    if (!rootRef.current) return;
    const local = motionRange(progressRef.current, 0.07, 0.285, reducedMotion);
    const visibility = motionRange(progressRef.current, 0.069, 0.09, reducedMotion)
      * (1 - motionRange(progressRef.current, 0.29, 0.325, reducedMotion));
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
    rootRef.current.position.lerp(position, reducedMotion ? 1 : 1 - Math.exp(-delta * 15));
    rootRef.current.visible = visibility > 0.005;
    orientation.position.copy(rootRef.current.position);
    orientation.lookAt(lookAhead);
    orientation.rotateZ(flightActive ? -(flightInput?.x ?? 0) * 0.12 : 0);
    rootRef.current.quaternion.slerp(orientation.quaternion, reducedMotion ? 1 : 1 - Math.exp(-delta * 15));
    rootRef.current.scale.setScalar(0.001 + visibility * 0.68);
    dronePositionRef.current.copy(rootRef.current.position);

    const rotorPhase = reducedMotion
      ? 0
      : clock.elapsedTime * 52
        + progressRef.current * 18
        + (flightActive ? (flightInput?.x ?? 0) * 2.4 + (flightInput?.y ?? 0) * 1.7 : 0);
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
      <instancedMesh ref={skidRef} args={[geometries.box, materials.frame, 2]} frustumCulled={false} />
      <instancedMesh ref={rotorBladeRef} args={[geometries.box, materials.rotor, 8]} frustumCulled={false} />
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
    </group>
  );
}

function SurveyDroneLite({
  progressRef,
  lensMode,
  nexusFlightInputRef,
  dronePositionRef,
  reducedMotion,
}: Pick<NexusActSceneProps, 'progressRef' | 'lensMode' | 'nexusFlightInputRef'> & {
  dronePositionRef: MutableRefObject<THREE.Vector3>;
  reducedMotion: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const partsRef = useRef<THREE.InstancedMesh>(null);
  const beamMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const position = useMemo(() => new THREE.Vector3(), []);
  const lookAhead = useMemo(() => new THREE.Vector3(), []);
  const orientation = useMemo(() => new THREE.Object3D(), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const rotorAnchors = useMemo<Array<[number, number]>>(() => [
    [-0.78, -0.58],
    [0.78, -0.58],
    [-0.78, 0.58],
    [0.78, 0.58],
  ], []);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const beamGeometry = useMemo(() => new THREE.ConeGeometry(1.32, 3.5, 18, 1, true), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    metalness: 0.58,
    roughness: 0.34,
  }), []);

  useEffect(() => () => {
    geometry.dispose();
    beamGeometry.dispose();
    material.dispose();
  }, [beamGeometry, geometry, material]);

  useLayoutEffect(() => {
    const parts = partsRef.current;
    if (!parts) return;

    setInstanceTransform(parts, 0, scratch, 0, 0, 0, 0.64, 0.3, 0.9);
    setInstanceTransform(parts, 1, scratch, 0, -0.31, 0.32, 0.28, 0.2, 0.28);
    setInstanceTransform(parts, 2, scratch, 0, 0, 0, 1.85, 0.07, 0.09, 0, Math.PI / 4);
    setInstanceTransform(parts, 3, scratch, 0, 0, 0, 1.85, 0.07, 0.09, 0, -Math.PI / 4);
    setInstanceTransform(parts, 4, scratch, -0.34, -0.4, 0.1, 0.06, 0.06, 1.05);
    setInstanceTransform(parts, 5, scratch, 0.34, -0.4, 0.1, 0.06, 0.06, 1.05);

    rotorAnchors.forEach(([x, z], index) => {
      setInstanceTransform(parts, 6 + index, scratch, x, 0.02, z, 0.26, 0.16, 0.26);
    });

    const colors = [
      '#c8cdc5',
      LENS_ACCENTS[lensMode],
      '#435154',
      '#435154',
      '#435154',
      '#435154',
      '#1b292a',
      '#1b292a',
      '#1b292a',
      '#1b292a',
    ];
    colors.forEach((color, index) => parts.setColorAt(index, scratchColor.set(color)));
    for (let index = 10; index < 18; index += 1) {
      parts.setColorAt(index, scratchColor.set('#91ded9'));
    }
    parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (parts.instanceColor) parts.instanceColor.needsUpdate = true;
    markInstanceMatrixDirty(parts);
  }, [lensMode, rotorAnchors, scratch, scratchColor]);

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    const parts = partsRef.current;
    if (!root || !parts) return;

    const local = motionRange(progressRef.current, 0.07, 0.285, reducedMotion);
    const visibility = motionRange(progressRef.current, 0.069, 0.09, reducedMotion)
      * (1 - motionRange(progressRef.current, 0.29, 0.325, reducedMotion));
    DRONE_PATH.getPoint(local, position);
    DRONE_PATH.getPoint(Math.min(1, local + 0.025), lookAhead);

    const flightInput = nexusFlightInputRef.current;
    const flightX = flightInput.active ? flightInput.x * 2.65 : 0;
    const flightY = flightInput.active ? flightInput.y * 1.7 : 0;
    position.x += flightX;
    position.y += flightY;
    lookAhead.x += flightX * 0.82;
    lookAhead.y += flightY * 0.82;
    position.y += reducedMotion ? 0 : Math.sin(local * Math.PI * 5) * 0.08;

    root.position.lerp(position, reducedMotion ? 1 : 1 - Math.exp(-delta * 15));
    root.visible = visibility > 0.005;
    orientation.position.copy(root.position);
    orientation.lookAt(lookAhead);
    orientation.rotateZ(flightInput.active ? -flightInput.x * 0.12 : 0);
    root.quaternion.slerp(orientation.quaternion, reducedMotion ? 1 : 1 - Math.exp(-delta * 15));
    root.scale.setScalar(0.001 + visibility * 0.68);
    dronePositionRef.current.copy(root.position);

    const rotorPhase = reducedMotion ? 0 : clock.elapsedTime * 52 + progressRef.current * 18;
    rotorAnchors.forEach(([x, z], rotorIndex) => {
      for (let blade = 0; blade < 2; blade += 1) {
        setInstanceTransform(
          parts,
          10 + rotorIndex * 2 + blade,
          scratch,
          x,
          0.18,
          z,
          1.05,
          0.018,
          0.065,
          0,
          rotorPhase + rotorIndex * 0.47 + blade * Math.PI / 2,
        );
      }
    });
    markInstanceMatrixDirty(parts);

    if (beamMaterialRef.current) {
      beamMaterialRef.current.color.set(LENS_ACCENTS[lensMode]);
      beamMaterialRef.current.opacity = visibility * (lensMode === 'raw' ? 0.04 : 0.1);
    }
  });

  return (
    <group ref={rootRef} visible={false} scale={0.001}>
      <instancedMesh ref={partsRef} args={[geometry, material, 18]} frustumCulled={false} />
      <mesh geometry={beamGeometry} position={[0, -2.2, 0]}>
        <meshBasicMaterial
          ref={beamMaterialRef}
          color="#72d9d6"
          transparent
          opacity={0.08}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
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
}: Pick<
  NexusActSceneProps,
  'progressRef' | 'lensMode' | 'nexusFlightInputRef' | 'collectedEvidenceCores' | 'onCollectEvidenceCore'
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
    if (!rootRef.current) return;
    const local = motionRange(progressRef.current, 0.076, 0.285, reducedMotion);
    const presence = motionRange(progressRef.current, 0.11, 0.145, reducedMotion)
      * (1 - motionRange(progressRef.current, 0.278, 0.31, reducedMotion));
    DRONE_PATH.getPoint(local, targetPosition);
    targetPosition.x += spec.offset[0];
    targetPosition.y += spec.offset[1] + (reducedMotion ? 0 : Math.sin(local * Math.PI * 4) * 0.07);
    rootRef.current.position.lerp(targetPosition, reducedMotion ? 1 : 1 - Math.exp(-delta * 15));
    rootRef.current.rotation.set(local * 4.2 + 0.3, local * 6.4 + 0.6, 0);
    const distance = dronePositionRef.current.distanceTo(targetPosition);
    const proximity = clamp01(1 - distance / 4.6);
    const captureAge = clock.elapsedTime - captureTimeRef.current;
    const captureProgress = clamp01(captureAge / 0.72);
    const captureBurst = !reducedMotion && collected && captureAge >= 0 && captureAge < 0.72;
    const visibleScale = collected
      ? captureBurst ? presence * (1 - captureProgress) * (1 + captureProgress * 2.4) : 0
      : presence;
    rootRef.current.scale.setScalar(THREE.MathUtils.damp(rootRef.current.scale.x, Math.max(0.001, visibleScale * 0.72), 15, delta));
    rootRef.current.visible = presence > 0.005 && (!collected || captureBurst);

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
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.58, 0.028, 8, 36]} />
        <meshBasicMaterial ref={haloMaterialRef} color={spec.color} transparent opacity={0.28} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.43, 0.014, 6, 32]} />
        <meshBasicMaterial color="#e8e5dc" transparent opacity={0.56} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function createEvidenceLabelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 144;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = 'rgba(8, 17, 18, 0.94)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#e7e3d8';
    context.font = '600 36px ui-monospace, monospace';
    context.fillText('AUTHENTIC UE5 CAPTURE', 34, 58);
    context.fillStyle = '#82d6d0';
    context.font = '500 24px ui-monospace, monospace';
    context.fillText('PROJECT NEXUS / SOURCE SURFACE', 34, 105);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function EvidencePanel({
  progressRef,
  lensMode,
  reducedMotion,
}: Pick<NexusActSceneProps, 'progressRef' | 'lensMode'> & { reducedMotion: boolean }) {
  const rootRef = useRef<THREE.Group>(null);
  const frameRef = useRef<THREE.InstancedMesh>(null);
  const sourceTexture = useTexture(NEXUS_FIELD_TEXTURE);
  const texture = useMemo(() => {
    const clone = sourceTexture.clone();
    clone.colorSpace = THREE.SRGBColorSpace;
    clone.anisotropy = 8;
    clone.needsUpdate = true;
    return clone;
  }, [sourceTexture]);
  const labelTexture = useMemo(createEvidenceLabelTexture, []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const accent = useMemo(() => new THREE.Color(), []);
  const frameGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const planeGeometry = useMemo(() => new THREE.PlaneGeometry(6.4, 4.8), []);
  const labelGeometry = useMemo(() => new THREE.PlaneGeometry(6.4, 0.72), []);
  const materials = useMemo(() => ({
    surface: new THREE.MeshBasicMaterial({ map: texture, color: '#ffffff', toneMapped: false }),
    label: new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, toneMapped: false }),
    frame: new THREE.MeshStandardMaterial({
      color: '#1d292a',
      emissive: '#72d9d6',
      emissiveIntensity: 0.72,
      metalness: 0.52,
      roughness: 0.38,
    }),
  }), [labelTexture, texture]);

  useEffect(() => () => {
    texture.dispose();
    labelTexture.dispose();
    frameGeometry.dispose();
    planeGeometry.dispose();
    labelGeometry.dispose();
    Object.values(materials).forEach((material) => material.dispose());
  }, [frameGeometry, labelGeometry, labelTexture, materials, planeGeometry, texture]);

  useLayoutEffect(() => {
    setInstanceTransform(frameRef.current, 0, scratch, 0, 2.46, -0.035, 6.62, 0.09, 0.09);
    setInstanceTransform(frameRef.current, 1, scratch, 0, -2.46, -0.035, 6.62, 0.09, 0.09);
    setInstanceTransform(frameRef.current, 2, scratch, -3.26, 0, -0.035, 0.09, 5.0, 0.09);
    setInstanceTransform(frameRef.current, 3, scratch, 3.26, 0, -0.035, 0.09, 5.0, 0.09);
    setInstanceTransform(frameRef.current, 4, scratch, -2.55, -3.72, -0.08, 0.08, 2.5, 0.08);
    setInstanceTransform(frameRef.current, 5, scratch, 2.55, -3.72, -0.08, 0.08, 2.5, 0.08);
    setInstanceTransform(frameRef.current, 6, scratch, -2.55, -4.97, -0.08, 0.82, 0.08, 0.18);
    setInstanceTransform(frameRef.current, 7, scratch, 2.55, -4.97, -0.08, 0.82, 0.08, 0.18);
    markInstanceMatrixDirty(frameRef.current);
  }, [scratch]);

  useFrame((_, delta) => {
    if (!rootRef.current) return;
    const reveal = motionRange(progressRef.current, 0.137, 0.149, reducedMotion);
    const departure = motionRange(progressRef.current, 0.166, 0.18, reducedMotion);
    const scale = reveal * (1 - departure);
    rootRef.current.scale.setScalar(Math.max(0.001, scale));

    accent.set(LENS_ACCENTS[lensMode]);
    materials.frame.emissive.lerp(accent, reducedMotion ? 1 : 1 - Math.exp(-delta * 16));
    materials.frame.emissiveIntensity = 0.45 + reveal * 0.85;
  });

  return (
    <group ref={rootRef} position={[1.8, 5, -34]} rotation={[0, -0.08, -0.012]} scale={0.001}>
      <mesh geometry={planeGeometry} material={materials.surface} position={[0, 0, 0.01]} />
      <instancedMesh ref={frameRef} args={[frameGeometry, materials.frame, 8]} frustumCulled={false} />
      <mesh geometry={labelGeometry} material={materials.label} position={[0, -2.87, 0.02]} />
    </group>
  );
}

function LensOptic({ progressRef, lensPointerRef, lensMode }: Pick<NexusActSceneProps, 'progressRef' | 'lensPointerRef' | 'lensMode'>) {
  const rootRef = useRef<THREE.Group>(null);
  const segmentRef = useRef<THREE.InstancedMesh>(null);
  const tickRef = useRef<THREE.InstancedMesh>(null);
  const cursor = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const accent = useMemo(() => new THREE.Color(), []);
  const geometries = useMemo(() => ({
    segment: new THREE.RingGeometry(0.9, 0.96, 14, 1, -Math.PI / 6 + 0.055, Math.PI / 3 - 0.11),
    tick: new THREE.PlaneGeometry(0.24, 0.018),
    glass: new THREE.CircleGeometry(0.89, 54),
    center: new THREE.RingGeometry(0.035, 0.047, 24),
  }), []);
  const materials = useMemo(() => ({
    segment: new THREE.MeshBasicMaterial({
      color: '#72d9d6',
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
    tick: new THREE.MeshBasicMaterial({
      color: '#e4e1d9',
      transparent: true,
      opacity: 0.78,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
    glass: new THREE.MeshBasicMaterial({
      color: '#72d9d6',
      transparent: true,
      opacity: 0.025,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  }), []);

  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);

  useLayoutEffect(() => {
    for (let index = 0; index < 6; index += 1) {
      const angle = index * Math.PI / 3;
      setInstanceTransform(segmentRef.current, index, scratch, 0, 0, 0, 1, 1, 1, 0, 0, angle);
      setInstanceTransform(
        tickRef.current,
        index,
        scratch,
        Math.cos(angle) * 1.06,
        Math.sin(angle) * 1.06,
        0,
        1,
        1,
        1,
        0,
        0,
        angle,
      );
    }
    markInstanceMatrixDirty(segmentRef.current);
    markInstanceMatrixDirty(tickRef.current);
  }, [scratch]);

  useFrame(({ camera, size }, delta) => {
    if (!rootRef.current) return;
    const presence = smooth(range(progressRef.current, 0.13, 0.16)) * (1 - smooth(range(progressRef.current, 0.285, 0.31)));
    const lensPointer = lensPointerRef?.current;
    cursor.set((lensPointer?.x ?? 0.76) * 2 - 1, (lensPointer?.y ?? 0.54) * 2 - 1, 0.12).unproject(camera);
    direction.copy(cursor).sub(camera.position).normalize();
    rootRef.current.position.copy(camera.position).add(direction.multiplyScalar(3.1));
    rootRef.current.quaternion.copy(camera.quaternion);
    rootRef.current.rotateZ((progressRef.current - 0.16) * 0.12);
    const scale = (size.width <= 820 ? 0.34 : 0.46) * presence;
    rootRef.current.scale.setScalar(Math.max(0.001, scale));
    rootRef.current.visible = presence > 0.005;

    accent.set(LENS_ACCENTS[lensMode]);
    const transition = 1 - Math.exp(-delta * 18);
    materials.segment.color.lerp(accent, transition);
    materials.glass.color.lerp(accent, transition);
    materials.glass.opacity = THREE.MathUtils.damp(
      materials.glass.opacity,
      lensMode === 'raw' ? 0.022 : 0.05,
      18,
      delta,
    );
  });

  return (
    <group ref={rootRef} visible={false} renderOrder={20}>
      <instancedMesh ref={segmentRef} args={[geometries.segment, materials.segment, 6]} frustumCulled={false} />
      <mesh geometry={geometries.glass} material={materials.glass} position={[0, 0, -0.01]} />
      <instancedMesh ref={tickRef} args={[geometries.tick, materials.tick, 6]} frustumCulled={false} />
      <mesh geometry={geometries.center} material={materials.tick} />
    </group>
  );
}

function CompactLensOptic({
  progressRef,
  lensPointerRef,
  lensMode,
}: Pick<NexusActSceneProps, 'progressRef' | 'lensPointerRef' | 'lensMode'>) {
  const rootRef = useRef<THREE.Mesh>(null);
  const cursor = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const accent = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.RingGeometry(0.87, 0.95, 48), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#72d9d6',
    transparent: true,
    opacity: 0.82,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }), []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(({ camera }, delta) => {
    if (!rootRef.current) return;
    const presence = smooth(range(progressRef.current, 0.13, 0.16))
      * (1 - smooth(range(progressRef.current, 0.285, 0.31)));
    const lensPointer = lensPointerRef.current;
    cursor.set(lensPointer.x * 2 - 1, lensPointer.y * 2 - 1, 0.12).unproject(camera);
    direction.copy(cursor).sub(camera.position).normalize();
    rootRef.current.position.copy(camera.position).add(direction.multiplyScalar(3.1));
    rootRef.current.quaternion.copy(camera.quaternion);
    rootRef.current.rotateZ((progressRef.current - 0.16) * 0.12);
    rootRef.current.scale.setScalar(Math.max(0.001, 0.34 * presence));
    rootRef.current.visible = presence > 0.005;
    accent.set(LENS_ACCENTS[lensMode]);
    material.color.lerp(accent, 1 - Math.exp(-delta * 18));
  });

  return <mesh ref={rootRef} geometry={geometry} material={material} visible={false} renderOrder={20} />;
}

export function NexusActScene(props: NexusActSceneProps) {
  const rootRef = useRef<THREE.Group>(null);
  const dronePositionRef = useRef(new THREE.Vector3(999, 999, 999));
  const reducedMotion = usePrefersReducedMotion();
  const fieldProfile = props.activeChapter === 'field';
  const lensProfile = props.activeChapter === 'lens';

  useFrame(() => {
    if (!rootRef.current) return;
    const progress = props.progressRef.current;
    rootRef.current.visible = progress <= 0.355;
  });

  return (
    <group ref={rootRef} visible={false}>
      {fieldProfile ? (
        <>
          <NexusThresholdEcho
            progressRef={props.progressRef}
            reducedMotion={reducedMotion}
          />
          {props.compact ? (
            <>
              <CompactNexusCity
                progressRef={props.progressRef}
                lensMode={props.lensMode}
                lensPointerRef={props.lensPointerRef}
                reducedMotion={reducedMotion}
              />
              <NexusLivingSignals
                progressRef={props.progressRef}
                lensMode={props.lensMode}
                reducedMotion={reducedMotion}
                compact
              />
            </>
          ) : (
            <>
              <NexusCity {...props} reducedMotion={reducedMotion} />
              <SurveyDrone
                progressRef={props.progressRef}
                lensMode={props.lensMode}
                nexusFlightInputRef={props.nexusFlightInputRef}
                dronePositionRef={dronePositionRef}
                reducedMotion={reducedMotion}
              />
            </>
          )}
        </>
      ) : null}
      {lensProfile ? (
        <>
          <CompactNexusCity
            progressRef={props.progressRef}
            lensMode={props.lensMode}
            lensPointerRef={props.lensPointerRef}
            reducedMotion={reducedMotion}
          />
          <SurveyDroneLite
            progressRef={props.progressRef}
            lensMode={props.lensMode}
            nexusFlightInputRef={props.nexusFlightInputRef}
            dronePositionRef={dronePositionRef}
            reducedMotion={reducedMotion}
          />
          <EvidenceCoreField
            progressRef={props.progressRef}
            lensMode={props.lensMode}
            nexusFlightInputRef={props.nexusFlightInputRef}
            collectedEvidenceCores={props.collectedEvidenceCores}
            onCollectEvidenceCore={props.onCollectEvidenceCore}
            dronePositionRef={dronePositionRef}
            reducedMotion={reducedMotion}
          />
          {!props.compact ? (
            <EvidencePanel
              progressRef={props.progressRef}
              lensMode={props.lensMode}
              reducedMotion={reducedMotion}
            />
          ) : null}
          {props.compact ? (
            <CompactLensOptic
              progressRef={props.progressRef}
              lensPointerRef={props.lensPointerRef}
              lensMode={props.lensMode}
            />
          ) : (
            <LensOptic
              progressRef={props.progressRef}
              lensPointerRef={props.lensPointerRef}
              lensMode={props.lensMode}
            />
          )}
        </>
      ) : null}
    </group>
  );
}

useTexture.preload(NEXUS_FIELD_TEXTURE);
