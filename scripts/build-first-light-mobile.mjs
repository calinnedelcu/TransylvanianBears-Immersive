import { createHash } from 'node:crypto';
import { readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  dequantize,
  flatten,
  inspect,
  join,
  meshopt,
  prune,
  simplify,
  textureCompress,
  uninstance,
  weld,
} from '@gltf-transform/functions';
import validator from 'gltf-validator';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'public/assets/world/first-light-citadel.glb');
const VARIANT = process.argv[2] ?? 'mobile';
if (VARIANT !== 'mobile' && VARIANT !== 'desktop') {
  throw new Error(`Unknown First Light runtime variant: ${VARIANT}`);
}
const OUTPUT = path.join(ROOT, `public/assets/world/first-light-citadel.${VARIANT}.glb`);
const TEMP_OUTPUT = `${OUTPUT}.tmp-${process.pid}.glb`;

const MOBILE_MAX_TRANSFER_BYTES = Math.floor(1.02 * 1024 * 1024);
const MOBILE_MAX_PRIMITIVES = 10;
const MOBILE_MAX_DRAW_CALLS = 10;
const MOBILE_MAX_TRIANGLES = 65_000;
const MOBILE_MAX_BOUNDS_DRIFT = 0.01;
const DESKTOP_MAX_TRANSFER_BYTES = Math.floor(2.4 * 1024 * 1024);
const DESKTOP_MAX_PRIMITIVES = 20;
const DESKTOP_MAX_DRAW_CALLS = 20;
const DESKTOP_MAX_BOUNDS_DRIFT = 0.012;
const REJECTED_OPENING_GEOMETRY = /\bbear\b|\bcrest\b|\bemblem\b|\bherald(?:ic|ry)?\b|\bbat[\s_-]+flight\b|\bfar[\s_-]+carpathians?\b|\bnear[\s_-]+ridge\b/i;
const REJECTED_IDENTITY_METADATA = new Set([
  'ANC_Threshold_BearCrest',
  'bearCrestSemanticId',
]);

// Allow Meshopt to discard tiny disconnected detail islands; bounds checks below protect the silhouette.
const MOBILE_SIMPLIFIER = {
  ready: MeshoptSimplifier.ready,
  simplify(indices, positions, stride, targetCount, targetError, flags = []) {
    MeshoptSimplifier.useExperimentalFeatures = true;
    return MeshoptSimplifier.simplify(
      indices,
      positions,
      stride,
      targetCount,
      targetError,
      [...new Set([...flags, 'Prune'])],
    );
  },
};

const MATERIAL_SPECS = {
  stone: {
    name: 'Limestone mobile',
    color: '#817c6d',
    roughness: 0.88,
    metallic: 0,
  },
  timber: {
    name: 'Blackened timber',
    color: '#20211d',
    roughness: 0.76,
    metallic: 0.03,
  },
  brass: {
    name: 'Oxidized brass',
    color: '#81724e',
    roughness: 0.4,
    metallic: 0.72,
  },
  earth: {
    name: 'Night earth',
    color: '#242823',
    roughness: 0.96,
    metallic: 0,
  },
  country: {
    name: 'Country soil',
    color: '#243028',
    roughness: 0.98,
    metallic: 0,
  },
  pine: {
    name: 'Country pine',
    color: '#050806',
    roughness: 0.98,
    metallic: 0,
  },
  mountainFar: {
    name: 'Mountain far',
    color: '#0d1216',
    roughness: 1,
    metallic: 0,
  },
  mountainNear: {
    name: 'Mountain near',
    color: '#111816',
    roughness: 1,
    metallic: 0,
  },
  occupiedLight: {
    name: 'Occupied light',
    color: '#d6b56d',
    roughness: 0.32,
    metallic: 0,
    emissive: '#e5bd6f',
  },
  signal: {
    name: 'Signal anchor',
    color: '#67d8d2',
    roughness: 0.24,
    metallic: 0.15,
    emissive: '#69e1dc',
  },
};

function hexFactor(hex, alpha = false) {
  const value = hex.slice(1);
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
  return alpha ? [...channels, 1] : channels;
}

