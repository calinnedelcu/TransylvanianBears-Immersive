import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { PILLARS, PROJECTS, RESULTS, TEAM, projectById, type Accent, type Project, type ResultEntry } from '../data';
import { Ink } from '../three/Ink';
import { PALETTE, coverTexture, getPawGeometry, getToonRamp, roundedRect } from '../three/shapes';
import { MONUMENT, RESULTS_CENTER, memberSpot, pillarSpot, projectSpot } from './journey';

const ACCENT: Record<Accent, string> = {
  cobalt: PALETTE.cobalt,
  mint: PALETTE.mint,
  sky: PALETTE.sky,
  gold: PALETTE.gold,
  bone: '#eadfc6',
  coral: PALETTE.coral,
  ink: PALETTE.ink,
  lilac: PALETTE.lilac,
};

function Toon({ color }: { color: string }) {
  return <meshToonMaterial color={color} gradientMap={getToonRamp()} />;
}

/* ------------------------------------------------------------------ */
/* Manifesto: four monoliths, each carrying the symbol of its verb     */
/* ------------------------------------------------------------------ */

function extruded(shape: THREE.Shape, depth = 0.35) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geometry.center();
  return geometry;
}

function shieldShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 1.25);
  s.quadraticCurveTo(0.6, 0.9, 1.1, 1.0);
  s.quadraticCurveTo(1.15, -0.4, 0, -1.35);
  s.quadraticCurveTo(-1.15, -0.4, -1.1, 1.0);
  s.quadraticCurveTo(-0.6, 0.9, 0, 1.25);
  return s;
}

function starShape() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? 1.3 : 0.55;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}

/** Observăm, Protejăm, Imaginăm, Măsurăm. */
function Emblem({ kind }: { kind: number }) {
  const eye = useRef<THREE.Group>(null);
  const shield = useMemo(() => extruded(shieldShape()), []);
  const star = useMemo(() => extruded(starShape()), []);

  useFrame(({ camera }) => {
    // The eye keeps watching the visitor.
    if (eye.current) eye.current.lookAt(camera.position);
  });

  switch (kind) {
    case 0:
      return (
        <group ref={eye}>
          <mesh>
            <sphereGeometry args={[0.95, 32, 24]} />
            <Toon color={PALETTE.bone} />
            <Ink width={3} />
          </mesh>
          <mesh position={[0, 0, 0.62]}>
            <sphereGeometry args={[0.42, 24, 16]} />
            <Toon color={PALETTE.cobalt} />
          </mesh>
          <mesh position={[0, 0, 0.9]}>
            <sphereGeometry args={[0.2, 16, 12]} />
            <meshBasicMaterial color={PALETTE.ink} />
          </mesh>
        </group>
      );
    case 1:
      return (
        <mesh geometry={shield}>
          <Toon color={PALETTE.bone} />
          <Ink width={3} />
        </mesh>
      );
    case 2:
      return (
        <mesh geometry={star}>
          <Toon color={PALETTE.gold} />
          <Ink width={3} />
        </mesh>
      );
    default:
      return (
        <group position={[0, -0.4, 0]}>
          {[0.8, 1.4, 2.1].map((h, i) => (
            <mesh key={h} position={[(i - 1) * 0.72, h / 2 - 0.6, 0]}>
              <boxGeometry args={[0.55, h, 0.55]} />
              <Toon color={[PALETTE.coral, PALETTE.mint, PALETTE.cobalt][i]} />
              <Ink width={2.5} />
            </mesh>
          ))}
        </group>
      );
  }
}

