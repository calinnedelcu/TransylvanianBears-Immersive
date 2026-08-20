import { useGLTF, useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { QualityTier } from '../../../experience/quality';
import { BURIED_ACT_MEDIA, BURIED_ACT_MODEL_URL } from './buriedActAssets';

const REQUIRED_NODE_NAMES = [
  'VS08_10_Buried_ROOT',
  'ENV_Buried_SchoolFold',
  'ENV_Buried_Descent',
  'ENV_Buried_LampChamber',
  'ENV_Buried_EvidenceGallery',
  'ENV_Buried_RoyalHall',
  'ENV_Buried_PixelGate',
  'PRP_Buried_LampRig',
  'PRP_Buried_LampIris',
  'PRP_Buried_Mechanism',
  'PRP_Buried_MechanismWheel',
  'PRP_Buried_Counterweight',
  'PRP_Buried_OilReservoir',
  'PRP_Buried_MercuryBasin',
  'PRP_Buried_GuardPair',
  'PRP_Buried_PixelCore',
  'SCR_Buried_Mechanism',
  'SCR_Buried_Guards',
  'SCR_Buried_Mercury',
  'SCR_Buried_RoyalHall',
  'FX_Buried_SchoolResidue',
  'FX_Buried_MercuryChannels',
  'FX_Buried_VapourVolume',
  'FX_Buried_LampCone',
  'FX_Buried_PixelCompression',
  'ANC_Buried_Entry',
  'ANC_Buried_OilFocus',
  'ANC_Buried_MechanismFocus',
  'ANC_Buried_MercuryFocus',
  'ANC_Buried_GuardsEvidence',
  'ANC_Buried_MercuryEvidence',
  'ANC_Buried_RoyalHallEvidence',
  'ANC_Buried_PixelHandoff',
] as const;

type MediaId = (typeof BURIED_ACT_MEDIA)[number]['id'];
type MediaBridgeId = 'mechanism-reprise' | 'royal-hall-preview';

type BuriedActPackageProps = Readonly<{
  localProgressRef: MutableRefObject<number>;
  lampRaised: boolean;
  qualityTier: QualityTier;
  reducedMotion: boolean;
  onPixelHandoffRendered: () => void;
}>;

type MaterialState = Readonly<{
  material: THREE.Material;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  visible: boolean;
}>;

type TransformState = Readonly<{
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}>;

type RuntimePackage = Readonly<{
  scene: THREE.Group;
  modelRoot: THREE.Object3D;
  materialStates: MaterialState[];
  clonedMaterials: THREE.Material[];
  generatedGeometries: THREE.BufferGeometry[];
  mediaMaterials: Record<MediaId, THREE.MeshBasicMaterial>;
  mediaBridgeMaterials: Record<MediaBridgeId, THREE.MeshBasicMaterial>;
  schoolResidueMaterials: THREE.Material[];
  mercuryMaterials: THREE.MeshStandardMaterial[];
  vapourMaterials: Array<THREE.MeshStandardMaterial | THREE.MeshBasicMaterial>;
  lampGlowMaterials: Array<THREE.MeshStandardMaterial | THREE.MeshBasicMaterial>;
  pixelShutterMaterials: Array<THREE.MeshStandardMaterial | THREE.MeshBasicMaterial>;
  pixelIrisMaterials: Array<THREE.MeshStandardMaterial | THREE.MeshBasicMaterial>;
  pixelCoreMaterials: Array<THREE.MeshStandardMaterial | THREE.MeshBasicMaterial>;
  nodes: Readonly<{
    lampRig: THREE.Object3D | null;
    lampFlame: THREE.Object3D | null;
    lampIris: THREE.Object3D | null;
    mechanismWheel: THREE.Object3D | null;
    counterweight: THREE.Object3D | null;
    vapour: THREE.Object3D | null;
    pixelCore: THREE.Object3D | null;
    pixelCompression: THREE.Object3D | null;
    pixelShutters: THREE.Object3D[];
    pixelIris: THREE.Object3D | null;
    livePixel: THREE.Mesh | null;
  }>;
  base: Readonly<{
    root: TransformState;
    lampRig: TransformState | null;
    lampIris: TransformState | null;
    mechanismWheel: TransformState | null;
    counterweight: TransformState | null;
    vapour: TransformState | null;
    pixelCore: TransformState | null;
    pixelCompression: TransformState | null;
    pixelShutters: TransformState[];
    pixelIris: TransformState | null;
  }>;
  requiredNodeCount: number;
  nodeCount: number;
  triangleCount: number;
}>;

const SCREEN_GEOMETRY = new THREE.PlaneGeometry(1, 1);

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return THREE.MathUtils.clamp(value, 0, 1);
}

