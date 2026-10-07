#!/usr/bin/env node
/**
 * Turns the six transparent team portraits in public/assets/membrii/ into
 * "die-cut sticker" cutouts in public/assets/team/:
 *
 *   - transparent margins are trimmed so every figure sits flush on the baseline,
 *   - a bone-coloured outline is baked in on the top and sides (the bottom stays
 *     flush because the capes are cropped by the original photo),
 *   - output is WebP with alpha.
 *
 *   npm run build:portraits
 *
 * The originals are never modified.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'public', 'assets', 'membrii');
const OUT = join(__dirname, '..', 'public', 'assets', 'team');

const MEMBERS = [
  { id: 'calin-nedelcu', file: 'CalinNedelcu.webp' },
  { id: 'vlad-bostina', file: 'VladBostina.webp' },
  { id: 'andrei-cheroiu', file: 'AndreiCheroiu.webp' },
  { id: 'alex-istrate', file: 'AlexIstrate.webp' },
  { id: 'cristian-buloi', file: 'CristianBuloi.webp' },
  { id: 'vlad-colan', file: 'VladColan.webp' },
];

const OUTLINE = 9; // px at source resolution (about 4 CSS px when shown at ~half size)
const BONE = { r: 245, g: 238, b: 223 };

async function visibleBox(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

await mkdir(OUT, { recursive: true });

for (const member of MEMBERS) {
  const input = join(SRC, member.file);
  const box = await visibleBox(input);

  // 1. Trim, then pad the top and sides so the outline has room to grow.
  const trimmed = await sharp(input)
    .extract(box)
    .extend({ top: OUTLINE, left: OUTLINE, right: OUTLINE, bottom: OUTLINE, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .png()
    .toBuffer();
  const { width, height } = await sharp(trimmed).metadata();

  // 2. Dilate the alpha channel into an outline mask.
  const mask = await sharp(trimmed)
    .extractChannel(3)
    .blur(OUTLINE / 1.6)
    .threshold(14)
    .blur(0.8)
    .toBuffer();

  const outline = await sharp({ create: { width, height, channels: 3, background: BONE } })
    .joinChannel(mask)
    .png()
    .toBuffer();

  // 3. Original on top of the outline, then drop the bottom padding so the cut is flush.
  //    (sharp runs extract before composite, so this takes two passes.)
  const stacked = await sharp(outline).composite([{ input: trimmed }]).png().toBuffer();
  const final = await sharp(stacked)
    .extract({ left: 0, top: 0, width, height: height - OUTLINE })
    .webp({ quality: 88, alphaQuality: 95, effort: 6 })
    .toBuffer({ resolveWithObject: true });

  await sharp(final.data).toFile(join(OUT, `${member.id}.webp`));
  console.log(`${member.id}.webp  ${final.info.width}x${final.info.height}  ${(final.info.size / 1024).toFixed(1)}KB`);
}
