#!/usr/bin/env node
/**
 * Builds public/og-image.jpg (1200x630) from the real hero of the site, so the
 * social preview always matches what visitors see.
 *
 *   npm run build && npm run generate:og
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'og-image.jpg');
const PORT = 4175;

if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error('No dist/ found. Run `npm run build` first.');
  process.exit(2);
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
const url = `http://localhost:${PORT}/`;

try {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {
      /* server not ready yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const browser = await chromium.launch();
  // Captured at laptop width (where the hero is at its best) and scaled down to the 1.91:1 card.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '.site-header{display:none!important}.marquee{display:none!important}' });
  await page.evaluate(async () => {
    const images = [...document.querySelectorAll('.hero img')];
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
  });
  await page.waitForTimeout(500);
  const shot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1440, height: 756 } });
  await browser.close();
  await sharp(shot).resize(1200, 630).jpeg({ quality: 90, mozjpeg: true }).toFile(OUT);
  console.log(`Wrote ${OUT}`);
} finally {
  server.kill();
}
