import * as THREE from 'three';

/** The site palette (see styles/tokens.css), for use inside WebGL. */
export const PALETTE = {
  ink: '#140b0d',
  bone: '#f5eedf',
  gold: '#ffc531',
  blood: '#d4202f',
  wine: '#5e1224',
  cobalt: '#3050ff',
  mint: '#7fe3ab',
  sky: '#9ec9ff',
  coral: '#ff6b5e',
  lilac: '#c9b3ff',
} as const;

let toonRamp: THREE.DataTexture | undefined;

/** A three-step light ramp: flat comic-book shading instead of smooth gradients. */
export function getToonRamp() {
  if (toonRamp) return toonRamp;
  const steps = new Uint8Array([90, 90, 90, 255, 178, 178, 178, 255, 255, 255, 255, 255]);
  toonRamp = new THREE.DataTexture(steps, 3, 1, THREE.RGBAFormat);
  toonRamp.minFilter = THREE.NearestFilter;
  toonRamp.magFilter = THREE.NearestFilter;
  toonRamp.generateMipmaps = false;
  toonRamp.needsUpdate = true;
  return toonRamp;
}

/**
 * The bear-paw emblem from components/PawMark.tsx, traced into three.js shapes.
 * SVG space is 64×64 with y pointing down; here it is centred and y points up.
 */
function pawShapes() {
  const S = 1 / 16;
  const X = (x: number) => (x - 32) * S;
  const Y = (y: number) => -(y - 36) * S;

  const toe = (cx: number, cy: number, rx: number, ry: number, deg: number) => {
    const shape = new THREE.Shape();
    shape.absellipse(X(cx), Y(cy), rx * S, ry * S, 0, Math.PI * 2, false, (-deg * Math.PI) / 180);
    return shape;
  };

  const pad = new THREE.Shape();
  pad.moveTo(X(32), Y(30));
  pad.bezierCurveTo(X(22.8), Y(30), X(15), Y(38), X(15), Y(46));
  pad.bezierCurveTo(X(15), Y(52.2), X(19.7), Y(55.2), X(25.2), Y(55.2));
  pad.bezierCurveTo(X(27.8), Y(55.2), X(29.7), Y(54), X(32), Y(54));
  pad.bezierCurveTo(X(34.3), Y(54), X(36.2), Y(55.2), X(38.8), Y(55.2));
  pad.bezierCurveTo(X(44.3), Y(55.2), X(49), Y(52.2), X(49), Y(46));
  pad.bezierCurveTo(X(49), Y(38), X(41.2), Y(30), X(32), Y(30));

  return [
    toe(13.5, 28, 5.6, 7.6, -24),
    toe(25.5, 15.5, 5.8, 8.3, -8),
    toe(38.5, 15.5, 5.8, 8.3, 8),
    toe(50.5, 28, 5.6, 7.6, 24),
    pad,
  ];
}

let pawGeometry: THREE.ExtrudeGeometry | undefined;

/** A chunky, bevelled 3D paw about four units across. */
export function getPawGeometry() {
  if (pawGeometry) return pawGeometry;
  pawGeometry = new THREE.ExtrudeGeometry(pawShapes(), {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.09,
    bevelSegments: 5,
    curveSegments: 36,
  });
  pawGeometry.center();
  pawGeometry.computeVertexNormals();
  return pawGeometry;
}

/**
 * A rounded rectangle whose UVs run 0…1 across its bounds, so an image texture
 * can be laid over it (ShapeGeometry's own UVs are in shape units).
 */
export function roundedRect(width: number, height: number, radius: number, segments = 10) {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);

  const geometry = new THREE.ShapeGeometry(shape, segments);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i += 1) {
    uv.setXY(i, (position.getX(i) + w) / width, (position.getY(i) + h) / height);
  }
  uv.needsUpdate = true;
  return geometry;
}

/** Crops a texture like CSS `object-fit: cover` for a frame of the given aspect ratio. */
export function coverTexture(texture: THREE.Texture, frameAspect: number) {
  const image = texture.image as { width: number; height: number } | undefined;
  if (!image?.width || !image.height) return;
  const imageAspect = image.width / image.height;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  if (imageAspect > frameAspect) {
    const scale = frameAspect / imageAspect;
    texture.repeat.set(scale, 1);
    texture.offset.set((1 - scale) / 2, 0);
  } else {
    const scale = imageAspect / frameAspect;
    texture.repeat.set(1, scale);
    texture.offset.set(0, (1 - scale) / 2);
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
}
