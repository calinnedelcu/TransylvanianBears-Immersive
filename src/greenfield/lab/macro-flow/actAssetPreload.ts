import { useGLTF, useTexture } from '@react-three/drei';

const NEXUS_EVIDENCE_TEXTURES = [
  '/assets/projects/nexus-ue5-aerial.webp',
  '/assets/projects/nexus-segmentation.webp',
  '/assets/projects/nexus-detection.webp',
];
const SCHOOL_ACT_MODEL_URL = '/assets/world/school-act/school-passage.glb';
const SCHOOL_ACT_MEDIA = [
  '/assets/projects/aegis.webp',
  '/assets/projects/schoolmate.webp',
];

export function prepareNexusActAssets() {
  useTexture.preload(NEXUS_EVIDENCE_TEXTURES);
}

export function prepareSchoolActAssets() {
  useGLTF.preload(SCHOOL_ACT_MODEL_URL, false, true);
  useTexture.preload(SCHOOL_ACT_MEDIA);
}
