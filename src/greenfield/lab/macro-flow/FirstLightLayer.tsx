import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { QualityTier } from '../../experience/quality';

type FirstLightLayerProps = {
  progressRef: MutableRefObject<number>;
  qualityTier: QualityTier;
  reducedMotion: boolean;
};

type InstanceTransform = {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};

const WORKSHOP_LIGHTS: InstanceTransform[] = [
  { position: [-8.25, 4.3, 15.8], scale: [0.9, 1.15, 0.9] },
  { position: [-5.82, 6.65, 15.84], scale: [0.82, 1.08, 0.82] },
  { position: [-2.88, 5.55, 16.08], scale: [0.78, 1, 0.78] },
  { position: [2.94, 6.1, 16.08], scale: [0.78, 1, 0.78] },
  { position: [5.92, 5.05, 15.84], scale: [0.86, 1.08, 0.86] },
  { position: [8.32, 4.72, 15.8], scale: [0.92, 1.18, 0.92] },
];

const PROJECT_MARKERS: InstanceTransform[] = [
  { position: [-4.75, 0.065, 29.4], rotation: [0, 0.2, 0] },
  { position: [-3.72, 0.065, 27.25], rotation: [0, -0.12, 0] },
  { position: [-2.25, 0.065, 25.05], rotation: [0, 0.16, 0] },
  { position: [-0.45, 0.065, 22.95], rotation: [0, -0.18, 0] },
  { position: [1.05, 0.065, 20.95], rotation: [0, 0.1, 0] },
  { position: [0.72, 0.065, 18.98], rotation: [0, -0.08, 0] },
  { position: [0, 0.065, 17.1], rotation: [0, 0.16, 0] },
];

const RELIEF_STONES: InstanceTransform[] = [
  { position: [-8.72, 2.65, 15.73], rotation: [0, 0, 0.12], scale: [0.78, 1.2, 0.28] },
  { position: [-6.65, 7.4, 15.73], rotation: [0, 0, -0.08], scale: [0.58, 0.9, 0.22] },
  { position: [6.72, 7.05, 15.73], rotation: [0, 0, 0.08], scale: [0.62, 0.96, 0.22] },
  { position: [8.68, 2.9, 15.73], rotation: [0, 0, -0.12], scale: [0.74, 1.12, 0.28] },
];

const BANNER_RODS: InstanceTransform[] = [
  { position: [-4.94, 6.18, 16.58], scale: [1, 1.12, 1] },
  { position: [4.98, 6.02, 16.48], scale: [1, 1.02, 1] },
];

const FOG_BANKS: InstanceTransform[] = [
  { position: [-7.5, 0.26, 24.8], rotation: [-Math.PI / 2, 0, 0.08], scale: [13, 5.8, 1] },
  { position: [6.8, 0.31, 21.4], rotation: [-Math.PI / 2, 0, -0.12], scale: [11, 5.2, 1] },
  { position: [0.3, 0.38, 16.8], rotation: [-Math.PI / 2, 0, 0.03], scale: [9.2, 3.8, 1] },
];

const MARKER_COLORS = [
  '#665d47',
  '#71664c',
  '#7b6d50',
  '#867655',
  '#776b52',
  '#8d7955',
  '#9b8258',
];

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

function setInstanceTransform(
  mesh: THREE.InstancedMesh | null,
  index: number,
  scratch: THREE.Object3D,
  transform: InstanceTransform,
) {
  if (!mesh) return;
  scratch.position.set(...transform.position);
  scratch.rotation.set(...(transform.rotation ?? [0, 0, 0]));
  scratch.scale.set(...(transform.scale ?? [1, 1, 1]));
  scratch.updateMatrix();
  mesh.setMatrixAt(index, scratch.matrix);
}

function markInstanceMatrixDirty(mesh: THREE.InstancedMesh | null) {
  if (mesh) mesh.instanceMatrix.needsUpdate = true;
}