function createMobileMaterials(document) {
  return Object.fromEntries(Object.entries(MATERIAL_SPECS).map(([key, spec]) => {
    const material = document
      .createMaterial(spec.name)
      .setBaseColorFactor(hexFactor(spec.color, true))
      .setRoughnessFactor(spec.roughness)
      .setMetallicFactor(spec.metallic)
      .setDoubleSided(false);
    if (spec.emissive) material.setEmissiveFactor(hexFactor(spec.emissive));
    return [key, material];
  }));
}

function selectMobileMaterial(materialName, materials) {
  if (materialName === 'Occupied light') return materials.occupiedLight;
  if (materialName === 'Signal anchor') return materials.signal;
  if (materialName === 'Mountain far') return materials.mountainFar;
  if (materialName === 'Mountain near') return materials.mountainNear;
  if (materialName === 'Night earth') return materials.earth;
  if (materialName === 'Country soil') return materials.country;
  if (/Country pine|Country canopy/.test(materialName)) return materials.pine;
  if (/Oxidized brass|Polished brass edge/.test(materialName)) return materials.brass;
  if (/Blackened timber|Charcoal roof|Aged iron/.test(materialName)) return materials.timber;
  return materials.stone;
}

function excludeRejectedOpeningGeometry(document) {
  for (const node of document.getRoot().listNodes()) {
    if (REJECTED_OPENING_GEOMETRY.test(node.getName())) {
      node.dispose();
      continue;
    }

    const extras = node.getExtras();
    const filteredExtras = Object.fromEntries(
      Object.entries(extras).filter(([key]) => !REJECTED_IDENTITY_METADATA.has(key)),
    );
    if (Object.keys(filteredExtras).length !== Object.keys(extras).length) {
      node.setExtras(filteredExtras);
    }
  }
}

function prepareMobileDocument(document) {
  const root = document.getRoot();
  const materials = createMobileMaterials(document);

  for (const mesh of root.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const sourceMaterialName = primitive.getMaterial()?.getName() ?? '';
      primitive.setMaterial(selectMobileMaterial(sourceMaterialName, materials));
      for (const semantic of primitive.listSemantics()) {
        if (semantic !== 'POSITION' && semantic !== 'NORMAL') {
          primitive.setAttribute(semantic, null);
        }
      }
    }
  }

  document.disposeExtension('KHR_materials_emissive_strength');
}

function prepareDesktopDocument(document) {
  // A uniform attribute layout allows one joined primitive per material.
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      primitive.setAttribute('TANGENT', null);
    }
  }
}

function textureSignature(json, textureIndex) {
  if (textureIndex === undefined) return null;
  const texture = json.textures?.[textureIndex];
  const sourceIndex = texture?.source
    ?? texture?.extensions?.KHR_texture_basisu?.source
    ?? texture?.extensions?.EXT_texture_webp?.source
    ?? texture?.extensions?.EXT_texture_avif?.source;
  const image = sourceIndex === undefined ? undefined : json.images?.[sourceIndex];
  return texture?.name ?? image?.name ?? image?.uri ?? `texture:${textureIndex}`;
}

function textureInfoSignature(json, textureInfo) {
  if (!textureInfo) return null;
  return {
    texture: textureSignature(json, textureInfo.index),
    texCoord: textureInfo.texCoord ?? 0,
    transform: textureInfo.extensions?.KHR_texture_transform ?? null,
  };
}

function materialSignatures(json) {
  return (json.materials ?? []).map((material) => {
    const pbr = material.pbrMetallicRoughness ?? {};
    return {
      name: material.name ?? '',
      baseColorFactor: pbr.baseColorFactor ?? [1, 1, 1, 1],
      metallicFactor: pbr.metallicFactor ?? 1,
      roughnessFactor: pbr.roughnessFactor ?? 1,
      emissiveFactor: material.emissiveFactor ?? [0, 0, 0],
      emissiveStrength: material.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? 1,
      alphaMode: material.alphaMode ?? 'OPAQUE',
      alphaCutoff: material.alphaCutoff ?? 0.5,
      doubleSided: material.doubleSided ?? false,
      baseColorTexture: textureInfoSignature(json, pbr.baseColorTexture),
      metallicRoughnessTexture: textureInfoSignature(json, pbr.metallicRoughnessTexture),
      normalTexture: textureInfoSignature(json, material.normalTexture),
      normalScale: material.normalTexture?.scale ?? 1,
      occlusionTexture: textureInfoSignature(json, material.occlusionTexture),
      occlusionStrength: material.occlusionTexture?.strength ?? 1,
      emissiveTexture: textureInfoSignature(json, material.emissiveTexture),
    };
  }).sort((left, right) => left.name.localeCompare(right.name));
}

