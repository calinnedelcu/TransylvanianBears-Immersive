import { useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import CITADEL from '../../../../shared/citadel.json';
import { PlanLines } from './PlanLines';
import { WorldTags } from './WorldTags';
import type { BuildUniforms } from './luminousCitadel';
import { GLASS_OPACITY, createBuildPulse, makeLuminous, makeSilhouette } from './luminousCitadel';
import { gateBeyond, gateThreshold } from './departures';
import { NightSky } from './NightSky';
import { SignalRoute } from './SignalRoute';

const CITADEL_URL = '/assets/world/citadel.glb';
useGLTF.preload(CITADEL_URL);

/**
 * Camera keyframes.
 *
 * Blender exports Y-up, so a Blender point (x, y, z) arrives here as (x, z, -y).
 * The hero pose is the camera from scripts/blender/build_citadel.py, converted;
 * the plan pose looks straight down so the first frame lands on the same framing
 * as the SVG drawing. Both read the same shared/citadel.json, so the silhouettes
 * match and the swap between drawing and model is not a cut.
 */
/** Outer radius of the ring, in metres. Must match shared/citadel.json. */
const RING_OUTER = 15.25;
const FOV = 40;
const HERO_EYE = new THREE.Vector3(20.5, 21.5, 41.0);
const HERO_TARGET = new THREE.Vector3(0, 6.4, -1.0);

/**
 * Two beats, in this order, because the tip is the moment worth having.
 *
 *   1. TIP  - the drawing stands facing the reader, then lies down into the ground.
 *   2. RISE - only once it is lying flat do the lines gain height and become walls.
 *
 * Overlapping them turns both into mush, so the rise starts as the tip finishes.
 * The handover from the SVG happens before either, while nothing moves at all.
 */
export const HANDOVER_END = 0.1;
const TIP_START = 0.1;
const TIP_END = 0.42;
/** The camera must already be up and in before the world shows, or the view
 *  arrives at eye level a hundred metres out and stares across a field of pines. */
const SETTLE_END = 0.6;
const RISE_START = 0.45;
const RISE_END = 0.74;
/** The drawing holds until the solid is well out of the ground, so the frame is
 *  never handed from a plan that has left to a building that has not arrived. */
const DRAWING_FADE_START = 0.68;
/** Ground arrives with the rise; scatter waits for the camera to get up. */
const GROUND_START = 0.4;
const LAND_START = 0.55;
const LAND_END = 0.74;
/** Trees never render squashed: below this they are simply not there. */
const LAND_MIN_SCALE = 0.14;
/** The gate is the last thing that happens: the citadel stands, then it opens. */
/** Stone arrives only after the piece has fully surfaced. */
const MATERIAL_START = RISE_END;
const MATERIAL_END = 0.94;
/** How long the finished pulse takes, in seconds of real time. */
const PULSE_SECONDS = 0.95;

const GATE_START = 0.96;
const GATE_END = 1;
const SETTLE_START = 0.3;
/** The camera never drops below this, so it cannot end up under the terrain. */
const GROUND_CLEARANCE = 1.6;

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function range(value: number, start: number, end: number) {
  return (value - start) / (end - start);
}

/**
 * The citadel grows out of its own plan.
 *
 * There is no cross fade between a drawing and a model, because a cross fade is a
 * cut. At rest the whole build is flattened to almost zero height and seen from
 * straight above, which is what a plan is. The handover from the SVG happens while
 * nothing moves, so it cannot be seen. Only then does the height come up: the same
 * lines gain thickness and become walls.
 */
/**
 * glTF export replaces spaces in node names with underscores, so every match
 * against an authored name has to normalise first. Missing this silently broke
 * the staged rise, the luminous pass, the gate and the node highlights at once:
 * nothing threw, the names simply never matched.
 */
function authoredName(object: THREE.Object3D): string {
  return object.name.replace(/_/g, ' ');
}

/** Walks up from whatever mesh was hit to the named node it belongs to. */
function nodeSlugFor(object: THREE.Object3D | null): string | null {
  let current = object;
  while (current) {
    const match = /^Node(?: signal)? (.+)$/.exec(authoredName(current));
    if (match) return match[1];
    current = current.parent;
  }
  return null;
}

function CitadelModel({
  progressRef,
  activeSlug,
  visited,
  reducedMotion,
  onHover,
  onSelect,
}: {
  progressRef: MutableRefObject<number>;
  activeSlug: string | null;
  visited: ReadonlySet<string>;
  reducedMotion: boolean;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
}) {
  const { scene } = useGLTF(CITADEL_URL);
  const tipRef = useRef<THREE.Group>(null);
  const worldRef = useRef<THREE.Group>(null);
  const worldSolidRef = useRef<THREE.Group>(null);
  const signalsRef = useRef<Array<{ slug: string; material: THREE.MeshStandardMaterial; base: number }>>([]);
  const piecesRef = useRef<
    Array<{
      object: THREE.Object3D;
      baseY: number;
      drop: number;
      delay: number;
      settle: number;
      build: BuildUniforms | null;
      solid: THREE.MeshStandardMaterial | null;
    }>
  >([]);
  const bladesRef = useRef<Array<{ object: THREE.Object3D; baseYaw: number; turn: number; delay: number }>>([]);
  const pulseRef = useRef<THREE.Mesh>(null);
  /** When the last piece landed, in clock seconds; -1 while still building. */
  const completedAtRef = useRef(-1);
  const pulse = useMemo(() => createBuildPulse(), []);
  const citadelRef = useRef<THREE.Object3D | null>(null);
  const landscapeRef = useRef<THREE.Object3D | null>(null);
  const scatterRef = useRef<THREE.Object3D | null>(null);

  const prepared = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const material = object.material as THREE.MeshStandardMaterial;
      if (material?.emissive && material.emissiveIntensity > 0) {
        // Blender emission strength does not survive the glTF round trip at the
        // value it was authored with; the occupied bays need to read as lit.
        material.emissiveIntensity = 3.6;
      }
    });
    return root;
  }, [scene]);

  useEffect(() => {
    const citadel = prepared.getObjectByName('Citadel') ?? null;
    const landscape = prepared.getObjectByName('Landscape') ?? null;
    const scatter = prepared.getObjectByName('Scatter') ?? null;

    // Only the citadel belongs to the sheet. Terrain, ridges and forest are the
    // world, and a plan does not draw the forest: tipping them with the drawing
    // put a slab of ground on edge behind it and scattered the flattened pines
    // across the frame as black blobs.
    if (citadel && worldSolidRef.current) worldSolidRef.current.add(citadel);
    if (landscape && worldRef.current) worldRef.current.add(landscape);
    if (scatter && worldRef.current) worldRef.current.add(scatter);

    citadelRef.current = citadel;
    landscapeRef.current = landscape;
    scatterRef.current = scatter;

    // The citadel becomes a drawing in three dimensions rather than a solid.
    // Per stage, so each merged batch shares the transform that animates it.
    //
    // This has to happen before the pieces are collected. It is what creates the
    // glass material, records the authored surface and adds the outline meshes,
    // so collecting first left every piece with no material and no edges to
    // animate, and the whole materialise phase quietly did nothing.
    citadel?.children
      .filter((stage) => authoredName(stage).startsWith('Stage '))
      .forEach((stage) => makeLuminous(stage));
    if (landscape) makeSilhouette(landscape, '#0d1512');
    if (scatter) makeSilhouette(scatter, '#080d0c');

    // The enclosure comes up first and the core last, the way a building is read:
    // boundary, rooms, threshold, towers, then the centre it was all protecting.
    // The citadel assembles piece by piece, in a scattered order, rather than in
    // six blocks. Each part waits its own turn, slides up out of the ground and
    // thickens from glass to built as it lands: the drawing becomes a building.
    const STAGE_WEIGHT: Record<string, number> = {
      'Stage ring': 0,
      'Stage bays': 0.2,
      'Stage gate': 0.4,
      'Stage towers': 0.55,
      'Stage core': 0.75,
      'Stage nodes': 0.95,
    };

    // Deterministic scatter: the same piece always arrives at the same moment, so
    // the sequence is composed rather than different on every reload.
    const scatterOrder = (name: string) => {
      let h = 2166136261;
      for (let i = 0; i < name.length; i += 1) {
        h ^= name.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return ((h >>> 0) % 10000) / 10000;
    };

    piecesRef.current = [];
    const box = new THREE.Box3();
    citadel?.children.forEach((stage) => {
      const weight = STAGE_WEIGHT[authoredName(stage)];
      if (weight === undefined) return;
      stage.children.forEach((object) => {
        if (!(object as THREE.Mesh).isMesh) return;
        const baseY = (object.userData.baseY as number | undefined) ?? object.position.y;
        object.userData.baseY = baseY;
        box.setFromObject(object);
        const height = Number.isFinite(box.max.y) ? Math.max(1.5, box.max.y - box.min.y) : 8;
        // Mostly scattered, lightly weighted so structure still tends to lead.
        const delay = Math.min(0.999, weight * 0.25 + scatterOrder(object.name) * 0.75);
        piecesRef.current.push({
          object,
          baseY,
          drop: height + Math.max(2, box.max.y),
          delay,
          // A second, independent scatter: the order pieces turn to stone is not
          // the order they arrived in, so the citadel keeps changing after it is up.
          settle: scatterOrder(`${object.name}-settle`),
          build: (object.userData.build as BuildUniforms | undefined) ?? null,
          solid: (object.userData.glass as THREE.MeshStandardMaterial | undefined) ?? null,
        });
      });
    });

    // The two leaves of the gate. Their origins sit on their hinges in the model,
    // so turning them about Y swings them the way a door swings rather than
    // spinning them through their own middles and through the jambs.
    bladesRef.current = [];
    const blades: THREE.Object3D[] = [];
    citadel?.traverse((object) => {
      if (/^Gate leaf /.test(authoredName(object))) blades.push(object);
    });
    blades
      .sort((a, b) => authoredName(a).localeCompare(authoredName(b)))
      .forEach((object, index, all) => {
        const stored = object.userData.baseYaw as number | undefined;
        const baseYaw = stored ?? object.rotation.y;
        object.userData.baseYaw = baseYaw;
        const middle = (all.length - 1) / 2;
        // Each leaf swings away from the centre post it closes against.
        const turn = (index <= middle ? 1 : -1) * 1.15;
        bladesRef.current.push({ object, baseYaw, turn, delay: Math.abs(index - middle) / all.length });
      });

    // Each system marker keeps its own material instance so one can light alone.
    signalsRef.current = [];
    citadel?.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const slug = nodeSlugFor(object);
      if (!slug || !authoredName(object).startsWith('Node signal')) return;
      const material = (object.material as THREE.MeshStandardMaterial).clone();
      object.material = material;
      signalsRef.current.push({ slug, material, base: material.emissiveIntensity });
    });

    // Nothing is solid while the sheet is still a drawing: the citadel is simply
    // absent. It no longer gets flattened, because the stages now rise by moving
    // up out of the ground rather than by stretching from zero height.
    if (citadel) citadel.visible = false;
    if (landscape) landscape.visible = false;
    if (scatter) {
      scatter.scale.y = LAND_MIN_SCALE;
      scatter.visible = false;
    }
  }, [prepared]);

  useFrame((state) => {
    const p = progressRef.current;

    // Beat 1: the sheet tips from facing the reader down into the ground plane.
    if (tipRef.current) {
      const tip = 1 - smooth(range(p, TIP_START, TIP_END));
      tipRef.current.rotation.x = tip * Math.PI / 2;
    }

    // The finished pulse runs on real time rather than on scroll: a flare held
    // half way by a stopped scroll is not a flare. It re-arms if the reader goes
    // back below the point where the citadel completes.
    const now = state.clock.elapsedTime;
    if (p < MATERIAL_END) completedAtRef.current = -1;
    else if (completedAtRef.current < 0) completedAtRef.current = now;
    const age = completedAtRef.current < 0 || reducedMotion ? -1 : now - completedAtRef.current;
    const decay = Math.max(0, 1 - Math.max(0, age - 0.07) / PULSE_SECONDS);
    const flare = age < 0 ? 0 : Math.min(1, age / 0.07) * decay * decay;

    if (pulseRef.current) {
      const wave = age < 0 ? 1 : age / PULSE_SECONDS;
      pulseRef.current.visible = wave < 1;
      pulse.uniforms.uT.value = Math.min(1, Math.max(0, wave));
    }

    if (citadelRef.current) {
      // The solid appears exactly where the lines are, at almost no height, so the
      // drawing does not cut to a model: it thickens into one.
      citadelRef.current.visible = p >= RISE_START;

      piecesRef.current.forEach((piece) => {
        const { object, baseY, drop, delay, settle, build, solid } = piece;

        // Phase one: the piece travels up out of the ground, still glass.
        const from = RISE_START + delay * (RISE_END - RISE_START) * 0.82;
        const raw = p >= RISE_END ? 1 : smooth(range(p, from, RISE_END));
        // A touch of overshoot so a piece lands with weight instead of easing in.
        const eased = raw < 1 ? raw + Math.sin(raw * Math.PI) * 0.06 : 1;
        object.position.y = raw >= 1 ? baseY : baseY - drop * (1 - eased);

        // Phase two: only once it has fully arrived does it turn to real material,
        // on its own scattered schedule, so the citadel builds itself in stone
        // piece by piece instead of switching over all at once.
        const settleFrom = MATERIAL_START + settle * (MATERIAL_END - MATERIAL_START) * 0.75;
        const built = raw < 1 ? 0 : smooth(range(p, settleFrom, MATERIAL_END));

        if (build) {
          // The shader turns this into a fill line climbing the piece, so the
          // surface is poured from the bottom up instead of dissolved in.
          build.uBuild.value = built;
          build.uGlassAlpha.value = GLASS_OPACITY + raw * 0.05;
          // A piece flares as the last of its material lands, then settles. The
          // finished pulse overrides it, so the whole citadel reports as one.
          const snap = built <= 0 || built >= 1
            ? 0
            : smooth(range(built, 0.55, 0.9)) * (1 - smooth(range(built, 0.9, 1)));
          build.uFlash.value = Math.max(snap * 0.85, flare);
        }
        // Only a finished piece occludes: half poured, it would write depth for
        // the part that is still glass and punch a hole in whatever is behind it.
        if (solid) solid.depthWrite = built > 0.995;
      });
    }
    // The aperture opens once the citadel stands. Nothing else moves at this point,
    // so the gate has the frame to itself.
    bladesRef.current.forEach(({ object, baseYaw, turn, delay }) => {
      const from = GATE_START + delay * (GATE_END - GATE_START) * 0.45;
      const open = smooth(range(p, from, GATE_END));
      object.rotation.y = baseYaw + open * turn;
    });

    // The ground is present the moment the sheet lands, otherwise the citadel
    // rises out of nothing and reads as a disc hanging in the dark.
    if (landscapeRef.current) landscapeRef.current.visible = p >= GROUND_START;

    if (scatterRef.current) {
      // Ridges and forest arrive later, and never render squashed: hidden until
      // they start, then straight to full height.
      const showing = p >= LAND_START;
      scatterRef.current.visible = showing;
      if (showing) {
        scatterRef.current.scale.y = THREE.MathUtils.lerp(
          LAND_MIN_SCALE, 1, smooth(range(p, LAND_START, LAND_END)),
        );
      }
    }
  });

  useFrame(() => {
    // A visited system stays lit, so the citadel you leave is not the one you met.
    signalsRef.current.forEach(({ slug, material, base }) => {
      const wanted = slug === activeSlug ? 5.2 : visited.has(slug) ? 2.6 : base;
      material.emissiveIntensity += (wanted - material.emissiveIntensity) * 0.12;
    });
  });

  // Read on the event, not at render: progressRef never triggers a re-render, so a
  // value captured here would freeze at whatever it was when the tree last built.
  const canInspect = () => progressRef.current > 0.9;

  return (
    <>
      <group
        onPointerMove={(event) => {
          if (!canInspect()) return;
          const slug = nodeSlugFor(event.object);
          if (slug) {
            event.stopPropagation();
            onHover(slug);
          }
        }}
        onPointerOut={() => canInspect() && onHover(null)}
        onClick={(event) => {
          if (!canInspect()) return;
          const slug = nodeSlugFor(event.object);
          if (slug) {
            event.stopPropagation();
            onSelect(slug);
          }
        }}
      >
        <group ref={worldSolidRef} />
      </group>
      <group ref={tipRef} rotation={[Math.PI / 2, 0, 0]}>
        {/* Drawn lines live on the sheet, so the whole plan tips as one piece. */}
        <PlanLines progressRef={progressRef} fadeStart={DRAWING_FADE_START} fadeEnd={RISE_END} />
      </group>
      <group ref={worldRef} />
      {/* The wave that leaves the walls when the last piece lands. */}
      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} visible={false}>
        <planeGeometry args={[76, 76]} />
        <primitive object={pulse.material} attach="material" />
      </mesh>
    </>
  );
}

