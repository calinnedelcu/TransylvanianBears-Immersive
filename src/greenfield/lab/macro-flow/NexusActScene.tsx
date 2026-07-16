import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { QualityTier } from '../../experience/quality';
import type { LensPointerState, MacroLensMode } from './macroFlowTypes';

type NexusActSceneProps = {
  progressRef: MutableRefObject<number>;
  lensMode: MacroLensMode;
  lensPointerRef: MutableRefObject<LensPointerState>;
  qualityTier: QualityTier;
};

type CityBlock = {
  position: [number, number, number];
  scale: [number, number, number];
  segment: number;
  side: -1 | 1;
  row: number;
};

const RAW_COLORS = ['#4c5d5f', '#596667', '#3f5052'];
const SEGMENT_COLORS = ['#cf6554', '#d8b75e', '#5ebdb6'];

const CITY_BLOCKS: CityBlock[] = Array.from({ length: 38 }, (_, index) => {
  const side = (index % 2 === 0 ? -1 : 1) as -1 | 1;
  const row = Math.floor(index / 2);
  const width = 1.75 + ((index * 7) % 5) * 0.42;
  const height = 1.35 + ((index * 11) % 9) * 0.48;
  const depth = 1.7 + ((index * 5) % 4) * 0.48;

  return {
    position: [side * (5.1 + ((index * 3) % 3) * 1.25), 0, 4 - row * 2.72],
    scale: [width, height, depth],
    segment: index % 3,
    side,
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
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function createCityMaterial(raw: string, segment: string) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uRaw: { value: new THREE.Color(raw) },
      uSegment: { value: new THREE.Color(segment) },
      uAccent: { value: new THREE.Color('#72d9d6') },
      uLens: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2(1440, 900) },
      uMode: { value: 0 },
      uLensMix: { value: 0 },
      uRadius: { value: 0.18 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vWorldPosition;
      varying float vDepth;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec4 viewPosition = viewMatrix * worldPosition;
        vWorldPosition = worldPosition.xyz;
        vNormalView = normalize(normalMatrix * normal);
        vDepth = -viewPosition.z;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uRaw;
      uniform vec3 uSegment;
      uniform vec3 uAccent;
      uniform vec2 uLens;
      uniform vec2 uResolution;
      uniform float uMode;
      uniform float uLensMix;
      uniform float uRadius;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vWorldPosition;
      varying float vDepth;

      float gridLine(float value, float density, float thickness) {
        float cell = abs(fract(value * density) - 0.5);
        return 1.0 - smoothstep(thickness, thickness + 0.025, cell);
      }

      void main() {
        vec2 screenUv = gl_FragCoord.xy / uResolution;
        vec2 lensDelta = screenUv - uLens;
        lensDelta.x *= uResolution.x / max(1.0, uResolution.y);
        float lensDistance = length(lensDelta);
        float lensMask = (1.0 - smoothstep(uRadius, uRadius + 0.018, lensDistance)) * uLensMix;
        float lensEdge = (1.0 - smoothstep(0.012, 0.026, abs(lensDistance - uRadius))) * uLensMix;

        vec3 lightDirection = normalize(vec3(-0.42, 0.82, 0.36));
        float diffuse = 0.38 + max(0.0, dot(normalize(vNormalView), lightDirection)) * 0.62;
        vec3 rawColor = uRaw * diffuse;
        vec3 inspected = rawColor;

        if (uMode > 0.5 && uMode < 1.5) {
          float heightBand = 0.92 + sin(vWorldPosition.y * 8.0 + vWorldPosition.z * 0.34) * 0.08;
          inspected = uSegment * (0.72 + diffuse * 0.42) * heightBand;
        } else if (uMode >= 1.5) {
          float grid = max(
            gridLine(vWorldPosition.y, 0.68, 0.06),
            gridLine(vWorldPosition.z, 0.28, 0.045)
          );
          float scan = 0.5 + 0.5 * sin(vWorldPosition.y * 5.0 - uTime * 2.2);
          inspected = rawColor * 0.34 + uAccent * (grid * 0.62 + scan * 0.08);
        } else {
          inspected = rawColor * 1.18 + uAccent * 0.035;
        }

        vec3 color = mix(rawColor, inspected, lensMask);
        color += uAccent * lensEdge * 0.48;
        float fogAmount = smoothstep(28.0, 74.0, vDepth);
        color = mix(color, vec3(0.025, 0.055, 0.058), fogAmount * 0.72);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
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

function StreetFurniture() {
  return (
    <>
      <mesh position={[0, -0.05, -20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.4, 58]} />
        <meshStandardMaterial color="#273537" emissive="#0c1415" emissiveIntensity={0.46} roughness={0.94} />
      </mesh>

      {[-5.05, 5.05].map((x) => (
        <group key={x} position={[x, 0, -20]}>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[2.55, 0.18, 58]} />
            <meshStandardMaterial color="#53605e" roughness={0.92} />
          </mesh>
          <mesh position={[x < 0 ? 1.34 : -1.34, 0.16, 0]}>
            <boxGeometry args={[0.12, 0.32, 58]} />
            <meshStandardMaterial color="#a8a58f" roughness={0.72} />
          </mesh>
        </group>
      ))}

      {[-2.52, 0, 2.52].map((x, index) => (
        <mesh key={x} position={[x, 0.02, -20]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[index === 1 ? 0.075 : 0.035, 56]} />
          <meshBasicMaterial color={index === 1 ? '#72d9d6' : '#c9ae68'} transparent opacity={index === 1 ? 0.62 : 0.4} />
        </mesh>
      ))}

      {[-9, -29].flatMap((z) => Array.from({ length: 9 }, (_, index) => (
        <mesh key={`${z}-${index}`} position={[-2.6 + index * 0.65, 0.035, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.36, 2.9]} />
          <meshBasicMaterial color="#d8d5c7" transparent opacity={0.64} />
        </mesh>
      )))}

      {Array.from({ length: 12 }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const z = 2 - Math.floor(index / 2) * 8.8;
        return (
          <group key={index} position={[side * 3.85, 0, z]}>
            <mesh position={[0, 1.45, 0]}>
              <cylinderGeometry args={[0.035, 0.05, 2.9, 8]} />
              <meshStandardMaterial color="#172324" metalness={0.72} roughness={0.38} />
            </mesh>
            <mesh position={[-side * 0.38, 2.86, 0]} rotation={[0, 0, side * 0.95]}>
              <boxGeometry args={[0.8, 0.055, 0.055]} />
              <meshStandardMaterial color="#182627" metalness={0.7} roughness={0.35} />
            </mesh>
            <pointLight position={[-side * 0.72, 2.62, 0]} color={index % 3 === 0 ? '#d7b264' : '#75dcda'} intensity={1.4} distance={5.5} decay={2.2} />
          </group>
        );
      })}
    </>
  );
}

function Traffic({ progressRef }: Pick<NexusActSceneProps, 'progressRef'>) {
  const refs = useRef<Array<THREE.Group | null>>([]);

  useFrame(({ clock }) => {
    refs.current.forEach((vehicle, index) => {
      if (!vehicle) return;
      const direction = index % 2 === 0 ? -1 : 1;
      const travel = (clock.elapsedTime * (0.65 + index * 0.09) + index * 13 + progressRef.current * 46) % 56;
      vehicle.position.z = direction < 0 ? 8 - travel : -48 + travel;
      vehicle.rotation.y = direction < 0 ? 0 : Math.PI;
    });
  });

  return (
    <>
      {Array.from({ length: 6 }, (_, index) => {
        const lane = index % 2 === 0 ? -1.35 : 1.35;
        return (
          <group key={index} ref={(node) => { refs.current[index] = node; }} position={[lane, 0.18, 6 - index * 8]}>
            <mesh position={[0, 0.24, 0]}>
              <boxGeometry args={[1.05, 0.4, 1.78]} />
              <meshStandardMaterial color={index % 3 === 0 ? '#a75346' : index % 3 === 1 ? '#d1b669' : '#627879'} metalness={0.18} roughness={0.54} />
            </mesh>
            <mesh position={[0, 0.53, -0.08]}>
              <boxGeometry args={[0.82, 0.32, 0.92]} />
              <meshStandardMaterial color="#273a3c" metalness={0.36} roughness={0.3} />
            </mesh>
            {[-0.47, 0.47].flatMap((x) => [-0.56, 0.56].map((z) => (
              <mesh key={`${x}-${z}`} position={[x, 0.14, z]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.15, 0.15, 0.1, 12]} />
                <meshStandardMaterial color="#0a0e0f" roughness={0.88} />
              </mesh>
            )))}
          </group>
        );
      })}
    </>
  );
}

function TrackedSubjects({ lensMode }: Pick<NexusActSceneProps, 'lensMode'>) {
  const detecting = lensMode === 'detection';
  const segmenting = lensMode === 'segmentation';

  return (
    <group position={[0, 0, -32]}>
      <group position={[-2.15, 0, 0]}>
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[1.5, 0.66, 2.25]} />
          <meshStandardMaterial color={segmenting ? '#cf6554' : '#6c7675'} roughness={0.56} />
        </mesh>
        <mesh position={[0, 0.5, 0]} scale={[1.8, 1.2, 2.55]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#df6553" wireframe transparent opacity={detecting ? 0.9 : 0.025} />
        </mesh>
      </group>

      <group position={[0.15, 0, 0.4]}>
        <mesh position={[0, 1.15, 0]}>
          <capsuleGeometry args={[0.26, 1.35, 5, 10]} />
          <meshStandardMaterial color={segmenting ? '#72d9d6' : '#bab9b0'} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.2, 0]} scale={[0.9, 2.7, 0.9]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#72d9d6" wireframe transparent opacity={detecting ? 0.9 : 0.025} />
        </mesh>
      </group>

      <group position={[2.8, 0, -0.35]}>
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[1.9, 2.4, 1.7]} />
          <meshStandardMaterial color={segmenting ? '#d8b75e' : '#465557'} roughness={0.82} />
        </mesh>
        <mesh position={[0, 1.24, 0]} scale={[2.2, 2.75, 2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#e9bd68" wireframe transparent opacity={detecting ? 0.9 : 0.025} />
        </mesh>
      </group>
    </group>
  );
}

function NexusCity({ progressRef, lensMode, lensPointerRef, qualityTier }: NexusActSceneProps) {
  const rootRef = useRef<THREE.Group>(null);
  const buildingRefs = useRef<Array<THREE.Group | null>>([]);
  const pointMaterialRef = useRef<THREE.PointsMaterial>(null);
  const cityMaterials = useMemo(
    () => RAW_COLORS.map((raw, index) => createCityMaterial(raw, SEGMENT_COLORS[index])),
    [],
  );
  const windowMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#a8d9d3', transparent: true, opacity: 0.38 }), []);
  const pointGeometry = useMemo(
    () => createPointCloudGeometry(qualityTier === 'cinematic' ? 2 : 1),
    [qualityTier],
  );

  useEffect(() => () => {
    cityMaterials.forEach((material) => material.dispose());
    windowMaterial.dispose();
    pointGeometry.dispose();
  }, [cityMaterials, pointGeometry, windowMaterial]);

  useFrame(({ clock, gl, size }, delta) => {
    const progress = progressRef.current;
    const fieldReveal = smooth(range(progress, 0.062, 0.135));
    const solidReveal = smooth(range(progress, 0.092, 0.165));
    const lensPresence = smooth(range(progress, 0.13, 0.16)) * (1 - smooth(range(progress, 0.285, 0.318)));
    const mode = lensMode === 'segmentation' ? 1 : lensMode === 'detection' ? 2 : 0;
    const pixelRatio = gl.getPixelRatio();

    cityMaterials.forEach((material) => {
      material.uniforms.uLens.value.set(lensPointerRef.current.x, lensPointerRef.current.y);
      material.uniforms.uResolution.value.set(size.width * pixelRatio, size.height * pixelRatio);
      material.uniforms.uMode.value = mode;
      material.uniforms.uLensMix.value = lensPresence;
      material.uniforms.uRadius.value = size.width <= 820 ? 0.28 : 0.2;
      material.uniforms.uTime.value = clock.elapsedTime;
    });

    buildingRefs.current.forEach((building, index) => {
      if (!building) return;
      const row = CITY_BLOCKS[index].row;
      const stagger = row * 0.0018;
      const reveal = smooth(range(progress, 0.076 + stagger, 0.126 + stagger));
      const targetY = Math.max(0.001, reveal);
      building.scale.y = THREE.MathUtils.damp(building.scale.y, targetY, 8.5, delta);
      building.position.y = (1 - targetY) * -0.32;
    });

    if (pointMaterialRef.current) {
      pointMaterialRef.current.opacity = fieldReveal * (1 - solidReveal * 0.9) * 0.78;
      pointMaterialRef.current.size = 0.028 + fieldReveal * 0.025;
    }
    windowMaterial.opacity = 0.08 + solidReveal * 0.42;
    windowMaterial.color.set(lensMode === 'segmentation' ? '#e7cf83' : lensMode === 'detection' ? '#72d9d6' : '#a8d9d3');

    if (rootRef.current) {
      const departure = smooth(range(progress, 0.285, 0.345));
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -departure * 6.5, 5.4, delta);
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, -7]}>
      <points geometry={pointGeometry} frustumCulled={false}>
        <pointsMaterial ref={pointMaterialRef} color="#8be3df" size={0.04} transparent opacity={0} depthWrite={false} sizeAttenuation />
      </points>

      <StreetFurniture />
      <Traffic progressRef={progressRef} />

      {CITY_BLOCKS.map((block, index) => {
        const windowRows = qualityTier === 'cinematic' ? 3 : 2;
        return (
          <group
            key={index}
            ref={(node) => { buildingRefs.current[index] = node; }}
            position={block.position}
            scale={[1, 0.001, 1]}
          >
            <mesh position={[0, block.scale[1] / 2, 0]} material={cityMaterials[block.segment]}>
              <boxGeometry args={block.scale} />
            </mesh>
            <mesh position={[0, block.scale[1] + 0.08, 0]}>
              <boxGeometry args={[block.scale[0] * 0.62, 0.15, block.scale[2] * 0.58]} />
              <meshStandardMaterial color="#233235" roughness={0.72} metalness={0.16} />
            </mesh>
            {Array.from({ length: windowRows }, (_, row) => Array.from({ length: 2 }, (__, column) => (
              <mesh
                key={`${row}-${column}`}
                material={windowMaterial}
                position={[
                  -block.side * (block.scale[0] / 2 + 0.018),
                  Math.min(block.scale[1] - 0.26, 0.42 + row * 0.62),
                  (column - 0.5) * Math.min(0.62, block.scale[2] * 0.3),
                ]}
              >
                <boxGeometry args={[0.035, 0.25, 0.38]} />
              </mesh>
            )))}
          </group>
        );
      })}

      <TrackedSubjects lensMode={lensMode} />
      <pointLight position={[0, 7.5, -17]} color="#6bdad6" intensity={10} distance={27} decay={2.1} />
      <pointLight position={[-4, 4, -34]} color="#d5ad64" intensity={8} distance={20} decay={2.1} />
    </group>
  );
}