function readGlbChunks(bytes) {
  const buffer = Buffer.from(bytes);
  if (buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error('Expected a binary glTF asset.');
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim());
  const binaryHeaderOffset = 20 + jsonLength;
  const binaryLength = buffer.readUInt32LE(binaryHeaderOffset);
  const binary = buffer.subarray(binaryHeaderOffset + 8, binaryHeaderOffset + 8 + binaryLength);
  return { buffer, json, binary };
}

async function imagePixelSignatures(bytes) {
  const { json, binary } = readGlbChunks(bytes);
  const signatures = [];

  for (const [index, image] of (json.images ?? []).entries()) {
    const bufferView = json.bufferViews?.[image.bufferView];
    if (!bufferView || bufferView.buffer !== 0) {
      throw new Error(`PBR image ${image.name ?? index} is not embedded in the GLB buffer.`);
    }
    const byteOffset = bufferView.byteOffset ?? 0;
    const encoded = binary.subarray(byteOffset, byteOffset + bufferView.byteLength);
    const { data, info } = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    signatures.push({
      name: image.name ?? `image:${index}`,
      width: info.width,
      height: info.height,
      channels: info.channels,
      hash: createHash('sha256').update(data).digest('hex'),
    });
  }

  return signatures.sort((left, right) => left.name.localeCompare(right.name));
}

function readGlbMetrics(bytes) {
  const { buffer, json } = readGlbChunks(bytes);
  const reachableNodes = new Set();
  const pendingNodes = (json.scenes ?? []).flatMap((scene) => scene.nodes ?? []);

  while (pendingNodes.length > 0) {
    const nodeIndex = pendingNodes.pop();
    if (reachableNodes.has(nodeIndex)) continue;
    reachableNodes.add(nodeIndex);
    pendingNodes.push(...(json.nodes?.[nodeIndex]?.children ?? []));
  }

  let drawCalls = 0;
  let triangles = 0;
  for (const nodeIndex of reachableNodes) {
    const node = json.nodes[nodeIndex];
    if (node.mesh === undefined) continue;
    const mesh = json.meshes[node.mesh];
    const instanceAttributes = node.extensions?.EXT_mesh_gpu_instancing?.attributes;
    const instanceAccessor = instanceAttributes ? Object.values(instanceAttributes)[0] : undefined;
    const instanceCount = instanceAccessor === undefined ? 1 : json.accessors[instanceAccessor].count;
    drawCalls += mesh.primitives.length;
    for (const primitive of mesh.primitives) {
      if ((primitive.mode ?? 4) !== 4) throw new Error('First Light mobile expects triangle primitives only.');
      const elementCount = primitive.indices === undefined
        ? json.accessors[primitive.attributes.POSITION].count
        : json.accessors[primitive.indices].count;
      triangles += (elementCount / 3) * instanceCount;
    }
  }

  return {
    bytes: buffer.byteLength,
    nodes: reachableNodes.size,
    meshes: json.meshes?.length ?? 0,
    materials: json.materials?.length ?? 0,
    textures: json.textures?.length ?? 0,
    images: json.images?.length ?? 0,
    primitives: (json.meshes ?? []).reduce((total, mesh) => total + mesh.primitives.length, 0),
    drawCalls,
    triangles,
    materialSignatures: materialSignatures(json),
    textureSignatures: (json.textures ?? []).map((_, index) => textureSignature(json, index)).sort(),
  };
}

function assertBoundsPreserved(sourceBounds, outputBounds, maximumAllowedDrift) {
  const sourceSize = sourceBounds.bboxMax.map((value, axis) => value - sourceBounds.bboxMin[axis]);
  const referenceSize = Math.max(...sourceSize);
  let maximumDrift = 0;

  for (let axis = 0; axis < 3; axis += 1) {
    maximumDrift = Math.max(
      maximumDrift,
      Math.abs(outputBounds.bboxMin[axis] - sourceBounds.bboxMin[axis]) / referenceSize,
      Math.abs(outputBounds.bboxMax[axis] - sourceBounds.bboxMax[axis]) / referenceSize,
    );
  }

  if (maximumDrift > maximumAllowedDrift) {
    throw new Error(`Citadel bounds drifted by ${(maximumDrift * 100).toFixed(3)}% (limit: ${(maximumAllowedDrift * 100).toFixed(3)}%).`);
  }
  return maximumDrift;
}

