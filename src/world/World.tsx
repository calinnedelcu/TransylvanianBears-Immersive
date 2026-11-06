import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '../three/shapes';
import { ease, measureStations, type Measured } from './journey';
import { Landscape } from './landscape';
import { seeded, world } from './state';
import { Billboards, Floaters, Medals, Monoliths, Monument, Paw, Standees } from './stations';

/**
 * Moves the camera between the stations of the page as it scrolls: the scroll position
 * is read every frame, so the browser keeps its own scrolling, keyboard and anchors.
 */
function CameraRig() {
  const { camera, scene, size } = useThree();
  const stations = useRef<Measured[]>([]);
  const goal = useMemo(
    () => ({
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
      offset: new THREE.Vector2(),
      sky: new THREE.Color(),
      fov: 40,
    }),
    [],
  );
  const current = useMemo(() => ({ position: new THREE.Vector3(), target: new THREE.Vector3(), offset: new THREE.Vector2(), fov: 40 }), []);
  const started = useRef(false);

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        stations.current = measureStations(aspect);
      });
    };
    measure();
    // Images, fonts and reveals change the page height: measure again whenever it does.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    void document.fonts?.ready.then(measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [size.width, size.height]);

  useEffect(() => {
    scene.fog = new THREE.Fog(world.sky, 50, 240);
    scene.background = world.sky;
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene]);

  useFrame((_, delta) => {
    const list = stations.current;
    if (!list.length) return;
    const y = window.scrollY;
    let k = 0;
    while (k < list.length - 1 && y >= list[k + 1].anchor) k += 1;
    const from = list[k];
    const to = list[Math.min(k + 1, list.length - 1)];
    const span = to.anchor - from.anchor;
    const t = span > 0 ? THREE.MathUtils.clamp((y - from.anchor) / span, 0, 1) : 0;
    const e = ease(t);

    goal.position.lerpVectors(from.keyframe.position, to.keyframe.position, e);
    goal.target.lerpVectors(from.keyframe.target, to.keyframe.target, e);
    goal.offset.lerpVectors(from.keyframe.offset, to.keyframe.offset, e);
    goal.fov = THREE.MathUtils.lerp(from.keyframe.fov, to.keyframe.fov, e);
    // The sky changes colour a little ahead of the camera, so sections never sit on the wrong colour.
    goal.sky.lerpColors(from.keyframe.sky, to.keyframe.sky, THREE.MathUtils.smoothstep(t, 0.2, 0.6));

    // A touch of parallax from the mouse.
    goal.position.x += world.pointer.x * 0.45;
    goal.position.y += world.pointer.y * 0.25;

    const k1 = started.current ? 1 - Math.exp(-delta * 5) : 1;
    started.current = true;
    current.position.lerp(goal.position, k1);
    current.target.lerp(goal.target, k1);
    current.offset.lerp(goal.offset, k1);
    current.fov += (goal.fov - current.fov) * k1;

    const perspective = camera as THREE.PerspectiveCamera;
    perspective.position.copy(current.position);
    perspective.lookAt(current.target);
    perspective.fov = current.fov;
    // Shift the picture so the subject sits beside (or above) the page's card.
    perspective.setViewOffset(
      size.width,
      size.height,
      -current.offset.x * size.width,
      current.offset.y * size.height,
      size.width,
      size.height,
    );
    perspective.updateProjectionMatrix();

    world.sky.lerp(goal.sky, started.current ? 1 - Math.exp(-delta * 6) : 1);
    if (scene.fog) scene.fog.color.copy(world.sky);
  });

  return null;
}

function usePointer() {
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      world.pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);
}

function Scene({ light }: { light: boolean }) {
  const random = useMemo(() => seeded(3), []);
  return (
    <>
      <ambientLight intensity={1.35} />
      <directionalLight position={[-12, 20, 10]} intensity={2.3} />
      <CameraRig />
      <Landscape light={light} />
      <Floaters count={light ? 12 : 22} random={random} />
      <Paw position={[7.5, 7, -6]} scale={1} />
      <Monoliths />
      <Medals />
      <Monument />
      <Suspense fallback={null}>
        <Billboards />
      </Suspense>
      <Suspense fallback={null}>
        <Standees />
      </Suspense>
    </>
  );
}

type WorldProps = {
  /** Called once the first frame is on screen, so the page can turn transparent. */
  onReady: () => void;
};

export default function World({ onReady }: WorldProps) {
  usePointer();
  const light = typeof window !== 'undefined' && (window.innerWidth < 760 || navigator.hardwareConcurrency <= 4);

  useEffect(() => {
    world.sky.set(PALETTE.gold);
  }, []);

  return (
    <Canvas
      className="world"
      aria-hidden="true"
      flat
      dpr={[1, light ? 1.5 : 1.75]}
      camera={{ fov: 40, near: 0.1, far: 420, position: [0, 3.4, 16] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={() => requestAnimationFrame(() => requestAnimationFrame(onReady))}
    >
      <Scene light={light} />
    </Canvas>
  );
}
