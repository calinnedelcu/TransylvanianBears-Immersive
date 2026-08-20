import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import CITADEL from '../../../../shared/citadel.json';

/**
 * The signal route, kept alive in the world.
 *
 * The drawing had a route and then dropped it, which left the interaction with
 * nothing to connect a choice to its system. Here the arc survives into the world
 * as a dim trace, and choosing a system runs light along it from the gate to that
 * node. It is the same line the plan drew, doing the job it was drawn for.
 */

const ROUTE = CITADEL.route;
const SPAN = ROUTE.endDeg - ROUTE.startDeg;
const STEPS = 220;

/** Where each system sits along the arc, 0 at the gate. */
export const NODE_REACH = new Map(
  CITADEL.nodes.map((node) => [node.id, (node.deg - ROUTE.startDeg) / SPAN]),
);

const VERT = `
  attribute float aT;
  varying float vT;
  void main() {
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = `
  uniform float uReach;
  uniform float uReveal;
  uniform vec3 uColor;
  varying float vT;

  void main() {
    // Everything behind the head stays lit; the head itself burns brighter.
    float trail = step(vT, uReach);
    float head = smoothstep(0.045, 0.0, abs(vT - uReach)) * step(0.001, uReach);
    float base = 0.16;
    float intensity = base + trail * 0.5 + head * 1.6;
    gl_FragColor = vec4(uColor * intensity, (base + trail * 0.55 + head) * uReveal);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

type SignalRouteProps = {
  progressRef: MutableRefObject<number>;
  activeSlug: string | null;
  showFrom: number;
};

export function SignalRoute({ progressRef, activeSlug, showFrom }: SignalRouteProps) {
  const reachRef = useRef(0);

  const geometry = useMemo(() => {
    const positions = new Float32Array((STEPS + 1) * 3);
    const ts = new Float32Array(STEPS + 1);
    for (let i = 0; i <= STEPS; i += 1) {
      const t = i / STEPS;
      const a = ((ROUTE.startDeg + SPAN * t) * Math.PI) / 180;
      positions[i * 3] = Math.cos(a) * ROUTE.radius;
      positions[i * 3 + 1] = 0.09;
      positions[i * 3 + 2] = Math.sin(a) * ROUTE.radius;
      ts[i] = t;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(ts, 1));
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uReach: { value: 0 },
      uReveal: { value: 0 },
      uColor: { value: new THREE.Color('#7fe3e0') },
    }),
    [],
  );

  useFrame(() => {
    const p = progressRef.current;
    uniforms.uReveal.value = Math.max(0, Math.min(1, (p - showFrom) / 0.14));
    const target = activeSlug ? NODE_REACH.get(activeSlug) ?? 0 : 0;
    // Ease so the light travels the arc rather than jumping to the answer.
    reachRef.current += (target - reachRef.current) * 0.06;
    uniforms.uReach.value = reachRef.current;
  });

  // Built as a plain Three object rather than the <line> intrinsic: that tag
  // collides with the SVG element of the same name, which breaks typing and makes
  // the reconciler reach for state it never created.
  const line = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const object = new THREE.Line(geometry, material);
    object.frustumCulled = false;
    object.renderOrder = 4;
    object.raycast = () => {};
    return object;
  }, [geometry, uniforms]);

  return <primitive object={line} />;
}
