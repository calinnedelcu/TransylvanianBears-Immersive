import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';

type ThresholdTitleProps = {
  progressRef: MutableRefObject<number>;
};

function makeTitleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = 'center';
  context.fillStyle = '#d7b468';
  context.font = '600 78px Cinzel, serif';
  context.fillText('TRANSYLVANIAN', 1024, 140);
  context.fillStyle = '#fff6e6';
  context.font = '600 280px Cinzel, serif';
  context.fillText('BEARS', 1024, 400);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function ThresholdTitle({ progressRef }: ThresholdTitleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const compact = useThree((state) => state.size.width <= 820);
  const texture = useMemo(makeTitleTexture, []);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    const group = groupRef.current;
    const material = materialRef.current;
    if (!group || !material) return;
    const leave = THREE.MathUtils.smoothstep(progressRef.current, 0.038, 0.07);
    const visible = 1 - leave;
    group.visible = visible > 0.02;
    material.opacity = visible;
  });

  return (
    <group
      ref={groupRef}
      position={compact ? [0, 8.55, 16.96] : [0, 7.92, 16.98]}
      rotation={[0, 0, 0]}
    >
      <mesh>
        <planeGeometry args={compact ? [4.6, 1.05] : [5.4, 1.22]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <pointLight position={[0, 0.1, 1.1]} color="#f0c57a" intensity={5.2} distance={6} decay={2} />
    </group>
  );
}