function assertMobileBudgets(sourceMetrics, mobileMetrics) {
  const failures = [];
  if (mobileMetrics.bytes > MOBILE_MAX_TRANSFER_BYTES) failures.push(`${mobileMetrics.bytes} transfer bytes`);
  if (mobileMetrics.primitives > MOBILE_MAX_PRIMITIVES) failures.push(`${mobileMetrics.primitives} primitives`);
  if (mobileMetrics.drawCalls > MOBILE_MAX_DRAW_CALLS) failures.push(`${mobileMetrics.drawCalls} draw calls`);
  if (mobileMetrics.triangles > MOBILE_MAX_TRIANGLES) failures.push(`${mobileMetrics.triangles} triangles`);
  if (mobileMetrics.drawCalls > sourceMetrics.drawCalls * 0.3) failures.push('draw calls were not reduced by at least 70%');
  if (mobileMetrics.triangles > sourceMetrics.triangles * 0.8) failures.push('triangles were not reduced by at least 20%');
  if (mobileMetrics.textures !== 0) failures.push(`${mobileMetrics.textures} textures remain`);
  if (failures.length > 0) throw new Error(`Mobile First Light budget failed: ${failures.join(', ')}.`);
}

function assertDesktopBudgets(sourceMetrics, desktopMetrics) {
  const failures = [];
  if (desktopMetrics.bytes > DESKTOP_MAX_TRANSFER_BYTES) failures.push(`${desktopMetrics.bytes} transfer bytes`);
  if (desktopMetrics.primitives > DESKTOP_MAX_PRIMITIVES) failures.push(`${desktopMetrics.primitives} primitives`);
  if (desktopMetrics.drawCalls > DESKTOP_MAX_DRAW_CALLS) failures.push(`${desktopMetrics.drawCalls} draw calls`);
  if (desktopMetrics.triangles !== sourceMetrics.triangles) failures.push(`${desktopMetrics.triangles} triangles instead of ${sourceMetrics.triangles}`);
  if (desktopMetrics.materials !== sourceMetrics.materials) failures.push(`${desktopMetrics.materials} materials instead of ${sourceMetrics.materials}`);
  if (desktopMetrics.textures !== sourceMetrics.textures) failures.push(`${desktopMetrics.textures} textures instead of ${sourceMetrics.textures}`);
  if (desktopMetrics.images !== sourceMetrics.images) failures.push(`${desktopMetrics.images} images instead of ${sourceMetrics.images}`);
  if (JSON.stringify(desktopMetrics.materialSignatures) !== JSON.stringify(sourceMetrics.materialSignatures)) {
    failures.push('PBR material bindings or factors changed');
  }
  if (JSON.stringify(desktopMetrics.textureSignatures) !== JSON.stringify(sourceMetrics.textureSignatures)) {
    failures.push('PBR texture set changed');
  }
  if (failures.length > 0) throw new Error(`Desktop First Light budget failed: ${failures.join(', ')}.`);
}

