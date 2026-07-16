import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { QualityTier } from '../../experience/quality';
import type { MacroTraceOutcome } from './macroFlowTypes';

type SchoolActSceneProps = {
  progressRef: MutableRefObject<number>;
  traceStep: number;
  traceOutcome: MacroTraceOutcome;
  qualityTier: QualityTier;
};

type TexturePair = {
  aegis: THREE.Texture;
  schoolmate: THREE.Texture;
};

const TRACE_POSITIONS = [
  new THREE.Vector3(1.18, 2.7, -81.4),
  new THREE.Vector3(2.05, 2.28, -82.5),
  new THREE.Vector3(4.78, 3.45, -86.6),
  new THREE.Vector3(1.34, 2.18, -86),
  new THREE.Vector3(-4.72, 3.25, -90.2),
];

const STUDENT_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(2.7, 0.05, -59),
  new THREE.Vector3(2.15, 0.05, -65),
  new THREE.Vector3(1.55, 0.05, -73),
  new THREE.Vector3(1.18, 0.05, -82),
  new THREE.Vector3(0.9, 0.05, -88),
  new THREE.Vector3(0.15, 0.05, -95),
  new THREE.Vector3(-1.15, 0.05, -102),
  new THREE.Vector3(-2.4, 0.05, -109),
]);

const SCHOOLMATE_FLOW = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-4.5, 2.2, -93.2),
  new THREE.Vector3(-2.4, 3.9, -98.2),
  new THREE.Vector3(2.7, 2.6, -103.2),
  new THREE.Vector3(-2.8, 3.1, -109.2),
  new THREE.Vector3(0, 3.7, -115.4),
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

