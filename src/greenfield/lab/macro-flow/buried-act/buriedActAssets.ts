import { useGLTF, useTexture } from '@react-three/drei';
import { publicAssetUrl } from './publicAssetUrl';

export const BURIED_ACT_MODEL_URL = publicAssetUrl('assets/world/buried-act/buried-mausoleum.glb');

export const BURIED_ACT_MEDIA = [
  {
    id: 'mechanism',
    anchor: 'SCR_Buried_Mechanism',
    url: publicAssetUrl('assets/projects/buried-hands/mechanism.webp'),
    mobileUrl: publicAssetUrl('assets/projects/buried-hands/mobile/mechanism.webp'),
    fallbackWidth: 6.8,
    fallbackHeight: 3.56,
  },
  {
    id: 'guards',
    anchor: 'SCR_Buried_Guards',
    url: publicAssetUrl('assets/projects/buried-hands/guards.webp'),
    mobileUrl: publicAssetUrl('assets/projects/buried-hands/mobile/guards.webp'),
    fallbackWidth: 6.8,
    fallbackHeight: 3.56,
  },
  {
    id: 'mercury',
    anchor: 'SCR_Buried_Mercury',
    url: publicAssetUrl('assets/projects/buried-hands/mercury.webp'),
    mobileUrl: publicAssetUrl('assets/projects/buried-hands/mobile/mercury.webp'),
    fallbackWidth: 6.8,
    fallbackHeight: 3.56,
  },
  {
    id: 'royal-hall',
    anchor: 'SCR_Buried_RoyalHall',
    url: publicAssetUrl('assets/projects/buried-hands/royal-hall.webp'),
    mobileUrl: publicAssetUrl('assets/projects/buried-hands/mobile/royal-hall.webp'),
    fallbackWidth: 7.4,
    fallbackHeight: 3.87,
  },
] as const;

export function prepareBuriedActAssets() {
  const compact = window.innerWidth <= 820;
  useGLTF.preload(BURIED_ACT_MODEL_URL, false, true);
  useTexture.preload(BURIED_ACT_MEDIA.map((entry) => compact ? entry.mobileUrl : entry.url));
}