function SurveyDrone({ progressRef, lensMode }: Pick<NexusActSceneProps, 'progressRef' | 'lensMode'>) {
  const rootRef = useRef<THREE.Group>(null);
  const rotorRefs = useRef<Array<THREE.Mesh | null>>([]);
  const beamMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const position = useMemo(() => new THREE.Vector3(), []);
  const lookAhead = useMemo(() => new THREE.Vector3(), []);
  const orientation = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }, delta) => {
    if (!rootRef.current) return;
    const local = smooth(range(progressRef.current, 0.076, 0.285));
    const visibility = smooth(range(progressRef.current, 0.064, 0.092)) * (1 - smooth(range(progressRef.current, 0.29, 0.325)));
    DRONE_PATH.getPoint(local, position);
    DRONE_PATH.getPoint(Math.min(1, local + 0.025), lookAhead);
    position.y += Math.sin(clock.elapsedTime * 1.7) * 0.12;
    rootRef.current.position.lerp(position, 1 - Math.exp(-delta * 7));
    orientation.position.copy(rootRef.current.position);
    orientation.lookAt(lookAhead);
    rootRef.current.quaternion.slerp(orientation.quaternion, 1 - Math.exp(-delta * 4.5));
    rootRef.current.scale.setScalar(0.001 + visibility * 0.68);

    rotorRefs.current.forEach((rotor, index) => {
      if (rotor) rotor.rotation.y += delta * (18 + index * 1.6);
    });
    if (beamMaterialRef.current) {
      beamMaterialRef.current.opacity = visibility * (lensMode === 'raw' ? 0.08 : 0.2);
      beamMaterialRef.current.color.set(lensMode === 'segmentation' ? '#e0bb65' : '#72d9d6');
    }
  });

  return (
    <group ref={rootRef} scale={0.001}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.34, 0.7, 8, 16]} />
        <meshStandardMaterial color="#ccd0c5" metalness={0.64} roughness={0.28} />
      </mesh>
      <mesh position={[0, -0.34, 0.28]}>
        <sphereGeometry args={[0.22, 18, 12]} />
        <meshStandardMaterial color="#162425" emissive="#72d9d6" emissiveIntensity={1.8} metalness={0.36} roughness={0.2} />
      </mesh>

      {[
        [-0.82, 0, -0.62],
        [0.82, 0, -0.62],
        [-0.82, 0, 0.62],
        [0.82, 0, 0.62],
      ].map(([x, y, z], index) => (
        <group key={index}>
          <mesh position={[x / 2, y, z / 2]} rotation={[0, Math.atan2(x, z), Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.055, Math.hypot(x, z), 8]} />
            <meshStandardMaterial color="#465457" metalness={0.68} roughness={0.32} />
          </mesh>
          <mesh position={[x, 0, z]}>
            <cylinderGeometry args={[0.2, 0.26, 0.18, 16]} />
            <meshStandardMaterial color="#1c292b" metalness={0.72} roughness={0.3} />
          </mesh>
          <mesh ref={(node) => { rotorRefs.current[index] = node; }} position={[x, 0.13, z]}>
            <cylinderGeometry args={[0.66, 0.66, 0.018, 28]} />
            <meshBasicMaterial color="#86e2de" transparent opacity={0.22} depthWrite={false} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, -2.38, 0]}>
        <coneGeometry args={[1.72, 4.3, 32, 1, true]} />
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
      <pointLight position={[0, -0.42, 0]} color="#72d9d6" intensity={4.5} distance={8} decay={2} />
    </group>
  );
}

