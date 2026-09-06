import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const baseURL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4176';
const output = resolve(process.env.QA_OUTPUT_DIR ?? 'artifacts/qa-citadel-opening');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const report = [];

async function pageFor(name, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...options });
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${name}: ${message.text()}`);
  });
  return page;
}

async function capture(page, name) {
  const state = await page.evaluate(() => {
    const root = document.querySelector('.mf-lab');
    const opening = document.querySelector('.hp-opening');
    return {
      ...root.dataset,
      progress: Number(opening.style.getPropertyValue('--hp-progress')),
      copyOpacity: Number(getComputedStyle(document.querySelector('.hp-copy')).opacity),
      overflow: document.documentElement.scrollWidth - innerWidth,
      scrollY,
    };
  });
  assert.equal(state.overflow, 0, `${name}: horizontal overflow`);
  assert.equal(state.rendererFailure, undefined, `${name}: renderer failed`);
  await page.screenshot({ path: resolve(output, `${name}.png`) });
  report.push({ name, ...state });
  console.log(name, JSON.stringify(state));
  return state;
}

async function waitForWorld(page) {
  await page.waitForFunction(() => Number(document.querySelector('.mf-lab')?.dataset.renderCalls) > 0,
    undefined, { timeout: 45_000 });
}

// Follow real document anchors; the last two screens of the opening are the gate approach.
async function moveOpening(page, build, handoff = 0) {
  await page.evaluate(async ({ build, handoff }) => {
    const opening = document.querySelector('.hp-opening');
    const start = opening.getBoundingClientRect().top + scrollY;
    const buildEnd = start + opening.offsetHeight - innerHeight * 2;
    const field = document.querySelector('#mf-field').getBoundingClientRect().top + scrollY;
    const destination = handoff > 0
      ? buildEnd + (field - buildEnd) * handoff
      : start + (buildEnd - start) * build;
    for (let frame = 0; frame < 14; frame += 1) {
      window.scrollTo({ top: destination, behavior: 'instant' });
      await new Promise(requestAnimationFrame);
    }
  }, { build, handoff });
  await page.waitForTimeout(400);
}

try {
  const desktop = await pageFor('desktop');
  await desktop.goto(baseURL, { waitUntil: 'networkidle' });
  await waitForWorld(desktop);
  assert.equal((await capture(desktop, 'desktop-opening')).copyOpacity, 1);
  for (const [name, build, handoff] of [
    ['desktop-rise', 0.64, 0], ['desktop-material', 0.82, 0],
    ['desktop-finished', 1, 0], ['desktop-gate', 1, 0.56],
    ['desktop-courtyard', 1, 0.85], ['desktop-field', 1, 1.05],
    ['desktop-reverse-build', 0.67, 0], ['desktop-return', 0, 0],
  ]) {
    await moveOpening(desktop, build, handoff);
    const state = await capture(desktop, name);
    if (name === 'desktop-field') assert.equal(state.activeChapter, 'field');
    if (name === 'desktop-return') assert.equal(state.copyOpacity, 1);
    if (name === 'desktop-reverse-build') assert.ok(Math.abs(state.progress - build) < 0.02);
  }
  await desktop.close();

  const mobileOptions = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
  const mobile = await pageFor('mobile', mobileOptions);
  await mobile.goto(`${baseURL}/?hp=1`, { waitUntil: 'networkidle' });
  await waitForWorld(mobile);
  await capture(mobile, 'mobile-finished');
  await mobile.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.waitForFunction(() => document.querySelector('.mf-lab')?.dataset.staticOpening === 'true');
  assert.equal((await capture(mobile, 'mobile-motion-toggle')).copyOpacity, 1);
  await mobile.close();

  for (const mode of ['reduced-desktop', 'reduced-mobile', 'no-webgl']) {
    const page = await pageFor(mode, {
      ...(mode === 'reduced-mobile' ? mobileOptions : {}),
      reducedMotion: mode.startsWith('reduced') ? 'reduce' : 'no-preference',
    });
    if (mode === 'no-webgl') {
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (/webgl/i.test(type)) return null;
          return original.call(this, type, ...args);
        };
      });
    }
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    const state = await capture(page, mode);
    assert.equal(state.staticOpening, 'true', `${mode}: static opening absent`);
    assert.equal(state.copyOpacity, 1, `${mode}: invisible title`);
    const button = page.locator('.hp-btn--primary');
    const box = await button.boundingBox();
    assert.ok(box && box.height >= 44 && box.y >= 0 && box.y + box.height <= page.viewportSize().height,
      `${mode}: primary action not fully in the first viewport`);
    await button.click();
    await page.waitForFunction(() => Math.abs(document.querySelector('#mf-field').getBoundingClientRect().top) < 5,
      undefined, { timeout: 10_000 });
    await capture(page, `${mode}-follow`);
    await page.close();
  }
  assert.deepEqual(errors, [], 'Browser or shader errors');
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ baseURL, errors, captures: report }, null, 2));
  await browser.close();
}

console.log(`Citadel opening checks passed. Screenshots: ${output}`);
