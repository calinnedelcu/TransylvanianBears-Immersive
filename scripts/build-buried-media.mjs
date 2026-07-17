import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const sourceDirectory = 'public/assets/projects/buried-hands';
const outputDirectory = `${sourceDirectory}/mobile`;
const frames = ['mechanism', 'guards', 'mercury', 'royal-hall'];

await mkdir(outputDirectory, { recursive: true });
for (const frame of frames) {
  await sharp(`${sourceDirectory}/${frame}.webp`)
    .resize({ width: 1024, withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 })
    .toFile(`${outputDirectory}/${frame}.webp`);
}

console.log(`[build-buried-media] generated ${frames.length} mobile evidence textures`);
