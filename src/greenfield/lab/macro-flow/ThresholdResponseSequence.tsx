import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { QualityTier } from '../../experience/quality';

type ThresholdResponseSequenceProps = {
  progressRef: MutableRefObject<number>;
  qualityTier: QualityTier;
  reducedMotion: boolean;
};

type ResponseStation = {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  side: -1 | 1;
  level: number;
};

const RESPONSE_COUNT = 6;
const RESPONSE_START = 0.021;
const RESPONSE_STEP = 0.0027;
const RESPONSE_DURATION = 0.0065;
const FORMATION_START = 0.034;
const APERTURE_OPEN_START = 0.044;
const APERTURE_OPEN_END = 0.061;
const PIVOT = new THREE.Vector3(0, 4.72, 15.84);
const MINERAL = new THREE.Color('#8b8068');
const ACTIVE_MINERAL = new THREE.Color('#c8b27e');
const TECHNICAL = new THREE.Color('#76d8d3');

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function range(value: number, start: number, end: number) {
  return clamp01((value - start) / Math.max(Number.EPSILON, end - start));
}

function smooth(value: number) {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function createSignalCurve(compact: boolean) {
  const points = compact
    ? [
        new THREE.Vector3(0.2, 0.1, 29),
        new THREE.Vector3(-0.15, 0.11, 25.3),
        new THREE.Vector3(0.3, 0.12, 21.4),
        new THREE.Vector3(-0.55, 0.22, 18.1),
        new THREE.Vector3(-0.28, 2.15, 16.15),
        PIVOT.clone(),
      ]
    : [
        new THREE.Vector3(-11.6, 0.09, 29.5),
        new THREE.Vector3(-8.5, 0.1, 25.9),
        new THREE.Vector3(-5.8, 0.11, 22.5),
        new THREE.Vector3(-2.8, 0.16, 19.2),
        new THREE.Vector3(-0.48, 2.1, 16.22),
        PIVOT.clone(),
      ];
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.45);
}

function createBladeGeometry(qualityTier: QualityTier) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.22, -1.45);
  shape.lineTo(0.22, -1.45);
  shape.lineTo(0.13, 1.28);
  shape.lineTo(0, 1.62);
  shape.lineTo(-0.13, 1.28);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.24,
    steps: 1,
    bevelEnabled: true,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    bevelSegments: qualityTier === 'cinematic' ? 2 : 1,
  });
  geometry.translate(0, 0, -0.12);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createResponseStations(): ResponseStation[] {
  const left = [
    { x: -2.45, y: 2.85, rotation: -0.07 },
    { x: -2.05, y: 4.78, rotation: -0.2 },
    { x: -1.24, y: 6.55, rotation: -0.46 },
  ];
  return left.flatMap(({ x, y, rotation }, level) => ([
    {
      position: new THREE.Vector3(x, y, 15.78),
      rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rotation)),
      side: -1 as const,
      level,
    },
    {
      position: new THREE.Vector3(-x, y, 15.78),
      rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -rotation)),
      side: 1 as const,
      level,
    },
  ]));
}

function createResponseJointGeometry() {
  const ring = new THREE.TorusGeometry(0.21, 0.036, 6, 18);
  const core = new THREE.SphereGeometry(0.06, 10, 7);
  const geometry = mergeGeometries([ring, core], false);
  ring.dispose();
  core.dispose();
  if (!geometry) throw new Error('Threshold response joint geometry could not be merged');
  geometry.computeBoundingSphere();
  return geometry;
}

function createSignalMaterial(color: string, opacity: number) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uReveal: { value: 0 },
      uOpacity: { value: opacity },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uReveal;
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;

      void main() {
        if (vUv.x > uReveal) discard;
        float distanceToHead = max(0.0, uReveal - vUv.x);
        float head = 1.0 - smoothstep(0.0, 0.16, distanceToHead);
        float tail = 0.34 + head * 0.66;
        gl_FragColor = vec4(mix(uColor * 0.68, uColor * 1.35, head), uOpacity * tail);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  material.forceSinglePass = true;
  return material;
}

