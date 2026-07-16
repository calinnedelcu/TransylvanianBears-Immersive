export const VERTICAL_SLICE_SCHEMA_VERSION = 1 as const;
export const VERTICAL_SLICE_RELEASE = 'v1' as const;
export const VERTICAL_SLICE_BASE_URL = '/assets/vertical-slice/v1' as const;

export const VERTICAL_SLICE_ASSET_STAGES = [
  'placeholder',
  'source-approved',
  'proxy',
  'candidate',
  'final',
] as const;

export type VerticalSliceAssetStage = (typeof VERTICAL_SLICE_ASSET_STAGES)[number];
export type VerticalSliceChapterId = '01-threshold' | '02-field' | '03-lens' | '04-proof';
export type VerticalSliceDeliveryTier = 'desktop' | 'mobile';
export type VerticalSliceAssetVariant = VerticalSliceDeliveryTier | 'shared';
export type VerticalSliceStableUrl = `/assets/vertical-slice/v1/${string}`;
export type PublicAssetUrl = `/${string}`;

export type VerticalSliceAssetKind =
  | 'scene'
  | 'camera-curve'
  | 'poster'
  | 'evidence-texture'
  | 'evidence-image'
  | 'evidence-video';

export type VerticalSliceAssetMimeType =
  | 'model/gltf-binary'
  | 'application/json'
  | 'image/ktx2'
  | 'image/avif'
  | 'image/webp'
  | 'video/webm'
  | 'video/mp4';

export type VerticalSliceAssetCodec =
  | 'meshopt-glb'
  | 'json'
  | 'ktx2-uastc'
  | 'ktx2-etc1s'
  | 'avif'
  | 'webp'
  | 'vp9-webm'
  | 'h264-mp4';

export type VerticalSliceRuntimeFallbackId =
  | 'procedural-threshold'
  | 'procedural-synthetic-field'
  | 'procedural-lens'
  | 'dom-proof-inspector'
  | 'static-proof-copy'
  | 'poster-only';

export type VerticalSliceUrlFallback = {
  readonly kind: 'url';
  readonly url: PublicAssetUrl;
  readonly mimeType: VerticalSliceAssetMimeType;
  readonly codec: VerticalSliceAssetCodec;
};

export type VerticalSliceRuntimeFallback = {
  readonly kind: 'runtime';
  readonly id: VerticalSliceRuntimeFallbackId;
};

export type VerticalSliceAssetFallback = VerticalSliceUrlFallback | VerticalSliceRuntimeFallback;

export type VerticalSliceAssetSlot = {
  readonly id: string;
  readonly chapter: VerticalSliceChapterId;
  readonly kind: VerticalSliceAssetKind;
  readonly variant: VerticalSliceAssetVariant;
  readonly stableUrl: VerticalSliceStableUrl;
  readonly stage: VerticalSliceAssetStage;
  readonly mimeType: VerticalSliceAssetMimeType;
  readonly codec: VerticalSliceAssetCodec;
  readonly maxTransferBytes: number;
  readonly fallbacks: readonly VerticalSliceAssetFallback[];
  readonly sourceRef?: string;
  readonly note?: string;
};

export type VerticalSliceChapterBudget = {
  /** New bytes requested while entering the chapter; already-cached neighbors are excluded. */
  readonly maxActivationTransferBytes: number;
  readonly maxSceneTransferBytes: number;
  readonly maxMediaTransferBytes: number;
  readonly maxVisibleTriangles: number;
  readonly maxDrawCalls: number;
  readonly maxTextureGpuBytes: number;
  readonly maxTotalGpuBytes: number;
  readonly maxRealtimeLights: number;
  readonly maxShadowCasters: number;
  readonly maxActivationLongTaskMs: number;
  readonly targetFrameTimeMs: number;
};

export type VerticalSliceSliceBudget = {
  readonly maxCriticalPosterBytes: number;
  readonly maxInitialRealtimeBytes: number;
  readonly maxTotalTransferBytes: number;
  readonly maxPeakTextureGpuBytes: number;
  readonly maxPeakTotalGpuBytes: number;
  readonly maxVisibleTriangles: number;
  readonly maxDrawCalls: number;
  readonly maxResidentChapterPackages: number;
  readonly maxActivationLongTaskMs: number;
  readonly targetFrameTimeMs: number;
};

const KIB = 1024;
const MIB = 1024 * KIB;

export const VERTICAL_SLICE_BUDGETS = {
  slice: {
    desktop: {
      maxCriticalPosterBytes: 360 * KIB,
      maxInitialRealtimeBytes: 2.5 * MIB,
      maxTotalTransferBytes: 17.5 * MIB,
      maxPeakTextureGpuBytes: 96 * MIB,
      maxPeakTotalGpuBytes: 128 * MIB,
      maxVisibleTriangles: 300_000,
      maxDrawCalls: 70,
      maxResidentChapterPackages: 2,
      maxActivationLongTaskMs: 100,
      targetFrameTimeMs: 16.7,
    },
    mobile: {
      maxCriticalPosterBytes: 220 * KIB,
      maxInitialRealtimeBytes: 1.25 * MIB,
      maxTotalTransferBytes: 9 * MIB,
      maxPeakTextureGpuBytes: 48 * MIB,
      maxPeakTotalGpuBytes: 64 * MIB,
      maxVisibleTriangles: 100_000,
      maxDrawCalls: 40,
      maxResidentChapterPackages: 2,
      maxActivationLongTaskMs: 80,
      targetFrameTimeMs: 33.3,
    },
  },
  chapters: {
    '01-threshold': {
      desktop: {
        maxActivationTransferBytes: 2.5 * MIB,
        maxSceneTransferBytes: 2.15 * MIB,
        maxMediaTransferBytes: 360 * KIB,
        maxVisibleTriangles: 300_000,
        maxDrawCalls: 70,
        maxTextureGpuBytes: 96 * MIB,
        maxTotalGpuBytes: 128 * MIB,
        maxRealtimeLights: 4,
        maxShadowCasters: 2,
        maxActivationLongTaskMs: 100,
        targetFrameTimeMs: 16.7,
      },
      mobile: {
        maxActivationTransferBytes: 1.25 * MIB,
        maxSceneTransferBytes: 1.02 * MIB,
        maxMediaTransferBytes: 220 * KIB,
        maxVisibleTriangles: 100_000,
        maxDrawCalls: 40,
        maxTextureGpuBytes: 48 * MIB,
        maxTotalGpuBytes: 64 * MIB,
        maxRealtimeLights: 2,
        maxShadowCasters: 0,
        maxActivationLongTaskMs: 80,
        targetFrameTimeMs: 33.3,
      },
    },
    '02-field': {
      desktop: {
        maxActivationTransferBytes: 3.8 * MIB,
        maxSceneTransferBytes: 2.5 * MIB,
        maxMediaTransferBytes: 1.25 * MIB,
        maxVisibleTriangles: 220_000,
        maxDrawCalls: 58,
        maxTextureGpuBytes: 72 * MIB,
        maxTotalGpuBytes: 96 * MIB,
        maxRealtimeLights: 3,
        maxShadowCasters: 1,
        maxActivationLongTaskMs: 80,
        targetFrameTimeMs: 16.7,
      },
      mobile: {
        maxActivationTransferBytes: 1.9 * MIB,
        maxSceneTransferBytes: 1.2 * MIB,
        maxMediaTransferBytes: 650 * KIB,
        maxVisibleTriangles: 75_000,
        maxDrawCalls: 30,
        maxTextureGpuBytes: 36 * MIB,
        maxTotalGpuBytes: 52 * MIB,
        maxRealtimeLights: 2,
        maxShadowCasters: 0,
        maxActivationLongTaskMs: 70,
        targetFrameTimeMs: 33.3,
      },
    },
    '03-lens': {
      desktop: {
        maxActivationTransferBytes: 1.85 * MIB,
        maxSceneTransferBytes: 680 * KIB,
        maxMediaTransferBytes: 1.1 * MIB,
        maxVisibleTriangles: 45_000,
        maxDrawCalls: 18,
        maxTextureGpuBytes: 16 * MIB,
        maxTotalGpuBytes: 24 * MIB,
        maxRealtimeLights: 1,
        maxShadowCasters: 0,
        maxActivationLongTaskMs: 50,
        targetFrameTimeMs: 16.7,
      },
      mobile: {
        maxActivationTransferBytes: 950 * KIB,
        maxSceneTransferBytes: 330 * KIB,
        maxMediaTransferBytes: 560 * KIB,
        maxVisibleTriangles: 20_000,
        maxDrawCalls: 12,
        maxTextureGpuBytes: 8 * MIB,
        maxTotalGpuBytes: 14 * MIB,
        maxRealtimeLights: 1,
        maxShadowCasters: 0,
        maxActivationLongTaskMs: 40,
        targetFrameTimeMs: 33.3,
      },
    },
    '04-proof': {
      desktop: {
        maxActivationTransferBytes: 7 * MIB,
        maxSceneTransferBytes: 780 * KIB,
        maxMediaTransferBytes: 6.1 * MIB,
        maxVisibleTriangles: 55_000,
        maxDrawCalls: 24,
        maxTextureGpuBytes: 48 * MIB,
        maxTotalGpuBytes: 64 * MIB,
        maxRealtimeLights: 1,
        maxShadowCasters: 0,
        maxActivationLongTaskMs: 80,
        targetFrameTimeMs: 16.7,
      },
      mobile: {
        maxActivationTransferBytes: 3.85 * MIB,
        maxSceneTransferBytes: 390 * KIB,
        maxMediaTransferBytes: 3.4 * MIB,
        maxVisibleTriangles: 30_000,
        maxDrawCalls: 18,
        maxTextureGpuBytes: 24 * MIB,
        maxTotalGpuBytes: 36 * MIB,
        maxRealtimeLights: 1,
        maxShadowCasters: 0,
        maxActivationLongTaskMs: 60,
        targetFrameTimeMs: 33.3,
      },
    },
  },
} as const satisfies {
  readonly slice: Readonly<Record<VerticalSliceDeliveryTier, VerticalSliceSliceBudget>>;
  readonly chapters: Readonly<
    Record<VerticalSliceChapterId, Readonly<Record<VerticalSliceDeliveryTier, VerticalSliceChapterBudget>>>
  >;
};