function createFogAlphaTexture() {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x / (size - 1) - 0.5) * 2;
      const ny = (y / (size - 1) - 0.5) * 2;
      const radial = clamp01(1 - Math.sqrt(nx * nx + ny * ny));
      const value = Math.round(smooth(radial) * 255);
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function bannerMaterial(color: string, phase: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpening: { value: 0 },
      uPhase: { value: phase },
      uColor: { value: new THREE.Color(color) },
    },
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uOpening;
      uniform float uPhase;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 transformed = position;
        float freeEdge = smoothstep(0.0, 0.92, 1.0 - uv.y);
        float fold = sin(uv.y * 9.0 + uPhase + uOpening * 2.8);
        transformed.z += fold * 0.055 * freeEdge;
        transformed.x += sin(uv.y * 4.5 + uPhase * 0.7 + uOpening) * 0.022 * freeEdge;
        transformed.z += uOpening * freeEdge * 0.025;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        if (vUv.y < 0.11 && abs(vUv.x - 0.5) < 0.12 - vUv.y * 0.45) discard;
        float weave = 0.91 + sin(vUv.y * 150.0) * 0.025 + sin(vUv.x * 95.0) * 0.018;
        float edge = smoothstep(0.0, 0.05, vUv.x) * smoothstep(0.0, 0.05, 1.0 - vUv.x);
        float lozenge = 1.0 - smoothstep(0.065, 0.1, abs(vUv.x - 0.5) + abs(vUv.y - 0.58));
        vec3 color = mix(uColor * weave, uColor * 1.38, lozenge * 0.34);
        gl_FragColor = vec4(color, edge * 0.86);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

