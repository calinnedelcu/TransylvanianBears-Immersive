import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { QualityTier } from '../../experience/quality';

type CarpathianThresholdProps = {
  progressRef: MutableRefObject<number>;
  qualityTier: QualityTier;
  reducedMotion: boolean;
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

function createGothicArchShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-6.15, 0);
  shape.lineTo(6.15, 0);
  shape.lineTo(6.15, 5.55);
  shape.quadraticCurveTo(4.5, 9.35, 0, 11.25);
  shape.quadraticCurveTo(-4.5, 9.35, -6.15, 5.55);
  shape.closePath();

  const opening = new THREE.Path();
  opening.moveTo(-3.55, 0);
  opening.lineTo(3.55, 0);
  opening.lineTo(3.55, 4.95);
  opening.quadraticCurveTo(2.35, 7.65, 0, 9.25);
  opening.quadraticCurveTo(-2.35, 7.65, -3.55, 4.95);
  opening.closePath();
  shape.holes.push(opening);
  return shape;
}

function createTunnelRibShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-3.82, 0);
  shape.lineTo(3.82, 0);
  shape.lineTo(3.82, 4.65);
  shape.quadraticCurveTo(2.55, 7.35, 0, 8.55);
  shape.quadraticCurveTo(-2.55, 7.35, -3.82, 4.65);
  shape.closePath();

  const opening = new THREE.Path();
  opening.moveTo(-3.28, 0);
  opening.lineTo(3.28, 0);
  opening.lineTo(3.28, 4.42);
  opening.quadraticCurveTo(2.12, 6.75, 0, 7.86);
  opening.quadraticCurveTo(-2.12, 6.75, -3.28, 4.42);
  opening.closePath();
  shape.holes.push(opening);
  return shape;
}

function createShieldShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.6);
  shape.lineTo(1.25, 1.12);
  shape.lineTo(1.08, -0.55);
  shape.quadraticCurveTo(0.75, -1.28, 0, -1.7);
  shape.quadraticCurveTo(-0.75, -1.28, -1.08, -0.55);
  shape.lineTo(-1.25, 1.12);
  shape.closePath();
  return shape;
}

function createHeraldicBearShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.08);
  shape.lineTo(0.72, 0.7);
  shape.lineTo(1, -0.12);
  shape.lineTo(0.56, -0.8);
  shape.lineTo(0.24, -1.05);
  shape.lineTo(0.24, -0.55);
  shape.lineTo(0, -0.25);
  shape.lineTo(-0.24, -0.55);
  shape.lineTo(-0.24, -1.05);
  shape.lineTo(-0.56, -0.8);
  shape.lineTo(-1, -0.12);
  shape.lineTo(-0.72, 0.7);
  shape.closePath();
  return shape;
}

function createWingShape(direction: -1 | 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.08);
  shape.lineTo(direction * 0.78, 0.34);
  shape.lineTo(direction * 1.65, 0.1);
  shape.lineTo(direction * 1.22, -0.18);
  shape.lineTo(direction * 0.84, -0.03);
  shape.lineTo(direction * 0.54, -0.34);
  shape.lineTo(0, -0.12);
  shape.closePath();
  return shape;
}

function BearCrest() {
  const shield = useMemo(createShieldShape, []);
  const bear = useMemo(createHeraldicBearShape, []);

  return (
    <group position={[0, 10.05, 15.12]} scale={0.88}>
      <mesh position={[0, 0, -0.08]}>
        <extrudeGeometry args={[shield, { depth: 0.22, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.045, bevelSegments: 2 }]} />
        <meshStandardMaterial color="#491318" emissive="#26080c" emissiveIntensity={0.42} roughness={0.56} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.02, 0.19]} scale={0.84}>
        <extrudeGeometry args={[bear, { depth: 0.12, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.025, bevelSegments: 1 }]} />
        <meshStandardMaterial color="#b69c68" emissive="#44351f" emissiveIntensity={0.34} metalness={0.76} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.02, 0.38]} rotation={[0, 0, Math.PI / 4]} scale={[1.25, 0.82, 0.68]}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial color="#1a1413" metalness={0.48} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.28, 0.39]} rotation={[0, 0, Math.PI / 4]} scale={[0.72, 0.72, 0.42]}>
        <boxGeometry args={[0.16, 0.16, 0.12]} />
        <meshStandardMaterial color="#a72b32" emissive="#7e151d" emissiveIntensity={1.9} roughness={0.24} />
      </mesh>
    </group>
  );
}