export const VERTICAL_SLICE_DELIVERY_POLICY = {
  coordinates: {
    blenderUpAxis: 'Z',
    gltfUpAxis: 'Y',
    unitMeters: 1,
    rootTranslation: [0, 0, 0],
    rootRotationQuaternion: [0, 0, 0, 1],
    rootScale: [1, 1, 1],
  },
  geometryCompression: {
    canonical: 'EXT_meshopt_compression',
    quantization: 'KHR_mesh_quantization',
    dracoPolicy: 'alternate-only-after-benchmark',
    minimumDracoTransferSavingPercent: 15,
    maximumDracoDecodeRegressionMs: 20,
  },
  textureCompression: {
    extension: 'KHR_texture_basisu',
    requireMipmaps: true,
    baseColor: 'ETC1S; UASTC for the threshold gate and evidence hero only',
    normal: 'UASTC',
    orm: 'ETC1S',
    emissive: 'ETC1S',
    bakedGi: 'UASTC',
  },
  lod: {
    levels: [0, 1, 2],
    maximumTriangleRatios: [1, 0.5, 0.2],
    desktopProjectedDiameterBreaks: [0.14, 0.04],
    mobileProjectedDiameterBreaks: [0.2, 0.065],
    hysteresisPercent: 10,
    cullProjectedDiameterBelow: 0.007,
  },
  bakedLighting: {
    mode: 'indirect-diffuse-as-emissive-texture',
    gltfTexCoord: 1,
    desktopAtlasResolution: 2048,
    mobileAtlasResolution: 1024,
    cyclesSamples: 128,
    dilationPixelsAt2k: 16,
    bakeDirectLight: false,
    dynamicNodePrefixes: ['PRP_', 'FX_', 'HSP_', 'ANC_'],
  },
  cameraCurves: {
    samplesPerCurve: 241,
    progressStart: 0,
    progressEnd: 1,
    quantizationDecimals: 4,
    fields: ['progress', 'position', 'target', 'fovDegrees', 'rollDegrees'],
  },
} as const;

export const VERTICAL_SLICE_PBR_TEXTURES = {
  baseColor: {
    suffix: '_BaseColor',
    channels: 'RGB base color; A only for an approved alpha mask',
    colorSpace: 'sRGB',
    desktopMaxResolution: 2048,
    mobileMaxResolution: 1024,
  },
  normal: {
    suffix: '_Normal',
    channels: 'RGB OpenGL tangent-space normal (+Y)',
    colorSpace: 'linear',
    desktopMaxResolution: 2048,
    mobileMaxResolution: 1024,
  },
  orm: {
    suffix: '_ORM',
    channels: 'R ambient occlusion, G roughness, B metalness; A=1',
    colorSpace: 'linear',
    desktopMaxResolution: 2048,
    mobileMaxResolution: 1024,
  },
  emissive: {
    suffix: '_Emissive',
    channels: 'RGB emissive mask/color; no baked bloom',
    colorSpace: 'sRGB',
    desktopMaxResolution: 1024,
    mobileMaxResolution: 512,
  },
  bakedGi: {
    suffix: '_GI',
    channels: 'RGB indirect diffuse only, bound to emissiveTexture on TEXCOORD_1',
    colorSpace: 'sRGB',
    desktopMaxResolution: 2048,
    mobileMaxResolution: 1024,
  },
} as const;

