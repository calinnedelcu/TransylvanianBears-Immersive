import * as THREE from 'three';

/**
 * Turns the citadel model into a luminous drawing.
 *
 * The building is not trying to be photoreal masonry: procedural geometry never
 * gets there, and every attempt read as a blockout. Instead the solids go almost
 * black so they occlude and hold silhouette, and every structural edge is drawn
 * as a bright line. The result is the plan given a third dimension rather than
 * given concrete, which is also the language the rest of the site speaks.
 */

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
 * with it. One uniform block drives the solid and both of its outlines, so all
 * three share a single fill line instead of three that nearly agree.
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
};

const BUILD_VERTEX_HEAD = 'varying float vBuildY;';
/** transformed is still object space here, and the piece never tips, so its world
 *  height is all the fragment stage needs to know. */
const BUILD_VERTEX_BODY = 'vBuildY = (modelMatrix * vec4(transformed, 1.0)).y;';

const BUILD_FRAGMENT_HEAD = `
varying float vBuildY;
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

float hpHeight() {
  return clamp((vBuildY - uLow) / max(0.0001, uHigh - uLow), 0.0, 1.0);
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
  return smoothstep(uWide, 0.0, abs(h - uBuild)) * uBand;
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
function attachBuild(material: THREE.Material, build: BuildUniforms, kind: 'solid' | 'line' | 'halo') {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, build);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${BUILD_VERTEX_HEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${BUILD_VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>\n${BUILD_FRAGMENT_HEAD}`,
    );

    if (kind === 'solid') {
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float hpH = hpHeight();
          float hpF = hpFill(hpH);
          float hpB = hpBand(hpH);
          diffuseColor.rgb = mix(uGlass, uReal, hpF);
          diffuseColor.a = max(mix(uGlassAlpha, 1.0, hpF), hpB * 0.55);`,
        )
        // Glass is uniformly matte; the authored surface only applies where the
        // material has actually landed, or the sheen arrives before the stone.
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
          roughnessFactor = mix(0.95, uRealRough, hpF);`,
        )
        .replace(
          '#include <metalnessmap_fragment>',
          `#include <metalnessmap_fragment>
          metalnessFactor = mix(0.0, uRealMetal, hpF);`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          totalEmissiveRadiance += uEdge * (hpB * 1.6 + uFlash * 0.7);`,
        );
    } else if (kind === 'line') {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float hpH = hpHeight();
        float hpF = hpFill(hpH);
        float hpB = max(hpBand(hpH), uFlash * 0.6);
        diffuseColor.rgb = mix(diffuseColor.rgb, uEdge, hpB * 0.85);
        diffuseColor.a = max(diffuseColor.a * (1.0 - hpF * 0.92), hpB * 0.75);`,
      );
    } else {
      // The halo blends additively, so brightening it is what turned the pour
      // into a white fog: every overlapping piece added its glow to the last.
      // It only ever recedes as the surface arrives.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float hpH = hpHeight();
        diffuseColor.a *= 1.0 - hpFill(hpH);`,
      );
    }
  };
  material.customProgramCacheKey = () => `hp-build-${kind}`;
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

/**
 * Line overlays are drawing, not targets. They are added outside the React tree,
 * so leaving them raycastable makes the renderer look for state it never created
 * and throw on every pointer move.
 */
const noRaycast = (line: THREE.Object3D) => {
  line.raycast = () => {};
};

function toneFor(materialName: string): [string, number] {
  const match = EDGE_TONES.find(([pattern]) => pattern.test(materialName));
  return match ? [match[1], match[2]] : ['#9aa3a0', 0.45];
}

export type LuminousParts = {
  /** Line overlays, so they can fade in with the rise. */
  lines: THREE.LineSegments[];
  /** Glass materials, so each piece can thicken as it settles into place. */
  glass: THREE.MeshStandardMaterial[];
};

/**
 * @param root the Citadel group
 * @param threshold edge angle in degrees; lower catches more of the form
 */
const authored = (object: THREE.Object3D) => object.name.replace(/_/g, ' ');

export function makeLuminous(root: THREE.Object3D, threshold = 32): LuminousParts {
  const lines: THREE.LineSegments[] = [];
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
      color: emissive ? source.color.clone() : GLASS_COLOR,
      roughness: 0.95,
      metalness: 0,
      emissive: emissive ? source.emissive.clone() : new THREE.Color('#000000'),
      emissiveIntensity: emissive ? 2.6 : 0,
      transparent: !emissive,
      opacity: emissive ? 1 : GLASS_OPACITY,
      // Without this the pieces fight each other for depth and flicker as the
      // camera moves; the edges carry the form anyway.
      depthWrite: emissive,
      side: THREE.DoubleSide,
      clippingPlanes: [GROUND_CLIP],
    });
    solid.name = name;
    object.material = solid;

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
        uWide: { value: THREE.MathUtils.clamp(0.6 / span, 0.05, 0.55) },
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
      };
      attachBuild(solid, build, 'solid');
      object.userData.build = build;
      object.userData.glass = solid;
      glass.push(solid);
    }
    object.castShadow = false;
    object.receiveShadow = false;

    // One outline per piece, deliberately not merged.
    //
    // Merging edges per tone was cheaper by roughly nine hundred draw calls, but it
    // destroyed the effect: hundreds of separately outlined pieces read as stacked
    // translucent plates, while a handful of large merged line meshes read as one
    // pale mass. The look is the product here, so the pieces keep their own edges.
    const [tone, baseOpacity] = toneFor(name);
    // Repeated small parts step back; they are texture, not structure.
    const minor = MINOR_PIECE.test(authored(object));
    const opacity = minor ? baseOpacity * MINOR_WEIGHT : baseOpacity;
    // A wider angle drops the near coplanar edges that faceted surfaces produce
    // in quantity and that carry no information about the form.
    const geometry = new THREE.EdgesGeometry(object.geometry, minor ? 46 : threshold);

    const core = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(tone),
        transparent: true,
        opacity,
        depthWrite: false,
        toneMapped: false,
        clippingPlanes: [GROUND_CLIP],
      }),
    );
    core.name = `${object.name} edges`;
    if (build) attachBuild(core.material as THREE.Material, build, 'line');
    core.renderOrder = 3;
    noRaycast(core);
    object.add(core);
    lines.push(core);

    // Only structure gets a halo, and it now respects depth. Drawing every edge
    // through every solid is what made the whole thing read as a tangle.
    if (!minor) {
      const halo = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({
          color: new THREE.Color(tone),
          transparent: true,
          opacity: opacity * 0.3,
          depthWrite: false,
          toneMapped: false,
          blending: THREE.AdditiveBlending,
          clippingPlanes: [GROUND_CLIP],
        }),
      );
      halo.name = `${object.name} halo`;
      if (build) attachBuild(halo.material as THREE.Material, build, 'halo');
      halo.renderOrder = 2;
      noRaycast(halo);
      halo.scale.setScalar(1.006);
      object.add(halo);
      lines.push(halo);
    }
  });

  return { lines, glass };
}

/** Scatter keeps silhouette only: 260 outlined pines is noise, not drawing. */
export function makeSilhouette(root: THREE.Object3D, color = '#0b1210') {
  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.material = material;
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });
}