function createLabelTexture(primary: string, secondary: string, accent: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);

  context.fillStyle = '#0a1112';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = accent;
  context.fillRect(0, 0, 18, canvas.height);
  context.strokeStyle = `${accent}66`;
  context.lineWidth = 2;
  context.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);
  context.fillStyle = '#e5e2d9';
  context.font = '700 76px Arial';
  context.fillText(primary, 74, 222);
  context.fillStyle = '#93a6a4';
  context.font = '500 28px monospace';
  context.fillText(secondary.toUpperCase(), 78, 292);
  context.fillStyle = accent;
  context.fillRect(78, 350, 182, 6);
  context.fillStyle = '#60716f';
  context.font = '400 19px monospace';
  context.fillText('TRANSYLVANIAN BEARS / SCHOOL SYSTEMS', 78, 408);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function LabelPanel({
  primary,
  secondary,
  accent,
  position,
  rotation = [0, 0, 0],
  scale = 1,
}: {
  primary: string;
  secondary: string;
  accent: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  const texture = useMemo(() => createLabelTexture(primary, secondary, accent), [accent, primary, secondary]);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0, -0.07]}>
        <boxGeometry args={[4.2, 2.1, 0.14]} />
        <meshStandardMaterial color="#11191a" metalness={0.45} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[4, 2]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function PortalFrames({ progressRef }: Pick<SchoolActSceneProps, 'progressRef'>) {
  const rootRef = useRef<THREE.Group>(null);
  const materialRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([]);

  useFrame((_, delta) => {
    const reveal = smooth(range(progressRef.current, 0.272, 0.345));
    const solidify = smooth(range(progressRef.current, 0.315, 0.385));
    if (rootRef.current) {
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -4.8 + reveal * 4.8, 5.5, delta);
    }
    materialRefs.current.forEach((material, index) => {
      if (!material) return;
      const local = smooth(range(reveal, index * 0.07, 0.45 + index * 0.07));
      const frameIndex = Math.floor(index / 3);
      const passed = smooth(range(progressRef.current, 0.345 + frameIndex * 0.012, 0.367 + frameIndex * 0.012));
      material.emissiveIntensity = 2.8 * local * (1 - solidify) + 0.24 * solidify;
      material.roughness = 0.24 + solidify * 0.5;
      material.metalness = 0.18 + solidify * 0.42;
      material.opacity = local * (1 - passed) * 0.74;
    });
  });

  return (
    <group ref={rootRef} position={[2.6, -4.8, 0]}>
      {Array.from({ length: 5 }, (_, index) => {
        const z = -56.5 - index * 3.1;
        const width = 4.6 + index * 0.34;
        const height = 8.2 + index * 0.2;
        const color = index < 3 ? '#72d9d6' : '#b6a46f';
        return (
          <group key={z} position={[Math.sin(index * 0.72) * 0.62, 0, z]}>
            <mesh position={[-width / 2, height / 2, 0]}>
              <boxGeometry args={[0.11, height, 0.11]} />
              <meshStandardMaterial
                ref={(material) => { materialRefs.current[index * 3] = material; }}
                color={color}
                emissive={color}
                emissiveIntensity={0}
                transparent
                opacity={0}
                depthWrite={false}
              />
            </mesh>
            <mesh position={[width / 2, height / 2, 0]}>
              <boxGeometry args={[0.11, height, 0.11]} />
              <meshStandardMaterial
                ref={(material) => { materialRefs.current[index * 3 + 1] = material; }}
                color={color}
                emissive={color}
                emissiveIntensity={0}
                transparent
                opacity={0}
                depthWrite={false}
              />
            </mesh>
            <mesh position={[0, height, 0]}>
              <boxGeometry args={[width, 0.11, 0.11]} />
              <meshStandardMaterial
                ref={(material) => { materialRefs.current[index * 3 + 2] = material; }}
                color={color}
                emissive={color}
                emissiveIntensity={0}
                transparent
                opacity={0}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function CorridorLight({
  position,
  materialRef,
}: {
  position: [number, number, number];
  materialRef: (material: THREE.MeshStandardMaterial | null) => void;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[2.5, 0.16, 0.72]} />
        <meshStandardMaterial color="#283233" roughness={0.5} metalness={0.28} />
      </mesh>
      <mesh>
        <boxGeometry args={[2.2, 0.06, 0.54]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#dce1d4"
          emissive="#dbead7"
          emissiveIntensity={0.15}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function SchoolArchitecture({ progressRef, qualityTier }: Pick<SchoolActSceneProps, 'progressRef' | 'qualityTier'>) {
  const rootRef = useRef<THREE.Group>(null);
  const lightMaterials = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const lightCount = qualityTier === 'cinematic' ? 8 : 6;
  const pavingCount = qualityTier === 'cinematic' ? 18 : 11;
  const lockerCount = qualityTier === 'cinematic' ? 9 : 6;

  useFrame(({ clock }, delta) => {
    const reveal = smooth(range(progressRef.current, 0.275, 0.335));
    const departure = smooth(range(progressRef.current, 0.595, 0.635));
    if (rootRef.current) {
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -5.5 + reveal * 5.5 - departure * 9, 5.2, delta);
    }
    const lightTravel = range(progressRef.current, 0.315, 0.56);
    lightMaterials.current.forEach((material, index) => {
      if (!material) return;
      const active = smooth(range(lightTravel, index / lightCount - 0.08, (index + 1.3) / lightCount));
      material.emissiveIntensity = 0.12 + active * 2.4 + Math.sin(clock.elapsedTime * 1.3 + index) * 0.04;
    });
  });

  return (
    <group ref={rootRef} position={[0, -5.5, 0]}>
      <mesh position={[0, 0.015, -88]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[13.2, 57]} />
        <meshStandardMaterial color="#303635" roughness={0.88} metalness={0.04} />
      </mesh>

      {Array.from({ length: pavingCount }, (_, index) => (
        <mesh key={`paver-${index}`} position={[0, 0.035, -57 - index * (13 / pavingCount)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.8, 0.48]} />
          <meshStandardMaterial color={index % 2 === 0 ? '#68716d' : '#555e5a'} roughness={0.92} />
        </mesh>
      ))}

      <mesh position={[-5.55, 3.45, -70]}>
        <boxGeometry args={[6.25, 6.9, 0.65]} />
        <meshStandardMaterial color="#5d625a" roughness={0.82} />
      </mesh>
      <mesh position={[5.55, 3.45, -70]}>
        <boxGeometry args={[6.25, 6.9, 0.65]} />
        <meshStandardMaterial color="#5d625a" roughness={0.82} />
      </mesh>
      <mesh position={[0, 7.2, -70]}>
        <boxGeometry args={[5.1, 1.55, 0.72]} />
        <meshStandardMaterial color="#3a4340" roughness={0.72} metalness={0.16} />
      </mesh>
      <mesh position={[0, 6.96, -69.58]}>
        <planeGeometry args={[4.35, 0.88]} />
        <meshBasicMaterial color="#d9e1d2" transparent opacity={0.13} />
      </mesh>
      <LabelPanel
        primary="AEGIS"
        secondary="controlled school access"
        accent="#72d9d6"
        position={[0, 7.18, -69.12]}
        scale={0.82}
      />

      {[-3.05, 3.05].map((x) => (
        <group key={`entry-column-${x}`}>
          <mesh position={[x, 3.2, -69.35]}>
            <boxGeometry args={[0.42, 6.4, 0.42]} />
            <meshStandardMaterial color="#777b70" roughness={0.75} />
          </mesh>
          <mesh position={[x, 3.2, -69.08]}>
            <boxGeometry args={[0.08, 5.75, 0.08]} />
            <meshStandardMaterial color="#72d9d6" emissive="#72d9d6" emissiveIntensity={0.82} />
          </mesh>
        </group>
      ))}

      <mesh position={[-6.2, 3.35, -93]}>
        <boxGeometry args={[0.32, 6.7, 44]} />
        <meshStandardMaterial color="#5d625d" roughness={0.88} />
      </mesh>
      <mesh position={[6.2, 3.35, -93]}>
        <boxGeometry args={[0.32, 6.7, 44]} />
        <meshStandardMaterial color="#444e4d" roughness={0.82} />
      </mesh>
      <mesh position={[0, 7, -93]}>
        <boxGeometry args={[12.7, 0.22, 44]} />
        <meshStandardMaterial color="#252d2d" roughness={0.9} />
      </mesh>

      {Array.from({ length: lightCount }, (_, index) => (
        <CorridorLight
          key={`ceiling-${index}`}
          position={[0, 6.83, -75 - index * (36 / Math.max(1, lightCount - 1))]}
          materialRef={(material) => { lightMaterials.current[index] = material; }}
        />
      ))}

      {Array.from({ length: lockerCount }, (_, index) => (
        <group key={`locker-${index}`} position={[-5.72, 2.25, -77 - index * (31 / Math.max(1, lockerCount - 1))]}>
          <mesh>
            <boxGeometry args={[0.52, 4.25, 2.25]} />
            <meshStandardMaterial color={index % 2 === 0 ? '#314342' : '#3b4b49'} metalness={0.18} roughness={0.72} />
          </mesh>
          {[-0.62, 0, 0.62].map((z) => (
            <mesh key={z} position={[0.275, 0.42, z]}>
              <boxGeometry args={[0.025, 0.035, 0.24]} />
              <meshBasicMaterial color="#9caa9e" />
            </mesh>
          ))}
        </group>
      ))}

      {Array.from({ length: 7 }, (_, index) => (
        <group key={`window-${index}`} position={[6.01, 3.65, -76 - index * 5.2]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh position={[0, 0, -0.08]}>
            <boxGeometry args={[3.45, 2.75, 0.18]} />
            <meshStandardMaterial color="#192324" metalness={0.26} roughness={0.44} />
          </mesh>
          <mesh>
            <planeGeometry args={[3.1, 2.4]} />
            <meshBasicMaterial color="#9bbeb6" transparent opacity={0.12 + (index % 3) * 0.035} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.055, 2.4, 0.04]} />
            <meshBasicMaterial color="#83938e" />
          </mesh>
        </group>
      ))}

      <group position={[0, 0, -102.2]}>
        <mesh position={[-4.15, 3.5, 0]}>
          <boxGeometry args={[4.2, 7, 0.4]} />
          <meshStandardMaterial color="#4c5551" roughness={0.86} />
        </mesh>
        <mesh position={[4.15, 3.5, 0]}>
          <boxGeometry args={[4.2, 7, 0.4]} />
          <meshStandardMaterial color="#4c5551" roughness={0.86} />
        </mesh>
        <mesh position={[0, 6.55, 0]}>
          <boxGeometry args={[4.2, 0.9, 0.4]} />
          <meshStandardMaterial color="#313b39" roughness={0.82} />
        </mesh>
        <mesh position={[0, 6.5, 0.23]}>
          <boxGeometry args={[3.45, 0.08, 0.06]} />
          <meshStandardMaterial color="#b8a66f" emissive="#b8a66f" emissiveIntensity={1.1} />
        </mesh>
      </group>

      <LabelPanel
        primary="SALA 11B"
        secondary="SchoolMate connected classroom"
        accent="#b8a66f"
        position={[3.7, 5.45, -101.92]}
        scale={0.48}
      />
      <LabelPanel
        primary="SECRETARIAT"
        secondary="requests and approvals"
        accent="#72d9d6"
        position={[-5.98, 4.2, -91.8]}
        rotation={[0, Math.PI / 2, 0]}
        scale={0.44}
      />
    </group>
  );
}

function StudentRig({
  progressRef,
  traceOutcome,
  aegisTexture,
}: Pick<SchoolActSceneProps, 'progressRef' | 'traceOutcome'> & { aegisTexture: THREE.Texture }) {
  const rootRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const phoneRef = useRef<THREE.Group>(null);
  const routeRef = useRef(0);
  const position = useMemo(() => new THREE.Vector3(), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    if (!rootRef.current) return;
    const approach = smooth(range(progressRef.current, 0.286, 0.365)) * 0.43;
    const allowed = traceOutcome === 'allowed';
    const onward = allowed ? smooth(range(progressRef.current, 0.365, 0.585)) * 0.57 : 0;
    const targetRoute = Math.min(1, approach + onward);
    const previousRoute = routeRef.current;
    routeRef.current = THREE.MathUtils.damp(routeRef.current, targetRoute, allowed ? 2.8 : 4.8, delta);
    STUDENT_PATH.getPoint(routeRef.current, position);
    STUDENT_PATH.getTangent(Math.min(0.999, routeRef.current + 0.008), tangent);
    rootRef.current.position.copy(position);
    rootRef.current.rotation.y = THREE.MathUtils.damp(
      rootRef.current.rotation.y,
      Math.atan2(-tangent.x, -tangent.z),
      6,
      delta,
    );

    const moving = Math.abs(routeRef.current - previousRoute) > 0.00002;
    const stride = moving ? Math.sin(clock.elapsedTime * 8.4) * 0.48 : 0;
    if (leftArmRef.current) leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, -stride * 0.68, 8, delta);
    if (rightArmRef.current) rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, stride * 0.18 - 0.42, 8, delta);
    if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.damp(leftLegRef.current.rotation.x, stride, 8, delta);
    if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.damp(rightLegRef.current.rotation.x, -stride, 8, delta);
    rootRef.current.position.y += moving ? Math.abs(Math.sin(clock.elapsedTime * 8.4)) * 0.055 : 0;

    if (phoneRef.current) {
      const presenting = routeRef.current > 0.34 && routeRef.current < 0.53 && traceOutcome !== 'allowed';
      phoneRef.current.position.y = THREE.MathUtils.damp(phoneRef.current.position.y, presenting ? 2.75 : 2.3, 7, delta);
      phoneRef.current.position.z = THREE.MathUtils.damp(phoneRef.current.position.z, presenting ? -0.72 : -0.42, 7, delta);
      phoneRef.current.rotation.x = THREE.MathUtils.damp(phoneRef.current.rotation.x, presenting ? -0.15 : 0.08, 7, delta);
    }
  });

  return (
    <group ref={rootRef} position={[2.7, 0.05, -59]} scale={0.82}>
      <mesh position={[0, 2.35, 0]}>
        <capsuleGeometry args={[0.5, 1.15, 8, 14]} />
        <meshStandardMaterial color="#213332" roughness={0.78} />
      </mesh>
      <mesh position={[0, 3.55, -0.02]}>
        <sphereGeometry args={[0.43, 18, 14]} />
        <meshStandardMaterial color="#a98469" roughness={0.82} />
      </mesh>
      <mesh position={[0, 3.84, 0.03]} rotation={[0.12, 0, 0]}>
        <sphereGeometry args={[0.44, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
        <meshStandardMaterial color="#171b1a" roughness={0.92} />
      </mesh>
      <mesh position={[0, 2.7, 0.42]}>
        <boxGeometry args={[0.86, 1.35, 0.36]} />
        <meshStandardMaterial color="#171e1f" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.83, -0.52]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[0.12, 1.45, 0.06]} />
        <meshStandardMaterial color="#b8a66f" emissive="#6f613d" emissiveIntensity={0.28} />
      </mesh>

      <group ref={leftArmRef} position={[-0.58, 2.78, 0]}>
        <mesh position={[0, -0.58, 0]}>
          <capsuleGeometry args={[0.15, 0.86, 5, 10]} />
          <meshStandardMaterial color="#29413e" roughness={0.8} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.58, 2.78, 0]}>
        <mesh position={[0, -0.58, 0]}>
          <capsuleGeometry args={[0.15, 0.86, 5, 10]} />
          <meshStandardMaterial color="#29413e" roughness={0.8} />
        </mesh>
      </group>
      <group ref={leftLegRef} position={[-0.27, 1.55, 0]}>
        <mesh position={[0, -0.7, 0]}>
          <capsuleGeometry args={[0.18, 1.05, 5, 10]} />
          <meshStandardMaterial color="#182222" roughness={0.86} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.27, 1.55, 0]}>
        <mesh position={[0, -0.7, 0]}>
          <capsuleGeometry args={[0.18, 1.05, 5, 10]} />
          <meshStandardMaterial color="#182222" roughness={0.86} />
        </mesh>
      </group>

      <group ref={phoneRef} position={[0.82, 2.3, -0.42]} rotation={[0.08, 0, -0.08]}>
        <mesh position={[0, 0, -0.035]}>
          <boxGeometry args={[0.55, 0.88, 0.09]} />
          <meshStandardMaterial color="#090d0e" metalness={0.42} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0, 0.018]}>
          <planeGeometry args={[0.49, 0.8]} />
          <meshBasicMaterial map={aegisTexture} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0, 0.16]} intensity={0.42} distance={1.7} color="#72d9d6" />
      </group>
    </group>
  );
}