export const VERTICAL_SLICE_ASSETS = {
  thresholdSceneDesktop: {
    id: 'vs01.scene.desktop',
    chapter: '01-threshold',
    kind: 'scene',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/01-threshold/scene.desktop.glb',
    stage: 'proxy',
    mimeType: 'model/gltf-binary',
    codec: 'meshopt-glb',
    maxTransferBytes: 2.15 * MIB,
    fallbacks: [
      { kind: 'url', url: '/assets/world/first-light-citadel.glb', mimeType: 'model/gltf-binary', codec: 'meshopt-glb' },
      { kind: 'runtime', id: 'procedural-threshold' },
    ],
    sourceRef: 'production/blender/vertical-slice/vs01_threshold.blend',
  },
  thresholdSceneMobile: {
    id: 'vs01.scene.mobile',
    chapter: '01-threshold',
    kind: 'scene',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/01-threshold/scene.mobile.glb',
    stage: 'proxy',
    mimeType: 'model/gltf-binary',
    codec: 'meshopt-glb',
    maxTransferBytes: 1.02 * MIB,
    fallbacks: [
      { kind: 'url', url: '/assets/world/first-light-citadel.glb', mimeType: 'model/gltf-binary', codec: 'meshopt-glb' },
      { kind: 'runtime', id: 'procedural-threshold' },
    ],
    sourceRef: 'production/blender/vertical-slice/vs01_threshold.blend',
  },
  thresholdCameraDesktop: {
    id: 'vs01.camera.desktop',
    chapter: '01-threshold',
    kind: 'camera-curve',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/01-threshold/camera.desktop.json',
    stage: 'candidate',
    mimeType: 'application/json',
    codec: 'json',
    maxTransferBytes: 40 * KIB,
    fallbacks: [{ kind: 'runtime', id: 'procedural-threshold' }],
    sourceRef: 'scripts/blender/build_vertical_slice_cameras.py',
  },
  thresholdCameraMobile: {
    id: 'vs01.camera.mobile',
    chapter: '01-threshold',
    kind: 'camera-curve',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/01-threshold/camera.mobile.json',
    stage: 'candidate',
    mimeType: 'application/json',
    codec: 'json',
    maxTransferBytes: 40 * KIB,
    fallbacks: [{ kind: 'runtime', id: 'procedural-threshold' }],
    sourceRef: 'scripts/blender/build_vertical_slice_cameras.py',
  },
  thresholdPosterDesktopAvif: {
    id: 'vs01.poster.desktop.avif',
    chapter: '01-threshold',
    kind: 'poster',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/01-threshold/poster.desktop.avif',
    stage: 'candidate',
    mimeType: 'image/avif',
    codec: 'avif',
    maxTransferBytes: 260 * KIB,
    fallbacks: [
      { kind: 'url', url: '/assets/world/first-light-poster.webp', mimeType: 'image/webp', codec: 'webp' },
      { kind: 'runtime', id: 'poster-only' },
    ],
  },
  thresholdPosterDesktopWebp: {
    id: 'vs01.poster.desktop.webp',
    chapter: '01-threshold',
    kind: 'poster',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/01-threshold/poster.desktop.webp',
    stage: 'proxy',
    mimeType: 'image/webp',
    codec: 'webp',
    maxTransferBytes: 360 * KIB,
    fallbacks: [{ kind: 'url', url: '/assets/world/first-light-poster.webp', mimeType: 'image/webp', codec: 'webp' }],
  },
  thresholdPosterMobileAvif: {
    id: 'vs01.poster.mobile.avif',
    chapter: '01-threshold',
    kind: 'poster',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/01-threshold/poster.mobile.avif',
    stage: 'proxy',
    mimeType: 'image/avif',
    codec: 'avif',
    maxTransferBytes: 160 * KIB,
    fallbacks: [
      { kind: 'url', url: '/assets/world/first-light-poster.webp', mimeType: 'image/webp', codec: 'webp' },
      { kind: 'runtime', id: 'poster-only' },
    ],
  },
  thresholdPosterMobileWebp: {
    id: 'vs01.poster.mobile.webp',
    chapter: '01-threshold',
    kind: 'poster',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/01-threshold/poster.mobile.webp',
    stage: 'proxy',
    mimeType: 'image/webp',
    codec: 'webp',
    maxTransferBytes: 220 * KIB,
    fallbacks: [{ kind: 'url', url: '/assets/world/first-light-poster.webp', mimeType: 'image/webp', codec: 'webp' }],
  },
  fieldSceneDesktop: {
    id: 'vs02.scene.desktop',
    chapter: '02-field',
    kind: 'scene',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/02-field/scene.desktop.glb',
    stage: 'proxy',
    mimeType: 'model/gltf-binary',
    codec: 'meshopt-glb',
    maxTransferBytes: 2.5 * MIB,
    fallbacks: [{ kind: 'runtime', id: 'procedural-synthetic-field' }],
    sourceRef: 'production/blender/vertical-slice/vs02_synthetic_field.blend',
  },
  fieldSceneMobile: {
    id: 'vs02.scene.mobile',
    chapter: '02-field',
    kind: 'scene',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/02-field/scene.mobile.glb',
    stage: 'proxy',
    mimeType: 'model/gltf-binary',
    codec: 'meshopt-glb',
    maxTransferBytes: 1.2 * MIB,
    fallbacks: [{ kind: 'runtime', id: 'procedural-synthetic-field' }],
    sourceRef: 'production/blender/vertical-slice/vs02_synthetic_field.blend',
  },
  fieldCameraDesktop: {
    id: 'vs02.camera.desktop',
    chapter: '02-field',
    kind: 'camera-curve',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/02-field/camera.desktop.json',
    stage: 'candidate',
    mimeType: 'application/json',
    codec: 'json',
    maxTransferBytes: 40 * KIB,
    fallbacks: [{ kind: 'runtime', id: 'procedural-synthetic-field' }],
    sourceRef: 'scripts/blender/build_vertical_slice_cameras.py',
  },
  fieldCameraMobile: {
    id: 'vs02.camera.mobile',
    chapter: '02-field',
    kind: 'camera-curve',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/02-field/camera.mobile.json',
    stage: 'candidate',
    mimeType: 'application/json',
    codec: 'json',
    maxTransferBytes: 40 * KIB,
    fallbacks: [{ kind: 'runtime', id: 'procedural-synthetic-field' }],
    sourceRef: 'scripts/blender/build_vertical_slice_cameras.py',
  },
  fieldAerialDesktop: {
    id: 'vs02.media.synthetic-aerial.desktop',
    chapter: '02-field',
    kind: 'evidence-texture',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/02-field/media/synthetic-aerial.desktop.ktx2',
    stage: 'source-approved',
    mimeType: 'image/ktx2',
    codec: 'ktx2-uastc',
    maxTransferBytes: 1.25 * MIB,
    fallbacks: [{ kind: 'url', url: '/assets/projects/nexus-ue5-aerial.webp', mimeType: 'image/webp', codec: 'webp' }],
    sourceRef: 'docs/greenfield/research/nexus/source/ue5-industrial-aerial.png',
  },
  fieldAerialMobile: {
    id: 'vs02.media.synthetic-aerial.mobile',
    chapter: '02-field',
    kind: 'evidence-texture',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/02-field/media/synthetic-aerial.mobile.ktx2',
    stage: 'source-approved',
    mimeType: 'image/ktx2',
    codec: 'ktx2-uastc',
    maxTransferBytes: 650 * KIB,
    fallbacks: [{ kind: 'url', url: '/assets/projects/nexus-ue5-aerial.webp', mimeType: 'image/webp', codec: 'webp' }],
    sourceRef: 'docs/greenfield/research/nexus/source/ue5-industrial-aerial.png',
  },
  fieldAerialEditorial: {
    id: 'vs02.media.synthetic-aerial.editorial',
    chapter: '02-field',
    kind: 'evidence-image',
    variant: 'shared',
    stableUrl: '/assets/vertical-slice/v1/02-field/media/synthetic-aerial.webp',
    stage: 'source-approved',
    mimeType: 'image/webp',
    codec: 'webp',
    maxTransferBytes: 420 * KIB,
    fallbacks: [{ kind: 'url', url: '/assets/projects/nexus-ue5-aerial.webp', mimeType: 'image/webp', codec: 'webp' }],
    sourceRef: 'docs/greenfield/research/nexus/source/ue5-industrial-aerial.png',
  },
  lensSceneDesktop: {
    id: 'vs03.scene.desktop',
    chapter: '03-lens',
    kind: 'scene',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/03-lens/scene.desktop.glb',
    stage: 'proxy',
    mimeType: 'model/gltf-binary',
    codec: 'meshopt-glb',
    maxTransferBytes: 680 * KIB,
    fallbacks: [{ kind: 'runtime', id: 'procedural-lens' }],
    sourceRef: 'production/blender/vertical-slice/vs03_lens.blend',
  },
  lensSceneMobile: {
    id: 'vs03.scene.mobile',
    chapter: '03-lens',
    kind: 'scene',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/03-lens/scene.mobile.glb',
    stage: 'proxy',
    mimeType: 'model/gltf-binary',
    codec: 'meshopt-glb',
    maxTransferBytes: 330 * KIB,
    fallbacks: [{ kind: 'runtime', id: 'procedural-lens' }],
    sourceRef: 'production/blender/vertical-slice/vs03_lens.blend',
  },
  lensCameraDesktop: {
    id: 'vs03.camera.desktop',
    chapter: '03-lens',
    kind: 'camera-curve',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/03-lens/camera.desktop.json',
    stage: 'candidate',
    mimeType: 'application/json',
    codec: 'json',
    maxTransferBytes: 40 * KIB,
    fallbacks: [{ kind: 'runtime', id: 'procedural-lens' }],
    sourceRef: 'scripts/blender/build_vertical_slice_cameras.py',
  },
  lensCameraMobile: {
    id: 'vs03.camera.mobile',
    chapter: '03-lens',
    kind: 'camera-curve',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/03-lens/camera.mobile.json',
    stage: 'candidate',
    mimeType: 'application/json',
    codec: 'json',
    maxTransferBytes: 40 * KIB,
    fallbacks: [{ kind: 'runtime', id: 'procedural-lens' }],
    sourceRef: 'scripts/blender/build_vertical_slice_cameras.py',
  },
  lensRawAlignedDesktop: {
    id: 'vs03.media.raw-aligned.desktop',
    chapter: '03-lens',
    kind: 'evidence-texture',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/03-lens/media/raw-aligned.desktop.ktx2',
    stage: 'placeholder',
    mimeType: 'image/ktx2',
    codec: 'ktx2-uastc',
    maxTransferBytes: 1.1 * MIB,
    fallbacks: [
      { kind: 'url', url: '/assets/projects/project-nexus.webp', mimeType: 'image/webp', codec: 'webp' },
      { kind: 'runtime', id: 'procedural-lens' },
    ],
    note: 'Blocked until the unannotated RGB frame matching the segmentation and box outputs is supplied.',
  },
  lensRawAlignedMobile: {
    id: 'vs03.media.raw-aligned.mobile',
    chapter: '03-lens',
    kind: 'evidence-texture',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/03-lens/media/raw-aligned.mobile.ktx2',
    stage: 'placeholder',
    mimeType: 'image/ktx2',
    codec: 'ktx2-uastc',
    maxTransferBytes: 560 * KIB,
    fallbacks: [
      { kind: 'url', url: '/assets/projects/project-nexus.webp', mimeType: 'image/webp', codec: 'webp' },
      { kind: 'runtime', id: 'procedural-lens' },
    ],
    note: 'Blocked until the unannotated RGB frame matching the segmentation and box outputs is supplied.',
  },
  lensRawAlignedEditorial: {
    id: 'vs03.media.raw-aligned.editorial',
    chapter: '03-lens',
    kind: 'evidence-image',
    variant: 'shared',
    stableUrl: '/assets/vertical-slice/v1/03-lens/media/raw-aligned.webp',
    stage: 'placeholder',
    mimeType: 'image/webp',
    codec: 'webp',
    maxTransferBytes: 420 * KIB,
    fallbacks: [
      { kind: 'url', url: '/assets/projects/project-nexus.webp', mimeType: 'image/webp', codec: 'webp' },
      { kind: 'runtime', id: 'static-proof-copy' },
    ],
    note: 'Blocked until the unannotated RGB frame matching the segmentation and box outputs is supplied.',
  },
  lensSegmentationDesktop: {
    id: 'vs03.media.segmentation.desktop',
    chapter: '03-lens',
    kind: 'evidence-texture',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/03-lens/media/segmentation.desktop.ktx2',
    stage: 'source-approved',
    mimeType: 'image/ktx2',
    codec: 'ktx2-uastc',
    maxTransferBytes: 1.1 * MIB,
    fallbacks: [{ kind: 'url', url: '/assets/projects/nexus-segmentation.webp', mimeType: 'image/webp', codec: 'webp' }],
    sourceRef: 'docs/greenfield/research/nexus/source/synthetic-segmentation.png',
  },
  lensSegmentationMobile: {
    id: 'vs03.media.segmentation.mobile',
    chapter: '03-lens',
    kind: 'evidence-texture',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/03-lens/media/segmentation.mobile.ktx2',
    stage: 'source-approved',
    mimeType: 'image/ktx2',
    codec: 'ktx2-uastc',
    maxTransferBytes: 560 * KIB,
    fallbacks: [{ kind: 'url', url: '/assets/projects/nexus-segmentation.webp', mimeType: 'image/webp', codec: 'webp' }],
    sourceRef: 'docs/greenfield/research/nexus/source/synthetic-segmentation.png',
  },
  lensSegmentationEditorial: {
    id: 'vs03.media.segmentation.editorial',
    chapter: '03-lens',
    kind: 'evidence-image',
    variant: 'shared',
    stableUrl: '/assets/vertical-slice/v1/03-lens/media/segmentation.webp',
    stage: 'source-approved',
    mimeType: 'image/webp',
    codec: 'webp',
    maxTransferBytes: 420 * KIB,
    fallbacks: [
      { kind: 'url', url: '/assets/projects/nexus-segmentation.webp', mimeType: 'image/webp', codec: 'webp' },
      { kind: 'runtime', id: 'static-proof-copy' },
    ],
    sourceRef: 'docs/greenfield/research/nexus/source/synthetic-segmentation.png',
  },
  lensDetectionDesktop: {
    id: 'vs03.media.detection.desktop',
    chapter: '03-lens',
    kind: 'evidence-texture',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/03-lens/media/detection.desktop.ktx2',
    stage: 'source-approved',
    mimeType: 'image/ktx2',
    codec: 'ktx2-uastc',
    maxTransferBytes: 1.1 * MIB,
    fallbacks: [{ kind: 'url', url: '/assets/projects/nexus-detection.webp', mimeType: 'image/webp', codec: 'webp' }],
    sourceRef: 'docs/greenfield/research/nexus/source/synthetic-boxes.png',
  },
  lensDetectionMobile: {
    id: 'vs03.media.detection.mobile',
    chapter: '03-lens',
    kind: 'evidence-texture',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/03-lens/media/detection.mobile.ktx2',
    stage: 'source-approved',
    mimeType: 'image/ktx2',
    codec: 'ktx2-uastc',
    maxTransferBytes: 560 * KIB,
    fallbacks: [{ kind: 'url', url: '/assets/projects/nexus-detection.webp', mimeType: 'image/webp', codec: 'webp' }],
    sourceRef: 'docs/greenfield/research/nexus/source/synthetic-boxes.png',
  },
  lensDetectionEditorial: {
    id: 'vs03.media.detection.editorial',
    chapter: '03-lens',
    kind: 'evidence-image',
    variant: 'shared',
    stableUrl: '/assets/vertical-slice/v1/03-lens/media/detection.webp',
    stage: 'source-approved',
    mimeType: 'image/webp',
    codec: 'webp',
    maxTransferBytes: 420 * KIB,
    fallbacks: [
      { kind: 'url', url: '/assets/projects/nexus-detection.webp', mimeType: 'image/webp', codec: 'webp' },
      { kind: 'runtime', id: 'static-proof-copy' },
    ],
    sourceRef: 'docs/greenfield/research/nexus/source/synthetic-boxes.png',
  },
  proofSceneDesktop: {
    id: 'vs04.scene.desktop',
    chapter: '04-proof',
    kind: 'scene',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/04-proof/scene.desktop.glb',
    stage: 'proxy',
    mimeType: 'model/gltf-binary',
    codec: 'meshopt-glb',
    maxTransferBytes: 780 * KIB,
    fallbacks: [{ kind: 'runtime', id: 'dom-proof-inspector' }],
    sourceRef: 'production/blender/vertical-slice/vs04_evidence.blend',
  },
  proofSceneMobile: {
    id: 'vs04.scene.mobile',
    chapter: '04-proof',
    kind: 'scene',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/04-proof/scene.mobile.glb',
    stage: 'proxy',
    mimeType: 'model/gltf-binary',
    codec: 'meshopt-glb',
    maxTransferBytes: 390 * KIB,
    fallbacks: [{ kind: 'runtime', id: 'dom-proof-inspector' }],
    sourceRef: 'production/blender/vertical-slice/vs04_evidence.blend',
  },
  proofCameraDesktop: {
    id: 'vs04.camera.desktop',
    chapter: '04-proof',
    kind: 'camera-curve',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/04-proof/camera.desktop.json',
    stage: 'candidate',
    mimeType: 'application/json',
    codec: 'json',
    maxTransferBytes: 40 * KIB,
    fallbacks: [{ kind: 'runtime', id: 'dom-proof-inspector' }],
    sourceRef: 'scripts/blender/build_vertical_slice_cameras.py',
  },
  proofCameraMobile: {
    id: 'vs04.camera.mobile',
    chapter: '04-proof',
    kind: 'camera-curve',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/04-proof/camera.mobile.json',
    stage: 'candidate',
    mimeType: 'application/json',
    codec: 'json',
    maxTransferBytes: 40 * KIB,
    fallbacks: [{ kind: 'runtime', id: 'dom-proof-inspector' }],
    sourceRef: 'scripts/blender/build_vertical_slice_cameras.py',
  },
  proofPosterDesktop: {
    id: 'vs04.media.real-proof.poster.desktop',
    chapter: '04-proof',
    kind: 'poster',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/04-proof/media/real-proof.poster.desktop.avif',
    stage: 'source-approved',
    mimeType: 'image/avif',
    codec: 'avif',
    maxTransferBytes: 260 * KIB,
    fallbacks: [
      { kind: 'url', url: '/assets/projects/project-nexus.webp', mimeType: 'image/webp', codec: 'webp' },
      { kind: 'runtime', id: 'static-proof-copy' },
    ],
    sourceRef: 'Project Nexus Stanford Drone validation master',
  },
  proofPosterMobile: {
    id: 'vs04.media.real-proof.poster.mobile',
    chapter: '04-proof',
    kind: 'poster',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/04-proof/media/real-proof.poster.mobile.avif',
    stage: 'source-approved',
    mimeType: 'image/avif',
    codec: 'avif',
    maxTransferBytes: 170 * KIB,
    fallbacks: [
      { kind: 'url', url: '/assets/projects/project-nexus.webp', mimeType: 'image/webp', codec: 'webp' },
      { kind: 'runtime', id: 'static-proof-copy' },
    ],
    sourceRef: 'Project Nexus Stanford Drone validation master',
  },
  proofVideoDesktopWebm: {
    id: 'vs04.media.real-proof.desktop.webm',
    chapter: '04-proof',
    kind: 'evidence-video',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/04-proof/media/real-proof.desktop.webm',
    stage: 'source-approved',
    mimeType: 'video/webm',
    codec: 'vp9-webm',
    maxTransferBytes: 4.75 * MIB,
    fallbacks: [
      { kind: 'url', url: '/assets/projects/project-nexus.webp', mimeType: 'image/webp', codec: 'webp' },
      { kind: 'runtime', id: 'static-proof-copy' },
    ],
    sourceRef: 'Project Nexus Stanford Drone validation master',
  },
  proofVideoDesktopMp4: {
    id: 'vs04.media.real-proof.desktop.mp4',
    chapter: '04-proof',
    kind: 'evidence-video',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/04-proof/media/real-proof.desktop.mp4',
    stage: 'source-approved',
    mimeType: 'video/mp4',
    codec: 'h264-mp4',
    maxTransferBytes: 5.5 * MIB,
    fallbacks: [
      { kind: 'url', url: '/assets/projects/project-nexus.webp', mimeType: 'image/webp', codec: 'webp' },
      { kind: 'runtime', id: 'static-proof-copy' },
    ],
    sourceRef: 'Project Nexus Stanford Drone validation master',
  },
  proofVideoMobileWebm: {
    id: 'vs04.media.real-proof.mobile.webm',
    chapter: '04-proof',
    kind: 'evidence-video',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/04-proof/media/real-proof.mobile.webm',
    stage: 'source-approved',
    mimeType: 'video/webm',
    codec: 'vp9-webm',
    maxTransferBytes: 2.6 * MIB,
    fallbacks: [
      { kind: 'url', url: '/assets/projects/project-nexus.webp', mimeType: 'image/webp', codec: 'webp' },
      { kind: 'runtime', id: 'static-proof-copy' },
    ],
    sourceRef: 'Project Nexus Stanford Drone validation master',
  },
  proofVideoMobileMp4: {
    id: 'vs04.media.real-proof.mobile.mp4',
    chapter: '04-proof',
    kind: 'evidence-video',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/04-proof/media/real-proof.mobile.mp4',
    stage: 'source-approved',
    mimeType: 'video/mp4',
    codec: 'h264-mp4',
    maxTransferBytes: 3 * MIB,
    fallbacks: [
      { kind: 'url', url: '/assets/projects/project-nexus.webp', mimeType: 'image/webp', codec: 'webp' },
      { kind: 'runtime', id: 'static-proof-copy' },
    ],
    sourceRef: 'Project Nexus Stanford Drone validation master',
  },
  proofAwardDesktop: {
    id: 'vs04.media.award.desktop',
    chapter: '04-proof',
    kind: 'evidence-image',
    variant: 'desktop',
    stableUrl: '/assets/vertical-slice/v1/04-proof/media/nexus-award.desktop.avif',
    stage: 'source-approved',
    mimeType: 'image/avif',
    codec: 'avif',
    maxTransferBytes: 320 * KIB,
    fallbacks: [{ kind: 'url', url: '/assets/achievements/project-nexus-2026.webp', mimeType: 'image/webp', codec: 'webp' }],
    sourceRef: 'public/assets/achievements/project-nexus-2026.webp',
  },
  proofAwardMobile: {
    id: 'vs04.media.award.mobile',
    chapter: '04-proof',
    kind: 'evidence-image',
    variant: 'mobile',
    stableUrl: '/assets/vertical-slice/v1/04-proof/media/nexus-award.mobile.avif',
    stage: 'source-approved',
    mimeType: 'image/avif',
    codec: 'avif',
    maxTransferBytes: 210 * KIB,
    fallbacks: [{ kind: 'url', url: '/assets/achievements/project-nexus-2026.webp', mimeType: 'image/webp', codec: 'webp' }],
    sourceRef: 'public/assets/achievements/project-nexus-2026.webp',
  },
} as const satisfies Readonly<Record<string, VerticalSliceAssetSlot>>;