function GuardianBear({ position, mirror = false }: { position: [number, number, number]; mirror?: boolean }) {
  return (
    <group position={position} rotation={[0, mirror ? -0.12 : 0.12, 0]} scale={[mirror ? -0.82 : 0.82, 0.82, 0.82]}>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.92, 1.04, 0.48, 8]} />
        <meshStandardMaterial color="#302f2a" roughness={0.98} />
      </mesh>
      <mesh position={[-0.2, 1.42, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.1, 1.28, 1]}>
        <capsuleGeometry args={[0.62, 1.3, 5, 8]} />
        <meshStandardMaterial color="#4b4941" roughness={0.96} />
      </mesh>
      <mesh position={[0.72, 1.78, 0.02]} scale={[1.04, 1.12, 0.94]}>
        <dodecahedronGeometry args={[0.72, 0]} />
        <meshStandardMaterial color="#555249" roughness={0.94} />
      </mesh>
      {[[0.54, 2.4], [1.04, 2.33]].map(([x, y]) => (
        <mesh key={x} position={[x, y, -0.02]}>
          <dodecahedronGeometry args={[0.25, 0]} />
          <meshStandardMaterial color="#48463f" roughness={0.96} />
        </mesh>
      ))}
      <mesh position={[1.32, 1.58, 0.14]} scale={[1.28, 0.72, 0.82]}>
        <dodecahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color="#666158" roughness={0.92} />
      </mesh>
      <mesh position={[1.68, 1.62, 0.18]} rotation={[0, 0, Math.PI / 4]} scale={[1.18, 0.82, 0.72]}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color="#171615" roughness={0.44} />
      </mesh>
      {[-0.72, 0.64].map((x) => (
        <mesh key={x} position={[x, 0.72, 0.22]} scale={[0.8, 1.15, 0.92]}>
          <dodecahedronGeometry args={[0.44, 0]} />
          <meshStandardMaterial color="#414039" roughness={0.97} />
        </mesh>
      ))}
    </group>
  );
}

function FortressTower({ x, z, height = 9.8 }: { x: number; z: number; height?: number }) {
  const roofY = height + 2.35;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[2.58, 2.9, height, 8]} />
        <meshStandardMaterial color="#3d403a" emissive="#111815" emissiveIntensity={0.28} roughness={0.96} />
      </mesh>
      <mesh position={[0, roofY, 0]} rotation={[0, Math.PI / 8, 0]}>
        <coneGeometry args={[3.38, 4.75, 8]} />
        <meshStandardMaterial color="#0b1010" roughness={0.83} metalness={0.12} />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = index * Math.PI * 0.25;
        return (
          <mesh key={angle} position={[Math.sin(angle) * 2.42, height + 0.18, Math.cos(angle) * 2.42]} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.74, 0.82, 0.68]} />
            <meshStandardMaterial color="#494b43" roughness={0.95} />
          </mesh>
        );
      })}
      {[4.1, 6.65].map((y, index) => (
        <group key={y} position={[0, y, 2.62]}>
          <mesh>
            <planeGeometry args={[0.26, 1.16]} />
            <meshBasicMaterial color={index === 0 ? '#b55b3c' : '#d2a568'} transparent opacity={0.72} />
          </mesh>
          <pointLight position={[0, 0, 0.25]} intensity={3.2} distance={5.5} color="#d77d4a" />
        </group>
      ))}
    </group>
  );
}

