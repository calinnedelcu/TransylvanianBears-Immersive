import { access, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const worldDir = path.join(root, 'public', 'assets', 'world');
const source = path.join(worldDir, 'first-light-poster.png');
const output = path.join(worldDir, 'first-light-poster.webp');
const rawModel = path.join(worldDir, 'first-light-citadel.raw.glb');

await access(source);
await sharp(source)
  .resize(1600, 900, { fit: 'cover' })
  .webp({ quality: 84, effort: 6 })
  .toFile(output);

await Promise.all([unlink(source), unlink(rawModel)]);
console.log(`Wrote ${path.relative(root, output)}`);