export type VerticalSliceAssetId = keyof typeof VERTICAL_SLICE_ASSETS;

export type VerticalSliceLodGroup = {
  readonly nodeBase: string;
  readonly requiredLevels: readonly [0, 1, 2];
};

export type VerticalSliceAnimationClip = {
  readonly name: string;
  readonly durationSeconds: number;
  readonly driver: 'scroll' | 'ambient';
  readonly loop: boolean;
  readonly targetNodeBases: readonly string[];
};

export type VerticalSliceSpatialNode = {
  readonly node: string;
  readonly semanticId: string;
  readonly shape?: 'box' | 'sphere' | 'capsule' | 'mesh' | 'plane';
  readonly radiusMeters?: number;
  readonly domOwner?: string;
};

export type VerticalSliceCameraCurve = {
  readonly assetId: VerticalSliceAssetId;
  readonly curveId: string;
  readonly cameraObject: string;
  readonly positionCurveObject: string;
  readonly targetCurveObject: string;
  readonly samples: 241;
};

export type VerticalSliceMediaSlot = {
  readonly id: string;
  readonly chapter: VerticalSliceChapterId;
  readonly stage: VerticalSliceAssetStage;
  readonly requiredForFinal: boolean;
  readonly finalAssetIds: readonly VerticalSliceAssetId[];
  readonly blockingReason?: string;
};