function GatePassage({ qualityTier, progressRef }: Pick<CarpathianThresholdProps, 'qualityTier' | 'progressRef'>) {
  const oculusRef = useRef<THREE.Group>(null);
  const ribShape = useMemo(createTunnelRibShape, []);
  const bearShape = useMemo(createHeraldicBearShape, []);
  const ribCount = qualityTier === 'cinematic' ? 6 : 4;

  useFrame(({ clock }) => {
    if (!oculusRef.current) return;
    const departure = smooth(range(progressRef.current, 0.085, 0.12));
    oculusRef.current.position.y = 5.35 + departure * 1.5;
    oculusRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.38) * 0.025;
    oculusRef.current.scale.setScalar(1 - departure * 0.2);
  });

  return (
    <group>
      <mesh position={[0, 0.01, 8.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.05, 13.4, 12, 22]} />
        <meshStandardMaterial color="#282722" emissive="#160e0b" emissiveIntensity={0.22} roughness={0.98} />
      </mesh>
      {[-3.68, 3.68].map((x) => (
        <mesh key={x} position={[x, 3.6, 8.55]}>
          <boxGeometry args={[0.58, 7.2, 13.2]} />
          <meshStandardMaterial color="#3b3932" emissive="#151713" emissiveIntensity={0.25} roughness={0.97} />
        </mesh>
      ))}

      {Array.from({ length: ribCount }, (_, index) => {
        const z = 13.25 - index * (10.2 / Math.max(1, ribCount - 1));
        return (
          <mesh key={z} position={[0, 0, z]}>
            <extrudeGeometry args={[ribShape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.025, bevelSegments: 1 }]} />
            <meshStandardMaterial color="#5a564b" emissive="#211a15" emissiveIntensity={0.32} roughness={0.94} />
          </mesh>
        );
      })}

      {[-1, 1].flatMap((side) => [11.7, 7.9, 4.15].map((z, index) => (
        <group key={`${side}-${z}`} position={[side * 3.32, 3.25, z]}>
          <mesh position={[-side * 0.22, -0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.06, 0.44, 8]} />
            <meshStandardMaterial color="#1b1a17" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh>
            <octahedronGeometry args={[0.14, 0]} />
            <meshStandardMaterial color="#efb16f" emissive="#dd6336" emissiveIntensity={3.2} roughness={0.2} />
          </mesh>
          <pointLight color={index === 2 ? '#b76d4d' : '#df824d'} intensity={9} distance={7} decay={2.1} />
        </group>
      )))}

      <group ref={oculusRef} position={[0, 5.35, 7.2]}>
        <mesh>
          <ringGeometry args={[1.22, 1.3, 64]} />
          <meshStandardMaterial color="#a9905f" emissive="#514127" emissiveIntensity={0.8} metalness={0.76} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0, 0.04]} scale={0.86}>
          <shapeGeometry args={[bearShape]} />
          <meshBasicMaterial color="#72d9d6" transparent opacity={0.72} toneMapped={false} />
        </mesh>
        {Array.from({ length: 7 }, (_, index) => {
          const angle = -Math.PI / 2 + index * (Math.PI * 2 / 7);
          return (
            <mesh key={index} position={[Math.cos(angle) * 1.48, Math.sin(angle) * 1.48, 0.02]} rotation={[0, 0, angle]}>
              <boxGeometry args={[0.28, 0.035, 0.035]} />
              <meshBasicMaterial color={index === 0 ? '#b6353c' : '#c4ae76'} toneMapped={false} />
            </mesh>
          );
        })}
        <pointLight position={[0, 0, 0.45]} color="#72d9d6" intensity={9} distance={12} decay={2.2} />
      </group>
    </group>
  );
}

