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

const BANNER_RODS: InstanceTransform[] = [
  { position: [-4.94, 6.18, 16.58], scale: [1, 1.12, 1] },
  { position: [4.98, 6.02, 16.48], scale: [1, 1.02, 1] },
];

const FOG_BANKS: InstanceTransform[] = [
  { position: [-7.5, 0.26, 24.8], rotation: [-Math.PI / 2, 0, 0.08], scale: [13, 5.8, 1] },
  { position: [6.8, 0.31, 21.4], rotation: [-Math.PI / 2, 0, -0.12], scale: [11, 5.2, 1] },
  { position: [0.3, 0.38, 16.8], rotation: [-Math.PI / 2, 0, 0.03], scale: [9.2, 3.8, 1] },
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
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uOpening: { value: 0 },
      uPhase: { value: phase },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uOpening;
      uniform float uPhase;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 transformed = position;
        float freeEdge = smoothstep(0.0, 0.92, 1.0 - uv.y);
        float fold = sin(uv.y * 9.0 + uPhase + uOpening * 2.8 + uTime * 1.7);
        transformed.z += fold * 0.055 * freeEdge;
        transformed.x += sin(uv.y * 4.5 + uPhase * 0.7 + uOpening + uTime * 0.8) * 0.022 * freeEdge;
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
  material.forceSinglePass = true;
  return material;
}

export function FirstLightLayer({ progressRef, qualityTier, reducedMotion }: FirstLightLayerProps) {
  const rootRef = useRef<THREE.Group>(null);
  const cursorLightRef = useRef<THREE.PointLight>(null);
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
  const detailGeometries = useMemo(() => ({
    bannerRod: new THREE.CylinderGeometry(0.035, 0.045, 3.65, 6),
    fog: new THREE.PlaneGeometry(1, 1),
  }), []);
  const detailMaterials = useMemo(() => ({
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

  detailMaterials.fog.forceSinglePass = true;

  useLayoutEffect(() => {
    BANNER_RODS.forEach((transform, index) => {
      setInstanceTransform(bannerRodRef.current, index, instanceTransform, transform);
    });
    FOG_BANKS.forEach((transform, index) => {
      setInstanceTransform(fogRef.current, index, instanceTransform, transform);
    });

    [
      bannerRodRef.current,
      fogRef.current,
    ].forEach(markInstanceMatrixDirty);
  }, [instanceTransform]);

  useEffect(() => () => {
    bannerMaterials.forEach((material) => material.dispose());
    Object.values(detailGeometries).forEach((geometry) => geometry.dispose());
    Object.values(detailMaterials).forEach((material) => material.dispose());
    fogAlphaTexture.dispose();
  }, [bannerMaterials, detailGeometries, detailMaterials, fogAlphaTexture]);

  useFrame(({ camera, clock, pointer }) => {
    const departure = smooth(range(progressRef.current, 0.044, 0.072));
    const opening = smooth(range(progressRef.current, 0.026, 0.092));

    if (rootRef.current) {
      rootRef.current.visible = departure < 0.995;
      rootRef.current.position.y = 0;
    }

    bannerMaterials.forEach((material) => {
      material.uniforms.uOpening.value = reducedMotion ? 0.42 : opening;
      material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    });

    const pointerIntent = reducedMotion ? 0 : clamp01(pointer.length() * 1.35);
    if (reducedMotion) {
      lightTarget.set(0, 5.4, 17.5);
    } else if (pointerIntent < 0.08) {
      lightTarget.set(
        Math.sin(clock.elapsedTime * 0.24) * 4.6,
        5.8 + Math.sin(clock.elapsedTime * 0.31) * 1.8,
        17.35,
      );
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
      const idlePulse = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.1) * 0.42;
      cursorLightRef.current.intensity = (4.2 + idlePulse + pointerIntent * (4.6 + opening * 1.4))
        * (1 - departure);
    }
    if (fogRef.current && !reducedMotion) {
      FOG_BANKS.forEach((transform, index) => {
        const drift = Math.sin(clock.elapsedTime * (0.11 + index * 0.018) + index * 1.7) * (1.4 + index * 0.38);
        const lift = Math.sin(clock.elapsedTime * 0.17 + index) * 0.1;
        setInstanceTransform(fogRef.current, index, instanceTransform, {
          ...transform,
          position: [transform.position[0] + drift, transform.position[1] + lift, transform.position[2]],
        });
      });
      markInstanceMatrixDirty(fogRef.current);
    }
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
        ref={fogRef}
        args={[detailGeometries.fog, detailMaterials.fog, FOG_BANKS.length]}
        frustumCulled={false}
        renderOrder={2}
      />

      <pointLight
        ref={cursorLightRef}
        position={[0, 5.4, 17.4]}
        color="#b8cbc8"
        intensity={4.2}
        distance={16}
        decay={2.15}
      />
    </group>
  );
}
