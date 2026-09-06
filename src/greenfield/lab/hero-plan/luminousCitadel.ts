import * as THREE from 'three';
import { createCitadelOutlines, type OutlinePiece } from './citadelOutlines';

/** The drawing gains physical surfaces as each piece finishes its rise. */

/** Edge colour per material family. Structure reads white, mechanism reads brass. */
const EDGE_TONES: Array<[RegExp, string, number]> = [
  [/limestone|plaster/i, '#e8e2d6', 0.85],
  [/brass/i, '#d8b76c', 0.95],
  [/signal/i, '#8fe6e4', 1],
  [/occupied|light/i, '#f6cf88', 1],
  [/timber|roof/i, '#7f8b8a', 0.55],
];

/**
 * Translucent volumes need a colour you can actually see through.
 *
 * A near black fill at low opacity is not translucent, it is invisible: the pieces
 * vanished and only their outlines remained. A cool mineral tint reads as a plate
 * of smoked glass, which is what makes the stack legible.
 */
export const GLASS_COLOR = new THREE.Color('#4a6270');
const GLASS_OPACITY = 0.34;
/** How hard a lit surface burns once its piece has turned to stone. */
export const EMISSIVE_STRENGTH = 0.85;

/**
 * Line hierarchy.
 *
 * Outlining all 178 pieces at equal weight turned the citadel into a thicket: a
 * sixty centimetre merlon drew as insistently as the wall carrying it, and with
 * an x-ray halo the far side of the ring showed through the near side. Structure
 * reads first, repetition recedes, so the building can be read at a glance.
 */
const MINOR_PIECE = /merlon|post|tie|beam|slot|rail|step|opening|pilaster|buttress/i;
const MINOR_WEIGHT = 0.3;

/**
 * Ground plane clip.
 *
 * The pieces rise by sliding up out of the earth, and translucent volumes with an
 * x-ray halo are not hidden by opaque terrain: the buried half showed straight
 * through the ground. Clipping at y = 0 cuts what has not surfaced yet, so the
 * rise reads as emerging instead of passing through.
 */
export const SETTLED_OPACITY = 0.72;
export { GLASS_OPACITY };

export const GROUND_CLIP = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/**
 * The build sweep.
 *
 * Crossfading a piece from glass to stone reads as it changing its mind. A wall
 * gets poured: the surface arrives from the bottom up behind a bright line, and
 * the outline the piece was drawn with is eaten away as the material catches up
 * with it. One uniform block drives the solid and its batched outline so their
 * fill lines stay aligned.
 */
export type BuildUniforms = {
  /** 0 glass, 1 fully built. Height of the fill line through the piece. */
  uBuild: { value: number };
  /** World space Y of the piece at rest, so the sweep is level with the ground. */
  uLow: { value: number };
  uHigh: { value: number };
  /** Softness of the material boundary itself. Kept crisp. */
  uSoft: { value: number };
  /** Reach of the glow around that boundary, which is a far wider thing. Held
   *  at a constant number of metres, so the line looks the same on a seven metre
   *  wall as on the tower beside it. */
  uWide: { value: number };
  /** How much glow this piece earns. A wall gets the whole show; a merlon or a
   *  floor plate does not, or three hundred small parts all flare at once and
   *  the citadel washes out to white. */
  uBand: { value: number };
  uGlass: { value: THREE.Color };
  uReal: { value: THREE.Color };
  uGlassAlpha: { value: number };
  uRealRough: { value: number };
  uRealMetal: { value: number };
  /** Colour of the fill line, and of the flare when the piece completes. */
  uEdge: { value: THREE.Color };
  /** 0 to 1 flare over the whole piece: its own snap, or the finished pulse. */
  uFlash: { value: number };
  /** Per piece value shift, so a wall of one material is not one flat field. */
  uTone: { value: number };
};

const BUILD_VERTEX_HEAD = 'varying float vBuildY;\nvarying vec3 vBuildPos;';
/** transformed is still object space here, and the piece never tips, so its world
 *  height is all the fragment stage needs to know. */
