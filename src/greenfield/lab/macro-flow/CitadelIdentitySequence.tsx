import { useFrame, useThree } from '@react-three/fiber';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { QualityTier } from '../../experience/quality';

type CitadelIdentitySequenceProps = {
  progressRef: MutableRefObject<number>;
  qualityTier: QualityTier;
  reducedMotion: boolean;
};

type SectorMotion = {
  assembledRotation: number;
  rotationDelta: number;
  assembledScaleX: number;
  assembledScaleY: number;
  assembledScaleZ: number;
  radialOffset: number;
  detachX: number;
  detachY: number;
  targetWorldZ: number;
  targetScaleX: number;
  clearanceDistance: number;
  detachSpin: number;
};

type SurfaceProfile = {
  color: THREE.ColorRepresentation;
  emissive: THREE.ColorRepresentation;
  metalness: number;
  roughness: number;
  baseEmissive: number;
  pulseGain: number;
};

type IdentityResources = {
  sectorGeometry: THREE.BufferGeometry;
  coreGeometry: THREE.BufferGeometry;
  jewelGeometry: THREE.OctahedronGeometry;
  tickGeometry: THREE.ExtrudeGeometry;
  identityMaterial: THREE.MeshStandardMaterial;
  identityPulseUniform: { value: number };
  jewelMaterial: THREE.MeshPhysicalMaterial;
  disposableGeometries: THREE.BufferGeometry[];
  disposableMaterials: THREE.Material[];
};

const SECTOR_COUNT = 7;
const SECTOR_STEP = Math.PI / SECTOR_COUNT;
const SECTOR_GAP = 0.082;
const SECTOR_INNER_RADIUS = 2.02;
const SECTOR_OUTER_RADIUS = 3.08;
const SECTOR_DEPTH = 0.54;
const SEAL_POSITION: [number, number, number] = [0, 5.1, 15.72];
const COMPACT_SEAL_POSITION: [number, number, number] = [0, 5.62, 15.72];
const DEPLOYED_WORLD_Z = [14.4, 9.65, 4.9, 0.15, -4.6, -9.35, -14.1];
const DEPLOYED_ROTATIONS = [0, 0.78, -0.78, 0, 0.78, -0.78, 0];
const STONE_ANGLE_OFFSETS = [-0.006, 0.011, -0.008, 0, 0.008, -0.011, 0.006];
const STONE_SCALE_X = [0.94, 1.035, 0.97, 1.075, 0.965, 1.025, 0.945];
const STONE_SCALE_Y = [1.02, 0.975, 1.035, 1.055, 0.985, 1.025, 0.99];
const STONE_SCALE_Z = [0.9, 1.08, 0.96, 1.14, 1.02, 1.1, 0.92];
const STONE_RADIAL_OFFSETS = [-0.025, 0.018, -0.012, 0.055, -0.006, 0.022, -0.02];
const SECTOR_SURFACES: readonly SurfaceProfile[] = [
  {
    color: '#514b43',
    emissive: '#24160d',
    metalness: 0.035,
    roughness: 0.89,
    baseEmissive: 0.045,
    pulseGain: 0.36,
  },
  {
    color: '#62594b',
    emissive: '#281a10',
    metalness: 0.025,
    roughness: 0.84,
    baseEmissive: 0.05,
    pulseGain: 0.38,
  },
  {
    color: '#44453f',
    emissive: '#1b1712',
    metalness: 0.02,
    roughness: 0.92,
    baseEmissive: 0.04,
    pulseGain: 0.32,
  },
  {
    color: '#82715a',
    emissive: '#352111',
    metalness: 0.16,
    roughness: 0.69,
    baseEmissive: 0.075,
    pulseGain: 0.5,
  },
  {
    color: '#4b4c46',
    emissive: '#1c1812',
    metalness: 0.03,
    roughness: 0.9,
    baseEmissive: 0.04,
    pulseGain: 0.33,
  },
  {
    color: '#665e52',
    emissive: '#261a11',
    metalness: 0.025,
    roughness: 0.83,
    baseEmissive: 0.05,
    pulseGain: 0.38,
  },
  {
    color: '#4e4840',
    emissive: '#21160e',
    metalness: 0.035,
    roughness: 0.88,
    baseEmissive: 0.045,
    pulseGain: 0.35,
  },
];