export type VerticalSliceFeatureTier = 'cinematic' | 'composed' | 'editorial';

export type VerticalSliceFeatureTierPolicy = {
  readonly availability: 'required' | 'optional' | 'disabled';
  readonly minVisibleInstances: number;
  readonly maxVisibleInstances: number;
};

export type VerticalSliceAuthoredFeature = {
  readonly id: string;
  readonly role: 'identity' | 'architectural-detail' | 'atmosphere';
  readonly intent: string;
  readonly nodeBases: readonly string[];
  readonly animationClip?: string;
  readonly tierPolicy: Readonly<Record<VerticalSliceFeatureTier, VerticalSliceFeatureTierPolicy>>;
};

export type VerticalSliceChapterContract = {
  readonly index: '01' | '02' | '03' | '04';
  readonly journeyChapter: 'threshold' | 'field' | 'lens' | 'proof';
  readonly blenderFile: string;
  readonly exportCollection: string;
  readonly rootNode: string;
  readonly stage: VerticalSliceAssetStage;
  readonly authoredFeatures?: readonly VerticalSliceAuthoredFeature[];
  readonly resources: {
    readonly desktop: readonly VerticalSliceAssetId[];
    readonly mobile: readonly VerticalSliceAssetId[];
    readonly shared: readonly VerticalSliceAssetId[];
  };
  readonly requiredNodes: readonly string[];
  readonly lodGroups: readonly VerticalSliceLodGroup[];
  readonly animationClips: readonly VerticalSliceAnimationClip[];
  readonly cameras: Readonly<Record<VerticalSliceDeliveryTier, VerticalSliceCameraCurve>>;
  readonly collisions: readonly VerticalSliceSpatialNode[];
  readonly hotspots: readonly VerticalSliceSpatialNode[];
  readonly anchors: readonly VerticalSliceSpatialNode[];
  readonly budget: Readonly<Record<VerticalSliceDeliveryTier, VerticalSliceChapterBudget>>;
};

export const VERTICAL_SLICE_MEDIA_SLOTS = {
  thresholdPoster: {
    id: 'media.threshold.poster',
    chapter: '01-threshold',
    stage: 'proxy',
    requiredForFinal: true,
    finalAssetIds: [
      'thresholdPosterDesktopAvif',
      'thresholdPosterDesktopWebp',
      'thresholdPosterMobileAvif',
      'thresholdPosterMobileWebp',
    ],
  },
  fieldSyntheticAerial: {
    id: 'media.nexus.synthetic-aerial',
    chapter: '02-field',
    stage: 'source-approved',
    requiredForFinal: true,
    finalAssetIds: ['fieldAerialDesktop', 'fieldAerialMobile', 'fieldAerialEditorial'],
  },
  lensRawAligned: {
    id: 'media.nexus.raw-aligned',
    chapter: '03-lens',
    stage: 'placeholder',
    requiredForFinal: true,
    finalAssetIds: ['lensRawAlignedDesktop', 'lensRawAlignedMobile', 'lensRawAlignedEditorial'],
    blockingReason: 'The raw RGB frame matching the segmentation and detection outputs has not been supplied.',
  },
  lensSegmentation: {
    id: 'media.nexus.segmentation',
    chapter: '03-lens',
    stage: 'source-approved',
    requiredForFinal: true,
    finalAssetIds: ['lensSegmentationDesktop', 'lensSegmentationMobile', 'lensSegmentationEditorial'],
  },
  lensDetection: {
    id: 'media.nexus.detection',
    chapter: '03-lens',
    stage: 'source-approved',
    requiredForFinal: true,
    finalAssetIds: ['lensDetectionDesktop', 'lensDetectionMobile', 'lensDetectionEditorial'],
  },
  proofRealVideo: {
    id: 'media.nexus.real-proof',
    chapter: '04-proof',
    stage: 'source-approved',
    requiredForFinal: true,
    finalAssetIds: [
      'proofPosterDesktop',
      'proofPosterMobile',
      'proofVideoDesktopWebm',
      'proofVideoDesktopMp4',
      'proofVideoMobileWebm',
      'proofVideoMobileMp4',
    ],
    blockingReason: 'Final web encodes, Stanford source attribution, and publication rights must pass review.',
  },
  proofAward: {
    id: 'media.nexus.award',
    chapter: '04-proof',
    stage: 'source-approved',
    requiredForFinal: true,
    finalAssetIds: ['proofAwardDesktop', 'proofAwardMobile'],
    blockingReason: 'The official result wording and the unidentified attendee must be confirmed before caption lock.',
  },
} as const satisfies Readonly<Record<string, VerticalSliceMediaSlot>>;

