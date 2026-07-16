import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { QualityTier } from '../../experience/quality';

type FirstLightLayerProps = {
  progressRef: MutableRefObject<number>;
  qualityTier: QualityTier;
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

function bannerMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpening: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime;
      uniform float uOpening;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 transformed = position;
        float freeEdge = smoothstep(0.0, 0.92, 1.0 - uv.y);
        transformed.z += sin(uv.y * 10.0 + uTime * 1.8) * 0.08 * freeEdge;
        transformed.x += sin(uv.y * 5.0 + uTime * 0.9) * 0.035 * freeEdge;
        transformed.z += uOpening * freeEdge * 0.04;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        if (vUv.y < 0.11 && abs(vUv.x - 0.5) < 0.12 - vUv.y * 0.45) discard;
        float weave = 0.9 + sin(vUv.y * 150.0) * 0.035 + sin(vUv.x * 95.0) * 0.025;
        float edge = smoothstep(0.0, 0.05, vUv.x) * smoothstep(0.0, 0.05, 1.0 - vUv.x);
        float diamond = 1.0 - smoothstep(0.07, 0.1, abs(vUv.x - 0.5) + abs(vUv.y - 0.58));
        vec3 color = mix(uColor * weave, uColor * 1.75, diamond * 0.52);
        gl_FragColor = vec4(color, edge * 0.84);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

export function FirstLightLayer({ progressRef, qualityTier }: FirstLightLayerProps) {
  const rootRef = useRef<THREE.Group>(null);
  const cursorLightRef = useRef<THREE.PointLight>(null);
  const beamMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const signalRef = useRef<THREE.Mesh>(null);
  const bannerMaterials = useMemo(
    () => [bannerMaterial('#641a20'), bannerMaterial('#312b24')],
    [],
  );
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const facadePlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -15), []);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);
  const lightTarget = useMemo(() => new THREE.Vector3(0, 5, 17.5), []);
  const debris = useMemo(() => Array.from({ length: qualityTier === 'cinematic' ? 42 : 24 }, (_, index) => ({
    position: [
      (index % 2 === 0 ? -1 : 1) * (2.2 + seeded(index + 1) * 6.8),
      0.05 + seeded(index + 2) * 0.2,
      18 + seeded(index + 3) * 18,
    ] as [number, number, number],
    scale: [
      0.14 + seeded(index + 4) * 0.36,
      0.18 + seeded(index + 5) * 0.72,
      0.14 + seeded(index + 6) * 0.4,
    ] as [number, number, number],
    rotation: seeded(index + 7) * Math.PI,
    crystal: index % 7 === 0,
  })), [qualityTier]);

  useEffect(() => () => {
    bannerMaterials.forEach((material) => material.dispose());
  }, [bannerMaterials]);

  useFrame(({ camera, clock, pointer }, delta) => {
    const departure = smooth(range(progressRef.current, 0.056, 0.096));
    const opening = smooth(range(progressRef.current, 0.026, 0.092));

    if (rootRef.current) {
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -18 * departure, 5.2, delta);
    }

    bannerMaterials.forEach((material) => {
      material.uniforms.uTime.value = clock.elapsedTime;
      material.uniforms.uOpening.value = opening;
    });

    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(facadePlane, hitPoint)) {
      lightTarget.set(
        THREE.MathUtils.clamp(hitPoint.x, -8, 8),
        THREE.MathUtils.clamp(hitPoint.y, 1.1, 10.5),
        17.4,
      );
    }
    if (cursorLightRef.current) {
      cursorLightRef.current.position.lerp(lightTarget, 1 - Math.exp(-delta * 5.5));
      cursorLightRef.current.intensity = 11 * (1 - departure) + opening * 8;
    }
    if (beamMaterialRef.current) {
      beamMaterialRef.current.opacity = opening * (1 - departure) * 0.08;
    }
    if (signalRef.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.12;
      const signalDeparture = smooth(range(progressRef.current, 0.018, 0.052));
      signalRef.current.scale.setScalar(Math.max(0.001, pulse * (1 - signalDeparture)));
      signalRef.current.visible = signalDeparture < 0.995;
    }
  });

  return (
    <group ref={rootRef}>
      <mesh position={[-4.35, 5.75, 16.65]} rotation={[0, 0.12, 0]} material={bannerMaterials[0]}>
        <planeGeometry args={[1.15, 3.5, 8, 24]} />
      </mesh>
      <mesh position={[4.45, 5.5, 16.55]} rotation={[0, -0.14, 0]} material={bannerMaterials[1]}>
        <planeGeometry args={[1.05, 3.2, 8, 24]} />
      </mesh>

      <mesh position={[0, 4.85, 19.6]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[4.8, 10, 40, 1, true]} />
        <meshBasicMaterial
          ref={beamMaterialRef}
          color="#c9d3ca"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {debris.map((item, index) => (
        <mesh key={index} position={item.position} scale={item.scale} rotation={[0, item.rotation, item.crystal ? 0.25 : 0]}>
          {item.crystal ? <octahedronGeometry args={[0.5, 0]} /> : <dodecahedronGeometry args={[0.5, 0]} />}
          <meshStandardMaterial
            color={item.crystal ? '#466c68' : index % 3 === 0 ? '#39413a' : '#242d29'}
            emissive={item.crystal ? '#315f5c' : '#080b0a'}
            emissiveIntensity={item.crystal ? 0.7 : 0.12}
            roughness={0.92}
            metalness={item.crystal ? 0.2 : 0}
          />
        </mesh>
      ))}

      <pointLight ref={cursorLightRef} position={[0, 5, 17.4]} color="#b8c9c1" intensity={14} distance={12} decay={2.15} />
      <mesh ref={signalRef} position={[0, 4.82, 17.15]}>
        <icosahedronGeometry args={[0.095, 1]} />
        <meshStandardMaterial color="#d9ffff" emissive="#72d9d6" emissiveIntensity={8} roughness={0.08} />
      </mesh>
    </group>
  );
}
