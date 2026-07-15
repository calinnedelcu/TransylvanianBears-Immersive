#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'public');

function mark(size) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
      <rect width="100" height="100" rx="${size >= 180 ? 18 : 10}" fill="#070a0b"/>
      <path d="M8 30 24 12l18 6 8-7 8 7 18-6 16 18-7 21 7 19-18 17-16 8H42l-16-8L8 70l7-19Z" fill="#e4e1d9"/>
      <path d="M29 35 50 22l21 13 6 20-15 18-12-15-12 15-15-18Z" fill="#0b1012"/>
      <rect x="45" y="45" width="10" height="10" transform="rotate(45 50 50)" fill="#df6553"/>
      <path d="M20 79 50 91l30-12" fill="none" stroke="#72d9d6" stroke-width="3"/>
    </svg>`;
}

for (const { size, name } of [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
]) {
  await sharp(Buffer.from(mark(size))).png({ compressionLevel: 9 }).toFile(join(ROOT, name));
  console.log(`Wrote ${name}`);
}
