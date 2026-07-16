import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4176';
const outputDir = resolve(process.env.QA_OUTPUT_DIR ?? '/tmp/transylvanian-bears-qa');
const errors = [];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

function collectErrors(page, scope) {
  page.on('pageerror', (error) => errors.push(`${scope}: pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${scope}: console: ${message.text()}`);
  });
}

async function waitForWorld(page) {
  await page.waitForFunction(() => {
    const root = document.querySelector('.mf-lab');
    const world = document.querySelector('.mf-world');
    const loadingGate = world
      ? Array.from(world.children).some((element) => element.classList.contains('mf-cinematic-loader'))
      : true;
    return !loadingGate
      && root?.getAttribute('data-camera-curves') === '4'
      && root?.hasAttribute('data-render-calls');
  }, undefined, { timeout: 45_000 });
  await page.waitForTimeout(350);
}

async function placeSectionTop(page, selector, viewportFraction) {
  const geometry = await page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: window.scrollY + rect.top, viewport: window.innerHeight };
  });
  await page.evaluate(async ({ top, viewport, fraction }) => {
    const destination = top - viewport * fraction;
    for (let frame = 0; frame < 12; frame += 1) {
      window.scrollTo({ top: destination, behavior: 'instant' });
      await new Promise(requestAnimationFrame);
    }
  }, { ...geometry, fraction: viewportFraction });
  await page.waitForTimeout(320);
}

async function capture(page, name) {
  const file = resolve(outputDir, `${name}.png`);
  await page.screenshot({ path: file, animations: 'disabled' });
  return file;
}

const files = [];

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  collectErrors(desktop, 'desktop');
  await desktop.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitForWorld(desktop);
  files.push(await capture(desktop, '01-opening-desktop'));

  await placeSectionTop(desktop, '#mf-lens', 0.45);
  await desktop.waitForTimeout(650);
  files.push(await capture(desktop, '02-nexus-raw-desktop'));
  await desktop.getByRole('button', { name: 'Segmentation Clasele devin suprafețe' }).click();
  await desktop.waitForTimeout(220);
  files.push(await capture(desktop, '03-nexus-segmentation-desktop'));
  await desktop.getByRole('button', { name: 'Detection Semnalele devin limite' }).click();
  await desktop.waitForTimeout(220);
  files.push(await capture(desktop, '04-nexus-detection-desktop'));

  await placeSectionTop(desktop, '#mf-proof', 0.5);
  files.push(await capture(desktop, '05-proof-handoff-desktop'));
  await placeSectionTop(desktop, '#mf-proof', 0);
  files.push(await capture(desktop, '06-proof-detection-desktop'));
  await desktop.getByRole('button', { name: 'Segmentare Export sintetic autentic' }).click();
  await desktop.waitForTimeout(220);
  files.push(await capture(desktop, '07-proof-segmentation-desktop'));
  await desktop.getByRole('button', { name: 'Validare Cadru real autentic' }).click();
  await desktop.waitForTimeout(220);
  files.push(await capture(desktop, '08-proof-validation-desktop'));
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  collectErrors(mobile, 'mobile');
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitForWorld(mobile);
  files.push(await capture(mobile, '09-opening-mobile'));
  await placeSectionTop(mobile, '#mf-lens', 0.45);
  files.push(await capture(mobile, '10-nexus-mobile'));
  await mobile.close();
} finally {
  await browser.close();
}

console.log(JSON.stringify({ outputDir, files, errors }, null, 2));
if (errors.length > 0) process.exitCode = 1;