function Monolith({ index }: { index: number }) {
  const symbol = useRef<THREE.Group>(null);
  const spot = pillarSpot(index);
  const pillar = PILLARS[index];
  const accent = projectById[pillar.projectIds[0]].accent;
  const color = accent === 'ink' ? PALETTE.gold : ACCENT[accent];

  useFrame(({ clock }) => {
    const node = symbol.current;
    if (!node) return;
    const t = clock.elapsedTime + index;
    node.position.y = 6.6 + Math.sin(t * 1.3) * 0.25;
    if (index !== 0) node.rotation.y = Math.sin(t * 0.7) * 0.6;
  });

  return (
    <group position={spot.position} rotation={[0, spot.yaw, 0]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[2.1, 2.3, 0.6, 8]} />
        <Toon color={PALETTE.bone} />
        <Ink width={3} />
      </mesh>
      <mesh position={[0, 2.8, 0]}>
        <boxGeometry args={[2, 4.4, 2]} />
        <Toon color={color} />
        <Ink width={3.5} />
      </mesh>
      <mesh position={[0, 2.8, 1.02]}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color={PALETTE.ink} />
      </mesh>
      <group ref={symbol} position={[0, 6.6, 0]}>
        <Emblem kind={index} />
      </group>
    </group>
  );
}