function Turnstile({
  traceStep,
  traceOutcome,
  aegisTexture,
}: Pick<SchoolActSceneProps, 'traceStep' | 'traceOutcome'> & { aegisTexture: THREE.Texture }) {
  const armsRef = useRef<THREE.Group>(null);
  const leftGateRef = useRef<THREE.Group>(null);
  const rightGateRef = useRef<THREE.Group>(null);
  const scannerMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const beamMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const gatePhaseRef = useRef(0);

  useFrame(({ clock }, delta) => {
    const allowed = traceOutcome === 'allowed';
    const denied = traceOutcome === 'expired' || traceOutcome === 'used';
    gatePhaseRef.current = THREE.MathUtils.damp(gatePhaseRef.current, allowed ? 1 : 0, 4.2, delta);
    const phase = gatePhaseRef.current;
    if (armsRef.current) armsRef.current.rotation.z = phase * Math.PI * 0.67;
    if (leftGateRef.current) leftGateRef.current.rotation.y = phase * -1.17;
    if (rightGateRef.current) rightGateRef.current.rotation.y = phase * 1.17;
    if (scannerMaterialRef.current) {
      const color = denied ? '#df6553' : allowed ? '#7ce3b0' : traceOutcome === 'running' ? '#d8bb72' : '#72d9d6';
      scannerMaterialRef.current.color.set(color);
      scannerMaterialRef.current.emissive.set(color);
      scannerMaterialRef.current.emissiveIntensity = 1.2 + Math.sin(clock.elapsedTime * (traceOutcome === 'running' ? 8 : 2.2)) * 0.35;
    }
    if (beamMaterialRef.current) {
      beamMaterialRef.current.opacity = traceOutcome === 'running' || traceStep > 0
        ? 0.13 + Math.sin(clock.elapsedTime * 7) * 0.035
        : 0.025;
      beamMaterialRef.current.color.set(denied ? '#df6553' : '#72d9d6');
    }
  });

  return (
    <group>
      <mesh position={[-2.65, 1.55, -86.3]}>
        <boxGeometry args={[0.68, 3.1, 2.8]} />
        <meshStandardMaterial color="#1a2425" metalness={0.48} roughness={0.42} />
      </mesh>
      <mesh position={[2.65, 1.55, -86.3]}>
        <boxGeometry args={[0.68, 3.1, 2.8]} />
        <meshStandardMaterial color="#1a2425" metalness={0.48} roughness={0.42} />
      </mesh>

      <group ref={leftGateRef} position={[-2.28, 1.68, -85.85]}>
        <mesh position={[1.02, 0, 0]}>
          <boxGeometry args={[2.04, 2.75, 0.08]} />
          <meshPhysicalMaterial color="#93d5ce" transparent opacity={0.14} transmission={0.35} roughness={0.18} />
        </mesh>
        <mesh position={[1.02, 0, 0.045]}>
          <boxGeometry args={[2, 0.045, 0.035]} />
          <meshBasicMaterial color="#72d9d6" />
        </mesh>
      </group>
      <group ref={rightGateRef} position={[2.28, 1.68, -85.85]}>
        <mesh position={[-1.02, 0, 0]}>
          <boxGeometry args={[2.04, 2.75, 0.08]} />
          <meshPhysicalMaterial color="#93d5ce" transparent opacity={0.14} transmission={0.35} roughness={0.18} />
        </mesh>
        <mesh position={[-1.02, 0, 0.045]}>
          <boxGeometry args={[2, 0.045, 0.035]} />
          <meshBasicMaterial color="#72d9d6" />
        </mesh>
      </group>

      <group ref={armsRef} position={[0, 1.65, -85.45]}>
        <mesh>
          <cylinderGeometry args={[0.32, 0.32, 0.52, 18]} />
          <meshStandardMaterial color="#6c7672" metalness={0.72} roughness={0.28} />
        </mesh>
        {[0, 1, 2].map((index) => {
          const angle = index * Math.PI * 2 / 3;
          return (
            <mesh key={angle} position={[Math.cos(angle) * 1.05, Math.sin(angle) * 1.05, 0]} rotation={[0, 0, angle - Math.PI / 2]}>
              <cylinderGeometry args={[0.075, 0.075, 2.1, 10]} />
              <meshStandardMaterial color="#9da69f" metalness={0.76} roughness={0.26} />
            </mesh>
          );
        })}
      </group>

      <group position={[2.05, 0, -82]}>
        <mesh position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.36, 0.48, 2.5, 8]} />
          <meshStandardMaterial color="#202b2c" metalness={0.4} roughness={0.46} />
        </mesh>
        <mesh position={[0, 2.63, 0.02]} rotation={[-0.28, 0, 0]}>
          <boxGeometry args={[1.05, 0.76, 0.2]} />
          <meshStandardMaterial color="#0c1213" metalness={0.38} roughness={0.32} />
        </mesh>
        <mesh position={[0, 2.64, 0.14]} rotation={[-0.28, 0, 0]}>
          <planeGeometry args={[0.9, 0.62]} />
          <meshBasicMaterial map={aegisTexture} toneMapped={false} />
        </mesh>
        <mesh position={[0, 3.18, 0.05]}>
          <boxGeometry args={[0.84, 0.08, 0.08]} />
          <meshStandardMaterial
            ref={scannerMaterialRef}
            color="#72d9d6"
            emissive="#72d9d6"
            emissiveIntensity={1.2}
          />
        </mesh>
      </group>

      <mesh position={[1.58, 2.42, -81.2]} rotation={[0.12, -0.3, 0]}>
        <planeGeometry args={[1.5, 1.7]} />
        <meshBasicMaterial
          ref={beamMaterialRef}
          color="#72d9d6"
          transparent
          opacity={0.025}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function TraceSegment({
  start,
  end,
  active,
  denied,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  active: boolean;
  denied: boolean;
}) {
  const midpoint = useMemo(() => start.clone().add(end).multiplyScalar(0.5), [end, start]);
  const length = start.distanceTo(end);
  const rotation = Math.atan2(end.x - start.x, end.z - start.z);
  const color = denied && active ? '#8d443d' : active ? '#477f7f' : '#2a3839';

  return (
    <mesh position={midpoint} rotation={[0, rotation, 0]}>
      <boxGeometry args={[0.018, 0.018, length]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 0.42 : 0.04} />
    </mesh>
  );
}