const TICK_SURFACE: SurfaceProfile = {
  color: '#887044',
  emissive: '#6b431e',
  metalness: 0.76,
  roughness: 0.5,
  baseEmissive: 0.14,
  pulseGain: 0.92,
};

const SHIELD_SURFACE: SurfaceProfile = {
  color: '#252827',
  emissive: '#16120e',
  metalness: 0.42,
  roughness: 0.72,
  baseEmissive: 0.06,
  pulseGain: 0.42,
};

const SHIELD_INSET_SURFACE: SurfaceProfile = {
  color: '#171a1a',
  emissive: '#0d0e0d',
  metalness: 0.62,
  roughness: 0.55,
  baseEmissive: 0.045,
  pulseGain: 0.32,
};

const PATINATED_BRASS_SURFACE: SurfaceProfile = {
  color: '#8e7747',
  emissive: '#68421f',
  metalness: 0.78,
  roughness: 0.48,
  baseEmissive: 0.14,
  pulseGain: 0.82,
};

const BEAR_SURFACE: SurfaceProfile = {
  color: '#aa8d50',
  emissive: '#754822',
  metalness: 0.79,
  roughness: 0.43,
  baseEmissive: 0.17,
  pulseGain: 0.88,
};

const BEAR_RECESS_SURFACE: SurfaceProfile = {
  color: '#25241f',
  emissive: '#130d09',
  metalness: 0.34,
  roughness: 0.72,
  baseEmissive: 0.035,
  pulseGain: 0.2,
};

const SECTOR_MOTIONS: SectorMotion[] = Array.from({ length: SECTOR_COUNT }, (_, index) => {
  const assembledRotation = (index - Math.floor(SECTOR_COUNT / 2)) * SECTOR_STEP
    + STONE_ANGLE_OFFSETS[index];
  const targetRotation = DEPLOYED_ROTATIONS[index];
  const rotationDelta = Math.atan2(
    Math.sin(targetRotation - assembledRotation),
    Math.cos(targetRotation - assembledRotation),
  );
  const centerAngle = Math.PI / 2 + assembledRotation;

  return {
    assembledRotation,
    rotationDelta,
    assembledScaleX: STONE_SCALE_X[index],
    assembledScaleY: STONE_SCALE_Y[index],
    assembledScaleZ: STONE_SCALE_Z[index],
    radialOffset: STONE_RADIAL_OFFSETS[index],
    detachX: Math.cos(centerAngle) * (0.24 + index * 0.012),
    detachY: Math.sin(centerAngle) * (0.24 + index * 0.012),
    targetWorldZ: DEPLOYED_WORLD_Z[index],
    targetScaleX: 1.58 + (index % 3) * 0.08,
    clearanceDistance: 8 + index * 1.15,
    detachSpin: (index % 2 === 0 ? 1 : -1) * (0.045 + index * 0.006),
  };
});

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