function createFieldMaterial() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uReveal: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uReveal;
      uniform float uTime;
      varying vec2 vUv;

      float line(float value, float width) {
        return 1.0 - smoothstep(width, width * 2.2, abs(value));
      }

      void main() {
        vec2 centered = vUv - 0.5;
        float perspective = mix(0.25, 1.0, vUv.y);
        float avenue = line(centered.x * perspective, 0.018);
        float sideRails = line(abs(centered.x) * perspective - 0.19, 0.012);
        float crossGrid = line(fract((1.0 - vUv.y) * 13.0 + uTime * 0.035) - 0.5, 0.055);
        float windows = step(0.77, fract((vUv.x + floor(vUv.y * 8.0) * 0.31) * 17.0))
          * step(0.58, vUv.y);
        vec3 base = vec3(0.018, 0.055, 0.058);
        vec3 cyan = vec3(0.17, 0.66, 0.64);
        vec3 amber = vec3(0.62, 0.39, 0.14);
        vec3 color = base + cyan * (avenue * 0.54 + sideRails * 0.42 + crossGrid * 0.14);
        color += amber * windows * 0.2;
        float edge = smoothstep(0.0, 0.12, vUv.x)
          * smoothstep(0.0, 0.12, 1.0 - vUv.x)
          * smoothstep(0.0, 0.1, vUv.y)
          * smoothstep(0.0, 0.1, 1.0 - vUv.y);
        gl_FragColor = vec4(color, uReveal * edge * 0.92);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  material.forceSinglePass = true;
  return material;
}