type PlanFrame = { cx: number; cy: number; radius: number };

/**
 * Drives the camera, and solves the overhead pose from the drawing on screen.
 *
 * The plan pose is not a hand tuned constant: it is derived every frame from where
 * the SVG plan actually sits, so the model lands exactly on top of the drawing at
 * any viewport. That is what lets the drawing hand over without a visible cut.
 */
/**
 * Where the camera stands to inspect one system, derived from its ring angle.
 *
 * Fifteen units from the wall at a forty degree field of view puts nothing in the
 * frame but the wall: the reader chose a system and was shown masonry. It stands
 * further out and higher now, and looks past the chosen bay into the courtyard,
 * so the system is read in the citadel rather than instead of it.
 */
function nodePose(deg: number) {
  const a = (deg * Math.PI) / 180;
  const out = CITADEL.ring.outerRadius;
  return {
    eye: new THREE.Vector3(Math.cos(a) * (out + 23), 13.5, Math.sin(a) * (out + 23)),
    target: new THREE.Vector3(Math.cos(a) * (out - 3), 6.2, Math.sin(a) * (out - 3)),
  };
}

const NODE_POSES = new Map(CITADEL.nodes.map((node) => [node.id, nodePose(node.deg)]));

function CameraRig({
  progressRef,
  planFrameRef,
  focusSlug,
  handoffRef,
}: {
  progressRef: MutableRefObject<number>;
  planFrameRef: MutableRefObject<PlanFrame | null>;
  focusSlug: string | null;
  handoffRef?: MutableRefObject<number>;
}) {
  const { camera, size } = useThree();
  const eye = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const planEye = useMemo(() => new THREE.Vector3(), []);
  const planTarget = useMemo(() => new THREE.Vector3(), []);
  const inspectRef = useRef(0);

  useFrame(() => {
    const frame = planFrameRef.current;
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const halfHeight = size.height / 2;
    const t = smooth(range(progressRef.current, SETTLE_START, SETTLE_END));

    // Distance that projects the standing sheet at exactly the drawn radius.
    const radius = frame && frame.radius > 8 ? frame.radius : halfHeight * 0.42;
    const distance = (RING_OUTER * halfHeight) / (radius * tanHalfFov);

    // The drawing is placed by shifting the projection, not by moving the camera.
    // Offsetting the camera in Y used to put it under the ground plane, so once the
    // terrain appeared the view came up from beneath the model.
    if (frame) {
      const shift = 1 - t;
      const dx = -(frame.cx - size.width / 2) * shift;
      const dy = -(frame.cy - size.height / 2) * shift;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        if (camera instanceof THREE.PerspectiveCamera && camera.view?.enabled) {
          camera.clearViewOffset();
        }
      } else if (camera instanceof THREE.PerspectiveCamera) {
        camera.setViewOffset(size.width, size.height, dx, dy, size.width, size.height);
      }
    }

    planTarget.set(0, 0, 0);
    planEye.set(0, 0, distance);

    // Portrait crops horizontally at a fixed vertical field of view, so the ring
    // runs off both sides of a phone. Pull the eye back until the width fits.
    const aspect = size.width / Math.max(1, size.height);
    const widen = aspect < 1.25 ? THREE.MathUtils.clamp(1.25 / aspect, 1, 2.2) : 1;

    // Lift the arc so the camera swings over the ring instead of sliding through it.
    const arc = Math.sin(Math.PI * t) * 9;
    eye.lerpVectors(planEye, HERO_EYE, t);
    if (widen > 1) {
      // Away from the target, so the framing widens without changing the angle.
      eye.sub(HERO_TARGET).multiplyScalar(1 + (widen - 1) * t).add(HERO_TARGET);
    }
    eye.y = Math.max(eye.y + arc, GROUND_CLEARANCE);
    target.lerpVectors(planTarget, HERO_TARGET, t);

    // Traverse: once the citadel stands, choosing a system walks the camera to it
    // and choosing nothing walks it back. The scroll pose stays the anchor.
    const pose = focusSlug ? NODE_POSES.get(focusSlug) : undefined;
    const inspect = pose && progressRef.current > 0.92 ? 1 : 0;
    inspectRef.current += (inspect - inspectRef.current) * 0.07;
    if (pose && inspectRef.current > 0.001) {
      eye.lerp(pose.eye, inspectRef.current);
      target.lerp(pose.target, inspectRef.current);
    }

    // Out through the gate.
    //
    // Two stages, because arriving at a doorway and going through it are
    // different movements: the first walks up to the opening, the second carries
    // on out and leaves the citadel behind. A single lerp from the far view to
    // the far side would cut the corner and take the camera through the wall.
    const handoff = handoffRef?.current ?? 0;
    if (handoff > 0) {
      const arrive = smooth(range(handoff, 0, 0.55));
      const threshold = gateThreshold();
      eye.lerp(threshold.eye, arrive);
      target.lerp(threshold.target, arrive);

      if (handoff > 0.55) {
        const through = smooth(range(handoff, 0.55, 1));
        const beyond = gateBeyond();
        eye.lerp(beyond.eye, through);
        target.lerp(beyond.target, through);
      }
    }

    // A short push under the arch, peaking where the camera actually crosses the
    // wall rather than at the middle of the move: the frame widens going through
    // the opening and settles inside, which reads as gathering pace without the
    // camera being sped up.
    const perspective = camera as THREE.PerspectiveCamera;
    if (perspective.isPerspectiveCamera) {
      const push = handoff > 0 ? Math.sin(smooth(range(handoff, 0.45, 1)) * Math.PI) : 0;
      const wanted = FOV + push * 13;
      if (Math.abs(perspective.fov - wanted) > 0.01) {
        perspective.fov = wanted;
        perspective.updateProjectionMatrix();
      }
    }

    camera.position.copy(eye);
    camera.lookAt(target);
  });

  return null;
}