function PhysicalTrace({ traceStep, traceOutcome }: Pick<SchoolActSceneProps, 'traceStep' | 'traceOutcome'>) {
  const tokenRef = useRef<THREE.Mesh>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const denied = traceOutcome === 'expired' || traceOutcome === 'used';

  useFrame(({ clock }, delta) => {
    if (!tokenRef.current) return;
    target.copy(TRACE_POSITIONS[Math.min(traceStep, TRACE_POSITIONS.length - 1)]);
    tokenRef.current.position.lerp(target, 1 - Math.exp(-delta * 7));
    tokenRef.current.rotation.x += delta * 1.2;
    tokenRef.current.rotation.y += delta * 1.7;
    const material = tokenRef.current.material as THREE.MeshStandardMaterial;
    const color = denied ? '#df6553' : '#72d9d6';
    material.color.set(color);
    material.emissive.set(color);
    material.emissiveIntensity = 2.8 + Math.sin(clock.elapsedTime * 4) * 0.5;
    tokenRef.current.visible = traceOutcome !== 'idle';
  });

  return (
    <group>
      {TRACE_POSITIONS.map((position, index) => {
        const reached = traceOutcome !== 'idle' && traceStep >= index;
        const color = denied && index === TRACE_POSITIONS.length - 1 ? '#df6553' : reached ? '#72d9d6' : '#435253';
        return (
          <group key={`${position.x}-${position.z}`} position={position}>
            <mesh>
              <octahedronGeometry args={[0.23, 0]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={reached ? 1.15 : 0.08} />
            </mesh>
            <mesh scale={reached ? 1 : 0.72}>
              <torusGeometry args={[0.42, 0.025, 6, 34]} />
              <meshBasicMaterial color={color} transparent opacity={reached ? 0.46 : 0.12} />
            </mesh>
          </group>
        );
      })}
      {TRACE_POSITIONS.slice(0, -1).map((position, index) => (
        <TraceSegment
          key={`trace-segment-${index}`}
          start={position}
          end={TRACE_POSITIONS[index + 1]}
          active={traceOutcome !== 'idle' && traceStep > index}
          denied={denied}
        />
      ))}
      <mesh ref={tokenRef} position={TRACE_POSITIONS[0]} visible={false}>
        <icosahedronGeometry args={[0.27, 1]} />
        <meshStandardMaterial color="#72d9d6" emissive="#72d9d6" emissiveIntensity={3.2} roughness={0.14} />
      </mesh>

      <group position={[4.78, 1.8, -86.6]}>
        <mesh>
          <boxGeometry args={[1.35, 3.6, 1.05]} />
          <meshStandardMaterial color="#152122" metalness={0.38} roughness={0.48} />
        </mesh>
        {[-0.78, -0.26, 0.26, 0.78].map((y) => (
          <mesh key={y} position={[0, y, 0.54]}>
            <boxGeometry args={[0.82, 0.09, 0.035]} />
            <meshBasicMaterial color={traceStep >= 2 ? '#72d9d6' : '#526361'} />
          </mesh>
        ))}
      </group>
      <LabelPanel
        primary="AUDIT LOG"
        secondary="atomic redeem / append only"
        accent={denied ? '#df6553' : '#72d9d6'}
        position={[-5.92, 3.45, -90.2]}
        rotation={[0, Math.PI / 2, 0]}
        scale={0.34}
      />
    </group>
  );
}

function ClassroomDesk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[2.15, 0.12, 0.82]} />
        <meshStandardMaterial color="#6f5940" roughness={0.78} />
      </mesh>
      {[-0.82, 0.82].map((x) => (
        <mesh key={x} position={[x, 0.56, 0]}>
          <boxGeometry args={[0.1, 1.12, 0.1]} />
          <meshStandardMaterial color="#303737" metalness={0.34} roughness={0.52} />
        </mesh>
      ))}
      <mesh position={[0, 0.68, 0.82]}>
        <boxGeometry args={[1.55, 1.22, 0.12]} />
        <meshStandardMaterial color="#334240" roughness={0.72} />
      </mesh>
    </group>
  );
}

