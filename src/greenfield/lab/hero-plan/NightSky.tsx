import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';

/**
 * Blue hour behind the citadel.
 *
 * A flat fog colour left the frame empty above the horizon, which made the
 * building read as an object on a backdrop rather than a place at a time of day.
 * The dome is a gradient plus a star field, both unlit and untouched by fog, so
 * the sky stays the one thing in the scene that is pure light.
 */

const SKY_VERT = `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform float uReveal;
  varying vec3 vWorld;

  void main() {
    float h = clamp(normalize(vWorld).y * 0.5 + 0.5, 0.0, 1.0);
    vec3 sky = mix(uHorizon, uZenith, pow(h, 0.62));

    // One warm band low on the horizon: the last of the sun, behind the ridges.
    float band = smoothstep(0.52, 0.46, h) * smoothstep(0.34, 0.47, h);
    sky = mix(sky, uGlow, band * 0.5);

    gl_FragColor = vec4(sky * uReveal, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function starField(count: number) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    // Deterministic scatter: the sky must not reshuffle between reloads.
    const a = i * 2.399963;
    const y = 1 - (i / count) * 1.35;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    positions[i * 3] = Math.cos(a) * r * 300;
    positions[i * 3 + 1] = Math.abs(y) * 300 + 6;
    positions[i * 3 + 2] = Math.sin(a) * r * 300;
    sizes[i] = 0.6 + ((i * 37) % 11) / 11;
  }
  return { positions, sizes };
}

type NightSkyProps = {
  progressRef: MutableRefObject<number>;
  showFrom: number;
};

export function NightSky({ progressRef, showFrom }: NightSkyProps) {
  const skyRef = useRef<THREE.ShaderMaterial>(null);
  const starsRef = useRef<THREE.Points>(null);

  const uniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color('#0b1a2c') },
      uHorizon: { value: new THREE.Color('#2b4257') },
      uGlow: { value: new THREE.Color('#5c5136') },
      uReveal: { value: 0 },
    }),
    [],
  );

  const stars = useMemo(() => {
    const { positions, sizes } = starField(900);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return geometry;
  }, []);

  useFrame(() => {
    const reveal = Math.max(0, Math.min(1, (progressRef.current - showFrom) / 0.2));
    uniforms.uReveal.value = reveal;
    if (skyRef.current) skyRef.current.visible = reveal > 0.001;
    if (starsRef.current) {
      starsRef.current.visible = reveal > 0.001;
      const material = starsRef.current.material as THREE.PointsMaterial;
      material.opacity = reveal * 0.75;
    }
  });

  return (
    <group>
      <mesh renderOrder={-100} frustumCulled={false}>
        <sphereGeometry args={[320, 40, 24]} />
        <shaderMaterial
          ref={skyRef}
          uniforms={uniforms}
          vertexShader={SKY_VERT}
          fragmentShader={SKY_FRAG}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      <points ref={starsRef} geometry={stars} frustumCulled={false} renderOrder={-99}>
        <pointsMaterial
          size={1.5}
          sizeAttenuation
          color="#cfe0f0"
          transparent
          opacity={0}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
}