function createVoussoirShape(
  innerRadius = SECTOR_INNER_RADIUS,
  outerRadius = SECTOR_OUTER_RADIUS,
  arcInset = 0,
) {
  const halfArc = (SECTOR_STEP - SECTOR_GAP - arcInset) / 2;
  const center = Math.PI / 2;
  const start = center - halfArc;
  const end = center + halfArc;
  const shape = new THREE.Shape();
  const outerJitter = [0.01, -0.025, 0.035, -0.012, 0.022, -0.018];
  const innerJitter = [-0.012, 0.022, -0.028, 0.018, -0.016, 0.008];
  const samples = outerJitter.length;

  for (let index = 0; index < samples; index += 1) {
    const unit = index / (samples - 1);
    const angle = THREE.MathUtils.lerp(start, end, unit);
    const radius = outerRadius + outerJitter[index];
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let index = samples - 1; index >= 0; index -= 1) {
    const unit = index / (samples - 1);
    const angle = THREE.MathUtils.lerp(start, end, unit);
    const radius = innerRadius + innerJitter[index];
    shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  shape.closePath();
  return shape;
}

function traceShield(path: THREE.Path | THREE.Shape, scale = 1) {
  path.moveTo(0, 1.66 * scale);
  path.bezierCurveTo(0.54 * scale, 1.58 * scale, 1.12 * scale, 1.38 * scale, 1.4 * scale, 0.94 * scale);
  path.lineTo(1.24 * scale, -0.46 * scale);
  path.bezierCurveTo(1.08 * scale, -0.94 * scale, 0.58 * scale, -1.34 * scale, 0, -1.72 * scale);
  path.bezierCurveTo(-0.58 * scale, -1.34 * scale, -1.08 * scale, -0.94 * scale, -1.24 * scale, -0.46 * scale);
  path.lineTo(-1.4 * scale, 0.94 * scale);
  path.bezierCurveTo(-1.12 * scale, 1.38 * scale, -0.54 * scale, 1.58 * scale, 0, 1.66 * scale);
  path.closePath();
}

function createShieldShape(scale = 1) {
  const shape = new THREE.Shape();
  traceShield(shape, scale);
  return shape;
}

function createShieldFrameShape() {
  const frame = createShieldShape();
  const inset = createShieldShape(0.84).getPoints(24).reverse();
  const hole = new THREE.Path();
  hole.setFromPoints(inset);
  hole.closePath();
  frame.holes.push(hole);
  return frame;
}

function createBearHeadShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -1.17);
  shape.bezierCurveTo(0.46, -1.1, 0.78, -0.79, 0.92, -0.37);
  shape.bezierCurveTo(1.02, -0.08, 0.97, 0.32, 0.79, 0.57);
  shape.bezierCurveTo(1.02, 0.7, 1.08, 1.02, 0.9, 1.22);
  shape.bezierCurveTo(0.73, 1.4, 0.47, 1.34, 0.33, 1.12);
  shape.bezierCurveTo(0.13, 1.23, -0.13, 1.23, -0.33, 1.12);
  shape.bezierCurveTo(-0.47, 1.34, -0.73, 1.4, -0.9, 1.22);
  shape.bezierCurveTo(-1.08, 1.02, -1.02, 0.7, -0.79, 0.57);
  shape.bezierCurveTo(-0.97, 0.32, -1.02, -0.08, -0.92, -0.37);
  shape.bezierCurveTo(-0.78, -0.79, -0.46, -1.1, 0, -1.17);
  shape.closePath();
  return shape;
}

function createBrowShape(side: -1 | 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0.07 * side, 0.49);
  shape.lineTo(0.31 * side, 0.59);
  shape.lineTo(0.62 * side, 0.45);
  shape.lineTo(0.5 * side, 0.28);
  shape.lineTo(0.2 * side, 0.33);
  shape.closePath();
  return shape;
}

function createForeheadShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.02);
  shape.lineTo(0.34, 0.72);
  shape.lineTo(0.25, 0.24);
  shape.lineTo(0, 0.03);
  shape.lineTo(-0.25, 0.24);
  shape.lineTo(-0.34, 0.72);
  shape.closePath();
  return shape;
}

function createCheekShape(side: -1 | 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0.08 * side, 0.16);
  shape.lineTo(0.41 * side, 0.27);
  shape.lineTo(0.68 * side, -0.08);
  shape.lineTo(0.45 * side, -0.53);
  shape.lineTo(0.16 * side, -0.34);
  shape.closePath();
  return shape;
}

function createKeyShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.14, -0.075);
  shape.lineTo(0.14, -0.075);
  shape.lineTo(0.11, 0.09);
  shape.lineTo(-0.11, 0.09);
  shape.closePath();
  return shape;
}

function centerExtrusion(geometry: THREE.ExtrudeGeometry, depth: number) {
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function prepareCorePiece(
  source: THREE.BufferGeometry,
  profile: SurfaceProfile,
) {
  const geometry = source.index ? source.toNonIndexed() : source;
  if (geometry !== source) source.dispose();
  geometry.computeVertexNormals();
  setVertexSurfaceAttributes(geometry, profile);
  return geometry;
}

function repeatValues(values: readonly number[], count: number) {
  const data = new Float32Array(values.length * count);
  for (let index = 0; index < count; index += 1) {
    data.set(values, index * values.length);
  }
  return data;
}

function setVertexSurfaceAttributes(
  geometry: THREE.BufferGeometry,
  profile: SurfaceProfile,
) {
  const vertexCount = geometry.getAttribute('position').count;
  const color = new THREE.Color(profile.color);
  const emissive = new THREE.Color(profile.emissive);

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(
    repeatValues([color.r, color.g, color.b], vertexCount),
    3,
  ));
  geometry.setAttribute('surfaceResponse', new THREE.Float32BufferAttribute(
    repeatValues([
      profile.metalness,
      profile.roughness,
      profile.baseEmissive,
      profile.pulseGain,
    ], vertexCount),
    4,
  ));
  geometry.setAttribute('surfaceEmissive', new THREE.Float32BufferAttribute(
    repeatValues([emissive.r, emissive.g, emissive.b], vertexCount),
    3,
  ));
}