function EvidencePanel({ progressRef, lensMode }: Pick<NexusActSceneProps, 'progressRef' | 'lensMode'>) {
  const rootRef = useRef<THREE.Group>(null);
  const screenMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const frameMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const texture = useTexture('/assets/projects/project-nexus.webp');
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  useFrame(({ camera, clock }, delta) => {
    if (!rootRef.current) return;
    const reveal = smooth(range(progressRef.current, 0.158, 0.215));
    const departure = smooth(range(progressRef.current, 0.275, 0.315));
    const scale = reveal * (1 - departure);
    rootRef.current.scale.setScalar(THREE.MathUtils.damp(rootRef.current.scale.x, Math.max(0.001, scale), 6.5, delta));
    rootRef.current.position.y = 4.15 + Math.sin(clock.elapsedTime * 0.7) * 0.08;
    rootRef.current.lookAt(camera.position);

    const modeColor = lensMode === 'segmentation' ? '#dfbd68' : lensMode === 'detection' ? '#df6553' : '#72d9d6';
    if (screenMaterialRef.current) screenMaterialRef.current.color.set(lensMode === 'raw' ? '#dce3dc' : modeColor);
    if (frameMaterialRef.current) {
      frameMaterialRef.current.emissive.set(modeColor);
      frameMaterialRef.current.emissiveIntensity = 0.35 + reveal * 1.2;
    }
  });

  return (
    <group ref={rootRef} position={[4.7, 4.15, -31]} scale={0.001}>
      <mesh position={[0, 0, -0.13]}>
        <boxGeometry args={[5.7, 4.68, 0.26]} />
        <meshStandardMaterial ref={frameMaterialRef} color="#172123" emissive="#72d9d6" emissiveIntensity={0.4} roughness={0.42} metalness={0.46} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[5.38, 4.36]} />
        <meshBasicMaterial ref={screenMaterialRef} map={texture} color="#dce3dc" toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.52, 0]}>
        <boxGeometry args={[5.74, 0.075, 0.075]} />
        <meshBasicMaterial color="#72d9d6" />
      </mesh>
      <mesh position={[-3.02, 0, 0]}>
        <boxGeometry args={[0.04, 4.68, 0.04]} />
        <meshBasicMaterial color="#d5b365" transparent opacity={0.68} />
      </mesh>
    </group>
  );
}