const BUILD_VERTEX_BODY = 'vBuildPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvBuildY = vBuildPos.y;';

const BUILD_FRAGMENT_HEAD = `
varying float vBuildY;
varying vec3 vBuildPos;
uniform float uBuild;
uniform float uLow;
uniform float uHigh;
uniform float uSoft;
uniform float uWide;
uniform float uBand;
uniform vec3 uGlass;
uniform vec3 uReal;
uniform float uGlassAlpha;
uniform float uRealRough;
uniform float uRealMetal;
uniform vec3 uEdge;
uniform float uFlash;
uniform float uTone;

float hpHeight() {
  return clamp((vBuildY - uLow) / max(0.0001, uHigh - uLow), 0.0, 1.0);
}

/**
 * Surface, which untextured geometry has none of.
 *
 * A perfectly even field of one colour is the last thing separating this from
 * moulded plastic - the geometry now steps mass to moulding to joint, but every
 * face inside those steps is still mathematically flat. Three octaves of world
 * space value noise give the stone a grain that does not repeat around the
 * enclosure and does not need a UV, which this model has none of outside the
 * palette lookup.
 */
float hpHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float hpNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hpHash(i), hpHash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hpHash(i + vec3(0.0, 1.0, 0.0)), hpHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hpHash(i + vec3(0.0, 0.0, 1.0)), hpHash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hpHash(i + vec3(0.0, 1.0, 1.0)), hpHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
float hpGrain() {
  return hpNoise(vBuildPos * 1.7) * 0.55
       + hpNoise(vBuildPos * 6.4) * 0.30
       + hpNoise(vBuildPos * 21.0) * 0.15;
}
/** 1 where the material has arrived, 0 where the piece is still a drawing. */
float hpFill(float h) {
  if (uBuild >= 1.0) return 1.0;
  if (uBuild <= 0.0) return 0.0;
  return 1.0 - smoothstep(uBuild - uSoft, uBuild + uSoft, h);
}
/** The bright line riding the front. Absent before the pour and after it. */
float hpBand(float h) {
  if (uBuild <= 0.0 || uBuild >= 1.0) return 0.0;
  return (1.0 - smoothstep(0.0, uWide, abs(h - uBuild))) * uBand;
}
`;

/**
 * Injects the sweep into a stock material.
 *
 * onBeforeCompile runs again on every recompile, and it is handed a fresh uniform
 * table each time, so the block has to be re assigned rather than merged once.
 * The cache key keeps these programs from being handed to materials that were
 * never injected.
 */
