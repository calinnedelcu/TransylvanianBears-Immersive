import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import sharp from 'sharp';

const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4176';
const report = { desktop: {}, mobile: {}, reduced: {}, routes: {}, errors: [] };
const browser = await chromium.launch({ headless: true });

async function signature(buffer) {
  const stats = await sharp(buffer).stats();
  return {
    hash: createHash('sha256').update(buffer).digest('hex').slice(0, 12),
    entropy: Number(stats.entropy.toFixed(3)),
    means: stats.channels.slice(0, 3).map((channel) => Number(channel.mean.toFixed(1))),
  };
}

async function moveWithin(page, selector, progress) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'attached' });
  const geometry = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: window.scrollY + rect.top,
      height: element.offsetHeight,
      viewport: window.innerHeight,
    };
  });
  await page.evaluate(({ target, value }) => {
    window.scrollTo(0, target.top + (target.height - target.viewport) * value);
  }, { target: geometry, value: progress });
  await page.waitForTimeout(850);
}

function collectErrors(page, scope) {
  page.on('pageerror', (error) => report.errors.push(`${scope}: pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') report.errors.push(`${scope}: console: ${message.text()}`);
  });
}

async function layoutState(page) {
  return page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    brokenImages: Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')),
  }));
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  collectErrors(desktop, 'desktop');
  await desktop.goto(baseUrl, { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(1_500);

  const audioButton = desktop.getByRole('button', { name: 'Pornește sunetul ambiental' });
  report.desktop.audioControl = await audioButton.count();
  if (report.desktop.audioControl) {
    await audioButton.click();
    await desktop.waitForTimeout(250);
    report.desktop.audioEnabled = await desktop.getByRole('button', { name: 'Oprește sunetul ambiental' }).count();
  }
  report.desktop.firstCanvas = await signature(await desktop.screenshot());

  await moveWithin(desktop, '.mf-beat--descent', 0.7);
  await desktop.waitForFunction(() => document.querySelector('.mf-lab')?.getAttribute('data-active-chapter') === 'descent');
  await desktop.waitForTimeout(1_200);
  report.desktop.descentCanvas = await signature(await desktop.screenshot());
  report.desktop.descentFilled = report.desktop.descentCanvas.entropy >= 4;

  await moveWithin(desktop, '.bh-theater', 0.5);
  await desktop.getByRole('button', { name: 'II. Mercurul schimbă traseul.' }).click();
  await desktop.waitForTimeout(900);
  report.desktop.buried = {
    active: await desktop.locator('.bh-theater__route button[data-active] strong').textContent(),
    readout: await desktop.locator('.bh-theater__readout h3').textContent(),
  };

  await moveWithin(desktop, '.ix-journey', 0.72);
  report.desktop.infect = {
    active: await desktop.locator('.ix-nodes button[data-active] strong').textContent(),
    visited: await desktop.locator('.ix-nodes button[data-visited]').count(),
    canvas: await signature(await desktop.locator('.ix-canvas').screenshot()),
  };

  await moveWithin(desktop, '.rc-journey', 0.84);
  await desktop.getByRole('button', { name: /Labour transformation Automation Risk/i }).click();
  await desktop.waitForTimeout(500);
  report.desktop.research = {
    phase: await desktop.locator('.rc-instrument').getAttribute('data-phase'),
    lens: await desktop.locator('.rc-instrument').getAttribute('data-lens'),
    projectionOpacity: await desktop.locator('.rc-projection--automation-risk')
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity)),
  };

  await moveWithin(desktop, '.ew-section', 0.78);
  report.desktop.evidenceMap = await signature(await desktop.locator('.ew-canvas').screenshot());
  report.desktop.planReady = await desktop.locator('.ew-section').getAttribute('data-plan-ready');
  await moveWithin(desktop, '.ew-section', 0.96);
  report.desktop.evidenceDawn = await signature(await desktop.locator('.ew-canvas').screenshot());
  report.desktop.dawnReady = await desktop.locator('.ew-section').getAttribute('data-dawn-ready');
  report.desktop.evidenceMoved = report.desktop.evidenceMap.hash !== report.desktop.evidenceDawn.hash;
  report.desktop.layout = await layoutState(desktop);

  for (const route of ['/work', '/team', '/archive']) {
    await desktop.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    report.routes[route] = {
      title: await desktop.title(),
      heading: await desktop.locator('h1').first().textContent(),
      overflow: await desktop.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  }
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  collectErrors(mobile, 'mobile');
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(1_200);
  await moveWithin(mobile, '.ix-journey', 0.72);
  report.mobile.infect = {
    active: await mobile.locator('.ix-nodes button[data-active] strong').textContent(),
    canvas: await signature(await mobile.locator('.ix-canvas').screenshot()),
  };
  await moveWithin(mobile, '.ew-section', 0.78);
  report.mobile.evidenceMap = await signature(await mobile.locator('.ew-canvas').screenshot());
  await moveWithin(mobile, '.ew-section', 0.96);
  report.mobile.evidenceDawn = await signature(await mobile.locator('.ew-canvas').screenshot());
  report.mobile.evidenceMoved = report.mobile.evidenceMap.hash !== report.mobile.evidenceDawn.hash;
  report.mobile.layout = await layoutState(mobile);
  await mobile.close();

  const reducedContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const reduced = await reducedContext.newPage();
  collectErrors(reduced, 'reduced');
  await reduced.goto(`${baseUrl}/#mf-evidence-weave`, { waitUntil: 'networkidle' });
  await reduced.locator('.ew-section').scrollIntoViewIfNeeded();
  await reduced.waitForTimeout(1_000);
  report.reduced = await reduced.evaluate(() => {
    const section = document.querySelector('.ew-section');
    return {
      media: matchMedia('(prefers-reduced-motion: reduce)').matches,
      sectionHeight: section?.getBoundingClientRect().height,
      viewport: innerHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  await reducedContext.close();
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));

const failed = report.errors.length > 0
  || report.desktop.layout?.scrollWidth !== report.desktop.layout?.width
  || report.mobile.layout?.scrollWidth !== report.mobile.layout?.width
  || report.desktop.layout?.brokenImages.length > 0
  || report.mobile.layout?.brokenImages.length > 0
  || !report.desktop.descentFilled
  || !report.desktop.evidenceMoved
  || !report.mobile.evidenceMoved;

if (failed) process.exitCode = 1;
