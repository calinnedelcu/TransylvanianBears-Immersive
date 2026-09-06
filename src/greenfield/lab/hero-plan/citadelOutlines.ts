import * as THREE from 'three';
import type { BuildUniforms } from './luminousCitadel';

export type OutlinePiece = {
  object: THREE.Mesh;
  geometry: THREE.EdgesGeometry;
  color: THREE.Color;
  opacity: number;
  build: BuildUniforms | null;
};

/** One draw per construction stage, with an independent transform and fill per piece. */
export function createCitadelOutlines(root: THREE.Object3D, pieces: OutlinePiece[]) {
  const rows = Math.max(1, pieces.length);
  const data = new Float32Array(rows * 32);
  const texture = new THREE.DataTexture(data, 8, rows, THREE.RGBAFormat, THREE.FloatType);
  texture.needsUpdate = true;
  const positions: number[] = [];
  const colors: number[] = [];
  const ids: number[] = [];

  pieces.forEach((piece, id) => {
    const attribute = piece.geometry.getAttribute('position');
    for (let i = 0; i < attribute.count; i += 1) {
      positions.push(attribute.getX(i), attribute.getY(i), attribute.getZ(i));
      colors.push(piece.color.r, piece.color.g, piece.color.b);
      ids.push(id);
    }
    piece.geometry.dispose();
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aPiece', new THREE.Float32BufferAttribute(ids, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uPieces: { value: texture }, uRows: { value: rows } },
    vertexShader: `
      uniform sampler2D uPieces;
      uniform float uRows;
      attribute float aPiece;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vHeight;
      varying float vWorldY;
      varying vec4 vFill;
      varying vec4 vStyle;

      vec4 piece(float column) {
        return texture2D(uPieces, vec2((column + 0.5) / 8.0, (aPiece + 0.5) / uRows));
      }
      void main() {
        mat4 transform = mat4(piece(0.0), piece(1.0), piece(2.0), piece(3.0));
        vec4 world = modelMatrix * transform * vec4(position, 1.0);
        vec4 bounds = piece(4.0);
        vHeight = clamp((world.y - bounds.x) / max(0.0001, bounds.y - bounds.x), 0.0, 1.0);
        vWorldY = world.y;
        vFill = vec4(bounds.zw, piece(5.0).xy);
        vStyle = piece(6.0);
        vColor = color;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vHeight;
      varying float vWorldY;
      varying vec4 vFill;
      varying vec4 vStyle;
      void main() {
        if (vWorldY < 0.0) discard;
        float built = vFill.x;
        float fill = built >= 1.0 ? 1.0 : built <= 0.0 ? 0.0
          : 1.0 - smoothstep(built - vFill.y, built + vFill.y, vHeight);
        float band = built <= 0.0 || built >= 1.0 ? 0.0
          : (1.0 - smoothstep(0.0, vFill.z, abs(vHeight - built))) * vFill.w;
        float alpha = max(vStyle.x * (1.0 - fill), band * 0.5) * vStyle.y;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(vColor * (1.0 + band * 0.4), alpha);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'Construction outlines';
  // Bounds change as individual walls rise. The parent stage controls visibility.
  lines.frustumCulled = false;
  lines.renderOrder = 3;
  lines.raycast = () => {};
  root.add(lines);

  const inverse = new THREE.Matrix4();
  const matrix = new THREE.Matrix4();
  const update = () => {
    root.updateWorldMatrix(true, true);
    inverse.copy(root.matrixWorld).invert();
    let visible = false;
    pieces.forEach(({ object, build, opacity }, index) => {
      const offset = index * 32;
      matrix.multiplyMatrices(inverse, object.matrixWorld).toArray(data, offset);
      const built = build?.uBuild.value ?? ((object.material as THREE.Material).transparent ? 0 : 1);
      const active = object.visible && built < 0.999;
      data[offset + 16] = build?.uLow.value ?? 0;
      data[offset + 17] = build?.uHigh.value ?? 1;
      data[offset + 18] = built;
      data[offset + 19] = build?.uSoft.value ?? 0.02;
      data[offset + 20] = build?.uWide.value ?? 0.05;
      data[offset + 21] = build?.uBand.value ?? 0;
      data[offset + 24] = opacity;
      data[offset + 25] = active ? 1 : 0;
      visible ||= active;
    });
    lines.visible = visible;
    if (visible) texture.needsUpdate = true;
  };

  update();
  return {
    update,
    dispose() {
      root.remove(lines);
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
