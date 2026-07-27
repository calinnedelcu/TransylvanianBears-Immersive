import { useGLTF, useTexture } from '@react-three/drei';

const NEXUS_FIELD_TEXTURE = '/assets/projects/nexus-ue5-aerial.webp';
const SCHOOL_ACT_MODEL_URL = '/assets/world/school-act/school-passage.glb';
const SCHOOL_ACT_MEDIA = [
  '/assets/projects/aegis.webp',
  '/assets/projects/schoolmate.webp',
];

export function prepareNexusActAssets() {
  useTexture.preload(NEXUS_FIELD_TEXTURE);
}

export function prepareSchoolActAssets() {
  useGLTF.preload(SCHOOL_ACT_MODEL_URL, false, true);
  useTexture.preload(SCHOOL_ACT_MEDIA);
}