function SchoolMateStage({
  progressRef,
  schoolmateTexture,
  qualityTier,
}: Pick<SchoolActSceneProps, 'progressRef' | 'qualityTier'> & { schoolmateTexture: THREE.Texture }) {
  const rootRef = useRef<THREE.Group>(null);
  const roleRefs = useRef<Array<THREE.Group | null>>([]);
  const beadRefs = useRef<Array<THREE.Mesh | null>>([]);
  const flowPosition = useMemo(() => new THREE.Vector3(), []);
  const deskRows = qualityTier === 'cinematic' ? 3 : 2;

  useFrame(({ clock }, delta) => {
    const reveal = smooth(range(progressRef.current, 0.455, 0.57));
    const departure = smooth(range(progressRef.current, 0.595, 0.635));
    if (rootRef.current) {
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -5 + reveal * 5 - departure * 8, 5.1, delta);
    }
    roleRefs.current.forEach((role, index) => {
      if (!role) return;
      const local = smooth(range(reveal, index * 0.13, 0.58 + index * 0.13));
      role.scale.setScalar(0.001 + local * 0.999);
      role.rotation.y = (1 - local) * (index % 2 === 0 ? -0.35 : 0.35);
    });
    beadRefs.current.forEach((bead, index) => {
      if (!bead) return;
      const phase = (clock.elapsedTime * 0.09 + index / beadRefs.current.length) % 1;
      const travel = clamp01((phase - (1 - reveal) * 0.35) / Math.max(0.001, reveal));
      SCHOOLMATE_FLOW.getPoint(travel, flowPosition);
      bead.position.copy(flowPosition);
      bead.visible = reveal > 0.08;
      const material = bead.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 1.1 + reveal * 2.4;
    });
  });

  return (
    <group ref={rootRef} position={[0, -5, 0]}>
      <group position={[0, 3.8, -112.2]}>
        <mesh position={[0, 0, -0.17]}>
          <boxGeometry args={[9.8, 5.72, 0.34]} />
          <meshStandardMaterial color="#121a1b" metalness={0.42} roughness={0.34} />
        </mesh>
        <mesh position={[0, 0, 0.015]}>
          <planeGeometry args={[9.3, 5.22]} />
          <meshBasicMaterial map={schoolmateTexture} toneMapped={false} />
        </mesh>
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[9.82, 0.09, 0.08]} />
          <meshStandardMaterial color="#b8a66f" emissive="#b8a66f" emissiveIntensity={1.7} />
        </mesh>
      </group>

      <group ref={(node) => { roleRefs.current[0] = node; }}>
        <LabelPanel primary="ELEV" secondary="orar / anunturi / cereri" accent="#72d9d6" position={[-5.88, 3.5, -95.4]} rotation={[0, Math.PI / 2, 0]} scale={0.42} />
      </group>
      <group ref={(node) => { roleRefs.current[1] = node; }}>
        <LabelPanel primary="PROFESOR" secondary="clase / catalog / comunicare" accent="#b8a66f" position={[5.88, 3.5, -101.6]} rotation={[0, -Math.PI / 2, 0]} scale={0.42} />
      </group>
      <group ref={(node) => { roleRefs.current[2] = node; }}>
        <LabelPanel primary="SECRETARIAT" secondary="aprobari / administrare" accent="#72d9d6" position={[-5.88, 3.5, -108.4]} rotation={[0, Math.PI / 2, 0]} scale={0.42} />
      </group>

      {Array.from({ length: deskRows }, (_, row) => (
        <group key={`desk-row-${row}`}>
          <ClassroomDesk position={[-2.75, 0, -105 - row * 3.3]} />
          <ClassroomDesk position={[2.75, 0, -105 - row * 3.3]} />
        </group>
      ))}

      <group position={[4.35, 0, -112.7]}>
        <mesh position={[0, 1.25, 0]}>
          <boxGeometry args={[2.8, 0.18, 1.25]} />
          <meshStandardMaterial color="#6b553d" roughness={0.76} />
        </mesh>
        <mesh position={[0, 2.18, -0.18]} rotation={[-0.08, -0.1, 0]}>
          <boxGeometry args={[1.95, 1.28, 0.12]} />
          <meshStandardMaterial color="#11191a" metalness={0.4} roughness={0.34} />
        </mesh>
        <mesh position={[0, 2.18, -0.105]} rotation={[-0.08, -0.1, 0]}>
          <planeGeometry args={[1.78, 1.1]} />
          <meshBasicMaterial map={schoolmateTexture} toneMapped={false} />
        </mesh>
      </group>

      {Array.from({ length: qualityTier === 'cinematic' ? 18 : 10 }, (_, index) => (
        <mesh key={`flow-${index}`} ref={(node) => { beadRefs.current[index] = node; }} visible={false}>
          <octahedronGeometry args={[0.09 + (index % 3) * 0.018, 0]} />
          <meshStandardMaterial color={index % 2 === 0 ? '#72d9d6' : '#b8a66f'} emissive={index % 2 === 0 ? '#72d9d6' : '#b8a66f'} emissiveIntensity={1.1} />
        </mesh>
      ))}
    </group>
  );
}