function setInstancedSectorAttributes(geometry: THREE.BufferGeometry) {
  const vertexCount = geometry.getAttribute('position').count;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(
    repeatValues([1, 1, 1], vertexCount),
    3,
  ));

  const responses = new Float32Array(SECTOR_COUNT * 4);
  const emissives = new Float32Array(SECTOR_COUNT * 3);
  SECTOR_SURFACES.forEach((profile, index) => {
    const emissive = new THREE.Color(profile.emissive);
    responses.set([
      profile.metalness,
      profile.roughness,
      profile.baseEmissive,
      profile.pulseGain,
    ], index * 4);
    emissives.set([emissive.r, emissive.g, emissive.b], index * 3);
  });

  geometry.setAttribute(
    'surfaceResponse',
    new THREE.InstancedBufferAttribute(responses, 4),
  );
  geometry.setAttribute(
    'surfaceEmissive',
    new THREE.InstancedBufferAttribute(emissives, 3),
  );
}

function createIdentityMaterial(
  qualityTier: QualityTier,
  pulseUniform: { value: number },
  compact: boolean,
) {
  const material = new THREE.MeshStandardMaterial({
    name: 'Citadel identity surfaces',
    color: '#ffffff',
    emissive: compact ? '#593519' : '#080604',
    emissiveIntensity: compact ? 0.66 : 0.12,
    metalness: 1,
    roughness: 1,
    vertexColors: true,
    envMapIntensity: qualityTier === 'cinematic' ? 0.72 : qualityTier === 'composed' ? 0.54 : 0.4,
    dithering: true,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uIdentityPulse = pulseUniform;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec4 surfaceResponse;
attribute vec3 surfaceEmissive;
varying vec4 vSurfaceResponse;
varying vec3 vSurfaceEmissive;
varying vec3 vIdentityPosition;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vSurfaceResponse = surfaceResponse;
vSurfaceEmissive = surfaceEmissive;
vIdentityPosition = transformed;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uIdentityPulse;
varying vec4 vSurfaceResponse;
varying vec3 vSurfaceEmissive;
varying vec3 vIdentityPosition;

float identityHash(vec3 value) {
  value = fract(value * 0.1031);
  value += dot(value, value.yzx + 33.33);
  return fract((value.x + value.y) * value.z);
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float identityGrain = identityHash(vIdentityPosition * vec3(7.7, 9.3, 11.1));
float identityLargeGrain = identityHash(vIdentityPosition * 1.73 + vec3(4.2, 1.7, 8.4));
float identityStone = 1.0 - smoothstep(0.18, 0.52, vSurfaceResponse.x);
float identityBrass = smoothstep(0.58, 0.82, vSurfaceResponse.x);
float identityPatina = smoothstep(0.72, 0.96, identityLargeGrain) * identityBrass;
diffuseColor.rgb *= mix(0.91, 1.075, identityGrain * (0.68 + identityStone * 0.32));
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  diffuseColor.rgb * vec3(0.48, 0.9, 0.72),
  identityPatina * 0.3
);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(
  roughnessFactor * vSurfaceResponse.y + (identityGrain - 0.5) * (0.12 + identityStone * 0.1),
  0.08,
  1.0
);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
metalnessFactor = clamp(metalnessFactor * vSurfaceResponse.x, 0.0, 1.0);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
totalEmissiveRadiance += vSurfaceEmissive
  * (vSurfaceResponse.z + uIdentityPulse * vSurfaceResponse.w);
totalEmissiveRadiance += diffuseColor.rgb
  * ${compact ? '0.2' : '0.0'}
  * (0.34 + identityBrass * 0.66);
float identityFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
float identityRim = pow(1.0 - identityFacing, 3.1);
totalEmissiveRadiance += vec3(1.0, 0.43, 0.14)
  * identityRim
  * ${compact ? '0.34' : '0.13'}
  * (0.55 + identityBrass * 0.45);`,
      );
  };
  material.customProgramCacheKey = () => `citadel-identity-surface-v2-${compact ? 'compact' : 'desktop'}`;
  return material;
}

function createIdentityResources(qualityTier: QualityTier, compact: boolean): IdentityResources {
  const curveSegments = qualityTier === 'cinematic' ? 24 : qualityTier === 'composed' ? 18 : 12;
  const bevelSegments = qualityTier === 'cinematic' ? 2 : 1;
  const sectorBase = centerExtrusion(
    new THREE.ExtrudeGeometry(createVoussoirShape(), {
      depth: SECTOR_DEPTH,
      steps: 1,
      curveSegments,
      bevelEnabled: true,
      bevelSize: 0.058,
      bevelThickness: 0.072,
      bevelSegments,
    }),
    SECTOR_DEPTH,
  );
  const sectorFaceDepth = 0.13;
  const sectorFace = centerExtrusion(
    new THREE.ExtrudeGeometry(createVoussoirShape(2.11, 2.98, 0.026), {
      depth: sectorFaceDepth,
      steps: 1,
      curveSegments,
      bevelEnabled: true,
      bevelSize: 0.032,
      bevelThickness: 0.032,
      bevelSegments,
    }),
    sectorFaceDepth,
  );
  sectorFace.translate(0, 0, 0.3);
  const sectorGeometry = mergeGeometries([sectorBase, sectorFace], false);
  sectorBase.dispose();
  sectorFace.dispose();
  if (!sectorGeometry) throw new Error('Citadel voussoir geometry could not be merged.');
  sectorGeometry.name = 'Seven irregular citadel voussoirs';
  sectorGeometry.computeBoundingSphere();
  setInstancedSectorAttributes(sectorGeometry);

  const shieldDepth = 0.32;
  const shieldGeometry = prepareCorePiece(centerExtrusion(
    new THREE.ExtrudeGeometry(createShieldShape(), {
      depth: shieldDepth,
      steps: 1,
      curveSegments,
      bevelEnabled: true,
      bevelSize: 0.065,
      bevelThickness: 0.06,
      bevelSegments,
    }),
    shieldDepth,
  ).translate(0, 0, 0.12), SHIELD_SURFACE);

  const insetDepth = 0.18;
  const shieldInsetGeometry = prepareCorePiece(centerExtrusion(
    new THREE.ExtrudeGeometry(createShieldShape(0.83), {
      depth: insetDepth,
      steps: 1,
      curveSegments,
      bevelEnabled: true,
      bevelSize: 0.035,
      bevelThickness: 0.04,
      bevelSegments,
    }),
    insetDepth,
  ).translate(0, 0, 0.33), SHIELD_INSET_SURFACE);

  const frameDepth = 0.14;
  const shieldFrameGeometry = prepareCorePiece(centerExtrusion(
    new THREE.ExtrudeGeometry(createShieldFrameShape(), {
      depth: frameDepth,
      steps: 1,
      curveSegments,
      bevelEnabled: true,
      bevelSize: 0.026,
      bevelThickness: 0.034,
      bevelSegments,
    }),
    frameDepth,
  ).translate(0, 0, 0.39), PATINATED_BRASS_SURFACE);

  const bearDepth = 0.22;
  const bearGeometry = prepareCorePiece(centerExtrusion(
    new THREE.ExtrudeGeometry(createBearHeadShape(), {
      depth: bearDepth,
      steps: 1,
      curveSegments,
      bevelEnabled: true,
      bevelSize: 0.045,
      bevelThickness: 0.044,
      bevelSegments,
    }),
    bearDepth,
  ).scale(0.78, 0.91, 1).translate(0, -0.015, 0.53), BEAR_SURFACE);

  const reliefSegments = qualityTier === 'cinematic' ? 20 : qualityTier === 'composed' ? 16 : 12;
  const muzzleGeometry = new THREE.SphereGeometry(0.46, reliefSegments, Math.max(8, reliefSegments / 2));
  muzzleGeometry.scale(0.96, 0.5, 0.28);
  muzzleGeometry.translate(0, -0.47, 0.79);
  const preparedMuzzle = prepareCorePiece(muzzleGeometry, PATINATED_BRASS_SURFACE);

  const foreheadGeometry = prepareCorePiece(centerExtrusion(
    new THREE.ExtrudeGeometry(createForeheadShape(), {
      depth: 0.12,
      steps: 1,
      curveSegments: Math.max(8, Math.round(curveSegments / 2)),
      bevelEnabled: true,
      bevelSize: 0.022,
      bevelThickness: 0.026,
      bevelSegments: 1,
    }),
    0.12,
  ).translate(0, 0, 0.76), BEAR_SURFACE);

  const browGeometries = ([-1, 1] as const).map((side) => prepareCorePiece(centerExtrusion(
    new THREE.ExtrudeGeometry(createBrowShape(side), {
      depth: 0.1,
      steps: 1,
      curveSegments: Math.max(8, Math.round(curveSegments / 2)),
      bevelEnabled: true,
      bevelSize: 0.018,
      bevelThickness: 0.022,
      bevelSegments: 1,
    }),
    0.1,
  ).translate(0, 0, 0.79), PATINATED_BRASS_SURFACE));

  const cheekGeometries = ([-1, 1] as const).map((side) => prepareCorePiece(centerExtrusion(
    new THREE.ExtrudeGeometry(createCheekShape(side), {
      depth: 0.095,
      steps: 1,
      curveSegments: Math.max(8, Math.round(curveSegments / 2)),
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.024,
      bevelSegments: 1,
    }),
    0.095,
  ).translate(0, 0, 0.77), BEAR_SURFACE));

  const recessGeometries: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const eye = new THREE.SphereGeometry(0.105, Math.max(10, reliefSegments), 8);
    eye.scale(0.9, 0.42, 0.28);
    eye.translate(side * 0.29, 0.25, 0.88);
    recessGeometries.push(prepareCorePiece(eye, BEAR_RECESS_SURFACE));
  }

  const corePieces = [
    shieldGeometry,
    shieldInsetGeometry,
    shieldFrameGeometry,
    bearGeometry,
    preparedMuzzle,
    foreheadGeometry,
    ...browGeometries,
    ...cheekGeometries,
    ...recessGeometries,
  ];
  const coreGeometry = mergeGeometries(corePieces, false);
  corePieces.forEach((geometry) => geometry.dispose());
  if (!coreGeometry) {
    throw new Error('Citadel identity core geometry could not be merged.');
  }
  coreGeometry.name = 'Citadel identity core';
  coreGeometry.computeBoundingSphere();

  const jewelGeometry = new THREE.OctahedronGeometry(0.16, 0);
  const tickDepth = 0.1;
  const tickGeometry = centerExtrusion(new THREE.ExtrudeGeometry(createKeyShape(), {
    depth: tickDepth,
    steps: 1,
    curveSegments: 6,
    bevelEnabled: true,
    bevelSize: 0.014,
    bevelThickness: 0.016,
    bevelSegments: 1,
  }), tickDepth);
  setVertexSurfaceAttributes(tickGeometry, TICK_SURFACE);
  const identityPulseUniform = { value: 0 };
  const identityMaterial = createIdentityMaterial(qualityTier, identityPulseUniform, compact);

  const jewelMaterial = new THREE.MeshPhysicalMaterial({
    name: 'Garnet enamel',
    color: '#551419',
    emissive: '#4d0d12',
    emissiveIntensity: 0.18,
    metalness: 0.12,
    roughness: 0.42,
    clearcoat: 0.28,
    clearcoatRoughness: 0.4,
    envMapIntensity: qualityTier === 'cinematic' ? 0.78 : 0.48,
    dithering: true,
  });
  const disposableGeometries: THREE.BufferGeometry[] = [
    sectorGeometry,
    coreGeometry,
    jewelGeometry,
    tickGeometry,
  ];
  const disposableMaterials: THREE.Material[] = [
    identityMaterial,
    jewelMaterial,
  ];

  return {
    sectorGeometry,
    coreGeometry,
    jewelGeometry,
    tickGeometry,
    identityMaterial,
    identityPulseUniform,
    jewelMaterial,
    disposableGeometries,
    disposableMaterials,
  };
}

export function CitadelIdentitySequence({
  progressRef,
  qualityTier,
  reducedMotion,
}: CitadelIdentitySequenceProps) {
  const compact = useThree((state) => state.size.width <= 820);
  const rootRef = useRef<THREE.Group>(null);
  const centerRef = useRef<THREE.Group>(null);
  const sectorRef = useRef<THREE.InstancedMesh>(null);
  const tickRef = useRef<THREE.InstancedMesh>(null);
  const jewelRef = useRef<THREE.Mesh>(null);
  const sectorTransform = useMemo(() => new THREE.Object3D(), []);
  const tickTransform = useMemo(() => new THREE.Object3D(), []);
  const resources = useMemo(
    () => createIdentityResources(qualityTier, compact),
    [compact, qualityTier],
  );

  useLayoutEffect(() => {
    const sectors = sectorRef.current;
    const ticks = tickRef.current;
    if (!sectors || !ticks) return;

    const sectorColor = new THREE.Color();
    sectors.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let index = 0; index < SECTOR_COUNT; index += 1) {
      const motion = SECTOR_MOTIONS[index];
      const angle = Math.PI / 2 + motion.assembledRotation;
      sectorTransform.position.set(
        Math.cos(angle) * motion.radialOffset,
        Math.sin(angle) * motion.radialOffset,
        0,
      );
      sectorTransform.rotation.set(0, 0, motion.assembledRotation);
      sectorTransform.scale.set(
        motion.assembledScaleX,
        motion.assembledScaleY,
        motion.assembledScaleZ,
      );
      sectorTransform.updateMatrix();
      sectors.setMatrixAt(index, sectorTransform.matrix);
      sectors.setColorAt(index, sectorColor.set(SECTOR_SURFACES[index].color));
    }
    sectors.instanceMatrix.needsUpdate = true;
    if (sectors.instanceColor) sectors.instanceColor.needsUpdate = true;

    ticks.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    for (let index = 0; index < SECTOR_COUNT; index += 1) {
      const angle = Math.PI / 2 + SECTOR_MOTIONS[index].assembledRotation;
      tickTransform.position.set(Math.cos(angle) * 1.88, Math.sin(angle) * 1.88, 0.43);
      tickTransform.rotation.set(0, 0, angle - Math.PI / 2);
      tickTransform.scale.set(
        0.9 + (index % 3) * 0.07,
        index === 3 ? 1.3 : 0.96 + (index % 2) * 0.1,
        1,
      );
      tickTransform.updateMatrix();
      ticks.setMatrixAt(index, tickTransform.matrix);
    }
    ticks.instanceMatrix.needsUpdate = true;
  }, [resources, sectorTransform, tickTransform]);

  useEffect(() => {
    const lab = document.querySelector<HTMLElement>('.mf-lab');
    if (!lab) return;
    lab.dataset.identitySequence = 'active';

    return () => {
      if (lab.dataset.identitySequence === 'active') {
        delete lab.dataset.identitySequence;
      }
    };
  }, []);

  useEffect(() => () => {
    resources.disposableGeometries.forEach((geometry) => geometry.dispose());
    resources.disposableMaterials.forEach((material) => material.dispose());
  }, [resources]);

  useFrame(({ clock }) => {
    const root = rootRef.current;
    const center = centerRef.current;
    const sectors = sectorRef.current;
    if (!root || !center || !sectors) return;

    const progress = clamp01(progressRef.current);
    root.visible = progress < 0.142;
    if (!root.visible) return;

    const breathEnvelope = reducedMotion ? 0 : 1 - smooth(range(progress, 0.025, 0.035));
    const signalUnit = range(progress, 0.016, 0.044);
    const signalPulse = reducedMotion ? 0 : Math.sin(signalUnit * Math.PI);
    const activation = motionRange(progress, 0.016, 0.044, reducedMotion);
    const centerRetreat = motionRange(progress, 0.048, 0.096, reducedMotion);
    const clearance = motionRange(progress, 0.116, 0.136, reducedMotion);

    for (let index = 0; index < SECTOR_COUNT; index += 1) {
      const motion = SECTOR_MOTIONS[index];
      const detach = motionRange(
        progress,
        0.035 + index * 0.003,
        0.054 + index * 0.003,
        reducedMotion,
      );
      const deploy = motionRange(
        progress,
        0.058 + index * 0.003,
        0.1 + index * 0.003,
        reducedMotion,
      );
      const breath = Math.sin(clock.elapsedTime * 0.82 + index * 0.41) * 0.006 * breathEnvelope;
      const assembledScale = 1 + breath + detach * 0.028 * (1 - deploy);
      const collapseScale = THREE.MathUtils.lerp(1, 0.26, clearance);
      const collapseDepth = THREE.MathUtils.lerp(1, 0.58, clearance);
      const targetLocalZ = motion.targetWorldZ - SEAL_POSITION[2] - clearance * motion.clearanceDistance;
      const centerAngle = Math.PI / 2 + motion.assembledRotation;
      const assembledX = Math.cos(centerAngle) * motion.radialOffset;
      const assembledY = Math.sin(centerAngle) * motion.radialOffset;

      sectorTransform.position.set(
        (assembledX + motion.detachX * detach) * (1 - deploy),
        (assembledY + motion.detachY * detach) * (1 - deploy),
        THREE.MathUtils.lerp(detach * 0.16, targetLocalZ, deploy),
      );
      sectorTransform.rotation.set(
        (index % 2 === 0 ? -1 : 1) * deploy * 0.028,
        (index % 3 - 1) * deploy * 0.022,
        motion.assembledRotation
          + motion.detachSpin * detach * (1 - deploy)
          + motion.rotationDelta * deploy,
      );
      sectorTransform.scale.set(
        THREE.MathUtils.lerp(
          motion.assembledScaleX * assembledScale,
          motion.targetScaleX,
          deploy,
        ) * collapseScale,
        THREE.MathUtils.lerp(
          motion.assembledScaleY * assembledScale,
          0.84,
          deploy,
        ) * collapseScale,
        THREE.MathUtils.lerp(
          motion.assembledScaleZ * assembledScale,
          6.2,
          deploy,
        ) * collapseDepth,
      );
      sectorTransform.updateMatrix();
      sectors.setMatrixAt(index, sectorTransform.matrix);
    }
    sectors.instanceMatrix.needsUpdate = true;
    resources.identityPulseUniform.value = (compact ? 0.58 : 0.035)
      + signalPulse * 1.08
      + activation * (1 - clearance) * 0.08;

    const centerBreath = Math.sin(clock.elapsedTime * 0.82) * 0.006 * breathEnvelope;
    const centerScale = (1 + centerBreath + signalPulse * 0.025) * (1 - centerRetreat * 0.945);
    center.position.z = -21 * centerRetreat;
    center.rotation.z = centerBreath * 0.5 + centerRetreat * 0.035;
    center.scale.setScalar(centerScale);

    resources.jewelMaterial.emissiveIntensity = (compact ? 0.42 : 0.18) + signalPulse * 1.02;
    if (jewelRef.current) {
      const jewelScale = 1 + signalPulse * 0.28;
      jewelRef.current.scale.set(
        jewelScale * 1.28,
        jewelScale * 0.82,
        jewelScale * 0.48,
      );
    }
  });

  return (
    <group
      ref={rootRef}
      position={compact ? COMPACT_SEAL_POSITION : SEAL_POSITION}
      scale={compact ? 1.1 : 1}
    >
      <instancedMesh
        ref={sectorRef}
        args={[resources.sectorGeometry, resources.identityMaterial, SECTOR_COUNT]}
        frustumCulled={false}
      />

      <group ref={centerRef}>
        <mesh
          geometry={resources.coreGeometry}
          material={resources.identityMaterial}
          frustumCulled={false}
        />
        <mesh
          ref={jewelRef}
          geometry={resources.jewelGeometry}
          material={resources.jewelMaterial}
          position={[0, -0.34, 0.96]}
          rotation={[0, 0, Math.PI / 4]}
          scale={[1.28, 0.82, 0.48]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={tickRef}
          args={[resources.tickGeometry, resources.identityMaterial, SECTOR_COUNT]}
          frustumCulled={false}
        />
      </group>
    </group>
  );
}