function attachBuild(material: THREE.Material, build: BuildUniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, build);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${BUILD_VERTEX_HEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${BUILD_VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>\n${BUILD_FRAGMENT_HEAD}`,
    );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float hpH = hpHeight();
        float hpF = hpFill(hpH);
        float hpB = hpBand(hpH);
        // Multiply, do not replace: by this point diffuseColor already holds
        // whatever the material produced - the palette texel, in this build -
        // and dropping a flat colour on top of it discards the whole palette.
        // Grain, and weather off the ground. Stone that has stood outside is
        // darker and dirtier where the rain runs off it and where it meets the
        // earth, and the difference is what tells the eye it is stone at all.
        float hpG = hpGrain();
        // Dirt collects at the foot of a wall, not at the top of it. The first
        // pass had this the wrong way up and darkened the parapets instead.
        float hpDirt = 1.0 - (1.0 - smoothstep(0.0, 2.8, vBuildY)) * 0.2;
        float hpRun = 0.92 + hpNoise(vec3(vBuildPos.xz * 2.2, vBuildY * 0.26)) * 0.16;
        vec3 hpReal = diffuseColor.rgb * uReal * uTone * (0.78 + hpG * 0.42) * hpDirt * hpRun;
        diffuseColor.rgb = mix(uGlass, hpReal, hpF);
        diffuseColor.a = max(mix(uGlassAlpha, 1.0, hpF), hpB * 0.55);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        // Screen-space surface gradient; bounded amplitude keeps distant stone stable.
        float hpRelief = hpGrain() * 0.012 * hpF;
        vec3 hpDx = dFdx(-vViewPosition);
        vec3 hpDy = dFdy(-vViewPosition);
        vec3 hpRx = cross(hpDy, normal);
        vec3 hpRy = cross(normal, hpDx);
        float hpDet = dot(hpDx, hpRx);
        if (abs(hpDet) > 0.0000001) {
          vec3 hpGradient = sign(hpDet) * (dFdx(hpRelief) * hpRx + dFdy(hpRelief) * hpRy);
          normal = normalize(abs(hpDet) * normal - hpGradient);
        }`,
      )
      // Glass is uniformly matte; the authored surface only applies where the
      // material has actually landed, or the sheen arrives before the stone.
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.95, clamp(roughnessFactor * uRealRough * (0.88 + hpGrain() * 0.26), 0.04, 1.0), hpF);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(0.0, metalnessFactor * uRealMetal, hpF);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += uEdge * (hpB * 0.55 + uFlash * 0.12);`,
      );
  };
  material.customProgramCacheKey = () => 'hp-build-solid';
}

/**
 * The finished pulse.
 *
 * Fortnite does not simply stop building: the last piece lands and the structure
 * reports itself done. A ring leaving the gate across the ground is the cheapest
 * honest way to say that, and it is the one part of the sequence driven by real
 * time rather than by scroll, because a flare frozen half way is not a flare.
 */
export function createBuildPulse() {
  const uniforms = {
    uT: { value: 0 },
    uColor: { value: new THREE.Color('#cfe6ff') },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uT;
      uniform vec3 uColor;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float ring = smoothstep(0.085, 0.0, abs(d - uT));
        float wash = smoothstep(uT, uT - 0.3, d) * 0.1;
        float fade = (1.0 - uT) * (1.0 - uT);
        float a = (ring * 0.9 + wash) * fade;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  return { material, uniforms };
}

function toneFor(materialName: string): [string, number] {
  const match = EDGE_TONES.find(([pattern]) => pattern.test(materialName));
  return match ? [match[1], match[2]] : ['#9aa3a0', 0.45];
}

export type Lamp = {
  material: THREE.MeshStandardMaterial;
  base: number;
  tint: THREE.Color;
};

export type LuminousParts = {
  update: () => void;
  dispose: () => void;
};

/**
 * @param root the Citadel group
 * @param threshold edge angle in degrees; lower catches more of the form
 */
const authored = (object: THREE.Object3D) => object.name.replace(/_/g, ' ');

/**
 * A stable 0..1 per name, used to nudge one piece's value off its neighbour's.
 *
 * Eleven materials across two hundred pieces means large fields of exactly one
 * colour, which is most of what makes untextured geometry read as moulded plastic
 * rather than as stone cut by somebody. A few percent either way is enough.
 */
function toneJitter(name: string) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i += 1) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export function makeLuminous(root: THREE.Object3D, threshold = 32): LuminousParts {
  const outlines: OutlinePiece[] = [];
  const glass: THREE.MeshStandardMaterial[] = [];

  // Collect first, then mutate: adding children while traverse walks the graph
  // means the walk can visit what it just created.
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
  });

  meshes.forEach((object) => {
    // This runs more than once: StrictMode mounts effects twice and hot reload
    // re-runs them. By the second pass object.material is already the glass we
    // installed, so reading the authored colour off it would capture the glass
    // tint and the piece could never turn to stone. Always read the original.
    const source =
      (object.userData.sourceMaterial as THREE.MeshStandardMaterial | undefined) ??
      (object.material as THREE.MeshStandardMaterial);
    object.userData.sourceMaterial = source;

    // Outlines from a previous pass would otherwise stack up on the piece.
    object.children
      .filter((child): child is THREE.LineSegments => (child as THREE.LineSegments).isLineSegments)
      .forEach((child) => {
        object.remove(child);
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      });

    const name = source?.name ?? '';
    // emissive is always a Color object, and glTF defaults emissiveIntensity to 1,
    // so the obvious truthiness check called every material emissive and every
    // volume stayed opaque. Test the colour itself.
    const emissive = Boolean(
      source?.emissive && source.emissive.r + source.emissive.g + source.emissive.b > 0.004,
    );

    // Solids become translucent rather than opaque void.
    //
    // Opaque volumes hid every piece behind the one in front, so the citadel read
    // as a silhouette with a few outlines. Letting them pass light means each of
    // the pieces stays legible through the ones covering it, which is what makes
    // the whole thing read as stacked plates instead of a solid mass.
    const solid = new THREE.MeshStandardMaterial({
      // White, with the authored maps carried across, and the glass tint applied
      // in the shader instead of baked into the colour.
      //
      // This material used to be built from nothing but `source.color`, which is
      // how the finished citadel ended up one flat cream. The export merges eleven
      // materials - limestone, plaster, timber, roof, brass, glass - into a single
      // palette texture, so every one of them arrives with `color` white and its
      // real colour in the map. Rebuilding the material without the map threw all
      // eleven away, and the shader then overwrote what was left.
      //
      // Roughness and metalness are 1 so the packed map lands unscaled; the
      // authored scalars ride in the uniforms for the pieces that have no map.
      // Lit pieces start as glass like everything else.
      //
      // They skip the build shader, because a window that goes translucent stops
      // being a window - and skipping it is why they used to arrive at full
      // brightness the instant they cleared the ground, a row of lamps hanging in
      // the air over a building that had not been built yet. They now pour in on
      // the same schedule as the wall they are set into, driven from the frame
      // loop instead of the shader: see `lamp` below.
      color: emissive ? GLASS_COLOR.clone() : 0xffffff,
      map: emissive ? null : source.map ?? null,
      roughnessMap: emissive ? null : source.roughnessMap ?? null,
      metalnessMap: emissive ? null : source.metalnessMap ?? null,
      roughness: emissive ? 0.95 : 1,
      metalness: emissive ? 0 : 1,
      emissive: emissive ? source.emissive.clone() : new THREE.Color('#000000'),
      emissiveIntensity: 0,
      transparent: true,
      opacity: GLASS_OPACITY,
      // Without this the pieces fight each other for depth and flicker as the
      // camera moves; the edges carry the form anyway.
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
      // Cast from the back faces only.
      //
      // A double sided material casts shadow from both, so every piece shadows its
      // own front face at the depth-map's precision: on bevelled geometry that is
      // a grey mottle over the whole building, which reads as haze rather than as
      // the bug it is. Backside casting moves the comparison a whole wall
      // thickness away from the surface being lit.
      shadowSide: THREE.BackSide,
      clippingPlanes: [GROUND_CLIP],
    });
    solid.name = name;
    object.material = solid;
    // Untextured low-poly architecture lives or dies on shadow. Flat-lit boxes
    // read as toy bricks no matter how good the palette is: there is nothing
    // else in an untextured plane to tell the eye which way a surface faces or
    // how far it stands from the one behind it.
    object.castShadow = true;
    object.receiveShadow = true;

    let build: BuildUniforms | null = null;
    if (!emissive) {
      // Where this piece starts and stops in the world, so the fill line can run
      // level with the ground instead of along whatever axis the mesh was
      // authored on. Measured at rest: the piece is at its base height here, and
      // the sweep only ever runs once it has finished travelling.
      const shape = object.geometry;
      if (!shape.boundingBox) shape.computeBoundingBox();
      object.updateWorldMatrix(true, false);
      const bounds = new THREE.Box3()
        .copy(shape.boundingBox ?? new THREE.Box3())
        .applyMatrix4(object.matrixWorld);
      const span = Math.max(0.05, bounds.max.y - bounds.min.y);

      build = {
        uBuild: { value: 0 },
        uLow: { value: bounds.min.y },
        uHigh: { value: bounds.max.y },
        // A crisp boundary and a wide glow are two different distances, and
        // deriving one from the other is what made the band either invisible on
        // a wall or the entire surface of a merlon.
        uSoft: { value: THREE.MathUtils.clamp(0.12 / span, 0.02, 0.14) },
        uWide: { value: THREE.MathUtils.clamp(0.18 / span, 0.015, 0.18) },
        // Only pieces with real height earn the glow. Floor plates and rails are
        // too thin for a travelling line to mean anything on them: they would
        // simply strobe, and there are hundreds of them.
        uBand: { value: THREE.MathUtils.clamp((span - 0.3) / 1.9, 0.05, 1) },
        uGlass: { value: GLASS_COLOR.clone() },
        // The authored surface, kept so the citadel can finish in limestone,
        // plaster, timber and brass rather than staying a diagram.
        uReal: { value: source.color.clone() },
        uGlassAlpha: { value: GLASS_OPACITY },
        uRealRough: { value: source.roughness },
        uRealMetal: { value: source.metalness },
        uEdge: { value: new THREE.Color(toneFor(name)[0]) },
        uFlash: { value: 0 },
        // Deterministic, from the piece's own name: the same stone is the same
        // shade on every reload, and no two neighbours are exactly equal.
        uTone: { value: 0.9 + toneJitter(name) * 0.2 },
      };
      attachBuild(solid, build);
      object.userData.build = build;
      object.userData.glass = solid;
      glass.push(solid);
    }
    if (emissive) {
      // What the frame loop needs to bring a lamp up with its own wall.
      object.userData.glass = solid;
      object.userData.lamp = { material: solid, base: EMISSIVE_STRENGTH, tint: source.color.clone() };
      glass.push(solid);
    }

    const [tone, baseOpacity] = toneFor(name);
    const minor = MINOR_PIECE.test(authored(object));
    outlines.push({
      object,
      geometry: new THREE.EdgesGeometry(object.geometry, minor ? 46 : threshold),
      color: new THREE.Color(tone),
      opacity: baseOpacity * (minor ? MINOR_WEIGHT : 1),
      build,
    });
  });

  const batch = createCitadelOutlines(root, outlines);
  return {
    update: batch.update,
    dispose() {
      batch.dispose();
      glass.forEach((material) => material.dispose());
    },
  };
}

/** Scatter keeps silhouette only: 260 outlined pines is noise, not drawing. */
export function makeSilhouette(root: THREE.Object3D, color = '#0b1210', takesShadow = false) {
  // The ground has to take the building's shadow or the citadel floats on it, and
  // an unlit material cannot: MeshBasic has no light to be occluded from. The
  // scatter stays basic - two hundred and sixty pines are a silhouette, and
  // shading them costs a lit pass to say nothing.
  const material = takesShadow
    ? new THREE.MeshLambertMaterial({ color: new THREE.Color(color) })
    : new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.material = material;
      object.castShadow = false;
      object.receiveShadow = takesShadow;
    }
  });
}

/**
 * The light standing behind the doors, seen through the gap between them.
 *
 * It lives just inside the gateway plane, so the leaves occlude it while they are
 * shut and reveal it as they swing: the widening slit is the light itself rather
 * than a glow pasted over the opening. Brightest at the ground, because what is
 * lit is a courtyard floor and not a bulb hung in the arch.
 */
export function createGateGlow() {
  const uniforms = {
    uOpen: { value: 0 },
    uNear: { value: 0 },
    uColor: { value: new THREE.Color('#ffcd94') },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uOpen;
      uniform float uNear;
      uniform vec3 uColor;
      void main() {
        float x = abs(vUv.x - 0.5) * 2.0;
        float w = mix(0.05, 1.0, uOpen);
        float core = smoothstep(w, w * 0.12, x);
        float bleed = smoothstep(min(1.0, w * 2.4), 0.0, x) * 0.32;
        float up = smoothstep(1.0, 0.12, vUv.y);
        float a = (core + bleed) * up * (0.13 + uNear * 0.42) * smoothstep(0.0, 0.1, uOpen);
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  return { material, uniforms };
}

/**
 * What the reader is briefly blinded by on the way through.
 *
 * It rides in front of the camera and peaks on the frame where the eye actually
 * crosses the wall, which is also the frame the citadel hands the story over. A
 * cut hidden inside a flare reads as going somewhere; the same cut in clear air
 * reads as a scene ending.
 */
export function createCrossingFlash() {
  const uniforms = {
    uT: { value: 0 },
    uColor: { value: new THREE.Color('#ffd2a0') },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uT;
      uniform vec3 uColor;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float wash = smoothstep(1.25, 0.0, d) * 0.5;
        float hot = smoothstep(0.62, 0.0, d) * 0.8;
        float a = (wash + hot) * uT;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  return { material, uniforms };
}

/**
 * Grit shaken off the lintel when the leaves break loose.
 *
 * A door that opens in clean air is a door with no weight. The scatter is fixed
 * rather than random so the same beat plays the same way on every reload.
 */
export function createGateDust(count = 190) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    // Golden angle across the opening: even coverage without a random seed.
    const t = (i * 0.6180339887) % 1;
    const u = (i * 0.2749) % 1;
    positions[i * 3] = (t - 0.5) * 2;
    positions[i * 3 + 1] = 0.72 + u * 0.28;
    positions[i * 3 + 2] = (u - 0.5) * 0.7;
    seeds[i] = t * 0.5 + u * 0.5;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const uniforms = {
    uT: { value: 0 },
    uFall: { value: 1 },
    uColor: { value: new THREE.Color('#e8cfa8') },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: `
      attribute float aSeed;
      uniform float uT;
      uniform float uFall;
      varying float vA;
      void main() {
        float delay = fract(aSeed * 7.31) * 0.46;
        float life = clamp((uT - delay) / 0.54, 0.0, 1.0);
        vec3 p = position;
        p.y -= life * life * uFall;
        p.x += sin(aSeed * 31.0 + life * 3.4) * 0.09;
        vA = sin(life * 3.14159265) * step(0.0001, life);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.6 + fract(aSeed * 13.0) * 3.4) * (14.0 / max(0.6, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vA;
      uniform vec3 uColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.0, d) * vA * 0.8;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, uniforms };
}

