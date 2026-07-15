#!/usr/bin/env node
/**
 * Compose the Open Graph share image at 1200×630 (Facebook / LinkedIn /
 * Twitter / Slack).
 *
 *   npm run generate:og
 *
 * Layers (bottom → top):
 *   1. Wine gradient base + grain
 *   2. Mountains/forest silhouettes pulled from public/assets/ (faded)
 *   3. Bear mascot, anchored bottom-right
 *   4. Title block, anchored bottom-left, with eyebrow + tagline + brand line
 *   5. Gold corner ornaments + thin border for that tarot-card seal feel
 *
 * Output: public/og-image.jpg (JPEG for smallest size + universal share
 * compatibility — many older crawlers don't accept WebP for OG).
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'public', 'assets');
const OUT = join(ROOT, 'public', 'og-image.jpg');

const WIDTH = 1200;
const HEIGHT = 630;

/** Wine→deep gradient base with grain texture. */
function backgroundSvg() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A0509" />
      <stop offset="50%" stop-color="#2A0810" />
      <stop offset="100%" stop-color="#4A0E1F" />
    </linearGradient>
    <radialGradient id="moon" cx="22%" cy="32%" r="40%">
      <stop offset="0%" stop-color="rgba(248,232,208,0.18)" />
      <stop offset="60%" stop-color="rgba(232,181,71,0.06)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0)" />
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)" />
  <rect width="100%" height="100%" fill="url(#moon)" />
  <rect width="100%" height="100%" filter="url(#grain)" opacity="0.18" />
</svg>`.trim();
}

/** Title block, eyebrow, tagline, and corner ornaments — composed as SVG. */
function foregroundSvg() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E8B547" />
      <stop offset="50%" stop-color="#F5D78A" />
      <stop offset="100%" stop-color="#F8E8D0" />
    </linearGradient>
  </defs>

  <!-- Outer frame: thin gold border with inset offset -->
  <rect x="32" y="32" width="${WIDTH - 64}" height="${HEIGHT - 64}"
        fill="none" stroke="url(#gold)" stroke-width="1.2" stroke-opacity="0.55" />
  <rect x="42" y="42" width="${WIDTH - 84}" height="${HEIGHT - 84}"
        fill="none" stroke="url(#gold)" stroke-width="0.6" stroke-opacity="0.3" />

  <!-- Corner ornaments (T-fleurons) -->
  ${[
    [50, 50, 0],
    [WIDTH - 50, 50, 90],
    [WIDTH - 50, HEIGHT - 50, 180],
    [50, HEIGHT - 50, 270],
  ]
    .map(
      ([cx, cy, rot]) => `
    <g transform="translate(${cx} ${cy}) rotate(${rot})" stroke="url(#gold)" stroke-width="1.4" stroke-opacity="0.7" fill="none">
      <line x1="0" y1="0" x2="32" y2="0" />
      <line x1="0" y1="0" x2="0" y2="32" />
      <circle cx="0" cy="0" r="3" fill="url(#gold)" stroke="none" />
    </g>`,
    )
    .join('\n')}

  <!-- Eyebrow rule + chip -->
  <g transform="translate(86 200)">
    <line x1="0" y1="0" x2="60" y2="0" stroke="url(#gold)" stroke-width="1.5" stroke-opacity="0.85" />
    <text x="76" y="5" font-family="'JetBrains Mono', 'Courier New', monospace"
          font-size="20" letter-spacing="6" fill="#E8B547" fill-opacity="0.95">
      COLEGIUL NAȚIONAL TUDOR VIANU
    </text>
  </g>

  <!-- Title -->
  <text x="86" y="320" font-family="'Cinzel', serif"
        font-size="98" font-weight="700" letter-spacing="-2" fill="url(#gold)">
    TransylvanianBears
  </text>

  <!-- Tagline -->
  <text x="86" y="395" font-family="'Manrope', system-ui, sans-serif"
        font-size="32" font-weight="300" fill="#F8E8D0" fill-opacity="0.85" letter-spacing="0.5">
    Codăm · Concurăm · Câștigăm
  </text>

  <!-- Brand stamp bottom-left -->
  <g transform="translate(86 530)">
    <line x1="0" y1="-20" x2="40" y2="-20" stroke="url(#gold)" stroke-width="1" stroke-opacity="0.6" />
    <text x="0" y="0" font-family="'JetBrains Mono', monospace"
          font-size="14" letter-spacing="3" fill="#E8B547" fill-opacity="0.7">
      VANATORII DIN CARPATI · TRANSILVANIA
    </text>
  </g>

  <!-- Bottom dimming so bear merges into card -->
  <rect x="0" y="${HEIGHT - 140}" width="${WIDTH}" height="140"
        fill="url(#fadeBottom)" />
  <defs>
    <linearGradient id="fadeBottom" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(26,5,9,0)" />
      <stop offset="100%" stop-color="rgba(26,5,9,0.7)" />
    </linearGradient>
  </defs>
</svg>`.trim();
}

async function loadOptional(filename, transform) {
  try {
    const buf = await readFile(join(ASSETS, filename));
    return await transform(sharp(buf));
  } catch (err) {
    console.warn(`  ! ${filename} not available — skipping (${err.message})`);
    return null;
  }
}

async function main() {
  console.log(`Composing ${WIDTH}×${HEIGHT} OG image...`);

  // 1. Base canvas (wine gradient + grain + soft moon)
  const base = sharp(Buffer.from(backgroundSvg())).png();

  const composites = [];

  // 2. Mountains layer — silhouette behind everything, faded to ~25%
  const mountains = await loadOptional('mountains-near.png', (img) =>
    img
      .resize({ width: WIDTH, height: HEIGHT, fit: 'cover', position: 'bottom' })
      .modulate({ brightness: 0.7, saturation: 0.6 })
      .ensureAlpha()
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"><rect width="100%" height="100%" fill="rgba(0,0,0,0.65)"/></svg>`,
          ),
          blend: 'multiply',
        },
      ])
      .toBuffer(),
  );
  if (mountains) composites.push({ input: mountains, top: 0, left: 0, blend: 'over' });

  // 3. Forest silhouette — bottom strip
  const forest = await loadOptional('forest.png', (img) =>
    img
      .resize({ width: WIDTH, height: 320, fit: 'cover', position: 'bottom' })
      .modulate({ brightness: 0.5 })
      .toBuffer(),
  );
  if (forest)
    composites.push({ input: forest, top: HEIGHT - 320, left: 0, blend: 'over' });

  // 4. Bear mascot — anchored bottom-right
  const bear = await loadOptional('bear-mascot.png', (img) =>
    img.resize({ width: 460, fit: 'inside' }).toBuffer(),
  );
  if (bear)
    composites.push({ input: bear, top: HEIGHT - 470, left: WIDTH - 480, blend: 'over' });

  // 5. Foreground SVG (title, frame, ornaments)
  composites.push({
    input: Buffer.from(foregroundSvg()),
    top: 0,
    left: 0,
    blend: 'over',
  });

  await base
    .composite(composites)
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(OUT);

  console.log(`✓ Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