export function SchoolActScene({ progressRef, traceStep, traceOutcome, qualityTier }: SchoolActSceneProps) {
  const rootRef = useRef<THREE.Group>(null);
  const [aegisTexture, schoolmateTexture] = useTexture([
    '/assets/projects/aegis.webp',
    '/assets/projects/schoolmate.webp',
  ]);
  const textures = useMemo<TexturePair>(() => {
    aegisTexture.colorSpace = THREE.SRGBColorSpace;
    schoolmateTexture.colorSpace = THREE.SRGBColorSpace;
    aegisTexture.anisotropy = qualityTier === 'cinematic' ? 8 : 4;
    schoolmateTexture.anisotropy = qualityTier === 'cinematic' ? 8 : 4;
    return { aegis: aegisTexture, schoolmate: schoolmateTexture };
  }, [aegisTexture, qualityTier, schoolmateTexture]);

  useFrame(() => {
    if (!rootRef.current) return;
    const progress = progressRef.current;
    rootRef.current.visible = progress >= 0.255 && progress <= 0.655;
  });

  return (
    <group ref={rootRef} visible={false}>
      <PortalFrames progressRef={progressRef} />
      <SchoolArchitecture progressRef={progressRef} qualityTier={qualityTier} />
      <StudentRig progressRef={progressRef} traceOutcome={traceOutcome} aegisTexture={textures.aegis} />
      <Turnstile traceStep={traceStep} traceOutcome={traceOutcome} aegisTexture={textures.aegis} />
      <PhysicalTrace traceStep={traceStep} traceOutcome={traceOutcome} />
      <SchoolMateStage progressRef={progressRef} schoolmateTexture={textures.schoolmate} qualityTier={qualityTier} />
      <pointLight position={[0, 5.4, -69]} intensity={32} distance={22} color="#a7d8cf" />
      <pointLight position={[0, 4.8, -84]} intensity={25} distance={20} color="#72d9d6" />
      <pointLight position={[0, 5.2, -101]} intensity={24} distance={23} color="#d0bd82" />
      <pointLight position={[0, 5.2, -115]} intensity={20} distance={18} color="#9ed6ca" />
    </group>
  );
}