function Stage({ exposure }: { exposure?: number }) {
  const { gl } = useThree();
  useEffect(() => {
    // Per material clipping, so only the citadel is cut at the ground. Harmless
    // to leave on for a shared renderer: it only enables the feature, and
    // materials that carry no planes are untouched.
    gl.localClippingEnabled = true;
  }, [gl]);
  useEffect(() => {
    // Exposure is renderer wide, so the sequence only claims it when it owns the
    // canvas. Inside the story's shared canvas it would relight fifteen other
    // chapters to suit this one.
    if (exposure === undefined) return;
    const previous = gl.toneMappingExposure;
    gl.toneMappingExposure = exposure;
    return () => {
      gl.toneMappingExposure = previous;
    };
  }, [gl, exposure]);
  return null;
}

type CitadelSceneProps = {
  progressRef: MutableRefObject<number>;
  planFrameRef: MutableRefObject<PlanFrame | null>;
  reducedMotion: boolean;
  /** Lit and named: whatever the reader is on, hovered or chosen. */
  activeSlug: string | null;
  /** Chosen outright. Only this moves the camera; see the note in the page. */
  focusSlug: string | null;
  /**
   * 0 to 1 across the scroll between the citadel standing and the first chapter.
   *
   * The opening ends with a building and the story starts with a city. Without
   * this the reader is cut from one to the other; with it they are walked out
   * through the gate the citadel just opened, which is the only exit it has.
   */
  handoffRef?: MutableRefObject<number>;
  visited: ReadonlySet<string>;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
  tagsRef: MutableRefObject<HTMLDivElement | null>;
};

