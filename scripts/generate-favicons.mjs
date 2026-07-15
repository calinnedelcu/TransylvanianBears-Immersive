#!/usr/bin/env node
/**
 * Generate favicon variants from public/assets/logo.png:
 *   - public/favicon-16x16.png
 *   - public/favicon-32x32.png
 *   - public/apple-touch-icon.png (180x180)
 *
 * Run with: npm run generate:favicons
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'public', 'assets', 'logo.png');

const VARIANTS = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

async function main() {
  if (!existsSync(SRC)) {
    console.error(`Source logo missing: ${SRC}`);
    process.exit(1);
  }
  for (const { size, name } of VARIANTS) {
    const dst = join(ROOT, 'public', name);
    await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(dst);
    const bytes = (await stat(dst)).size;
    console.log(`  ✓ ${name}  ${size}×${size}  ${(bytes / 1024).toFixed(1)} KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