export function ThresholdResponseSequence({
  progressRef,
  qualityTier,
  reducedMotion,
}: ThresholdResponseSequenceProps) {
  const compact = useThree((state) => state.size.width <= 820);
  const rootRef = useRef<THREE.Group>(null);
  const signalGroupRef = useRef<THREE.Group>(null);
  const responseGroupRef = useRef<THREE.Group>(null);
  const signalHeadRef = useRef<THREE.Mesh>(null);
  const pivotRef = useRef<THREE.Mesh>(null);
  const jointRef = useRef<THREE.InstancedMesh>(null);
  const bladeRef = useRef<THREE.InstancedMesh>(null);
  const responseCountRef = useRef(-1);
  const stationTransform = useMemo(() => new THREE.Object3D(), []);
  const signalCurve = useMemo(() => createSignalCurve(compact), [compact]);
  const stations = useMemo(createResponseStations, []);
  const signalGeometries = useMemo(() => ({
    filament: new THREE.TubeGeometry(signalCurve, compact ? 52 : 72, 0.035, 5, false),
    glow: new THREE.TubeGeometry(signalCurve, compact ? 52 : 72, 0.11, 6, false),
    head: new THREE.SphereGeometry(compact ? 0.14 : 0.12, 12, 8),
  }), [compact, signalCurve]);
  const responseGeometries = useMemo(() => ({
    joint: createResponseJointGeometry(),
    blade: createBladeGeometry(qualityTier),
    pivot: new THREE.OctahedronGeometry(0.24, 0),
    field: new THREE.PlaneGeometry(6.2, 8.6),
  }), [qualityTier]);
  const signalMaterials = useMemo(() => ({
    filament: createSignalMaterial('#8ff7ee', 0.96),
    glow: createSignalMaterial('#53c9c5', 0.13),
    head: new THREE.MeshBasicMaterial({
      color: '#b8fff7',
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false,
    }),
  }), []);
  const responseMaterials = useMemo(() => ({
    joint: new THREE.MeshBasicMaterial({
      color: '#eadfc5',
      transparent: true,
      opacity: 0.9,
      toneMapped: false,
      depthWrite: false,
    }),
    blade: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#172d2c',
      emissiveIntensity: qualityTier === 'cinematic' ? 0.7 : 0.45,
      metalness: 0.58,
      roughness: 0.48,
      vertexColors: true,
      transparent: true,
      opacity: 0.98,
    }),
    pivot: new THREE.MeshStandardMaterial({
      color: '#9a3729',
      emissive: '#5d170f',
      emissiveIntensity: 1.2,
      metalness: 0.64,
      roughness: 0.32,
    }),
    field: createFieldMaterial(),
  }), [qualityTier]);
  const scratchColor = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    jointRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    bladeRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.mf-lab');
    if (root) root.dataset.thresholdResponseTotal = String(RESPONSE_COUNT);
    return () => {
      if (root) {
        delete root.dataset.thresholdResponseTotal;
        delete root.dataset.thresholdResponses;
        delete root.dataset.thresholdSignal;
        delete root.dataset.thresholdAperture;
      }
    };
  }, []);

  useEffect(() => () => {
    Object.values(signalGeometries).forEach((geometry) => geometry.dispose());
    Object.values(responseGeometries).forEach((geometry) => geometry.dispose());
    Object.values(signalMaterials).forEach((material) => material.dispose());
    Object.values(responseMaterials).forEach((material) => material.dispose());
  }, [responseGeometries, responseMaterials, signalGeometries, signalMaterials]);

  useFrame(({ clock }) => {
    const progress = progressRef.current;
    const reveal = smooth(range(progress, 0.009, 0.031));
    const signalFade = 1 - smooth(range(progress, 0.044, 0.056));
    const aperture = smooth(range(progress, APERTURE_OPEN_START, APERTURE_OPEN_END));
    const apparatusDeparture = smooth(range(progress, 0.047, 0.054));
    const root = rootRef.current;
    if (root) root.visible = progress >= 0.004 && progress < 0.059;
    if (signalGroupRef.current) signalGroupRef.current.visible = progress < 0.046;
    if (responseGroupRef.current) responseGroupRef.current.visible = progress < 0.047;

    signalMaterials.filament.uniforms.uReveal.value = reveal;
    signalMaterials.glow.uniforms.uReveal.value = reveal;
    signalMaterials.filament.uniforms.uOpacity.value = 0.96 * signalFade;
    signalMaterials.glow.uniforms.uOpacity.value = 0.13 * signalFade;

    const signalHead = signalHeadRef.current;
    if (signalHead) {
      signalCurve.getPointAt(reveal, signalHead.position);
      const headPulse = reducedMotion ? 1 : 0.9 + Math.sin(clock.elapsedTime * 7.2) * 0.1;
      signalHead.scale.setScalar((0.45 + reveal * 0.55) * headPulse);
      signalHead.visible = reveal > 0.015 && signalFade > 0.02;
      signalMaterials.head.opacity = signalFade * (0.42 + reveal * 0.52);
    }

    if (pivotRef.current) {
      const pivotActivation = smooth(range(progress, 0.028, 0.034));
      const pivotPulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 3.4) * 0.06;
      pivotRef.current.scale.setScalar(pivotActivation * pivotPulse * (1 - apparatusDeparture));
      pivotRef.current.rotation.z = reducedMotion ? Math.PI / 4 : Math.PI / 4 + clock.elapsedTime * 0.05;
    }

    const joints = jointRef.current;
    const blades = bladeRef.current;
    let responseCount = 0;

    stations.forEach((station, index) => {
      const responseStart = RESPONSE_START + index * RESPONSE_STEP;
      const response = smooth(range(progress, responseStart, responseStart + RESPONSE_DURATION));
      const formation = smooth(range(
        progress,
        FORMATION_START + index * 0.001,
        0.047 + index * 0.0008,
      ));
      const bladeOpen = smooth(range(
        progress,
        APERTURE_OPEN_START + station.level * 0.001,
        APERTURE_OPEN_END + station.level * 0.0008,
      ));
      if (response >= 0.98) responseCount += 1;

      const responsePulse = reducedMotion ? 1 : 1 + Math.sin(response * Math.PI) * 0.62;
      const jointScale = response
        * responsePulse
        * THREE.MathUtils.lerp(1, 0.5, formation)
        * (1 - apparatusDeparture);
      stationTransform.position.copy(station.position);
      stationTransform.quaternion.identity();
      stationTransform.scale.setScalar(jointScale);
      stationTransform.updateMatrix();
      joints?.setMatrixAt(index, stationTransform.matrix);

      stationTransform.position.copy(station.position);
      stationTransform.position.x += station.side * bladeOpen * (2.35 + station.level * 0.4);
      stationTransform.position.y += bladeOpen * (0.06 + station.level * 0.16);
      stationTransform.quaternion.copy(station.rotation);
      stationTransform.rotateZ(station.side * bladeOpen * (0.1 + station.level * 0.045));
      stationTransform.scale.set(
        THREE.MathUtils.lerp(0.18, 0.76 + station.level * 0.07, formation) * (1 - apparatusDeparture),
        THREE.MathUtils.lerp(0.02, 0.92 - station.level * 0.04, formation) * (1 - apparatusDeparture),
        THREE.MathUtils.lerp(0.18, 1, formation) * (1 - apparatusDeparture),
      );
      stationTransform.updateMatrix();
      blades?.setMatrixAt(index, stationTransform.matrix);
      blades?.setColorAt(
        index,
        scratchColor
          .lerpColors(MINERAL, ACTIVE_MINERAL, response)
          .lerp(TECHNICAL, aperture * 0.72),
      );
    });

    if (joints) joints.instanceMatrix.needsUpdate = true;
    if (blades) {
      blades.instanceMatrix.needsUpdate = true;
      if (blades.instanceColor) blades.instanceColor.needsUpdate = true;
    }

    responseMaterials.field.uniforms.uReveal.value = aperture
      * (1 - smooth(range(progress, 0.051, 0.059)));
    responseMaterials.field.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;

    if (responseCount !== responseCountRef.current) {
      responseCountRef.current = responseCount;
      const lab = document.querySelector<HTMLElement>('.mf-lab');
      if (lab) lab.dataset.thresholdResponses = String(responseCount);
    }
    const lab = document.querySelector<HTMLElement>('.mf-lab');
    if (lab) {
      lab.dataset.thresholdSignal = reveal >= 0.995 ? 'arrived' : reveal > 0.01 ? 'travelling' : 'idle';
      lab.dataset.thresholdAperture = aperture >= 0.995 ? 'open' : aperture > 0.01 ? 'opening' : 'closed';
    }
  });

  return (
    <group ref={rootRef} visible={false}>
      <mesh
        geometry={responseGeometries.field}
        material={responseMaterials.field}
        position={[0, 4.35, 14.68]}
      />
      <group ref={signalGroupRef}>
        <mesh geometry={signalGeometries.glow} material={signalMaterials.glow} renderOrder={5} />
        <mesh geometry={signalGeometries.filament} material={signalMaterials.filament} renderOrder={6} />
        <mesh
          ref={signalHeadRef}
          geometry={signalGeometries.head}
          material={signalMaterials.head}
          renderOrder={7}
        />
        <mesh
          ref={pivotRef}
          geometry={responseGeometries.pivot}
          material={responseMaterials.pivot}
          position={PIVOT}
          renderOrder={7}
        />
      </group>
      <instancedMesh
        ref={bladeRef}
        args={[responseGeometries.blade, responseMaterials.blade, RESPONSE_COUNT]}
        frustumCulled={false}
        renderOrder={5}
      />
      <group ref={responseGroupRef}>
        <instancedMesh
          ref={jointRef}
          args={[responseGeometries.joint, responseMaterials.joint, RESPONSE_COUNT]}
          frustumCulled={false}
          renderOrder={8}
        />
      </group>
    </group>
  );
}