export function FirstLightLayer({ progressRef, qualityTier, reducedMotion }: FirstLightLayerProps) {
  const rootRef = useRef<THREE.Group>(null);
  const cursorLightRef = useRef<THREE.PointLight>(null);
  const signalRef = useRef<THREE.Mesh>(null);
  const wetPatchRef = useRef<THREE.InstancedMesh>(null);
  const trackRef = useRef<THREE.InstancedMesh>(null);
  const responseLightRef = useRef<THREE.InstancedMesh>(null);
  const projectMarkerRef = useRef<THREE.InstancedMesh>(null);
  const reliefRef = useRef<THREE.InstancedMesh>(null);
  const bannerRodRef = useRef<THREE.InstancedMesh>(null);
  const fogRef = useRef<THREE.InstancedMesh>(null);
  const instanceTransform = useMemo(() => new THREE.Object3D(), []);
  const bannerMaterials = useMemo(
    () => [bannerMaterial('#491318', 0.4), bannerMaterial('#202723', 2.2)],
    [],
  );
  const fogAlphaTexture = useMemo(createFogAlphaTexture, []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const facadePlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -15), []);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);
  const lightTarget = useMemo(() => new THREE.Vector3(0, 5.4, 17.5), []);
  const wetPatches = useMemo(() => {
    const groundCount = qualityTier === 'cinematic' ? 12 : 8;
    const wallCount = qualityTier === 'cinematic' ? 6 : 4;
    const ground = Array.from({ length: groundCount }, (_, index) => {
      const z = 17.5 + seeded(index + 3) * 16;
      const routeX = Math.sin((z - 17) * 0.21) * 1.15;
      return {
        position: [
          routeX + (seeded(index + 12) - 0.5) * 8.4,
          0.045 + index * 0.0004,
          z,
        ] as [number, number, number],
        rotation: [-Math.PI / 2, 0, seeded(index + 27) * Math.PI] as [number, number, number],
        scale: [
          0.42 + seeded(index + 38) * 0.72,
          0.68 + seeded(index + 49) * 1.05,
          1,
        ] as [number, number, number],
      };
    });
    const wall = Array.from({ length: wallCount }, (_, index) => {
      const side = index % 2 === 0 ? -1 : 1;
      return {
        position: [
          side * (5.75 + seeded(index + 61) * 3.1),
          1.45 + seeded(index + 72) * 5.8,
          15.91 + index * 0.0005,
        ] as [number, number, number],
        rotation: [0, 0, (seeded(index + 83) - 0.5) * 0.6] as [number, number, number],
        scale: [
          0.34 + seeded(index + 94) * 0.52,
          0.48 + seeded(index + 105) * 0.78,
          1,
        ] as [number, number, number],
      };
    });
    return [...ground, ...wall];
  }, [qualityTier]);
  const roadTracks = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const pair = Math.floor(index / 2);
    const side = index % 2 === 0 ? -1 : 1;
    const z = 18.2 + pair * 2.15;
    const routeX = Math.sin((z - 17) * 0.21) * 0.9;
    return {
      position: [routeX + side * 0.92, 0.058 + index * 0.0003, z] as [number, number, number],
      rotation: [-Math.PI / 2, 0, -0.08 + pair * 0.018] as [number, number, number],
      scale: [0.14 + seeded(index + 117) * 0.07, 0.76 + seeded(index + 128) * 0.34, 1] as [number, number, number],
    };
  }), []);
  const detailGeometries = useMemo(() => ({
    patch: new THREE.CircleGeometry(1, 10),
    responseLight: new THREE.BoxGeometry(0.12, 0.32, 0.07),
    projectMarker: new THREE.CylinderGeometry(0.13, 0.16, 0.055, 6),
    relief: new THREE.BoxGeometry(0.42, 0.68, 0.065),
    bannerRod: new THREE.CylinderGeometry(0.035, 0.045, 3.65, 6),
    fog: new THREE.PlaneGeometry(1, 1),
  }), []);
  const detailMaterials = useMemo(() => ({
    wetPatch: new THREE.MeshStandardMaterial({
      color: '#263431',
      roughness: 0.34,
      metalness: 0.02,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    track: new THREE.MeshStandardMaterial({
      color: '#111817',
      roughness: 0.78,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
    responseLight: new THREE.MeshStandardMaterial({
      color: '#c9aa70',
      emissive: '#bb7445',
      emissiveIntensity: 1.45,
      metalness: 0.38,
      roughness: 0.44,
    }),
    projectMarker: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#282217',
      emissiveIntensity: 0.22,
      metalness: 0.64,
      roughness: 0.46,
    }),
    relief: new THREE.MeshStandardMaterial({
      color: '#4b514c',
      emissive: '#121815',
      emissiveIntensity: 0.14,
      roughness: 0.95,
      metalness: 0,
    }),
    bannerRod: new THREE.MeshStandardMaterial({
      color: '#514a39',
      metalness: 0.62,
      roughness: 0.48,
    }),
    fog: new THREE.MeshBasicMaterial({
      color: '#879d98',
      alphaMap: fogAlphaTexture,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    }),
  }), [fogAlphaTexture]);

  useLayoutEffect(() => {
    wetPatches.forEach((transform, index) => {
      setInstanceTransform(wetPatchRef.current, index, instanceTransform, transform);
    });
    roadTracks.forEach((transform, index) => {
      setInstanceTransform(trackRef.current, index, instanceTransform, transform);
    });
    WORKSHOP_LIGHTS.forEach((transform, index) => {
      setInstanceTransform(responseLightRef.current, index, instanceTransform, transform);
    });
    PROJECT_MARKERS.forEach((transform, index) => {
      setInstanceTransform(projectMarkerRef.current, index, instanceTransform, transform);
      projectMarkerRef.current?.setColorAt(index, new THREE.Color(MARKER_COLORS[index]));
    });
    RELIEF_STONES.forEach((transform, index) => {
      setInstanceTransform(reliefRef.current, index, instanceTransform, transform);
    });
    BANNER_RODS.forEach((transform, index) => {
      setInstanceTransform(bannerRodRef.current, index, instanceTransform, transform);
    });
    FOG_BANKS.forEach((transform, index) => {
      setInstanceTransform(fogRef.current, index, instanceTransform, transform);
    });

    [
      wetPatchRef.current,
      trackRef.current,
      responseLightRef.current,
      projectMarkerRef.current,
      reliefRef.current,
      bannerRodRef.current,
      fogRef.current,
    ].forEach(markInstanceMatrixDirty);
    if (projectMarkerRef.current?.instanceColor) {
      projectMarkerRef.current.instanceColor.needsUpdate = true;
    }
  }, [instanceTransform, roadTracks, wetPatches]);

  useEffect(() => () => {
    bannerMaterials.forEach((material) => material.dispose());
    Object.values(detailGeometries).forEach((geometry) => geometry.dispose());
    Object.values(detailMaterials).forEach((material) => material.dispose());
    fogAlphaTexture.dispose();
  }, [bannerMaterials, detailGeometries, detailMaterials, fogAlphaTexture]);

  useFrame(({ camera, pointer }) => {
    const departure = smooth(range(progressRef.current, 0.056, 0.096));
    const opening = smooth(range(progressRef.current, 0.026, 0.092));

    if (rootRef.current) {
      rootRef.current.visible = departure < 0.995;
      rootRef.current.position.y = -18 * departure;
    }

    bannerMaterials.forEach((material) => {
      material.uniforms.uOpening.value = reducedMotion ? 0.42 : opening;
    });

    if (reducedMotion) {
      lightTarget.set(0, 5.4, 17.5);
    } else {
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(facadePlane, hitPoint)) {
        lightTarget.set(
          THREE.MathUtils.clamp(hitPoint.x, -8, 8),
          THREE.MathUtils.clamp(hitPoint.y, 1.1, 10.5),
          17.4,
        );
      }
    }
    if (cursorLightRef.current) {
      cursorLightRef.current.position.copy(lightTarget);
      cursorLightRef.current.intensity = (9 + opening * 5.5) * (1 - departure);
    }
    if (signalRef.current) {
      const signalDeparture = smooth(range(progressRef.current, 0.018, 0.052));
      signalRef.current.scale.setScalar(Math.max(0.001, (0.92 + opening * 0.08) * (1 - signalDeparture)));
      signalRef.current.visible = signalDeparture < 0.995;
    }

    detailMaterials.responseLight.emissiveIntensity = 1.45 + opening * 1.05;
    detailMaterials.projectMarker.emissiveIntensity = 0.22 + opening * 0.38;
    detailMaterials.fog.opacity = (qualityTier === 'cinematic' ? 0.105 : 0.068)
      * (reducedMotion ? 0.72 : 1)
      * (1 - departure);
  });

  return (
    <group ref={rootRef}>
      <instancedMesh
        ref={bannerRodRef}
        args={[detailGeometries.bannerRod, detailMaterials.bannerRod, BANNER_RODS.length]}
        frustumCulled={false}
      />
      <mesh position={[-4.35, 5.75, 16.65]} rotation={[0, 0.12, 0]} material={bannerMaterials[0]}>
        <planeGeometry args={[1.15, 3.5, 8, 24]} />
      </mesh>
      <mesh position={[4.45, 5.5, 16.55]} rotation={[0, -0.14, 0]} material={bannerMaterials[1]}>
        <planeGeometry args={[1.05, 3.2, 8, 24]} />
      </mesh>

      <instancedMesh
        ref={wetPatchRef}
        args={[detailGeometries.patch, detailMaterials.wetPatch, wetPatches.length]}
        frustumCulled={false}
        renderOrder={1}
      />
      <instancedMesh
        ref={trackRef}
        args={[detailGeometries.patch, detailMaterials.track, roadTracks.length]}
        frustumCulled={false}
        renderOrder={1}
      />
      <instancedMesh
        ref={responseLightRef}
        args={[
          detailGeometries.responseLight,
          detailMaterials.responseLight,
          WORKSHOP_LIGHTS.length,
        ]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={projectMarkerRef}
        args={[
          detailGeometries.projectMarker,
          detailMaterials.projectMarker,
          PROJECT_MARKERS.length,
        ]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={reliefRef}
        args={[detailGeometries.relief, detailMaterials.relief, RELIEF_STONES.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={fogRef}
        args={[detailGeometries.fog, detailMaterials.fog, FOG_BANKS.length]}
        frustumCulled={false}
        renderOrder={2}
      />

      <pointLight
        ref={cursorLightRef}
        position={[0, 5.4, 17.4]}
        color="#b8cbc8"
        intensity={9}
        distance={13}
        decay={2.15}
      />
      <mesh ref={signalRef} position={[0, 4.82, 17.15]}>
        <icosahedronGeometry args={[0.095, 1]} />
        <meshStandardMaterial
          color="#d9ffff"
          emissive="#72d9d6"
          emissiveIntensity={6.5}
          roughness={0.08}
        />
      </mesh>
    </group>
  );
}