function range(value: number, start: number, end: number) {
  return THREE.MathUtils.smoothstep(value, start, end);
}

function transformState(object: THREE.Object3D | null): TransformState | null {
  if (!object) return null;
  return {
    position: object.position.clone(),
    rotation: object.rotation.clone(),
    scale: object.scale.clone(),
  };
}

function restoreTransform(object: THREE.Object3D | null, state: TransformState | null) {
  if (!object || !state) return;
  object.position.copy(state.position);
  object.rotation.copy(state.rotation);
  object.scale.copy(state.scale);
}

function cloneMaterials(scene: THREE.Group) {
  const clonedMaterials: THREE.Material[] = [];
  const cache = new Map<string, THREE.Material>();
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const materials = sourceMaterials.map((source) => {
      const cached = cache.get(source.uuid);
      if (cached) return cached;
      const clone = source.clone();
      cache.set(source.uuid, clone);
      clonedMaterials.push(clone);
      return clone;
    });
    child.material = Array.isArray(child.material) ? materials : materials[0];
  });
  return clonedMaterials;
}

function isolateSubtreeMaterials(
  scene: THREE.Group,
  root: THREE.Object3D | null,
  clonedMaterials: THREE.Material[],
) {
  if (!root) return;
  const isolated = new Map<string, THREE.Material>();
  const subtreeMeshes = new Set<THREE.Mesh>();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    subtreeMeshes.add(child);
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const materials = sourceMaterials.map((source) => {
      const cached = isolated.get(source.uuid);
      if (cached) return cached;
      const clone = source.clone();
      isolated.set(source.uuid, clone);
      clonedMaterials.push(clone);
      return clone;
    });
    child.material = Array.isArray(child.material) ? materials : materials[0];
  });

  const isolatedIds = new Set([...isolated.values()].map((material) => material.uuid));
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || subtreeMeshes.has(child)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    if (materials.some((material) => isolatedIds.has(material.uuid))) {
      throw new Error(`Animated material escaped its effect subtree: ${root.name}`);
    }
  });
}

function addProceduralEffects(
  scene: THREE.Group,
  clonedMaterials: THREE.Material[],
  generatedGeometries: THREE.BufferGeometry[],
) {
  const coneAnchor = scene.getObjectByName('FX_Buried_LampCone');
  if (coneAnchor) {
    const authoredRange = Number(coneAnchor.userData.coneRange) || 12;
    const authoredAngle = Number(coneAnchor.userData.coneAngle) || 0.58;
    const visibleRange = Math.min(authoredRange, 6.2);
    const radius = Math.tan(authoredAngle * 0.5) * visibleRange;
    const geometry = new THREE.ConeGeometry(radius, visibleRange, 28, 1, true);
    const material = new THREE.MeshBasicMaterial({
      name: 'FX_Buried_LampCone_Runtime',
      color: '#e5aa5b',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const cone = new THREE.Mesh(geometry, material);
    cone.name = 'FX_Buried_LampCone_Volume';
    cone.position.y = -visibleRange * 0.5;
    cone.renderOrder = 7;
    cone.frustumCulled = false;
    coneAnchor.add(cone);
    generatedGeometries.push(geometry);
    clonedMaterials.push(material);
  }

  const vapourAnchor = scene.getObjectByName('FX_Buried_VapourVolume');
  if (vapourAnchor) {
    const width = Number(vapourAnchor.userData.volumeWidth) || 3.6;
    const height = Number(vapourAnchor.userData.volumeHeight) || 2.3;
    const depth = Number(vapourAnchor.userData.volumeDepth) || 2;
    const geometry = new THREE.SphereGeometry(1, 18, 10);
    const material = new THREE.MeshBasicMaterial({
      name: 'FX_Buried_Vapour_Runtime',
      color: '#9abfba',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const offsets = [
      [-0.22, 0, -0.08, 1],
      [0.24, 0.12, 0.1, 0.72],
      [0, -0.14, 0.2, 0.58],
    ] as const;
    offsets.forEach(([x, y, z, scale], index) => {
      const cloud = new THREE.Mesh(geometry, material);
      cloud.name = `FX_Buried_Vapour_Layer_${index + 1}`;
      cloud.position.set(x * width, y * height, z * depth);
      cloud.scale.set(width * 0.52 * scale, height * 0.5 * scale, depth * 0.55 * scale);
      cloud.renderOrder = 6 + index;
      cloud.frustumCulled = false;
      vapourAnchor.add(cloud);
    });
    generatedGeometries.push(geometry);
    clonedMaterials.push(material);
  }
}

function materialList(
  object: THREE.Object3D | null,
): Array<THREE.MeshStandardMaterial | THREE.MeshBasicMaterial> {
  const result: Array<THREE.MeshStandardMaterial | THREE.MeshBasicMaterial> = [];
  const seen = new Set<string>();
  object?.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const candidates = Array.isArray(child.material) ? child.material : [child.material];
    candidates.forEach((material) => {
      if (
        (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial)
        && !seen.has(material.uuid)
      ) {
        seen.add(material.uuid);
        result.push(material);
      }
    });
  });
  return result;
}

function materialListForObjects(
  objects: Array<THREE.Object3D | null>,
): Array<THREE.MeshStandardMaterial | THREE.MeshBasicMaterial> {
  const seen = new Set<string>();
  return objects.flatMap((object) => materialList(object)).filter((material) => {
    if (seen.has(material.uuid)) return false;
    seen.add(material.uuid);
    return true;
  });
}

function triangleCount(scene: THREE.Object3D) {
  let triangles = 0;
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const count = child.geometry.index?.count
      ?? child.geometry.getAttribute('position')?.count
      ?? 0;
    triangles += count / 3;
  });
  return Math.round(triangles);
}

