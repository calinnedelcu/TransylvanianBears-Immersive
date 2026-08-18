import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { QualityTier } from '../../experience/quality';

type CarpathianThresholdProps = {
  progressRef: MutableRefObject<number>;
  qualityTier: QualityTier;
  reducedMotion: boolean;
  atmosphereEnabled?: boolean;
  realtimeLightEnabled?: boolean;
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

function seeded(seed: number) {
  const value = Math.sin(seed * 91.371 + 17.17) * 43758.5453;
  return value - Math.floor(value);
}

const MOON_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const MOON_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  float valueNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(
      mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), local.x),
      mix(hash21(cell + vec2(0.0, 1.0)), hash21(cell + vec2(1.0)), local.x),
      local.y
    );
  }

  float crater(vec2 point, vec2 center, float radius) {
    float distanceToCenter = length(point - center);
    float bowl = 1.0 - smoothstep(radius * 0.25, radius, distanceToCenter);
    float rim = smoothstep(radius * 0.58, radius * 0.82, distanceToCenter)
      * (1.0 - smoothstep(radius * 0.82, radius, distanceToCenter));
    return rim * 0.42 - bowl * 0.3;
  }

  void main() {
    vec2 point = vUv - 0.5;
    float radius = length(point) * 2.0;
    float limb = 1.0 - smoothstep(0.65, 0.71, radius);
    float halo = (1.0 - smoothstep(0.69, 1.0, radius)) * 0.07;
    vec2 moonUv = point / 0.7 + 0.5;
    float terrain = valueNoise(moonUv * 8.0) * 0.12 + valueNoise(moonUv * 19.0) * 0.055;
    terrain += crater(moonUv, vec2(0.31, 0.63), 0.18);
    terrain += crater(moonUv, vec2(0.62, 0.7), 0.1);
    terrain += crater(moonUv, vec2(0.68, 0.37), 0.15);
    terrain += crater(moonUv, vec2(0.43, 0.29), 0.085);
    float cloudVeil = smoothstep(
      0.46,
      0.72,
      valueNoise(vec2(moonUv.x * 3.2, moonUv.y * 14.0 + 2.7))
    );
    vec3 coldStone = vec3(0.61, 0.67, 0.64);
    vec3 litStone = vec3(0.82, 0.84, 0.78);
    vec3 color = mix(coldStone, litStone, 0.52 + terrain);
    color *= 0.72 + limb * 0.34;
    color = mix(color, vec3(0.43, 0.52, 0.51), cloudVeil * 0.2);
    gl_FragColor = vec4(color, max(limb * 0.86, halo));
  }