export const VERTICAL_SLICE_CHAPTERS = {
  '01-threshold': {
    index: '01',
    journeyChapter: 'threshold',
    blenderFile: 'production/blender/vertical-slice/vs01_threshold.blend',
    exportCollection: 'VS01_THRESHOLD_EXPORT',
    rootNode: 'VS01_Threshold_ROOT',
    stage: 'proxy',
    authoredFeatures: [
      {
        id: 'threshold.neo-gothic-silhouette',
        role: 'identity',
        intent: 'A strong Transylvanian neo-Gothic castle silhouette built from a keep, pointed portal, and paired spires.',
        nodeBases: [
          'ENV_Threshold_GothicKeep',
          'ENV_Threshold_GothicPortal',
          'ENV_Threshold_GothicSpire_01',
          'ENV_Threshold_GothicSpire_02',
        ],
        tierPolicy: {
          cinematic: { availability: 'required', minVisibleInstances: 4, maxVisibleInstances: 4 },
          composed: { availability: 'required', minVisibleInstances: 2, maxVisibleInstances: 4 },
          editorial: { availability: 'disabled', minVisibleInstances: 0, maxVisibleInstances: 0 },
        },
      },
      {
        id: 'threshold.neo-gothic-detail',
        role: 'architectural-detail',
        intent: 'Abstract buttress and tracery modules add deliberate vertical rhythm without competing with the gate aperture.',
        nodeBases: [
          'ENV_Threshold_GothicButtress_01',
          'ENV_Threshold_GothicButtress_02',
          'ENV_Threshold_GothicButtress_03',
          'ENV_Threshold_GothicButtress_04',
          'ENV_Threshold_GothicButtress_05',
          'ENV_Threshold_GothicButtress_06',
          'ENV_Threshold_GothicTracery_01',
          'ENV_Threshold_GothicTracery_02',
          'ENV_Threshold_GothicTracery_03',
        ],
        tierPolicy: {
          cinematic: { availability: 'required', minVisibleInstances: 3, maxVisibleInstances: 9 },
          composed: { availability: 'optional', minVisibleInstances: 0, maxVisibleInstances: 3 },
          editorial: { availability: 'disabled', minVisibleInstances: 0, maxVisibleInstances: 0 },
        },
      },
      {
        id: 'threshold.bear-heraldry',
        role: 'identity',
        intent: 'A physical central bear crest and paired abstract guardian emblems make the team identity architectural and materially credible.',
        nodeBases: [
          'ENV_Threshold_BearCrest',
          'ENV_Threshold_BearEmblem_L',
          'ENV_Threshold_BearEmblem_R',
        ],
        tierPolicy: {
          cinematic: { availability: 'required', minVisibleInstances: 3, maxVisibleInstances: 3 },
          composed: { availability: 'required', minVisibleInstances: 1, maxVisibleInstances: 3 },
          editorial: { availability: 'disabled', minVisibleInstances: 0, maxVisibleInstances: 0 },
        },
      },
      {
        id: 'threshold.sparse-bat-flight',
        role: 'atmosphere',
        intent: 'Sparse authored bat silhouettes provide a restrained Dracula-inflected nocturnal accent at long distance only.',
        nodeBases: [
          'PRP_Threshold_BatSilhouette_01',
          'PRP_Threshold_BatSilhouette_02',
          'PRP_Threshold_BatSilhouette_03',
          'PRP_Threshold_BatSilhouette_04',
          'PRP_Threshold_BatSilhouette_05',
          'PRP_Threshold_BatSilhouette_06',
        ],
        animationClip: 'VS01_Bat_Flight',
        tierPolicy: {
          cinematic: { availability: 'optional', minVisibleInstances: 0, maxVisibleInstances: 6 },
          composed: { availability: 'optional', minVisibleInstances: 0, maxVisibleInstances: 2 },
          editorial: { availability: 'disabled', minVisibleInstances: 0, maxVisibleInstances: 0 },
        },
      },
    ],
    resources: {
      desktop: [
        'thresholdSceneDesktop',
        'thresholdCameraDesktop',
        'thresholdPosterDesktopAvif',
        'thresholdPosterDesktopWebp',
      ],
      mobile: [
        'thresholdSceneMobile',
        'thresholdCameraMobile',
        'thresholdPosterMobileAvif',
        'thresholdPosterMobileWebp',
      ],
      shared: [],
    },
    requiredNodes: [
      'VS01_Threshold_ROOT',
      'COL_Threshold_Ground',
      'COL_Threshold_Gate',
      'HSP_Threshold_GatePivot',
      'HSP_Threshold_WorkshopCore',
      'ANC_Threshold_SignalStart',
      'ANC_Threshold_SignalEnd',
      'ANC_Threshold_HandoffField',
      'ANC_Threshold_Response_01',
      'ANC_Threshold_Response_02',
      'ANC_Threshold_Response_03',
      'ANC_Threshold_Response_04',
      'ANC_Threshold_Response_05',
      'ANC_Threshold_Response_06',
      'ANC_Threshold_BearCrest',
      'ANC_Threshold_BearEmblem_L',
      'ANC_Threshold_BearEmblem_R',
      'ANC_Threshold_BatFlightEntry',
      'ANC_Threshold_BatFlightExit',
    ],
    lodGroups: [
      'ENV_Threshold_Terrain',
      'ENV_Threshold_OuterRing',
      'ENV_Threshold_Gatehouse',
      'ENV_Threshold_WorkshopCore',
      'ENV_Threshold_CarpathiansNear',
      'ENV_Threshold_CarpathiansFar',
      'ENV_Threshold_GothicKeep',
      'ENV_Threshold_GothicPortal',
      'ENV_Threshold_GothicSpire_01',
      'ENV_Threshold_GothicSpire_02',
      'ENV_Threshold_GothicButtress_01',
      'ENV_Threshold_GothicButtress_02',
      'ENV_Threshold_GothicButtress_03',
      'ENV_Threshold_GothicButtress_04',
      'ENV_Threshold_GothicButtress_05',
      'ENV_Threshold_GothicButtress_06',
      'ENV_Threshold_GothicTracery_01',
      'ENV_Threshold_GothicTracery_02',
      'ENV_Threshold_GothicTracery_03',
      'ENV_Threshold_BearCrest',
      'ENV_Threshold_BearEmblem_L',
      'ENV_Threshold_BearEmblem_R',
      'PRP_Threshold_GatePivot',
      'PRP_Threshold_GateBlade_01',
      'PRP_Threshold_GateBlade_02',
      'PRP_Threshold_GateBlade_03',
      'PRP_Threshold_GateBlade_04',
      'PRP_Threshold_GateBlade_05',
      'PRP_Threshold_GateBlade_06',
      'PRP_Threshold_BatSilhouette_01',
      'PRP_Threshold_BatSilhouette_02',
      'PRP_Threshold_BatSilhouette_03',
      'PRP_Threshold_BatSilhouette_04',
      'PRP_Threshold_BatSilhouette_05',
      'PRP_Threshold_BatSilhouette_06',
      'FX_Threshold_SignalRibbon',
    ].map((nodeBase) => ({ nodeBase, requiredLevels: [0, 1, 2] as const })),
    animationClips: [
      { name: 'VS01_Signal_Arrive', durationSeconds: 2, driver: 'scroll', loop: false, targetNodeBases: ['FX_Threshold_SignalRibbon'] },
      { name: 'VS01_Response_Sequence', durationSeconds: 2.4, driver: 'scroll', loop: false, targetNodeBases: ['ANC_Threshold_Response'] },
      { name: 'VS01_Gate_Open', durationSeconds: 3, driver: 'scroll', loop: false, targetNodeBases: ['PRP_Threshold_GateBlade', 'PRP_Threshold_GatePivot'] },
      { name: 'VS01_Bat_Flight', durationSeconds: 6, driver: 'ambient', loop: true, targetNodeBases: ['PRP_Threshold_BatSilhouette'] },
    ],
    cameras: {
      desktop: {
        assetId: 'thresholdCameraDesktop',
        curveId: 'VS01_CAM_Threshold_Desktop',
        cameraObject: 'CAM_Threshold_Desktop',
        positionCurveObject: 'CRV_Threshold_Desktop_Pos',
        targetCurveObject: 'CRV_Threshold_Desktop_Tgt',
        samples: 241,
      },
      mobile: {
        assetId: 'thresholdCameraMobile',
        curveId: 'VS01_CAM_Threshold_Mobile',
        cameraObject: 'CAM_Threshold_Mobile',
        positionCurveObject: 'CRV_Threshold_Mobile_Pos',
        targetCurveObject: 'CRV_Threshold_Mobile_Tgt',
        samples: 241,
      },
    },
    collisions: [
      { node: 'COL_Threshold_Ground', semanticId: 'threshold.ground', shape: 'mesh' },
      { node: 'COL_Threshold_Gate', semanticId: 'threshold.gate', shape: 'box' },
    ],
    hotspots: [
      { node: 'HSP_Threshold_GatePivot', semanticId: 'threshold.gate-pivot', shape: 'sphere', radiusMeters: 0.55 },
      { node: 'HSP_Threshold_WorkshopCore', semanticId: 'threshold.workshop-core', shape: 'sphere', radiusMeters: 1 },
    ],
    anchors: [
      { node: 'ANC_Threshold_SignalStart', semanticId: 'threshold.signal.start' },
      { node: 'ANC_Threshold_SignalEnd', semanticId: 'threshold.signal.end' },
      { node: 'ANC_Threshold_HandoffField', semanticId: 'handoff.threshold-field' },
      { node: 'ANC_Threshold_BearCrest', semanticId: 'threshold.identity.bear-crest' },
      { node: 'ANC_Threshold_BearEmblem_L', semanticId: 'threshold.identity.bear-emblem.left' },
      { node: 'ANC_Threshold_BearEmblem_R', semanticId: 'threshold.identity.bear-emblem.right' },
      { node: 'ANC_Threshold_BatFlightEntry', semanticId: 'threshold.atmosphere.bat-flight.entry' },
      { node: 'ANC_Threshold_BatFlightExit', semanticId: 'threshold.atmosphere.bat-flight.exit' },
      ...([1, 2, 3, 4, 5, 6] as const).map((index) => ({
        node: `ANC_Threshold_Response_0${index}`,
        semanticId: `threshold.response.0${index}`,
      })),
    ],
    budget: VERTICAL_SLICE_BUDGETS.chapters['01-threshold'],
  },
  '02-field': {
    index: '02',
    journeyChapter: 'field',
    blenderFile: 'production/blender/vertical-slice/vs02_synthetic_field.blend',
    exportCollection: 'VS02_FIELD_EXPORT',
    rootNode: 'VS02_Field_ROOT',
    stage: 'proxy',
    resources: {
      desktop: ['fieldSceneDesktop', 'fieldCameraDesktop', 'fieldAerialDesktop'],
      mobile: ['fieldSceneMobile', 'fieldCameraMobile', 'fieldAerialMobile'],
      shared: ['fieldAerialEditorial'],
    },
    requiredNodes: [
      'VS02_Field_ROOT',
      'COL_Field_Ground',
      'COL_Field_Bounds',
      'HSP_Field_Sample',
      'HSP_Field_Drone',
      'ANC_Field_MediaAerial',
      'ANC_Field_HandoffLens',
    ],
    lodGroups: [
      'ENV_Field_Ground',
      'ENV_Field_Road',
      'ENV_Field_Block_A',
      'ENV_Field_Block_B',
      'ENV_Field_Block_C',
      'ENV_Field_DataKeep',
      'PRP_Field_SurveyDrone',
      'PRP_Field_TrackedSubject_A',
      'PRP_Field_TrackedSubject_B',
      'FX_Field_DataStream_A',
      'FX_Field_DataStream_B',
      'FX_Field_DataStream_C',
    ].map((nodeBase) => ({ nodeBase, requiredLevels: [0, 1, 2] as const })),
    animationClips: [
      { name: 'VS02_Field_Reveal', durationSeconds: 2, driver: 'scroll', loop: false, targetNodeBases: ['ENV_Field'] },
      { name: 'VS02_Drone_Flyby', durationSeconds: 4, driver: 'scroll', loop: false, targetNodeBases: ['PRP_Field_SurveyDrone'] },
      { name: 'VS02_Data_Flow', durationSeconds: 3, driver: 'ambient', loop: true, targetNodeBases: ['FX_Field_DataStream'] },
    ],
    cameras: {
      desktop: {
        assetId: 'fieldCameraDesktop',
        curveId: 'VS02_CAM_Field_Desktop',
        cameraObject: 'CAM_Field_Desktop',
        positionCurveObject: 'CRV_Field_Desktop_Pos',
        targetCurveObject: 'CRV_Field_Desktop_Tgt',
        samples: 241,
      },
      mobile: {
        assetId: 'fieldCameraMobile',
        curveId: 'VS02_CAM_Field_Mobile',
        cameraObject: 'CAM_Field_Mobile',
        positionCurveObject: 'CRV_Field_Mobile_Pos',
        targetCurveObject: 'CRV_Field_Mobile_Tgt',
        samples: 241,
      },
    },
    collisions: [
      { node: 'COL_Field_Ground', semanticId: 'field.ground', shape: 'mesh' },
      { node: 'COL_Field_Bounds', semanticId: 'field.bounds', shape: 'box' },
    ],
    hotspots: [
      { node: 'HSP_Field_Sample', semanticId: 'field.sample', shape: 'sphere', radiusMeters: 0.75 },
      { node: 'HSP_Field_Drone', semanticId: 'field.drone', shape: 'sphere', radiusMeters: 0.8 },
    ],
    anchors: [
      { node: 'ANC_Field_MediaAerial', semanticId: 'media.nexus.synthetic-aerial', domOwner: 'mf-field' },
      { node: 'ANC_Field_HandoffLens', semanticId: 'handoff.field-lens' },
    ],
    budget: VERTICAL_SLICE_BUDGETS.chapters['02-field'],
  },
  '03-lens': {
    index: '03',
    journeyChapter: 'lens',
    blenderFile: 'production/blender/vertical-slice/vs03_lens.blend',
    exportCollection: 'VS03_LENS_EXPORT',
    rootNode: 'VS03_Lens_ROOT',
    stage: 'proxy',
    resources: {
      desktop: [
        'lensSceneDesktop',
        'lensCameraDesktop',
        'lensRawAlignedDesktop',
        'lensSegmentationDesktop',
        'lensDetectionDesktop',
      ],
      mobile: [
        'lensSceneMobile',
        'lensCameraMobile',
        'lensRawAlignedMobile',
        'lensSegmentationMobile',
        'lensDetectionMobile',
      ],
      shared: ['lensRawAlignedEditorial', 'lensSegmentationEditorial', 'lensDetectionEditorial'],
    },
    requiredNodes: [
      'VS03_Lens_ROOT',
      'COL_Lens_Pick',
      'HSP_Lens_Optic',
      'ANC_Lens_ModeRaw',
      'ANC_Lens_ModeSegmentation',
      'ANC_Lens_ModeDetection',
      'ANC_Lens_HandoffProof',
    ],
    lodGroups: [
      'PRP_Lens_Housing',
      'PRP_Lens_OuterRing',
      'PRP_Lens_InnerRing',
      'PRP_Lens_Glass',
      'FX_Lens_Reticle',
    ].map((nodeBase) => ({ nodeBase, requiredLevels: [0, 1, 2] as const })),
    animationClips: [
      { name: 'VS03_Lens_Deploy', durationSeconds: 1.5, driver: 'scroll', loop: false, targetNodeBases: ['PRP_Lens'] },
      { name: 'VS03_Lens_Focus', durationSeconds: 1, driver: 'scroll', loop: false, targetNodeBases: ['PRP_Lens_InnerRing', 'FX_Lens_Reticle'] },
    ],
    cameras: {
      desktop: {
        assetId: 'lensCameraDesktop',
        curveId: 'VS03_CAM_Lens_Desktop',
        cameraObject: 'CAM_Lens_Desktop',
        positionCurveObject: 'CRV_Lens_Desktop_Pos',
        targetCurveObject: 'CRV_Lens_Desktop_Tgt',
        samples: 241,
      },
      mobile: {
        assetId: 'lensCameraMobile',
        curveId: 'VS03_CAM_Lens_Mobile',
        cameraObject: 'CAM_Lens_Mobile',
        positionCurveObject: 'CRV_Lens_Mobile_Pos',
        targetCurveObject: 'CRV_Lens_Mobile_Tgt',
        samples: 241,
      },
    },
    collisions: [{ node: 'COL_Lens_Pick', semanticId: 'lens.pick-volume', shape: 'sphere', radiusMeters: 1.2 }],
    hotspots: [
      { node: 'HSP_Lens_Optic', semanticId: 'lens.optic', shape: 'sphere', radiusMeters: 1.2, domOwner: 'mf-lens' },
    ],
    anchors: [
      { node: 'ANC_Lens_ModeRaw', semanticId: 'media.nexus.raw-aligned', domOwner: 'mf-lens' },
      { node: 'ANC_Lens_ModeSegmentation', semanticId: 'media.nexus.segmentation', domOwner: 'mf-lens' },
      { node: 'ANC_Lens_ModeDetection', semanticId: 'media.nexus.detection', domOwner: 'mf-lens' },
      { node: 'ANC_Lens_HandoffProof', semanticId: 'handoff.lens-proof' },
    ],
    budget: VERTICAL_SLICE_BUDGETS.chapters['03-lens'],
  },
  '04-proof': {
    index: '04',
    journeyChapter: 'proof',
    blenderFile: 'production/blender/vertical-slice/vs04_evidence.blend',
    exportCollection: 'VS04_PROOF_EXPORT',
    rootNode: 'VS04_Proof_ROOT',
    stage: 'proxy',
    resources: {
      desktop: [
        'proofSceneDesktop',
        'proofCameraDesktop',
        'proofPosterDesktop',
        'proofVideoDesktopWebm',
        'proofVideoDesktopMp4',
        'proofAwardDesktop',
      ],
      mobile: [
        'proofSceneMobile',
        'proofCameraMobile',
        'proofPosterMobile',
        'proofVideoMobileWebm',
        'proofVideoMobileMp4',
        'proofAwardMobile',
      ],
      shared: [],
    },
    requiredNodes: [
      'VS04_Proof_ROOT',
      'COL_Proof_Frame',
      'HSP_Proof_Media',
      'HSP_Proof_SourceLink',
      'ANC_Proof_Raw',
      'ANC_Proof_Segmentation',
      'ANC_Proof_Detection',
      'ANC_Proof_RealVideo',
      'ANC_Proof_Award',
      'ANC_Proof_HandoffAegis',
    ],
    lodGroups: [
      'ENV_Proof_Clearing',
      'PRP_Proof_MediaFrame',
      'PRP_Proof_AwardMount',
      'FX_Proof_TransitionLines',
    ].map((nodeBase) => ({ nodeBase, requiredLevels: [0, 1, 2] as const })),
    animationClips: [
      { name: 'VS04_Evidence_Unfold', durationSeconds: 2, driver: 'scroll', loop: false, targetNodeBases: ['PRP_Proof_MediaFrame', 'PRP_Proof_AwardMount'] },
      { name: 'VS04_Handoff_Aegis', durationSeconds: 1.8, driver: 'scroll', loop: false, targetNodeBases: ['FX_Proof_TransitionLines'] },
    ],
    cameras: {
      desktop: {
        assetId: 'proofCameraDesktop',
        curveId: 'VS04_CAM_Proof_Desktop',
        cameraObject: 'CAM_Proof_Desktop',
        positionCurveObject: 'CRV_Proof_Desktop_Pos',
        targetCurveObject: 'CRV_Proof_Desktop_Tgt',
        samples: 241,
      },
      mobile: {
        assetId: 'proofCameraMobile',
        curveId: 'VS04_CAM_Proof_Mobile',
        cameraObject: 'CAM_Proof_Mobile',
        positionCurveObject: 'CRV_Proof_Mobile_Pos',
        targetCurveObject: 'CRV_Proof_Mobile_Tgt',
        samples: 241,
      },
    },
    collisions: [{ node: 'COL_Proof_Frame', semanticId: 'proof.media-frame', shape: 'box' }],
    hotspots: [
      { node: 'HSP_Proof_Media', semanticId: 'proof.media', shape: 'plane', domOwner: 'mf-proof' },
      { node: 'HSP_Proof_SourceLink', semanticId: 'proof.source-link', shape: 'sphere', radiusMeters: 0.35, domOwner: 'mf-proof' },
    ],
    anchors: [
      { node: 'ANC_Proof_Raw', semanticId: 'media.nexus.raw-aligned', domOwner: 'mf-proof' },
      { node: 'ANC_Proof_Segmentation', semanticId: 'media.nexus.segmentation', domOwner: 'mf-proof' },
      { node: 'ANC_Proof_Detection', semanticId: 'media.nexus.detection', domOwner: 'mf-proof' },
      { node: 'ANC_Proof_RealVideo', semanticId: 'media.nexus.real-proof', domOwner: 'mf-proof' },
      { node: 'ANC_Proof_Award', semanticId: 'media.nexus.award', domOwner: 'mf-proof' },
      { node: 'ANC_Proof_HandoffAegis', semanticId: 'handoff.proof-aegis' },
    ],
    budget: VERTICAL_SLICE_BUDGETS.chapters['04-proof'],
  },
} as const satisfies Readonly<Record<VerticalSliceChapterId, VerticalSliceChapterContract>>;

