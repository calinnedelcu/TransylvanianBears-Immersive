#!/usr/bin/env node
/**
 * Convert every PNG under public/assets/ (recursively) into a WebP sibling.
 * Skips files whose `.webp` is already newer than the source. Run with:
 *
 *   npm run optimize:images
 *
 * The PNGs are kept on disk so `<picture>` fallbacks (or pre-WebP browsers)
 * still resolve. Components reference the `.webp` directly when modern
 * browsers are the only target.
 */
import { readdir, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'public', 'assets');

// Quality knob — 78 is a strong sweet spot for photographic + flat layers.
const QUALITY = 78;
// Files larger than this in bytes get re-checked even if the .webp exists,
// in case someone replaced the PNG without bumping mtime. Generous.
const FORCE_RECHECK_BYTES = 0;

/** Walk a directory recursively and yield every absolute file path. */
async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

async function shouldConvert(pngPath, webpPath) {
  if (!existsSync(webpPath)) return true;
  const [pngStat, webpStat] = await Promise.all([stat(pngPath), stat(webpPath)]);
  if (FORCE_RECHECK_BYTES && pngStat.size > FORCE_RECHECK_BYTES) return true;
  return pngStat.mtimeMs > webpStat.mtimeMs;
}

async function convertOne(pngPath) {
  const webpPath = pngPath.replace(/\.png$/i, '.webp');
  if (!(await shouldConvert(pngPath, webpPath))) {
    return { pngPath, status: 'skip' };
  }
  await mkdir(dirname(webpPath), { recursive: true });
  const before = (await stat(pngPath)).size;
  await sharp(pngPath)
    .webp({ quality: QUALITY, effort: 5, smartSubsample: true })
    .toFile(webpPath);
  const after = (await stat(webpPath)).size;
  return { pngPath, webpPath, status: 'ok', before, after };
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  if (!existsSync(ROOT)) {
    console.error(`No assets directory at ${ROOT}`);
    process.exit(1);
  }
  const pngs = [];
  for await (const file of walk(ROOT)) {
    if (extname(file).toLowerCase() === '.png') pngs.push(file);
  }
  console.log(`Found ${pngs.length} PNG(s) under ${ROOT}`);
  let totalBefore = 0;
  let totalAfter = 0;
  let converted = 0;
  let skipped = 0;
  for (const png of pngs) {
    const result = await convertOne(png);
    const rel = result.pngPath.replace(ROOT, '').replace(/^[\\/]/, '');
    if (result.status === 'skip') {
      skipped += 1;
      console.log(`  · skip   ${rel}`);
      continue;
    }
    converted += 1;
    totalBefore += result.before;
    totalAfter += result.after;
    const pct = ((1 - result.after / result.before) * 100).toFixed(0);
    console.log(`  ✓ webp   ${rel}  ${fmtBytes(result.before)} → ${fmtBytes(result.after)}  (-${pct}%)`);
  }
  console.log('');
  console.log(`Converted ${converted}, skipped ${skipped}`);
  if (converted > 0) {
    const pct = ((1 - totalAfter / totalBefore) * 100).toFixed(0);
    console.log(`Total: ${fmtBytes(totalBefore)} → ${fmtBytes(totalAfter)}  (-${pct}%)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