function BatFlock({ progressRef, qualityTier, reducedMotion }: CarpathianThresholdProps) {
  const batRefs = useRef<Array<THREE.Group | null>>([]);
  const wingRefs = useRef<Array<THREE.Mesh | null>>([]);
  const leftWing = useMemo(() => createWingShape(-1), []);
  const rightWing = useMemo(() => createWingShape(1), []);
  const leftWingGeometry = useMemo(() => new THREE.ShapeGeometry(leftWing), [leftWing]);
  const rightWingGeometry = useMemo(() => new THREE.ShapeGeometry(rightWing), [rightWing]);
  const bats = useMemo(() => Array.from({ length: qualityTier === 'cinematic' ? 16 : 9 }, (_, index) => ({
    phase: seeded(index + 4),
    y: 9.2 + seeded(index + 11) * 5.8,
    z: 4.5 + seeded(index + 19) * 7.5,
    scale: 0.17 + seeded(index + 29) * 0.16,
    speed: 0.045 + seeded(index + 37) * 0.035,
  })), [qualityTier]);

  useEffect(() => () => {
    leftWingGeometry.dispose();
    rightWingGeometry.dispose();
  }, [leftWingGeometry, rightWingGeometry]);

  useFrame(({ clock }) => {
    const departure = smooth(range(progressRef.current, 0.056, 0.094));
    bats.forEach((bat, index) => {
      const root = batRefs.current[index];
      if (!root) return;
      const travel = (bat.phase + clock.elapsedTime * bat.speed + progressRef.current * 0.7) % 1;
      root.position.x = -13 + travel * 26;
      root.position.y = bat.y + Math.sin(clock.elapsedTime * 0.9 + index * 1.7) * 0.44 + departure * 3;
      root.position.z = bat.z;
      root.rotation.z = Math.sin(clock.elapsedTime * 0.55 + index) * 0.09;
      root.scale.setScalar(bat.scale * (1 - departure * 0.78));

      if (!reducedMotion) {
        const flap = Math.sin(clock.elapsedTime * (7.4 + bat.speed * 24) + index * 0.9) * 0.62;
        const left = wingRefs.current[index * 2];
        const right = wingRefs.current[index * 2 + 1];
        if (left) left.rotation.y = flap;
        if (right) right.rotation.y = -flap;
      }
    });
  });

  return (
    <group>
      {bats.map((_, index) => (
        <group key={index} ref={(node) => { batRefs.current[index] = node; }}>
          <mesh scale={[0.32, 0.82, 0.32]}>
            <sphereGeometry args={[0.32, 8, 6]} />
            <meshBasicMaterial color="#050707" />
          </mesh>
          <mesh ref={(node) => { wingRefs.current[index * 2] = node; }} geometry={leftWingGeometry}>
            <meshBasicMaterial color="#050707" side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={(node) => { wingRefs.current[index * 2 + 1] = node; }} geometry={rightWingGeometry}>
            <meshBasicMaterial color="#050707" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function TimberDoor({ side }: { side: -1 | 1 }) {
  return (
    <group>
      <mesh position={[side * -1.68, 4.05, 0]}>
        <boxGeometry args={[3.32, 8.1, 0.34]} />
        <meshStandardMaterial color="#231713" emissive="#100705" emissiveIntensity={0.22} roughness={0.87} metalness={0.03} />
      </mesh>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh key={index} position={[side * (-0.42 - index * 0.64), 4.05, 0.2]}>
          <boxGeometry args={[0.045, 7.72, 0.045]} />
          <meshStandardMaterial color="#5c3928" roughness={0.9} />
        </mesh>
      ))}
      {[1.65, 4.15, 6.55].map((y) => (
        <mesh key={y} position={[side * -1.68, y, 0.23]}>
          <boxGeometry args={[3.08, 0.14, 0.08]} />
          <meshStandardMaterial color="#171918" metalness={0.72} roughness={0.34} />
        </mesh>
      ))}
      <mesh position={[side * -0.62, 4.05, 0.28]}>
        <torusGeometry args={[0.24, 0.045, 8, 24]} />
        <meshStandardMaterial color="#a18752" metalness={0.84} roughness={0.26} />
      </mesh>
    </group>
  );
}

export function CarpathianThreshold({ progressRef, qualityTier, reducedMotion }: CarpathianThresholdProps) {
  const rootRef = useRef<THREE.Group>(null);
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);
  const portcullisRef = useRef<THREE.Group>(null);
  const flameRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const archShape = useMemo(createGothicArchShape, []);

  useFrame(({ clock }, delta) => {
    const doorOpening = smooth(range(progressRef.current, 0.006, 0.04));
    const gateLift = smooth(range(progressRef.current, 0.006, 0.035));
    const departure = smooth(range(progressRef.current, 0.056, 0.096));

    if (rootRef.current) {
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -18 * departure, 5.2, delta);
    }
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
      material.emissiveIntensity = 3.6 + Math.sin(clock.elapsedTime * 8.2 + index * 1.7) * 0.65;
    });
  });

  return (
    <group ref={rootRef}>
      <group position={[-9.3, 12.8, 4.2]}>
        <mesh position={[0, 0, -0.08]}>
          <circleGeometry args={[4.35, 48]} />
          <meshBasicMaterial color="#9eb0aa" transparent opacity={0.055} depthWrite={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[3.05, 48]} />
          <meshBasicMaterial color="#c8d0c5" transparent opacity={0.72} fog={false} />
        </mesh>
      </group>

      <BatFlock progressRef={progressRef} qualityTier={qualityTier} reducedMotion={reducedMotion} />
      <FortressTower x={-7.75} z={13.25} height={10.1} />
      <FortressTower x={7.75} z={13.25} height={10.1} />
      <GatePassage qualityTier={qualityTier} progressRef={progressRef} />

      <mesh position={[0, 0, 14.05]}>
        <extrudeGeometry args={[archShape, { depth: 0.92, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.08, bevelSegments: 3 }]} />
        <meshStandardMaterial color="#494a42" emissive="#121a17" emissiveIntensity={0.34} roughness={0.94} metalness={0.02} />
      </mesh>

      <mesh position={[0, 9.72, 15.03]}>
        <boxGeometry args={[12.8, 0.38, 0.32]} />
        <meshStandardMaterial color="#806c43" metalness={0.66} roughness={0.42} />
      </mesh>

      <BearCrest />
      <GuardianBear position={[-5.15, 0.05, 15.38]} />
      <GuardianBear position={[5.15, 0.05, 15.38]} mirror />

      <group ref={leftDoorRef} position={[-3.42, 0, 15.05]}>
        <TimberDoor side={-1} />
      </group>
      <group ref={rightDoorRef} position={[3.42, 0, 15.05]}>
        <TimberDoor side={1} />
      </group>

      <group ref={portcullisRef} position={[0, 0, 15.48]}>
        {Array.from({ length: 8 }, (_, index) => {
          const x = -3.05 + index * 0.87;
          return (
            <group key={x} position={[x, 0, 0]}>
              <mesh position={[0, 4.35, 0]}>
                <cylinderGeometry args={[0.075, 0.075, 8.7, 8]} />
                <meshStandardMaterial color="#151918" metalness={0.78} roughness={0.32} />
              </mesh>
              <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI]}>
                <coneGeometry args={[0.18, 0.72, 6]} />
                <meshStandardMaterial color="#151918" metalness={0.78} roughness={0.32} />
              </mesh>
            </group>
          );
        })}
        {[2.2, 5.4, 8.25].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[6.7, 0.14, 0.14]} />
            <meshStandardMaterial color="#151918" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {[-1, 1].map((side, index) => (
        <group key={side} position={[side * 4.48, 5.15, 15.62]}>
          <mesh position={[0, -0.55, -0.05]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 0.74, 8]} />
            <meshStandardMaterial color="#1c1c19" metalness={0.72} roughness={0.36} />
          </mesh>
          <mesh>
            <coneGeometry args={[0.18, 0.7, 9]} />
            <meshStandardMaterial
              ref={(material) => { flameRefs.current[index] = material; }}
              color="#ffd08a"
              emissive="#e76e36"
              emissiveIntensity={3.6}
              roughness={0.18}
            />
          </mesh>
          <pointLight position={[0, 0, 0.25]} intensity={22} distance={9} color="#e88449" />
        </group>
      ))}
    </group>
  );
}
