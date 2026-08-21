import { useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import CITADEL from '../../../../shared/citadel.json';
import { PlanLines } from './PlanLines';
import { WorldTags } from './WorldTags';
import type { BuildUniforms } from './luminousCitadel';
import {
  GLASS_OPACITY,
  createBuildPulse,
  createCrossingFlash,
  createGateDust,
  createGateGlow,
  makeLuminous,
  makeSilhouette,
} from './luminousCitadel';
import { onRing } from './citadelSpace';
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

/** Just inside the threshold, at head height. */
const GATE_LIGHT = onRing(CITADEL.gate.centerDeg, CITADEL.ring.innerRadius - 1.5, 3.4);
/**
 * The light in the keep's doorway, across the courtyard from the gate.
 *
 * The reader comes through the arch and the far side of the court has to be worth
 * arriving at. Derived from the keep's own geometry so it stands in the doorway
 * rather than near it: facets sit at 30 + k*60 and one of them looks straight
 * down the gate axis, which is where the portal is.
 */
const KEEP_INRADIUS = CITADEL.core.radius * Math.cos(Math.PI / CITADEL.core.facets);
const KEEP_LIGHT = onRing(CITADEL.gate.centerDeg, KEEP_INRADIUS + 1.1, 2.0);

/**
 * How far a leaf swings, in radians.
 *
 * Eighty-three degrees, not ninety. The leaf is 1.85m wide and hinges 1.85m off the
 * centre line, while the jamb is 1.91m out: at a right angle the free edge is
 * already flush with the side of the passage, and past it the tip travels back out
 * into the masonry. Eighty-three leaves 28cm of clearance closed onto the stop, and
 * still 15cm at the top of the swing curve's rebound.
 */
const GATE_SWING = 1.45;
/**
 * The gate's own frame of reference: the middle of the wall band at the gate's
 * bearing. The glow and the dust hang off this, so they follow the model rather
 * than a second set of hand placed numbers that has to be kept in step with it.
 */
const GATE_MID = (CITADEL.ring.innerRadius + CITADEL.ring.outerRadius) / 2;
const GATE_SPAN = CITADEL.ring.outerRadius * Math.sin((CITADEL.gate.halfWidthDeg * Math.PI) / 180) * 2;
const GATE_FACE = onRing(CITADEL.gate.centerDeg, GATE_MID - 0.55, 0);
const GATE_YAW = ((90 - CITADEL.gate.centerDeg) * Math.PI) / 180;
/**
 * Where the eye crosses the wall, as a fraction of the handoff.
 *
 * Measured from the walk itself rather than guessed: the doors finish opening
 * just before this, and the flare peaks on it.
 */
const GATE_CROSSING = 0.75;
const SETTLE_START = 0.3;
/** The camera never drops below this, so it cannot end up under the terrain. */
const GROUND_CLEARANCE = 1.6;

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/**
 * How a gate leaf moves, which is not how anything eases.
 *
 * A timber door under its own weight takes the load first - it shudders in the
 * jamb without going anywhere - then gives all at once, swings fastest through
 * the middle of its arc, and arrives at its stop hard enough to rebound. A
 * smoothstep does none of that: it starts moving immediately and parks. The
 * shudder is the part that makes the leaf read as heavy rather than motorised.
 *
 * `phase` offsets the rattle per leaf, so the two do not shake in lockstep.
 */
function swing(value: number, phase: number) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  const STRAIN = 0.18;
  if (value < STRAIN) {
    const load = value / STRAIN;
    return Math.sin(load * 11 + phase) * 0.011 * load * load;
  }
  const s = (value - STRAIN) / (1 - STRAIN);
  // Slow off the jamb, quick through the arc.
  const arc = s * s * (3 - 2 * s) + Math.sin(s * Math.PI) * 0.15 * (1 - s);
  // And it hits the stop rather than settling onto it.
  const late = range(s, 0.78, 1);
  const rebound = late > 0 ? Math.sin(late * Math.PI * 1.5) * 0.05 * (1 - late) : 0;
  return arc + rebound;
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
  handoffRef,
  activeSlug,
  visited,
  reducedMotion,
  onHover,
  onSelect,
}: {
  progressRef: MutableRefObject<number>;
  handoffRef?: MutableRefObject<number>;
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
  const bladesRef = useRef<Array<{ pivot: THREE.Object3D; baseYaw: number; turn: number; phase: number }>>([]);
  const gateLightRef = useRef<THREE.PointLight>(null);
  const keepLightRef = useRef<THREE.PointLight>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const dustRef = useRef<THREE.Points>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  /** When the last piece landed, in clock seconds; -1 while still building. */
  const completedAtRef = useRef(-1);
  const pulse = useMemo(() => createBuildPulse(), []);
  const glow = useMemo(() => createGateGlow(), []);
  const dust = useMemo(() => createGateDust(), []);
  const flash = useMemo(() => createCrossingFlash(), []);
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
      // The courtyard fills in behind the walls, once there is a wall to fill in
      // behind. A stage missing from this table is silently never collected: its
      // pieces get the glass material and then no build uniform to drive them out
      // of it, so they stand translucent forever while everything around them
      // turns to stone.
      'Stage court': 0.85,
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

    // The two leaves of the gate, each on its own hinge.
    //
    // The hinge is built here rather than read off the model, because the model
    // does not have one: the exported leaf nodes carry an identity rotation and
    // their geometry is centred on its own origin, so turning a leaf about Y spun
    // it through its own middle - half of it swinging into the gateway and half
    // out through the jamb - which from head on reads as a door that did not open.
    //
    // Two other things were wrong with matching on the name alone. `Gate leaf 00`
    // also prefixes `Gate leaf 00 edges` and `Gate leaf 00 halo`, which are the
    // outline and glow meshes parented to the leaf: they were being turned a
    // second time on top of their parent, so the drawing of the door ended up at
    // twice the angle of the door. The exact-match pattern leaves them alone, and
    // they follow their leaf for free.
    bladesRef.current = [];
    const leaves: THREE.Object3D[] = [];
    citadel?.traverse((object) => {
      if (/^Gate leaf \d+$/.test(authoredName(object))) leaves.push(object);
    });
    // The gateway's own centre line, so which end of a leaf is the hinge and which
    // way it has to swing are both read off the geometry instead of assumed.
    const mid = (CITADEL.ring.innerRadius + CITADEL.ring.outerRadius) / 2;
    const gateCentre = onRing(CITADEL.gate.centerDeg, mid, 0);
    const outward = gateCentre.clone().setY(0).normalize();
    const leafBox = new THREE.Box3();
    const corner = new THREE.Vector3();
    leaves
      .sort((a, b) => authoredName(a).localeCompare(authoredName(b)))
      .forEach((leaf, index) => {
        let pivot = leaf.parent instanceof THREE.Group && leaf.parent.userData.hingeFor === leaf.uuid
          ? leaf.parent
          : null;
        if (!pivot) {
          const parent = leaf.parent;
          if (!parent) return;
          leafBox.setFromObject(leaf);
          // Of the leaf's four horizontal corners, the hinge is the one furthest
          // from the middle of the gateway; the free edge is the one nearest it.
          let hinge = new THREE.Vector3();
          let far = -Infinity;
          [leafBox.min.x, leafBox.max.x].forEach((x) => {
            [leafBox.min.z, leafBox.max.z].forEach((z) => {
              corner.set(x, 0, z);
              const d = corner.distanceTo(gateCentre.clone().setY(0));
              if (d > far) { far = d; hinge = corner.clone(); }
            });
          });
          pivot = new THREE.Group();
          pivot.name = `${leaf.name} hinge`;
          pivot.userData.hingeFor = leaf.uuid;
          pivot.position.set(hinge.x, 0, hinge.z);
          parent.add(pivot);
          pivot.add(leaf);
          leaf.position.x -= hinge.x;
          leaf.position.z -= hinge.z;
        }

        // Which way it opens is a fact about the geometry, not about the index.
        //
        // Outwards, towards the reader. A gate leaf swinging into its own courtyard
        // is the accurate answer and the wrong one to look at: from head on it
        // recedes into a dark passage and disappears behind the jamb, so the only
        // thing that moves on screen is a slit getting wider. Swung out, the leaves
        // sweep towards the camera and pass it on both sides, which is the whole
        // reason to be standing in front of a door when it opens.
        leafBox.setFromObject(leaf);
        leafBox.getCenter(corner);
        const arm = new THREE.Vector3(corner.x - pivot.position.x, 0, corner.z - pivot.position.z);
        // Velocity of the free edge for a positive turn about Y, at rest.
        const sweep = new THREE.Vector3(arm.z, 0, -arm.x);
        const towardsReader = sweep.dot(outward) > 0 ? 1 : -1;
        bladesRef.current.push({
          pivot,
          baseYaw: pivot.rotation.y,
          turn: towardsReader * GATE_SWING,
          phase: index * 2.3,
        });
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
    // The gate opens for the reader, not before them.
    //
    // It used to swing at the tail of the build, which meant the citadel finished
    // itself standing wide open and the walk up to it arrived at a doorway that
    // had nothing left to do. The building seals itself instead, and the doors
    // give way as the camera closes on them.
    const handoff = handoffRef?.current ?? 0;
    // The doors open in the window where the camera can actually see them.
    //
    // Both earlier attempts missed it in opposite directions. Opening at the end of
    // the build left the reader walking towards a doorway with nothing left to do;
    // opening at the start of the walk spent the whole swing while the camera was
    // still ten metres up and looking down at the roofs, where the gate is a dark
    // slot at the bottom of the frame and the leaves are behind the lintel. The
    // walk arrives level with the threshold around 0.44 and holds there until 0.62
    // before it runs in, so that hold is where the doors go.
    const gateOpen = range(handoff, 0.42, 0.68);
    bladesRef.current.forEach(({ pivot, baseYaw, turn, phase }) => {
      pivot.rotation.y = baseYaw + swing(gateOpen, phase) * turn;
    });

    // What is behind the doors arrives before the reader does. A gate opening on
    // nothing is a gate opening on nothing; the light coming through the widening
    // gap is the reason to walk in. It builds again as the camera nears, so the
    // approach brightens rather than holding at whatever the doors uncovered.
    const near = smooth(range(handoff, 0.36, GATE_CROSSING));
    const opened = swing(gateOpen, 0);
    if (gateLightRef.current) {
      // Kept deliberately low. What sells the gate is that it is the only lit thing
      // on a dark building, not how many lumens come out of it: turned up, it
      // washes the leaves, the jambs and the towers to the same cream and the
      // opening stops reading as an opening.
      gateLightRef.current.intensity = opened * (11 + near * 19);
      gateLightRef.current.visible = opened > 0.002;
    }
    // The keep lights the moment the citadel finishes and gains on the approach,
    // so the courtyard the reader walks into has a far side.
    if (keepLightRef.current) {
      const lit = smooth(range(p, MATERIAL_END - 0.08, MATERIAL_END));
      keepLightRef.current.intensity = lit * (13 + near * 26);
      keepLightRef.current.visible = lit > 0.002;
    }
    if (glowRef.current) {
      glowRef.current.visible = opened > 0.002;
      glow.uniforms.uOpen.value = opened;
      glow.uniforms.uNear.value = near;
    }
    // Grit off the lintel on the frame the leaves break loose, and only then:
    // held past the swing it becomes weather, which is a different scene.
    if (dustRef.current) {
      const shed = range(gateOpen, 0.12, 0.86);
      dustRef.current.visible = shed > 0 && shed < 1;
      dust.uniforms.uT.value = shed;
    }

    // The crossing itself. The flare peaks on the frame the eye passes through the
    // wall, which is also the frame the citadel hands the story on: a cut inside a
    // flare reads as arriving somewhere, the same cut in clear air reads as a
    // scene stopping.
    if (flashRef.current) {
      // Two things at once, and they have to read as one.
      //
      // A kiss of light as the lintel goes over, which belongs to the arch. Then a
      // gather, from the far side of the courtyard to the moment the story changes
      // worlds, which does not: the flare that actually covers the swap is a
      // document layer, because nothing in this scene outlives the swap - see
      // .mf-crossing. This is the part of it that happens in the scene, so the
      // light is on the citadel before it is on the page, and the reader sees a
      // courtyard filling with light rather than a filter fading in over one.
      const arch = handoff <= 0 ? 0 : Math.sin(smooth(range(handoff, 0.62, 0.86)) * Math.PI);
      const gather = smooth(range(handoff, 0.84, 1)) ** 1.7;
      const t = Math.min(0.88, arch * arch * 0.22 + gather * 0.56);
      flashRef.current.visible = t > 0.004;
      flash.uniforms.uT.value = t;
      if (flashRef.current.visible) {
        // Ride a fixed distance ahead of the camera, square to it.
        flashRef.current.quaternion.copy(state.camera.quaternion);
        flashRef.current.position
          .copy(state.camera.position)
          .add(new THREE.Vector3(0, 0, -0.9).applyQuaternion(state.camera.quaternion));
      }
    }

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
      {/* Warm, low, just inside the threshold: the courtyard seen through a door
          that is opening, rather than a lamp hung in the archway. */}
      <pointLight
        ref={gateLightRef}
        position={GATE_LIGHT}
        intensity={0}
        distance={15}
        decay={2}
        color="#ffbe80"
        visible={false}
      />
      {/* The keep's doorway, seen from the arch and walked towards. */}
      <pointLight
        ref={keepLightRef}
        position={KEEP_LIGHT}
        intensity={0}
        distance={17}
        decay={2}
        color="#ffc98d"
        visible={false}
      />
      {/* The light standing in the gateway. It sits just inside the plane of the
          doors, so they occlude it shut and uncover it as they swing: the slit
          widening across the frame is the light, not a decal over the opening. */}
      <mesh
        ref={glowRef}
        position={[GATE_FACE.x, CITADEL.gate.archHeight * 0.62, GATE_FACE.z]}
        rotation={[0, GATE_YAW, 0]}
        visible={false}
        renderOrder={4}
        raycast={() => {}}
      >
        <planeGeometry args={[GATE_SPAN * 1.15, CITADEL.gate.archHeight * 1.24]} />
        <primitive object={glow.material} attach="material" />
      </mesh>
      {/* Grit shaken off the lintel as the leaves break loose. */}
      <primitive
        ref={dustRef}
        object={dust.points}
        position={[GATE_FACE.x, CITADEL.gate.archHeight, GATE_FACE.z]}
        rotation={[0, GATE_YAW, 0]}
        scale={[GATE_SPAN * 0.5, CITADEL.gate.archHeight, 1]}
        visible={false}
      />
      {/* Carried in front of the camera; only ever visible on the way through. */}
      <mesh ref={flashRef} visible={false} renderOrder={999} raycast={() => {}} frustumCulled={false}>
        <planeGeometry args={[3.2, 3.2]} />
        <primitive object={flash.material} attach="material" />
      </mesh>
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
        // Not a constant glide. Walking through a door is slow up to it, quick
        // under it, and settled inside; an even lerp across the whole distance
        // makes the doorway the least eventful part of the move.
        const span = range(handoff, 0.55, 1);
        const paced = span < 0.62
          ? smooth(span / 0.62) * 0.78
          : 0.78 + smooth((span - 0.62) / 0.38) * 0.22;
        const beyond = gateBeyond();
        eye.lerp(beyond.eye, paced);
        target.lerp(beyond.target, paced);
      }

      // A duck under the lintel. Small enough that it registers as the head of
      // someone walking rather than as the camera bouncing.
      eye.y -= Math.sin(smooth(range(handoff, 0.58, 0.96)) * Math.PI) * 0.5;
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
        handoffRef={handoffRef}
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