function LensOptic({ progressRef, lensPointerRef, lensMode }: Pick<NexusActSceneProps, 'progressRef' | 'lensPointerRef' | 'lensMode'>) {
  const rootRef = useRef<THREE.Group>(null);
  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const glassMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const cursor = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size, clock }) => {
    if (!rootRef.current) return;
    const presence = smooth(range(progressRef.current, 0.13, 0.16)) * (1 - smooth(range(progressRef.current, 0.285, 0.31)));
    cursor.set(lensPointerRef.current.x * 2 - 1, lensPointerRef.current.y * 2 - 1, 0.12).unproject(camera);
    direction.copy(cursor).sub(camera.position).normalize();
    rootRef.current.position.copy(camera.position).add(direction.multiplyScalar(3.1));
    rootRef.current.quaternion.copy(camera.quaternion);
    const scale = (size.width <= 820 ? 0.34 : 0.46) * presence;
    rootRef.current.scale.setScalar(Math.max(0.001, scale));
    rootRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.45) * 0.018;
    rootRef.current.visible = presence > 0.005;

    const accent = lensMode === 'segmentation' ? '#e1bd67' : lensMode === 'detection' ? '#df6553' : '#72d9d6';
    if (ringMaterialRef.current) ringMaterialRef.current.color.set(accent);
    if (glassMaterialRef.current) {
      glassMaterialRef.current.color.set(accent);
      glassMaterialRef.current.opacity = lensMode === 'raw' ? 0.025 : 0.06;
    }
  });

  return (
    <group ref={rootRef} visible={false} renderOrder={20}>
      <mesh>
        <ringGeometry args={[0.91, 0.95, 72]} />
        <meshBasicMaterial ref={ringMaterialRef} color="#72d9d6" transparent opacity={0.9} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[0.91, 72]} />
        <meshBasicMaterial ref={glassMaterialRef} color="#72d9d6" transparent opacity={0.03} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {Array.from({ length: 4 }, (_, index) => {
        const angle = index * Math.PI / 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 1.05, Math.sin(angle) * 1.05, 0]} rotation={[0, 0, angle]}>
            <planeGeometry args={[0.26, 0.018]} />
            <meshBasicMaterial color="#e4e1d9" transparent opacity={0.8} depthTest={false} depthWrite={false} />
          </mesh>
        );
      })}
      <mesh>
        <ringGeometry args={[0.035, 0.047, 24]} />
        <meshBasicMaterial color="#e4e1d9" transparent opacity={0.75} depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function NexusActScene(props: NexusActSceneProps) {
  return (
    <>
      <NexusCity {...props} />
      <SurveyDrone progressRef={props.progressRef} lensMode={props.lensMode} />
      <EvidencePanel progressRef={props.progressRef} lensMode={props.lensMode} />
      <LensOptic progressRef={props.progressRef} lensPointerRef={props.lensPointerRef} lensMode={props.lensMode} />
    </>
  );
}