export const VERTICAL_SLICE_VALIDATION_RULES = [
  'stable-url-unique-and-versioned',
  'required-files-exist-with-correct-mime',
  'khronos-gltf-validator-zero-errors',
  'canonical-glb-meshopt-not-draco',
  'required-node-names-exactly-once',
  'root-transform-is-identity-and-scale-is-meters',
  'lod-levels-present-and-monotonically-reduced',
  'pbr-channel-and-color-space-contract',
  'ktx2-mip-chain-complete',
  'baked-gi-uses-texcoord-one-and-excludes-dynamic-nodes',
  'animation-clips-have-approved-names-durations-and-endpoints',
  'camera-curves-have-241-finite-monotonic-samples',
  'chapter-handoff-curves-meet-position-target-and-fov-tolerances',
  'collision-hotspot-and-anchor-nodes-have-valid-extras',
  'chapter-01-neo-gothic-bear-and-bat-feature-policy',
  'desktop-and-mobile-budgets-pass-on-wire-and-at-runtime',
  'media-provenance-rights-crop-and-caption-approved',
  'reverse-scrub-reconstructs-the-previous-state',
  'url-and-runtime-fallbacks-pass-with-webgl-disabled',
  'no-required-slot-remains-before-final-stage',
] as const;

export type ResolvedVerticalSliceAsset =
  | {
      readonly kind: 'url';
      readonly source: 'stable' | 'fallback';
      readonly url: PublicAssetUrl;
      readonly mimeType: VerticalSliceAssetMimeType;
      readonly codec: VerticalSliceAssetCodec;
    }
  | {
      readonly kind: 'runtime';
      readonly source: 'fallback';
      readonly id: VerticalSliceRuntimeFallbackId;
    };

