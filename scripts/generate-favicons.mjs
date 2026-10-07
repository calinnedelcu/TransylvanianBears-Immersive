#!/usr/bin/env node
/**
 * Renders the PNG favicons and the Apple touch icon from public/favicon.svg.
 *
 *   npm run generate:favicons
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const svg = await readFile(join(PUBLIC, 'favicon.svg'));

for (const { size, name } of [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
]) {
  await sharp(svg, { density: Math.max(72, size * 6) })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(PUBLIC, name));
  console.log(`Wrote ${name}`);
}