function percentReduction(source, output) {
  return `${((1 - output / source) * 100).toFixed(1)}%`;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

async function main() {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder,
    });

  const sourceBytes = await readFile(SOURCE);
  const sourceMetrics = readGlbMetrics(sourceBytes);
  const document = await io.read(SOURCE);
  excludeRejectedOpeningGeometry(document);
  const sourceBounds = inspect(document).scenes.properties[0];
  if (!sourceBounds) throw new Error('First Light source has no scene.');
  let boundsReference = sourceBounds;

  if (VARIANT === 'mobile') {
    prepareMobileDocument(document);
    await document.transform(
      dequantize(),
      prune(),
      uninstance(),
      flatten(),
      join({ keepMeshes: false, keepNamed: false }),
      weld(),
      simplify({ simplifier: MOBILE_SIMPLIFIER, ratio: 0.4, error: 0.018 }),
      dedup(),
      prune(),
      meshopt({
        encoder: MeshoptEncoder,
        level: 'high',
        quantizationVolume: 'scene',
        quantizePosition: 14,
        quantizeNormal: 8,
      }),
    );
  } else {
    prepareDesktopDocument(document);
    await document.transform(
      dequantize(),
      uninstance(),
      flatten(),
    );
    boundsReference = inspect(document).scenes.properties[0];
    if (!boundsReference) throw new Error('First Light desktop reference has no scene.');
    await document.transform(
      join({ keepMeshes: false, keepNamed: false }),
      weld(),
      prune({ keepAttributes: true, keepSolidTextures: true }),
      textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        effort: 100,
        lossless: true,
        slots: /^(baseColorTexture|metallicRoughnessTexture|normalTexture|occlusionTexture|emissiveTexture)$/,
      }),
      meshopt({
        encoder: MeshoptEncoder,
        level: 'high',
        quantizationVolume: 'scene',
        quantizePosition: 14,
        quantizeNormal: 7,
        quantizeTexcoord: 10,
      }),
    );
  }

  try {
    await io.write(TEMP_OUTPUT, document);
    const outputBytes = await readFile(TEMP_OUTPUT);
    const outputMetrics = readGlbMetrics(outputBytes);
    const outputDocument = await io.read(TEMP_OUTPUT);
    const outputBounds = inspect(outputDocument).scenes.properties[0];
    if (!outputBounds) throw new Error(`First Light ${VARIANT} output has no scene.`);
    const boundsDrift = assertBoundsPreserved(
      boundsReference,
      outputBounds,
      VARIANT === 'mobile' ? MOBILE_MAX_BOUNDS_DRIFT : DESKTOP_MAX_BOUNDS_DRIFT,
    );
    let matchingPbrImages = null;
    if (VARIANT === 'mobile') {
      assertMobileBudgets(sourceMetrics, outputMetrics);
    } else {
      assertDesktopBudgets(sourceMetrics, outputMetrics);
      const [sourcePixels, outputPixels] = await Promise.all([
        imagePixelSignatures(sourceBytes),
        imagePixelSignatures(outputBytes),
      ]);
      if (JSON.stringify(sourcePixels) !== JSON.stringify(outputPixels)) {
        throw new Error('Desktop First Light PBR texture pixels changed.');
      }
      matchingPbrImages = outputPixels.length;
    }

    const validation = await validator.validateBytes(new Uint8Array(outputBytes), {
      uri: path.basename(OUTPUT),
      format: 'glb',
      maxIssues: 100,
      writeTimestamp: false,
    });
    if (validation.issues.numErrors > 0) {
      const details = validation.issues.messages
        .filter((issue) => issue.severity === 0)
        .map((issue) => issue.code)
        .join(', ');
      throw new Error(`glTF validation failed with ${validation.issues.numErrors} errors: ${details}`);
    }

    await rename(TEMP_OUTPUT, OUTPUT);

    console.log(`First Light ${VARIANT} GLB`);
    console.log(`  source: ${formatBytes(sourceMetrics.bytes)} | ${sourceMetrics.primitives} primitives | ${sourceMetrics.drawCalls} draw calls | ${sourceMetrics.triangles.toLocaleString('en-US')} triangles`);
    console.log(`  ${VARIANT}: ${formatBytes(outputMetrics.bytes)} | ${outputMetrics.primitives} primitives | ${outputMetrics.drawCalls} draw calls | ${outputMetrics.triangles.toLocaleString('en-US')} triangles`);
    console.log(`  reduction: ${percentReduction(sourceMetrics.bytes, outputMetrics.bytes)} transfer | ${percentReduction(sourceMetrics.drawCalls, outputMetrics.drawCalls)} draw calls | ${percentReduction(sourceMetrics.triangles, outputMetrics.triangles)} triangles`);
    console.log(`  silhouette bounds drift: ${(boundsDrift * 100).toFixed(3)}%`);
    if (matchingPbrImages !== null) console.log(`  PBR textures: ${matchingPbrImages}/${sourceMetrics.images} decoded pixel match`);
    console.log(`  validation: ${validation.issues.numErrors} errors, ${validation.issues.numWarnings} warnings`);
  } finally {
    await rm(TEMP_OUTPUT, { force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