/**
 * Everything the sequence puts inside a canvas, without the canvas.
 *
 * The lab page gives it one of its own; the story has a single canvas shared by
 * sixteen chapters and cannot afford a second WebGL context, so the opening has
 * to be mountable inside somebody else's scene. Nothing here assumes it owns the
 * renderer beyond the clipping flag, which is additive.
 */
export function CitadelSequence({
  progressRef,
  planFrameRef,
  reducedMotion,
  activeSlug,
  focusSlug,
  handoffRef,
  visited,
  onHover,
  onSelect,
  tagsRef,
  exposure,
  lit = true,
  sky = true,
}: CitadelSceneProps & { exposure?: number; lit?: boolean; sky?: boolean }) {
  return (
    <>
      <Stage exposure={exposure} />
      <CameraRig
        progressRef={progressRef}
        planFrameRef={planFrameRef}
        focusSlug={focusSlug}
        handoffRef={handoffRef}
      />
      <WorldTags progressRef={progressRef} tagsRef={tagsRef} showFrom={RISE_END} />
      {sky ? <NightSky progressRef={progressRef} showFrom={TIP_END} /> : null}
      <SignalRoute progressRef={progressRef} activeSlug={activeSlug} showFrom={RISE_START} />

      {/* Blue hour: cool sky key, warm occupancy fill, readable shadow detail.
          Skippable, because a host scene arrives with a lighting rig of its own
          and two keys on the same model read as neither. */}
      {lit ? <hemisphereLight intensity={0.34} color="#7f9ab4" groundColor="#0c1210" /> : null}
      {lit ? (
      <directionalLight
        position={[-38, 34, 20]}
        intensity={0.9}
        color="#c3d6e8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={10}
        shadow-camera-far={140}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0006}
        shadow-normalBias={0.04}
      />
      ) : null}
      {lit ? <pointLight position={[0, 7.5, 1]} intensity={220} distance={40} color="#f2c377" /> : null}

      <CitadelModel
        progressRef={progressRef}
        activeSlug={activeSlug}
        visited={visited}
        reducedMotion={reducedMotion}
        onHover={onHover}
        onSelect={onSelect}
      />
    </>
  );
}

/** The lab page's standalone shell: the sequence with a canvas of its own. */
export function CitadelScene(props: CitadelSceneProps) {
  return (
    <Canvas
      className="hp-canvas"
      shadows={props.reducedMotion ? false : 'soft'}
      dpr={[1, props.reducedMotion ? 1 : 1.5]}
      frameloop={props.reducedMotion ? 'demand' : 'always'}
      camera={{ fov: FOV, near: 0.5, far: 400, position: [0, 82, 0.001] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ scene }) => {
        scene.fog = new THREE.Fog('#0a121a', 46, 210);
      }}
    >
      <CitadelSequence {...props} exposure={1.1} />
    </Canvas>
  );
}