export type ResolveVerticalSliceAssetOptions = {
  /** Candidate assets are available only in explicit review builds. */
  readonly allowCandidate?: boolean;
};

export function isVerticalSliceStableAssetLoadable(
  stage: VerticalSliceAssetStage,
  options: ResolveVerticalSliceAssetOptions = {},
): boolean {
  return stage === 'final' || (stage === 'candidate' && options.allowCandidate === true);
}

export function resolveVerticalSliceAsset(
  asset: VerticalSliceAssetSlot,
  options: ResolveVerticalSliceAssetOptions = {},
): ResolvedVerticalSliceAsset | undefined {
  if (isVerticalSliceStableAssetLoadable(asset.stage, options)) {
    return {
      kind: 'url',
      source: 'stable',
      url: asset.stableUrl,
      mimeType: asset.mimeType,
      codec: asset.codec,
    };
  }

  const fallback = asset.fallbacks[0];
  if (!fallback) return undefined;
  if (fallback.kind === 'runtime') {
    return { kind: 'runtime', source: 'fallback', id: fallback.id };
  }

  return {
    kind: 'url',
    source: 'fallback',
    url: fallback.url,
    mimeType: fallback.mimeType,
    codec: fallback.codec,
  };
}

export function getVerticalSliceAsset(assetId: VerticalSliceAssetId): VerticalSliceAssetSlot {
  return VERTICAL_SLICE_ASSETS[assetId];
}

export const VERTICAL_SLICE_ASSET_MANIFEST = {
  schemaVersion: VERTICAL_SLICE_SCHEMA_VERSION,
  release: VERTICAL_SLICE_RELEASE,
  baseUrl: VERTICAL_SLICE_BASE_URL,
  stages: VERTICAL_SLICE_ASSET_STAGES,
  deliveryPolicy: VERTICAL_SLICE_DELIVERY_POLICY,
  pbrTextures: VERTICAL_SLICE_PBR_TEXTURES,
  budgets: VERTICAL_SLICE_BUDGETS,
  assets: VERTICAL_SLICE_ASSETS,
  mediaSlots: VERTICAL_SLICE_MEDIA_SLOTS,
  chapters: VERTICAL_SLICE_CHAPTERS,
  validationRules: VERTICAL_SLICE_VALIDATION_RULES,
} as const;