function makeRuntimePackage(
  sourceScene: THREE.Group,
  textures: THREE.Texture[],
  qualityTier: QualityTier,
  compact: boolean,
  maxAnisotropy: number,
): RuntimePackage {
  const scene = sourceScene.clone(true);
  scene.name = 'Buried act runtime';
  const clonedMaterials = cloneMaterials(scene);
  const generatedGeometries: THREE.BufferGeometry[] = [];
  const modelRoot = scene.getObjectByName('VS08_10_Buried_ROOT') ?? scene;

  addProceduralEffects(scene, clonedMaterials, generatedGeometries);
  [
    'FX_Buried_SchoolResidue',
    'FX_Buried_VapourVolume',
    'FX_Buried_LampCone',
    'FX_Buried_PixelCompression',
  ].forEach((name) => isolateSubtreeMaterials(
    scene,
    scene.getObjectByName(name) ?? null,
    clonedMaterials,
  ));

  let nodeCount = 0;
  scene.traverse((child) => {
    nodeCount += 1;
    if (compact && child.userData.mobileOptional === true) child.visible = false;
    if (!(child instanceof THREE.Mesh)) return;
    const denseOptional = child.userData.mobileOptional === true;
    child.castShadow = qualityTier === 'cinematic' && !denseOptional;
    child.receiveShadow = qualityTier === 'cinematic';
    child.frustumCulled = true;
  });

  const mediaMaterials = {} as Record<MediaId, THREE.MeshBasicMaterial>;
  BURIED_ACT_MEDIA.forEach((spec, index) => {
    const texture = textures[index];
    const image = texture.image as { width?: number; height?: number } | undefined;
    const sourceRatio = image?.width && image?.height ? image.width / image.height : 1;
    const width = Number(scene.getObjectByName(spec.anchor)?.userData.mediaWidth) || spec.fallbackWidth;
    const height = Number(scene.getObjectByName(spec.anchor)?.userData.mediaHeight) || spec.fallbackHeight;
    const targetRatio = width / height;
    const horizontalCrop = sourceRatio > targetRatio
      ? THREE.MathUtils.clamp(targetRatio / sourceRatio, 0.01, 1)
      : 1;
    const verticalCrop = sourceRatio < targetRatio
      ? THREE.MathUtils.clamp(sourceRatio / targetRatio, 0.01, 1)
      : 1;
    const nextAnisotropy = Math.min(compact ? 4 : 8, maxAnisotropy);
    const textureChanged = texture.colorSpace !== THREE.SRGBColorSpace
      || texture.anisotropy !== nextAnisotropy
      || texture.repeat.x !== horizontalCrop
      || texture.repeat.y !== verticalCrop;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = nextAnisotropy;
    texture.repeat.set(horizontalCrop, verticalCrop);
    texture.offset.set((1 - horizontalCrop) * 0.5, (1 - verticalCrop) * 0.5);
    if (textureChanged) texture.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({
      name: `MEDIA_Buried_${spec.id}`,
      map: texture,
      color: '#ffffff',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    mediaMaterials[spec.id] = material;
    clonedMaterials.push(material);

    const anchor = scene.getObjectByName(spec.anchor);
    if (!anchor) return;
    const overlay = new THREE.Mesh(SCREEN_GEOMETRY, material);
    overlay.name = `MEDIA_Buried_${spec.id}_Plane`;
    overlay.position.set(0, 0, 0.018);
    overlay.scale.set(width, height, 1);
    overlay.renderOrder = 9;
    overlay.castShadow = false;
    overlay.receiveShadow = false;
    overlay.frustumCulled = false;
    anchor.add(overlay);
  });

  const mediaBridgeMaterials = {} as Record<MediaBridgeId, THREE.MeshBasicMaterial>;
  const addMediaBridge = (
    id: MediaBridgeId,
    anchorName: string,
    texture: THREE.Texture,
  ) => {
    const anchor = scene.getObjectByName(anchorName);
    if (!anchor) return;
    const material = new THREE.MeshBasicMaterial({
      name: `MEDIA_Buried_${id}`,
      map: texture,
      color: '#ffffff',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const overlay = new THREE.Mesh(SCREEN_GEOMETRY, material);
    overlay.name = `MEDIA_Buried_${id}_Plane`;
    overlay.position.set(0, 0, 0.022);
    overlay.scale.set(
      Number(anchor.userData.mediaWidth) || 3.56,
      Number(anchor.userData.mediaHeight) || 2,
      1,
    );
    overlay.renderOrder = 10;
    overlay.castShadow = false;
    overlay.receiveShadow = false;
    overlay.frustumCulled = false;
    anchor.add(overlay);
    mediaBridgeMaterials[id] = material;
    clonedMaterials.push(material);
  };

  // Keep the proof copy locked to a visible 3D aperture while the camera crosses rooms.
  addMediaBridge('mechanism-reprise', 'SCR_Buried_Guards', textures[0]);
  addMediaBridge('royal-hall-preview', 'SCR_Buried_Mercury', textures[3]);

  const nodes = {
    lampRig: scene.getObjectByName('PRP_Buried_LampRig') ?? null,
    lampFlame: scene.getObjectByName('Lamp flame') ?? null,
    lampIris: scene.getObjectByName('PRP_Buried_LampIris') ?? null,
    mechanismWheel: scene.getObjectByName('PRP_Buried_MechanismWheel') ?? null,
    counterweight: scene.getObjectByName('PRP_Buried_Counterweight') ?? null,
    vapour: scene.getObjectByName('FX_Buried_VapourVolume') ?? null,
    pixelCore: scene.getObjectByName('PRP_Buried_PixelCore') ?? null,
    pixelCompression: scene.getObjectByName('FX_Buried_PixelCompression') ?? null,
    pixelShutters: [
      'Pixel compression left shutter',
      'Pixel compression right shutter',
      'Pixel compression lower shutter',
      'Pixel compression upper shutter',
    ].map((name) => scene.getObjectByName(name)).filter((node): node is THREE.Object3D => Boolean(node)),
    pixelIris: scene.getObjectByName('Pixel compression circular iris trace') ?? null,
    livePixel: (scene.getObjectByName('First live infect pixel') as THREE.Mesh | undefined) ?? null,
  };

  const materialStates = clonedMaterials.map((material) => ({
    material,
    opacity: material.opacity,
    transparent: material.transparent,
    depthWrite: material.depthWrite,
    visible: material.visible,
  }));

  const schoolResidueMaterials = materialList(scene.getObjectByName('FX_Buried_SchoolResidue') ?? null);
  const mercuryMaterials = materialList(scene.getObjectByName('FX_Buried_MercuryChannels') ?? null)
    .filter((material): material is THREE.MeshStandardMaterial => material instanceof THREE.MeshStandardMaterial);
  const vapourMaterials = materialList(nodes.vapour);
  const lampGlowMaterials = materialList(scene.getObjectByName('FX_Buried_LampCone') ?? null);
  const pixelShutterMaterials = materialListForObjects(nodes.pixelShutters);
  const pixelIrisMaterials = materialList(nodes.pixelIris);
  const pixelCoreMaterials = materialList(nodes.pixelCore);

  [
    ...schoolResidueMaterials,
    ...vapourMaterials,
    ...pixelShutterMaterials,
    ...pixelIrisMaterials,
    ...pixelCoreMaterials,
  ].forEach((material) => {
    material.transparent = true;
    material.depthWrite = false;
  });

  return {
    scene,
    modelRoot,
    materialStates,
    clonedMaterials,
    generatedGeometries,
    mediaMaterials,
    mediaBridgeMaterials,
    schoolResidueMaterials,
    mercuryMaterials,
    vapourMaterials,
    lampGlowMaterials,
    pixelShutterMaterials,
    pixelIrisMaterials,
    pixelCoreMaterials,
    nodes,
    base: {
      root: transformState(modelRoot) as TransformState,
      lampRig: transformState(nodes.lampRig),
      lampIris: transformState(nodes.lampIris),
      mechanismWheel: transformState(nodes.mechanismWheel),
      counterweight: transformState(nodes.counterweight),
      vapour: transformState(nodes.vapour),
      pixelCore: transformState(nodes.pixelCore),
      pixelCompression: transformState(nodes.pixelCompression),
      pixelShutters: nodes.pixelShutters.map((node) => transformState(node) as TransformState),
      pixelIris: transformState(nodes.pixelIris),
    },
    requiredNodeCount: REQUIRED_NODE_NAMES.filter((name) => scene.getObjectByName(name)).length,
    nodeCount,
    triangleCount: triangleCount(scene),
  };
}

function setOpacity(
  materials: Array<THREE.Material>,
  opacity: number,
) {
  materials.forEach((material) => {
    material.opacity = opacity;
    material.visible = opacity > 0.001;
  });
}

function evidenceAt(progress: number): MediaId | 'none' {
  if (progress >= 0.79 && progress < 0.96) return 'royal-hall';
  if (progress >= 0.69 && progress < 0.84) return 'mercury';
  if (progress >= 0.58 && progress < 0.75) return 'guards';
  if (progress >= 0.38 && progress < 0.64) return 'mechanism';
  return 'none';
}

export function BuriedActPackage({
  localProgressRef,
  lampRaised,
  qualityTier,
  reducedMotion,
  onPixelHandoffRendered,
}: BuriedActPackageProps) {
  const { scene: sourceScene } = useGLTF(BURIED_ACT_MODEL_URL, false, true);
  const compact = useThree((state) => state.size.width <= 820);
  const mediaUrls = useMemo(
    () => BURIED_ACT_MEDIA.map((entry) => compact ? entry.mobileUrl : entry.url),
    [compact],
  );
  const textures = useTexture(mediaUrls) as THREE.Texture[];
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const runtime = useMemo(
    () => makeRuntimePackage(sourceScene, textures, qualityTier, compact, maxAnisotropy),
    [compact, maxAnisotropy, qualityTier, sourceScene, textures],
  );
  const lampLightRef = useRef<THREE.PointLight>(null);
  const mercuryLightRef = useRef<THREE.PointLight>(null);
  const readabilityFillLightRef = useRef<THREE.PointLight>(null);
  const entryGlowLightRef = useRef<THREE.PointLight>(null);
  const galleryGlowLightRef = useRef<THREE.PointLight>(null);
  const royalGlowLightRef = useRef<THREE.PointLight>(null);
  const liftRef = useRef<number | null>(null);
  const activeEvidenceRef = useRef<MediaId | 'none'>('none');
  const pixelHandoffArmedRef = useRef(false);
  const pixelHandoffSignaledRef = useRef(false);
  const pixelHandoffScheduledRef = useRef(false);
  const pixelHandoffPaintFrameRef = useRef(0);
  const firstFrameScheduledRef = useRef(false);
  const firstFramePaintRef = useRef(0);
  const lampWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const readabilityFillPosition = useMemo(() => new THREE.Vector3(), []);
  const readabilityFillDirection = useMemo(() => new THREE.Vector3(), []);

  const schedulePixelHandoff = useCallback(() => {
    if (
      !pixelHandoffArmedRef.current
      || pixelHandoffSignaledRef.current
      || pixelHandoffScheduledRef.current
    ) return;
    pixelHandoffScheduledRef.current = true;
    pixelHandoffPaintFrameRef.current = window.requestAnimationFrame(() => {
      pixelHandoffPaintFrameRef.current = window.requestAnimationFrame(() => {
        pixelHandoffScheduledRef.current = false;
        if (!pixelHandoffArmedRef.current || pixelHandoffSignaledRef.current) return;
        pixelHandoffSignaledRef.current = true;
        const lab = document.querySelector<HTMLElement>('.mf-lab');
        if (lab) lab.dataset.buriedPixelFrame = 'rendered';
        onPixelHandoffRendered();
      });
    });
  }, [onPixelHandoffRendered]);

  useEffect(() => {
    const lab = document.querySelector<HTMLElement>('.mf-lab');
    if (!lab) return undefined;
    firstFrameScheduledRef.current = false;
    delete lab.dataset.buriedPixelFrame;
    lab.dataset.buriedActFrame = 'pending';
    lab.dataset.buriedActModel = 'ready';
    lab.dataset.buriedActNodes = `${runtime.requiredNodeCount}/${REQUIRED_NODE_NAMES.length}`;
    lab.dataset.buriedActRuntimeNodes = String(runtime.nodeCount);
    lab.dataset.buriedActTriangles = String(runtime.triangleCount);
    return () => {
      delete lab.dataset.buriedActModel;
      delete lab.dataset.buriedActNodes;
      delete lab.dataset.buriedActRuntimeNodes;
      delete lab.dataset.buriedActTriangles;
      delete lab.dataset.buriedActEvidence;
      delete lab.dataset.buriedActFrame;
    };
  }, [runtime]);

  useEffect(() => {
    const lab = document.querySelector<HTMLElement>('.mf-lab');
    if (!lab) return;
    lab.dataset.buriedLamp = lampRaised ? 'raised' : 'offered';
  }, [lampRaised]);

  useEffect(() => {
    const renderMeshes: THREE.Mesh[] = [];
    runtime.nodes.pixelCore?.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.frustumCulled = false;
      renderMeshes.push(child);
    });
    if (renderMeshes.length === 0) return undefined;
    const previousHandlers = new Map(renderMeshes.map((mesh) => [mesh, mesh.onAfterRender]));
    renderMeshes.forEach((mesh) => {
      const previous = previousHandlers.get(mesh);
      mesh.onAfterRender = (...args) => {
        previous?.(...args);
        schedulePixelHandoff();
      };
    });
    return () => {
      renderMeshes.forEach((mesh) => {
        mesh.onAfterRender = previousHandlers.get(mesh) ?? (() => {});
      });
    };
  }, [runtime, schedulePixelHandoff]);

  useEffect(() => () => {
    window.cancelAnimationFrame(pixelHandoffPaintFrameRef.current);
    window.cancelAnimationFrame(firstFramePaintRef.current);
    pixelHandoffPaintFrameRef.current = 0;
    firstFramePaintRef.current = 0;
    pixelHandoffScheduledRef.current = false;
    firstFrameScheduledRef.current = false;
    runtime.clonedMaterials.forEach((material) => material.dispose());
    runtime.generatedGeometries.forEach((geometry) => geometry.dispose());
  }, [runtime]);

  useFrame(({ camera, clock }, delta) => {
    if (!firstFrameScheduledRef.current) {
      firstFrameScheduledRef.current = true;
      firstFramePaintRef.current = window.requestAnimationFrame(() => {
        const lab = document.querySelector<HTMLElement>('.mf-lab');
        if (lab) lab.dataset.buriedActFrame = 'rendered';
      });
    }
    const progress = clamp01(localProgressRef.current);
    const autoRaised = progress >= 0.37;
    const resolvedLamp = lampRaised || autoRaised;
    const liftTarget = resolvedLamp ? 1 : 0;
    liftRef.current = liftRef.current === null || reducedMotion
      ? liftTarget
      : THREE.MathUtils.damp(liftRef.current, liftTarget, 6.8, delta);
    const lift = liftRef.current;

    runtime.materialStates.forEach(({ material, opacity, visible }) => {
      material.opacity = opacity;
      material.visible = visible;
    });
    restoreTransform(runtime.modelRoot, runtime.base.root);
    restoreTransform(runtime.nodes.lampRig, runtime.base.lampRig);
    restoreTransform(runtime.nodes.lampIris, runtime.base.lampIris);
    restoreTransform(runtime.nodes.mechanismWheel, runtime.base.mechanismWheel);
    restoreTransform(runtime.nodes.counterweight, runtime.base.counterweight);
    restoreTransform(runtime.nodes.vapour, runtime.base.vapour);
    restoreTransform(runtime.nodes.pixelCore, runtime.base.pixelCore);
    restoreTransform(runtime.nodes.pixelCompression, runtime.base.pixelCompression);
    runtime.nodes.pixelShutters.forEach((node, index) => {
      restoreTransform(node, runtime.base.pixelShutters[index] ?? null);
    });
    restoreTransform(runtime.nodes.pixelIris, runtime.base.pixelIris);

    const entry = range(progress, 0, 0.13);
    runtime.modelRoot.visible = progress <= 1;
    runtime.modelRoot.position.y += (1 - entry) * -1.2;

    const schoolResidue = 1 - range(progress, 0.06, 0.18);
    setOpacity(runtime.schoolResidueMaterials, schoolResidue * 0.86);

    if (runtime.nodes.lampRig && runtime.base.lampRig) {
      const restY = Number(runtime.nodes.lampRig.userData.restY) || 0;
      const raisedY = Number(runtime.nodes.lampRig.userData.raisedY) || 2.15;
      runtime.nodes.lampRig.position.y += THREE.MathUtils.lerp(restY, raisedY, lift);
      const focusSweep = range(progress, 0.31, 0.59);
      runtime.nodes.lampRig.rotation.y += THREE.MathUtils.lerp(-0.3, 0.38, focusSweep) * lift;
    }
    if (runtime.nodes.lampIris && runtime.base.lampIris) {
      const closedRotation = Number(runtime.nodes.lampIris.userData.closedRotation) || 0.46;
      const openRotation = Number(runtime.nodes.lampIris.userData.openRotation) || 0;
      runtime.nodes.lampIris.rotation.y += THREE.MathUtils.lerp(closedRotation, openRotation, lift);
    }

    const mechanismWake = range(progress, 0.36, 0.56) * lift;
    if (runtime.nodes.mechanismWheel && runtime.base.mechanismWheel) {
      const turns = Number(runtime.nodes.mechanismWheel.userData.turnsOnRaise) || 1.25;
      runtime.nodes.mechanismWheel.rotation.z += mechanismWake * Math.PI * 2 * turns;
    }
    if (runtime.nodes.counterweight && runtime.base.counterweight) {
      const travel = Number(runtime.nodes.counterweight.userData.travel) || 2.15;
      runtime.nodes.counterweight.position.y += mechanismWake * travel;
    }

    runtime.lampGlowMaterials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissiveIntensity = 0.35 + lift * 4.6;
      }
      material.opacity = lift * 0.16;
      material.transparent = true;
      material.depthWrite = false;
    });
    runtime.mercuryMaterials.forEach((material) => {
      material.emissiveIntensity = 0.18 + range(progress, 0.46, 0.72) * lift * 1.45;
      material.envMapIntensity = 0.72 + lift * 0.5;
    });

    const vapourEnvelope = range(progress, 0.45, 0.55) * (1 - range(progress, 0.82, 0.9));
    setOpacity(runtime.vapourMaterials, vapourEnvelope * (0.08 + lift * 0.2));
    if (runtime.nodes.vapour && runtime.base.vapour) {
      runtime.nodes.vapour.visible = vapourEnvelope > 0.002;
      if (!reducedMotion) {
        runtime.nodes.vapour.rotation.y += Math.sin(clock.elapsedTime * 0.17) * 0.035;
        runtime.nodes.vapour.position.x += Math.sin(clock.elapsedTime * 0.23) * 0.1;
      }
    }

    const mediaOpacity: Record<MediaId, number> = {
      mechanism: range(progress, 0.34, 0.41) * (1 - range(progress, 0.58, 0.65)),
      guards: range(progress, 0.56, 0.62) * (1 - range(progress, 0.7, 0.77)),
      mercury: range(progress, 0.67, 0.72) * (1 - range(progress, 0.81, 0.87)),
      'royal-hall': range(progress, 0.78, 0.84) * (1 - range(progress, 0.95, 0.99)),
    };
    BURIED_ACT_MEDIA.forEach(({ id }) => {
      const material = runtime.mediaMaterials[id];
      material.opacity = mediaOpacity[id];
      material.visible = material.opacity > 0.001;
    });
    const bridgeOpacity: Record<MediaBridgeId, number> = {
      'mechanism-reprise': range(progress, 0.59, 0.615) * (1 - range(progress, 0.655, 0.68)),
      'royal-hall-preview': range(progress, 0.75, 0.77) * (1 - range(progress, 0.815, 0.85)),
    };
    Object.entries(runtime.mediaBridgeMaterials).forEach(([id, material]) => {
      material.opacity = bridgeOpacity[id as MediaBridgeId];
      material.visible = material.opacity > 0.001;
    });

    const nextEvidence = evidenceAt(progress);
    if (nextEvidence !== activeEvidenceRef.current) {
      activeEvidenceRef.current = nextEvidence;
      const lab = document.querySelector<HTMLElement>('.mf-lab');
      if (lab) lab.dataset.buriedActEvidence = nextEvidence;
    }

    const compression = range(progress, 0.885, 0.95);
    const shutterClose = range(progress, 0.9, 0.95);
    const irisFade = 1 - range(progress, 0.91, 0.945);
    const coreReveal = range(progress, 0.925, 0.952);
    setOpacity(runtime.pixelShutterMaterials, compression);
    setOpacity(runtime.pixelIrisMaterials, compression * irisFade);
    setOpacity(runtime.pixelCoreMaterials, coreReveal);
    if (runtime.nodes.pixelCompression && runtime.base.pixelCompression) {
      runtime.nodes.pixelCompression.visible = compression > 0.001;
    }
    runtime.nodes.pixelShutters.forEach((node, index) => {
      const base = runtime.base.pixelShutters[index];
      if (!base) return;
      const inwardScale = THREE.MathUtils.lerp(1, 0.26, shutterClose);
      if (node.name.includes('left') || node.name.includes('right')) {
        node.position.x = base.position.x * inwardScale;
      } else {
        node.position.y = base.position.y * inwardScale;
      }
    });
    if (runtime.nodes.pixelCore && runtime.base.pixelCore) {
      runtime.nodes.pixelCore.scale.multiplyScalar(THREE.MathUtils.lerp(0.5, 1, coreReveal));
    }
    pixelHandoffArmedRef.current = progress >= 0.999;
    if (pixelHandoffArmedRef.current) schedulePixelHandoff();
    if (progress < 0.999) {
      window.cancelAnimationFrame(pixelHandoffPaintFrameRef.current);
      pixelHandoffScheduledRef.current = false;
      pixelHandoffSignaledRef.current = false;
      const lab = document.querySelector<HTMLElement>('.mf-lab');
      if (lab) delete lab.dataset.buriedPixelFrame;
    }

    if (lampLightRef.current) {
      const flicker = reducedMotion
        ? 0
        : Math.sin(clock.elapsedTime * 8.7) * 1.2 + Math.sin(clock.elapsedTime * 15.3) * 0.55;
      lampLightRef.current.intensity = 12 + lift * 52 + flicker * (0.25 + lift * 0.75);
      if (runtime.nodes.lampFlame) {
        runtime.nodes.lampFlame.getWorldPosition(lampWorldPosition);
        lampLightRef.current.position.copy(lampWorldPosition);
      }
    }
    if (mercuryLightRef.current) {
      mercuryLightRef.current.intensity = range(progress, 0.46, 0.72) * lift * 18;
    }
    if (readabilityFillLightRef.current) {
      camera.getWorldDirection(readabilityFillDirection);
      readabilityFillPosition
        .copy(camera.position)
        .addScaledVector(readabilityFillDirection, 2.4);
      readabilityFillPosition.y += 0.7;
      readabilityFillLightRef.current.position.copy(readabilityFillPosition);
      readabilityFillLightRef.current.intensity = (compact ? 30 : 26)
        + lift * (compact ? 10 : 8)
        + range(progress, 0.48, 0.8) * (compact ? 6 : 5);
    }
    if (entryGlowLightRef.current) {
      entryGlowLightRef.current.intensity = 34 * (1 - range(progress, 0.34, 0.5));
    }
    if (galleryGlowLightRef.current) {
      const galleryEnvelope = range(progress, 0.28, 0.42) * (1 - range(progress, 0.76, 0.88));
      galleryGlowLightRef.current.intensity = 36 * galleryEnvelope;
    }
    if (royalGlowLightRef.current) {
      royalGlowLightRef.current.intensity = 38 * range(progress, 0.68, 0.82);
    }
  });

  return (
    <>
      <primitive object={runtime.scene} />
      <pointLight
        ref={lampLightRef}
        position={[-2.7, 2.8, -150]}
        color="#f09a45"
        intensity={12}
        distance={29}
        decay={2}
        castShadow={qualityTier === 'cinematic'}
      />
      <pointLight
        ref={mercuryLightRef}
        position={[1.8, 0.65, -157]}
        color="#a9c8c6"
        intensity={0}
        distance={16}
        decay={2}
      />
      {/*
        A hemisphere light is sky bouncing off ground. There is no sky here: the
        act is a sealed tomb under a hill. It was doing readability work, so what
        replaces it does that job without pretending to be weather - a flat, very
        low warm floor under the lamps, so the darkest corners are dark rather
        than absent.
      */}
      <ambientLight color="#c99a6a" intensity={compact ? 0.13 : 0.11} />
      {/*
        Kept, but for what it actually is. A hundred and thirty metres down the
        corridor on -Z is the entrance the story is in the middle of sealing, so
        this is the last of the daylight reaching in, not a sun in the corner.
      */}
      <directionalLight
        position={[-7, 11, -132]}
        color="#d98243"
        intensity={compact ? 0.4 : 0.48}
      />
      <pointLight
        ref={readabilityFillLightRef}
        color="#d99a68"
        intensity={compact ? 30 : 26}
        distance={compact ? 26 : 30}
        decay={2}
      />
      <pointLight
        ref={entryGlowLightRef}
        position={[-1.8, 4.2, -137]}
        color="#f07832"
        intensity={34}
        distance={31}
        decay={2}
      />
      <pointLight
        ref={galleryGlowLightRef}
        position={[2.4, 3.8, -169]}
        color="#e86f2d"
        intensity={0}
        distance={32}
        decay={2}
      />
      <pointLight
        ref={royalGlowLightRef}
        position={[-1.4, 4.8, -187]}
        color="#ff9141"
        intensity={0}
        distance={28}
        decay={2}
      />
    </>
  );
}