`;

function setInstanceTransform(
  mesh: THREE.InstancedMesh | null,
  index: number,
  scratch: THREE.Object3D,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
  rotation: [number, number, number] = [0, 0, 0],
) {
  if (!mesh) return;
  scratch.position.set(...position);
  scratch.rotation.set(...rotation);
  scratch.scale.set(...scale);
  scratch.updateMatrix();
  mesh.setMatrixAt(index, scratch.matrix);
}

function markInstanceMatrixDirty(mesh: THREE.InstancedMesh | null) {
  if (mesh) mesh.instanceMatrix.needsUpdate = true;
}

function createRidgeShape(seedOffset: number, width: number, height: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -4);
  for (let index = 0; index <= 44; index += 1) {
    const phase = index / 44;
    const x = -width / 2 + phase * width;
    const broadRange = Math.sin(phase * Math.PI * 3.1 + seedOffset * 0.03) * 0.19;
    const secondaryRange = Math.sin(phase * Math.PI * 8.4 + seedOffset * 0.11) * 0.09;
    const peak = 0.48 + broadRange + secondaryRange + seeded(seedOffset + index) * 0.17;
    shape.lineTo(x, peak * height);
  }
  shape.lineTo(width / 2, -4);
  shape.closePath();
  return shape;
}

function applyVertexColor<T extends THREE.BufferGeometry>(geometry: T, color: THREE.ColorRepresentation) {
  const tint = new THREE.Color(color);
  const colors = new Float32Array(geometry.getAttribute('position').count * 3);
  for (let index = 0; index < colors.length; index += 3) {
    colors[index] = tint.r;
    colors[index + 1] = tint.g;
    colors[index + 2] = tint.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function CarpathianBackdrop({ progressRef, qualityTier, reducedMotion }: CarpathianThresholdProps) {
  const compact = useThree((state) => state.size.width <= 820);
  const rootRef = useRef<THREE.Group>(null);
  const treeRef = useRef<THREE.InstancedMesh>(null);
  const towerRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const treeCount = compact ? 34 : qualityTier === 'cinematic' ? 74 : 52;
  const towerCount = compact ? 7 : 12;
  const lightCount = compact ? 18 : 36;
  const ridgeGeometry = useMemo(() => {
    const layers = [
      { shape: createRidgeShape(131, 56, 8.5), color: '#102321', position: [0, 2.6, 1.8] },
      { shape: createRidgeShape(271, 60, 6.4), color: '#0c1b1a', position: [-2.5, 2.15, 4.6] },
      { shape: createRidgeShape(419, 64, 4.9), color: '#091413', position: [3, 1.7, 7.2] },
    ] as const;
    const geometries = layers.map(({ shape, color, position }) => {
      const geometry = applyVertexColor(new THREE.ShapeGeometry(shape), color);
      geometry.translate(position[0], position[1], position[2]);
      return geometry;
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) throw new Error('Unable to batch Carpathian ridge geometry');
    return merged;
  }, []);
  const ridgeMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    vertexColors: true,
    fog: true,
  }), []);
  const geometries = useMemo(() => ({
    tree: new THREE.ConeGeometry(0.72, 3.4, 6),
    tower: new THREE.BoxGeometry(1, 1, 1),
    roof: new THREE.ConeGeometry(0.72, 1.8, 4),
    light: new THREE.PlaneGeometry(1, 1),
  }), []);
  const materials = useMemo(() => ({
    tree: new THREE.MeshBasicMaterial({ color: '#091412', fog: true }),
    tower: new THREE.MeshBasicMaterial({ color: '#101817', fog: true }),
    roof: new THREE.MeshBasicMaterial({ color: '#090d0d', fog: true }),
    light: new THREE.MeshBasicMaterial({
      color: '#efb969',
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      toneMapped: false,
    }),
  }), []);

  useLayoutEffect(() => {
    for (let index = 0; index < treeCount; index += 1) {
      const depthBand = index % 3;
      const x = -25 + seeded(index + 901) * 50;
      const scale = 0.72 + seeded(index + 941) * 1.28;
      setInstanceTransform(
        treeRef.current,
        index,
        scratch,
        [x, 2.05 + depthBand * 0.34, 8.6 + depthBand * 1.12],
        [scale, scale * (1.08 + seeded(index + 951) * 0.34), scale],
        [0, seeded(index + 961) * Math.PI, 0],
      );
    }

    for (let index = 0; index < towerCount; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const x = side * (9.5 + Math.floor(index / 2) * 2.7);
      const height = 1.8 + seeded(index + 1001) * 2.8;
      setInstanceTransform(towerRef.current, index, scratch, [x, height / 2 + 1.5, 8.15], [0.9, height, 0.82]);
      setInstanceTransform(roofRef.current, index, scratch, [x, height + 2.36, 8.15], [1, 1, 1], [0, Math.PI / 4, 0]);
    }

    for (let index = 0; index < lightCount; index += 1) {
      const x = -20 + seeded(index + 1081) * 40;
      const y = 2.8 + seeded(index + 1091) * 4.8;
      setInstanceTransform(
        lightRef.current,
        index,
        scratch,
        [x, y, 8.65 + seeded(index + 1101) * 0.9],
        [0.1 + seeded(index + 1111) * 0.1, 0.16 + seeded(index + 1121) * 0.16, 1],
      );
    }

    [treeRef.current, towerRef.current, roofRef.current, lightRef.current]
      .forEach(markInstanceMatrixDirty);
  }, [lightCount, scratch, towerCount, treeCount]);

  useEffect(() => () => {
    ridgeGeometry.dispose();
    ridgeMaterial.dispose();
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials, ridgeGeometry, ridgeMaterial]);

  useFrame(({ clock }) => {
    const departure = smooth(range(progressRef.current, 0.044, 0.076));
    const root = rootRef.current;
    if (!root) return;
    root.visible = departure < 0.995;
    if (!root.visible) return;
    root.position.y = -departure * 4.8;
    root.position.x = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.08) * 0.34;
    if (lightRef.current && !reducedMotion) {
      lightRef.current.position.y = Math.sin(clock.elapsedTime * 0.7) * 0.035;
    }
    const villageFlicker = 0.84
      + Math.sin(clock.elapsedTime * 1.35) * 0.08
      + Math.sin(clock.elapsedTime * 3.7) * 0.04;
    materials.light.opacity = villageFlicker * (1 - departure);
  });

  return (
    <group ref={rootRef}>
      <mesh geometry={ridgeGeometry} material={ridgeMaterial} />
      <instancedMesh ref={towerRef} args={[geometries.tower, materials.tower, towerCount]} frustumCulled={false} />
      <instancedMesh ref={roofRef} args={[geometries.roof, materials.roof, towerCount]} frustumCulled={false} />
      <instancedMesh ref={treeRef} args={[geometries.tree, materials.tree, treeCount]} frustumCulled={false} />
      <instancedMesh ref={lightRef} args={[geometries.light, materials.light, lightCount]} frustumCulled={false} />
    </group>
  );
}

type CinematicRainProps = Pick<CarpathianThresholdProps, 'progressRef' | 'qualityTier'>;

function createRainGeometry(count: number) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 2 * 3);
  const speeds = new Float32Array(count * 2);
  const phases = new Float32Array(count * 2);
  const fades = new Float32Array(count * 2);

  for (let index = 0; index < count; index += 1) {
    const x = -23 + seeded(index + 2001) * 46;
    const y = -1 + seeded(index + 2011) * 25;
    const z = 7 + seeded(index + 2021) * 30;
    const length = 0.24 + seeded(index + 2031) * 0.92;
    const wind = 0.045 + seeded(index + 2041) * 0.09;
    const speed = 7 + seeded(index + 2051) * 11;
    const phase = seeded(index + 2061) * 24;
    const fade = 0.16 + seeded(index + 2071) * 0.64;
    const vertexOffset = index * 6;
    const attributeOffset = index * 2;

    positions.set([x, y, z, x - wind, y - length, z], vertexOffset);
    speeds[attributeOffset] = speed;
    speeds[attributeOffset + 1] = speed;
    phases[attributeOffset] = phase;
    phases[attributeOffset + 1] = phase;
    fades[attributeOffset] = fade;
    fades[attributeOffset + 1] = fade;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aFade', new THREE.BufferAttribute(fades, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function CinematicRain({ progressRef, qualityTier }: CinematicRainProps) {
  const compact = useThree((state) => state.size.width <= 820);
  const count = compact ? 150 : qualityTier === 'cinematic' ? 460 : 280;
  const geometry = useMemo(() => createRainGeometry(count), [count]);
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute float aSpeed;
      attribute float aPhase;
      attribute float aFade;
      varying float vFade;

      void main() {
        vec3 transformed = position;
        float cycle = 25.0;
        float travel = mod(uTime * aSpeed + aPhase, cycle);
        transformed.y -= travel;
        transformed.x -= travel * 0.055;
        if (transformed.y < -3.0) {
          transformed.y += cycle;
          transformed.x += cycle * 0.055;
        }
        vFade = aFade;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vFade;

      void main() {
        gl_FragColor = vec4(0.68, 0.79, 0.78, uOpacity * vFade);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  }), []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(({ clock }) => {
    const departure = smooth(range(progressRef.current, 0.044, 0.072));
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uOpacity.value = (compact ? 0.28 : 0.38) * (1 - departure);
  });

  return (
    <lineSegments
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={2}
    />
  );
}

function createBatShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.7, 0.08);
  shape.lineTo(-1.18, 0.34);
  shape.lineTo(-0.78, 0.17);
  shape.lineTo(-0.5, 0.42);
  shape.lineTo(-0.22, 0.12);
  shape.lineTo(-0.1, 0.22);
  shape.lineTo(0, 0.34);
  shape.lineTo(0.1, 0.22);
  shape.lineTo(0.22, 0.12);
  shape.lineTo(0.5, 0.42);
  shape.lineTo(0.78, 0.17);
  shape.lineTo(1.18, 0.34);
  shape.lineTo(1.7, 0.08);
  shape.lineTo(1.18, -0.2);
  shape.lineTo(0.82, -0.05);
  shape.lineTo(0.5, -0.36);
  shape.lineTo(0.18, -0.12);
  shape.lineTo(0, -0.42);
  shape.lineTo(-0.18, -0.12);
  shape.lineTo(-0.5, -0.36);
  shape.lineTo(-0.82, -0.05);
  shape.lineTo(-1.18, -0.2);
  shape.closePath();
  return shape;
}

function BatFlock({ progressRef, qualityTier, reducedMotion }: CarpathianThresholdProps) {
  const rootRef = useRef<THREE.Group>(null);
  const batRef = useRef<THREE.InstancedMesh>(null);
  const compact = useThree((state) => state.size.width <= 820);
  const batShape = useMemo(() => createBatShape(), []);
  const rootTransform = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => new THREE.ShapeGeometry(batShape), [batShape]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#050707',
    side: THREE.DoubleSide,
  }), []);
  const bats = useMemo(() => Array.from({ length: compact ? 4 : qualityTier === 'cinematic' ? 7 : 5 }, (_, index) => ({
    phase: seeded(index + 4),
    y: 9.2 + seeded(index + 11) * 5.8,
    z: 4.5 + seeded(index + 19) * 7.5,
    scale: 0.21 + seeded(index + 29) * 0.2,
    arc: 1.4 + seeded(index + 37) * 2.2,
  })), [compact, qualityTier]);

  useLayoutEffect(() => {
    batRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, [bats.length]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(({ clock }) => {
    const departure = smooth(range(progressRef.current, 0.04, 0.064));
    if (rootRef.current) rootRef.current.visible = departure < 0.995;
    if (departure >= 0.995) return;

    const batMesh = batRef.current;
    if (!batMesh) return;

    const scrollFlight = smooth(range(progressRef.current, 0.003, 0.048));
    const idleFlight = reducedMotion ? 0 : (clock.elapsedTime * 0.026) % 1;
    const flight = scrollFlight + idleFlight * (1 - scrollFlight);
    bats.forEach((bat, index) => {
      rootTransform.position.set(
        -4 + bat.phase * 12 + flight * (10 + bat.phase * 5),
        bat.y
        + Math.sin((flight * 1.6 + bat.phase) * Math.PI * 2) * 0.42
        + flight * bat.arc,
        bat.z,
      );
      rootTransform.rotation.set(0, 0, Math.sin((flight + bat.phase) * Math.PI * 2) * 0.12);
      const flap = reducedMotion
        ? 0
        : Math.sin((clock.elapsedTime * 2.4 + flight * 3.8 + bat.phase + index * 0.08) * Math.PI * 2);
      rootTransform.scale.set(
        bat.scale * (1 - departure),
        bat.scale * (0.72 + Math.abs(flap) * 0.34) * (1 - departure),
        bat.scale * (1 - departure),
      );
      rootTransform.updateMatrix();
      batMesh.setMatrixAt(index, rootTransform.matrix);
    });

    batMesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={rootRef}>
      <instancedMesh ref={batRef} args={[geometry, material, bats.length]} frustumCulled={false} />
    </group>
  );
}

type TimberDoorResources = {
  geometries: Record<-1 | 1, THREE.BufferGeometry>;
  material: THREE.MeshStandardMaterial;
};

function TimberDoor({ side, resources }: { side: -1 | 1; resources: TimberDoorResources }) {
  return <mesh geometry={resources.geometries[side]} material={resources.material} />;
}

function createTimberDoorGeometry(side: -1 | 1) {
  const parts: THREE.BufferGeometry[] = [];
  const addPart = (
    geometry: THREE.BufferGeometry,
    color: THREE.ColorRepresentation,
    position: [number, number, number],
  ) => {
    applyVertexColor(geometry, color);
    geometry.translate(...position);
    parts.push(geometry);
  };

  addPart(new THREE.BoxGeometry(3.32, 8.1, 0.34), '#231713', [side * -1.68, 4.05, 0]);
  for (let index = 0; index < 5; index += 1) {
    addPart(
      new THREE.BoxGeometry(0.045, 7.72, 0.045),
      '#5c3928',
      [side * (-0.42 - index * 0.64), 4.05, 0.2],
    );
  }
  [1.65, 4.15, 6.55].forEach((y) => {
    addPart(new THREE.BoxGeometry(3.08, 0.14, 0.08), '#171918', [side * -1.68, y, 0.23]);
  });
  addPart(new THREE.TorusGeometry(0.24, 0.045, 8, 24), '#a18752', [side * -0.62, 4.05, 0.28]);

  const merged = mergeGeometries(parts, false);
  parts.forEach((geometry) => geometry.dispose());
  if (!merged) throw new Error('Unable to batch timber door geometry');
  return merged;
}

export function CarpathianThreshold({
  progressRef,
  qualityTier,
  reducedMotion,
  atmosphereEnabled = true,
  realtimeLightEnabled = true,
}: CarpathianThresholdProps) {
  const compact = useThree((state) => state.size.width <= 820);
  const rootRef = useRef<THREE.Group>(null);
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);
  const portcullisRef = useRef<THREE.Group>(null);
  const portcullisBarRef = useRef<THREE.InstancedMesh>(null);
  const portcullisSpikeRef = useRef<THREE.InstancedMesh>(null);
  const portcullisRailRef = useRef<THREE.InstancedMesh>(null);
  const torchHandleRef = useRef<THREE.InstancedMesh>(null);
  const gateLightRef = useRef<THREE.PointLight>(null);
  const flameGroupRefs = useRef<Array<THREE.Group | null>>([]);
  const flameRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const introStartTimeRef = useRef<number | null>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const doorResources = useMemo<TimberDoorResources>(() => ({
    geometries: {
      [-1]: createTimberDoorGeometry(-1),
      [1]: createTimberDoorGeometry(1),
    },
    material: new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: '#100705',
      emissiveIntensity: 0.16,
      roughness: 0.74,
      metalness: 0.18,
    }),
  }), []);
  const gateResources = useMemo(() => ({
    geometries: {
      portcullisBar: new THREE.CylinderGeometry(0.075, 0.075, 8.7, 8),
      portcullisSpike: new THREE.ConeGeometry(0.18, 0.72, 6),
      portcullisRail: new THREE.BoxGeometry(6.7, 0.14, 0.14),
      torchHandle: new THREE.CylinderGeometry(0.08, 0.08, 0.74, 8),
    },
    materials: {
      portcullis: new THREE.MeshStandardMaterial({ color: '#151918', metalness: 0.78, roughness: 0.32 }),
      portcullisRail: new THREE.MeshStandardMaterial({ color: '#151918', metalness: 0.8, roughness: 0.3 }),
      torchHandle: new THREE.MeshStandardMaterial({ color: '#1c1c19', metalness: 0.72, roughness: 0.36 }),
    },
  }), []);

  useLayoutEffect(() => {
    for (let index = 0; index < 8; index += 1) {
      const x = -3.05 + index * 0.87;
      setInstanceTransform(portcullisBarRef.current, index, scratch, [x, 4.35, 0]);
      setInstanceTransform(
        portcullisSpikeRef.current,
        index,
        scratch,
        [x, 0.05, 0],
        [1, 1, 1],
        [0, 0, Math.PI],
      );
    }
    [2.2, 5.4, 8.25].forEach((y, index) => {
      setInstanceTransform(portcullisRailRef.current, index, scratch, [0, y, 0]);
    });
    [-1, 1].forEach((side, index) => {
      setInstanceTransform(
        torchHandleRef.current,
        index,
        scratch,
        [side * 4.48, 4.6, 15.57],
        [1, 1, 1],
        [0, 0, Math.PI / 2],
      );
    });
    [portcullisBarRef.current, portcullisSpikeRef.current, portcullisRailRef.current, torchHandleRef.current]
      .forEach(markInstanceMatrixDirty);
  }, [scratch]);

  useEffect(() => () => {
    Object.values(doorResources.geometries).forEach((geometry) => geometry.dispose());
    doorResources.material.dispose();
    Object.values(gateResources.geometries).forEach((geometry) => geometry.dispose());
    Object.values(gateResources.materials).forEach((material) => material.dispose());
  }, [doorResources, gateResources]);

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const doorOpening = smooth(range(progressRef.current, 0.0405, 0.051));
    const gateLift = smooth(range(progressRef.current, 0.04, 0.047));
    const departure = smooth(range(progressRef.current, 0.044, 0.072));
    if (introStartTimeRef.current === null) introStartTimeRef.current = clock.elapsedTime;
    const introTime = clock.elapsedTime - introStartTimeRef.current;

    root.visible = departure < 0.995;
    if (!root.visible) return;
    root.position.y = 0;
    if (leftDoorRef.current) {
      leftDoorRef.current.rotation.y = THREE.MathUtils.damp(leftDoorRef.current.rotation.y, doorOpening * 1.34, 6.4, delta);
    }
    if (rightDoorRef.current) {
      rightDoorRef.current.rotation.y = THREE.MathUtils.damp(rightDoorRef.current.rotation.y, doorOpening * -1.34, 6.4, delta);
    }
    if (portcullisRef.current) {
      portcullisRef.current.position.y = THREE.MathUtils.damp(portcullisRef.current.position.y, gateLift * 10.2, 7.2, delta);
      portcullisRef.current.visible = gateLift < 0.96;
    }
    flameRefs.current.forEach((material, index) => {
      if (!material) return;
      const ignition = smooth(range(introTime, 0.38 + index * 0.22, 1.28 + index * 0.22));
      const flicker = Math.sin(clock.elapsedTime * 8.2 + index * 1.7) * 0.62
        + Math.sin(clock.elapsedTime * 17.4 + index) * 0.28;
      material.emissiveIntensity = 0.2 + ignition * (4.2 + flicker);
      material.color.setRGB(
        0.1 + ignition * 0.9,
        0.055 + ignition * 0.76,
        0.025 + ignition * 0.52,
      );
      const flame = flameGroupRefs.current[index];
      if (flame) {
        flame.scale.set(
          ignition * (0.92 + (reducedMotion ? 0 : flicker * 0.035)),
          ignition * (1.08 + (reducedMotion ? 0 : flicker * 0.11)),
          ignition * (0.92 + (reducedMotion ? 0 : flicker * 0.035)),
        );
        flame.rotation.z = reducedMotion ? 0 : flicker * 0.025;
      }
    });
    if (gateLightRef.current) {
      const ignition = smooth(range(introTime, 0.45, 1.85));
      const lowPulse = Math.sin(clock.elapsedTime * 1.15) * 2.8;
      const flamePulse = Math.sin(clock.elapsedTime * 8.2) * 1.6
        + Math.sin(clock.elapsedTime * 17.4) * 0.7;
      gateLightRef.current.intensity = ignition * (30 + lowPulse + flamePulse) * (1 - departure);
      gateLightRef.current.position.x = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.72) * 0.42;
    }
  });

  return (
    <group ref={rootRef}>
      {atmosphereEnabled ? (
        <>
          <CarpathianBackdrop
            progressRef={progressRef}
            qualityTier={qualityTier}
            reducedMotion={reducedMotion}
          />
          {!reducedMotion ? (
            <CinematicRain progressRef={progressRef} qualityTier={qualityTier} />
          ) : null}
          <group position={compact ? [-7.2, 13.15, 4.2] : [-9.3, 12.8, 4.2]} scale={compact ? 0.5 : 1}>
            <mesh>
              <circleGeometry args={[4.35, 48]} />
              <shaderMaterial
                vertexShader={MOON_VERTEX_SHADER}
                fragmentShader={MOON_FRAGMENT_SHADER}
                transparent
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
          <BatFlock progressRef={progressRef} qualityTier={qualityTier} reducedMotion={reducedMotion} />
        </>
      ) : null}
      <group ref={leftDoorRef} position={[-3.42, 0, 15.05]}>
        <TimberDoor side={-1} resources={doorResources} />
      </group>
      <group ref={rightDoorRef} position={[3.42, 0, 15.05]}>
        <TimberDoor side={1} resources={doorResources} />
      </group>

      <group ref={portcullisRef} position={[0, 0, 15.48]}>
        <instancedMesh
          ref={portcullisBarRef}
          args={[gateResources.geometries.portcullisBar, gateResources.materials.portcullis, 8]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={portcullisSpikeRef}
          args={[gateResources.geometries.portcullisSpike, gateResources.materials.portcullis, 8]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={portcullisRailRef}
          args={[gateResources.geometries.portcullisRail, gateResources.materials.portcullisRail, 3]}
          frustumCulled={false}
        />
      </group>

      <instancedMesh
        ref={torchHandleRef}
        args={[gateResources.geometries.torchHandle, gateResources.materials.torchHandle, 2]}
        frustumCulled={false}
      />
      {[-1, 1].map((side, index) => (
        <group
          key={side}
          ref={(node) => { flameGroupRefs.current[index] = node; }}
          position={[side * 4.48, 5.15, 15.62]}
        >
          <mesh>
            <coneGeometry args={[0.18, 0.7, 9]} />
            <meshStandardMaterial
              ref={(material) => { flameRefs.current[index] = material; }}
              color="#ffd08a"
              emissive="#e76e36"
              emissiveIntensity={4.4}
              roughness={0.18}
            />
          </mesh>
        </group>
      ))}
      {realtimeLightEnabled ? (
        <pointLight
          ref={gateLightRef}
          position={[0, 5.15, 15.9]}
          intensity={30}
          distance={15}
          decay={2}
          color="#ee8b4f"
        />
      ) : null}
    </group>
  );
}