/**
 * The light coming out of the keep's doorway, as something in the air.
 *
 * A lit rectangle at the end of a passage is a lit rectangle. What makes light at
 * the end of a tunnel worth walking towards is the part of it standing between the
 * reader and the source: the beam, the haze on the floor, the soft edge where the
 * opening bleeds into the dark around it. None of that is the lamp, and none of it
 * is geometry either - it is air.
 *
 * Cheaply and correctly: a stack of soft additive cards square to the doorway
 * axis, growing and fading as they come out of it. Seen down the axis they read as
 * one cone of light; the reader never sees them from the side, because the walk
 * arrives head on.
 */
export function createDoorGlow() {
  const uniforms = {
    uNear: { value: 0 },
    uColor: { value: new THREE.Color('#ffd7a0') },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    // Depth tested, so the jambs and the cheeks cut the beam the way they should.
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    vertexShader: `
      varying vec2 vUv;
      varying float vCard;
      attribute float aCard;
      void main() {
        vUv = uv;
        vCard = aCard;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying float vCard;
      uniform float uNear;
      uniform vec3 uColor;
      void main() {
        // Soft on every edge, so no card ever shows its own outline.
        vec2 d = abs(vUv - 0.5) * 2.0;
        float edge = smoothstep(1.0, 0.24, d.x) * smoothstep(1.0, 0.3, d.y);
        // Thinner the further out of the doorway it stands.
        float depth = mix(1.0, 0.16, vCard);
        // Eight cards accumulate, so each one carries very little: the beam has to
        // read as haze standing in the doorway, not as the doorway on fire.
        float a = edge * depth * (0.012 + uNear * 0.065);
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  return { material, uniforms };
}