export function Monoliths() {
  return (
    <>
      {PILLARS.map((pillar, index) => (
        <Monolith key={pillar.verb} index={index} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Projects: a billboard for each project along the road               */
/* ------------------------------------------------------------------ */

const BOARD_W = 5.2;
const BOARD_H = 3.25;
const BOARD_FRAME = 0.12;

function Billboard({ project, index }: { project: Project; index: number }) {
  const texture = useTexture(project.cover.src);
  const board = useRef<THREE.Group>(null);
  const spot = projectSpot(index);
  const geometry = useMemo(
    () => ({
      image: roundedRect(BOARD_W, BOARD_H, 0.22),
      frame: roundedRect(BOARD_W + BOARD_FRAME * 2, BOARD_H + BOARD_FRAME * 2, 0.3),
    }),
    [],
  );

  useEffect(() => coverTexture(texture, BOARD_W / BOARD_H), [texture]);

  useFrame(({ clock }) => {
    if (board.current) board.current.rotation.z = Math.sin(clock.elapsedTime * 0.8 + index) * 0.012;
  });

  const accent = ACCENT[project.accent];
  const legY = (spot.position.y - BOARD_H / 2) / 2;

  return (
    <group position={[spot.position.x, 0, spot.position.z]} rotation={[0, spot.yaw, 0]}>
      {[-1.7, 1.7].map((x) => (
        <mesh key={x} position={[x, legY, -0.1]}>
          <cylinderGeometry args={[0.1, 0.12, legY * 2, 8]} />
          <meshBasicMaterial color={PALETTE.ink} />
        </mesh>
      ))}
      <group ref={board} position={[0, spot.position.y, 0]}>
        <mesh geometry={geometry.frame} position={[0.18, -0.18, -0.08]}>
          <meshBasicMaterial color={PALETTE.ink} />
        </mesh>
        <mesh geometry={geometry.frame} position={[0, 0, -0.03]}>
          <meshBasicMaterial color={PALETTE.ink} />
        </mesh>
        <mesh geometry={geometry.image}>
          <meshBasicMaterial map={texture} />
        </mesh>
        <mesh geometry={geometry.frame} position={[0, 0, -0.05]} rotation={[0, Math.PI, 0]}>
          <meshBasicMaterial color={accent} />
        </mesh>
        <mesh geometry={getPawGeometry()} position={[0, 0, -0.24]} rotation={[0, Math.PI, 0]} scale={0.3}>
          <Toon color={project.accent === 'ink' ? PALETTE.gold : PALETTE.bone} />
          <Ink width={2.5} />
        </mesh>
      </group>
    </group>
  );
}

export function Billboards() {
  return (
    <>
      {PROJECTS.map((project, index) => (
        <Billboard key={project.id} project={project} index={index} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Results: a podium under the night sky, every result a spinning medal */
/* ------------------------------------------------------------------ */

const MEDAL: Record<string, string> = {
  1: PALETTE.gold,
  2: '#d9dee6',
  3: '#e29a5b',
};

function Medal({ entry, index, count }: { entry: ResultEntry; index: number; count: number }) {
  const group = useRef<THREE.Group>(null);
  const u = count > 1 ? index / (count - 1) - 0.5 : 0;
  const angle = u * 2.6;
  const base = useMemo(
    () => new THREE.Vector3(Math.sin(angle) * 9, 4.6 + Math.cos(index * 1.7) * 1.4, RESULTS_CENTER.z - Math.cos(angle) * 6 + 3),
    [angle, index],
  );
  const color = (entry.place && MEDAL[entry.place]) || PALETTE.bone;

  useFrame(({ clock }, delta) => {
    const node = group.current;
    if (!node) return;
    node.rotation.y += delta * (0.8 + (index % 3) * 0.25);
    node.position.y = base.y + Math.sin(clock.elapsedTime * 1.1 + index) * 0.3;
  });

  return (
    <group ref={group} position={base}>
      <mesh position={[-0.32, 1.25, 0]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.42, 1.4, 0.06]} />
        <Toon color={PALETTE.blood} />
      </mesh>
      <mesh position={[0.32, 1.25, 0]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.42, 1.4, 0.06]} />
        <Toon color={PALETTE.cobalt} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.22, 40]} />
        <Toon color={color} />
        <Ink width={3} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh
          key={side}
          geometry={getPawGeometry()}
          position={[0, 0, side * 0.12]}
          rotation={[0, side > 0 ? 0 : Math.PI, 0]}
          scale={[0.24, 0.24, 0.05]}
        >
          <meshBasicMaterial color={PALETTE.ink} />
        </mesh>
      ))}
    </group>
  );
}

function Podium() {
  const steps = [
    { x: 0, h: 2.2, color: PALETTE.gold },
    { x: -2.5, h: 1.5, color: '#d9dee6' },
    { x: 2.5, h: 1, color: '#e29a5b' },
  ];
  return (
    <group position={[RESULTS_CENTER.x, 0, RESULTS_CENTER.z - 3]}>
      {steps.map((step) => (
        <mesh key={step.x} position={[step.x, step.h / 2, 0]}>
          <boxGeometry args={[2.4, step.h, 2.2]} />
          <Toon color={step.color} />
          <Ink width={3} />
        </mesh>
      ))}
    </group>
  );
}

export function Medals() {
  return (
    <>
      <Podium />
      {RESULTS.map((entry, index) => (
        <Medal key={entry.id} entry={entry} index={index} count={RESULTS.length} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Team: die-cut portraits standing in a half-circle                    */
/* ------------------------------------------------------------------ */

const CARD_W = 2.9;
const CARD_H = 3.1;
const PORTRAIT_H = 3.9;

function Standee({ index }: { index: number }) {
  const member = TEAM[index];
  const texture = useTexture(member.portrait.src);
  const figure = useRef<THREE.Group>(null);
  const spot = memberSpot(index, TEAM.length);
  const aspect = member.portrait.width / member.portrait.height;
  const geometry = useMemo(
    () => ({
      card: roundedRect(CARD_W, CARD_H, 0.28),
      frame: roundedRect(CARD_W + 0.16, CARD_H + 0.16, 0.34),
    }),
    [],
  );

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  useFrame(({ clock }) => {
    if (figure.current) figure.current.position.y = Math.sin(clock.elapsedTime * 1.4 + index * 0.9) * 0.05;
  });

  const accent = ACCENT[member.accent];
  const cardY = 0.55 + CARD_H / 2;

  return (
    <group position={spot.position} rotation={[0, spot.yaw, 0]}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[1.6, 1.7, 0.5, 24]} />
        <Toon color={PALETTE.bone} />
        <Ink width={3} />
      </mesh>
      <group ref={figure}>
        <mesh geometry={geometry.frame} position={[0.16, cardY - 0.16, -0.1]}>
          <meshBasicMaterial color={PALETTE.ink} />
        </mesh>
        <mesh geometry={geometry.frame} position={[0, cardY, -0.06]}>
          <meshBasicMaterial color={PALETTE.ink} />
        </mesh>
        <mesh geometry={geometry.card} position={[0, cardY, -0.04]}>
          <meshBasicMaterial color={accent} />
        </mesh>
        <mesh geometry={geometry.frame} position={[0, cardY, -0.08]} rotation={[0, Math.PI, 0]}>
          <meshBasicMaterial color={accent} />
        </mesh>
        {/* The portrait stands on the card's bottom edge and rises above its top, like on the page. */}
        <mesh position={[0, 0.55 + PORTRAIT_H / 2, 0.02]}>
          <planeGeometry args={[PORTRAIT_H * aspect, PORTRAIT_H]} />
          <meshBasicMaterial map={texture} transparent alphaTest={0.35} />
        </mesh>
      </group>
    </group>
  );
}

export function Standees() {
  return (
    <>
      {TEAM.map((member, index) => (
        <Standee key={member.id} index={index} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* The paw: on the hero hill and as the monument at the end            */
/* ------------------------------------------------------------------ */

export function Paw({ position, scale, color = PALETTE.bone }: { position: THREE.Vector3Tuple; scale: number; color?: string }) {
  const node = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!node.current) return;
    node.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.7;
    node.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.9) * 0.25;
  });
  return (
    <mesh ref={node} geometry={getPawGeometry()} position={position} scale={scale}>
      <Toon color={color} />
      <Ink width={4} />
    </mesh>
  );
}

export function Monument() {
  return (
    <group>
      <mesh position={[MONUMENT.x, 1, MONUMENT.z]}>
        <cylinderGeometry args={[4.4, 5, 2, 10]} />
        <Toon color={PALETTE.bone} />
        <Ink width={3.5} />
      </mesh>
      <mesh position={[MONUMENT.x, 2.15, MONUMENT.z]}>
        <cylinderGeometry args={[3.4, 3.6, 0.3, 10]} />
        <Toon color={PALETTE.gold} />
        <Ink width={3} />
      </mesh>
      <Paw position={[MONUMENT.x, 6.5, MONUMENT.z]} scale={2.4} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Floating toon shapes scattered over the whole walk                   */
/* ------------------------------------------------------------------ */

type FloaterKind = 'ico' | 'torus' | 'octa' | 'ball' | 'box' | 'knot';
const KINDS: FloaterKind[] = ['ico', 'torus', 'octa', 'ball', 'box', 'knot'];
const COLORS = [PALETTE.cobalt, PALETTE.coral, PALETTE.lilac, PALETTE.mint, PALETTE.sky, PALETTE.blood, PALETTE.gold];

function FloaterGeometry({ kind }: { kind: FloaterKind }) {
  switch (kind) {
    case 'ico':
      return <icosahedronGeometry args={[1, 0]} />;
    case 'torus':
      return <torusGeometry args={[0.8, 0.34, 16, 40]} />;
    case 'octa':
      return <octahedronGeometry args={[1, 0]} />;
    case 'ball':
      return <sphereGeometry args={[0.9, 24, 18]} />;
    case 'box':
      return <boxGeometry args={[1.25, 1.25, 1.25]} />;
    case 'knot':
      return <torusKnotGeometry args={[0.7, 0.24, 96, 14]} />;
  }
}

export function Floaters({ count, random }: { count: number; random: () => number }) {
  const group = useRef<THREE.Group>(null);
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const side = index % 2 === 0 ? 1 : -1;
        return {
          kind: KINDS[index % KINDS.length],
          color: COLORS[index % COLORS.length],
          position: new THREE.Vector3(side * (6 + random() * 10), 5 + random() * 6, 12 - (index / count) * 270),
          size: 0.45 + random() * 0.5,
          spin: 0.3 + random() * 0.6,
          phase: random() * 6,
        };
      }),
    [count, random],
  );

  useFrame(({ clock }, delta) => {
    const node = group.current;
    if (!node) return;
    node.children.forEach((child, index) => {
      const item = items[index];
      child.rotation.x += delta * item.spin;
      child.rotation.y += delta * item.spin * 0.7;
      child.position.y = item.position.y + Math.sin(clock.elapsedTime * 0.9 + item.phase) * 0.5;
    });
  });

  return (
    <group ref={group}>
      {items.map((item, index) => (
        <mesh key={index} position={item.position} scale={item.size}>
          <FloaterGeometry kind={item.kind} />
          <Toon color={item.color} />
          <Ink width={3} />
        </mesh>
      ))}
    </group>
  );
}
