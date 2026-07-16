import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4176';
const report = { assets: {}, desktop: {}, mobile: {}, reduced: {}, routes: {}, errors: [] };
const browser = await chromium.launch({ headless: true });
const renderBudgets = {
  desktopThreshold: { calls: 220, triangles: 320_000 },
  desktopNexus: { calls: 115, triangles: 100_000 },
  desktopDescent: { calls: 150, triangles: 100_000 },
  mobileThreshold: { calls: 170, triangles: 150_000 },
};

async function signature(buffer) {
  const stats = await sharp(buffer).stats();
  return {
    hash: createHash('sha256').update(buffer).digest('hex').slice(0, 12),
    entropy: Number(stats.entropy.toFixed(3)),
    means: stats.channels.slice(0, 3).map((channel) => Number(channel.mean.toFixed(1))),
  };
}

function validateCameraAssets() {
  const chapters = ['01-threshold', '02-field', '03-lens', '04-proof'];
  const tiers = ['desktop', 'mobile'];
  const tiersReport = {};
  for (const tier of tiers) {
    const curves = chapters.map((chapter, index) => {
      const file = `public/assets/vertical-slice/v1/${chapter}/camera.${tier}.json`;
      return {
        file,
        bytes: statSync(file).size,
        expectedId: `vs0${index + 1}.camera.${tier}`,
        payload: JSON.parse(readFileSync(file, 'utf8')),
      };
    });
    const valid = curves.every(({ expectedId, payload }) => (
      payload.schemaVersion === 1
      && payload.id === expectedId
      && payload.samples.length === 241
      && payload.samples[0].progress === 0
      && payload.samples.at(-1).progress === 1
      && payload.samples.every((sample, index, samples) => (
        Number.isFinite(sample.progress)
        && (index === 0 || sample.progress > samples[index - 1].progress)
        && sample.position.length === 3
        && sample.position.every(Number.isFinite)
        && sample.target.length === 3
        && sample.target.every(Number.isFinite)
        && Number.isFinite(sample.fovDegrees)
        && Number.isFinite(sample.rollDegrees)
      ))
    ));
    const continuous = curves.slice(0, -1).every(({ payload }, index) => {
      const current = payload.samples.at(-1);
      const following = curves[index + 1].payload.samples[0];
      return JSON.stringify(current.position) === JSON.stringify(following.position)
        && JSON.stringify(current.target) === JSON.stringify(following.target)
        && current.fovDegrees === following.fovDegrees
        && current.rollDegrees === following.rollDegrees;
    });
    const paced = curves.every(({ payload }) => {
      const distances = payload.samples.slice(1).map((sample, index) => Math.hypot(
        ...sample.position.map((value, axis) => value - payload.samples[index].position[axis]),
      ));
      const minimum = Math.min(...distances);
      const maximum = Math.max(...distances);
      return minimum > 0 && maximum / minimum >= 2;
    });
    tiersReport[tier] = {
      valid,
      continuous,
      paced,
      maxBytes: Math.max(...curves.map(({ bytes }) => bytes)),
      withinBudget: curves.every(({ bytes }) => bytes <= 40 * 1024),
    };
  }
  return tiersReport;
}

async function validateFirstLightAssets() {
  const modelPath = 'public/assets/world/first-light-citadel.glb';
  const posterPath = 'public/assets/world/first-light-poster.webp';
  const nexusAerialPath = 'public/assets/projects/nexus-ue5-aerial.webp';
  const nexusSegmentationPath = 'public/assets/projects/nexus-segmentation.webp';
  const nexusDetectionPath = 'public/assets/projects/nexus-detection.webp';
  const poster = await sharp(posterPath).metadata();
  const nexusAerial = await sharp(nexusAerialPath).metadata();
  const nexusSegmentation = await sharp(nexusSegmentationPath).metadata();
  const nexusDetection = await sharp(nexusDetectionPath).metadata();
  const modelBytes = statSync(modelPath).size;
  const posterBytes = statSync(posterPath).size;
  const nexusAerialBytes = statSync(nexusAerialPath).size;
  const nexusSegmentationBytes = statSync(nexusSegmentationPath).size;
  const nexusDetectionBytes = statSync(nexusDetectionPath).size;
  return {
    modelBytes,
    posterBytes,
    posterSize: [poster.width, poster.height],
    nexusAerialBytes,
    nexusAerialSize: [nexusAerial.width, nexusAerial.height],
    nexusSegmentationBytes,
    nexusSegmentationSize: [nexusSegmentation.width, nexusSegmentation.height],
    nexusDetectionBytes,
    nexusDetectionSize: [nexusDetection.width, nexusDetection.height],
    withinBudget: modelBytes <= 2.15 * 1024 * 1024 && posterBytes <= 360 * 1024,
    correctPosterFrame: poster.width === 1600 && poster.height === 900,
    authenticAerialReady: nexusAerialBytes <= 420 * 1024
      && nexusAerial.width === 1280
      && nexusAerial.height === 960,
    authenticLensExportsReady: nexusSegmentationBytes <= 220 * 1024
      && nexusSegmentation.width === 904
      && nexusSegmentation.height === 684
      && nexusDetectionBytes <= 220 * 1024
      && nexusDetection.width === 1203
      && nexusDetection.height === 906,
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
  await page.waitForTimeout(280);
}

async function proofHandoffState(page) {
  return page.locator('.mf-proof-handoff').evaluate((element) => {
    const frame = element.querySelector('.mf-proof-handoff__frame');
    const paper = element.querySelector('.mf-proof-handoff__paper');
    if (!(frame instanceof HTMLElement) || !(paper instanceof HTMLElement)) return null;
    const frameRect = frame.getBoundingClientRect();
    const rootStyle = getComputedStyle(element);
    return {
      visible: rootStyle.visibility === 'visible' && Number(rootStyle.opacity) > 0.05,
      width: Number(frameRect.width.toFixed(1)),
      height: Number(frameRect.height.toFixed(1)),
      radius: getComputedStyle(frame).borderRadius,
      clipPath: getComputedStyle(paper).clipPath,
    };
  });
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

async function renderStats(page) {
  await page.waitForFunction(() => document.querySelector('.mf-lab')?.hasAttribute('data-render-calls'));
  return page.locator('.mf-lab').evaluate((element) => ({
    chapter: element.getAttribute('data-active-chapter'),
    calls: Number(element.getAttribute('data-render-calls')),
    triangles: Number(element.getAttribute('data-render-triangles')),
  }));
}

function withinRenderBudget(stats, budget) {
  return stats.calls <= budget.calls && stats.triangles <= budget.triangles;
}

try {
  report.assets.cameraCurves = validateCameraAssets();
  report.assets.firstLight = await validateFirstLightAssets();
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  collectErrors(desktop, 'desktop');
  await desktop.goto(baseUrl, { waitUntil: 'networkidle' });
  await desktop.waitForFunction(() => {
    const world = document.querySelector('.mf-world');
    const loadingGate = world
      ? Array.from(world.children).some((element) => element.classList.contains('mf-cinematic-loader'))
      : true;
    return !loadingGate
      && document.querySelector('.mf-lab')?.getAttribute('data-camera-curves') === '4';
  }, undefined, { timeout: 20_000 });
  await desktop.waitForTimeout(500);

  const audioButton = desktop.getByRole('button', { name: 'Pornește sunetul ambiental' });
  report.desktop.audioControl = await audioButton.count();
  if (report.desktop.audioControl) {
    await audioButton.click();
    await desktop.waitForTimeout(250);
    report.desktop.audioEnabled = await desktop.getByRole('button', { name: 'Oprește sunetul ambiental' }).count();
  }
  report.desktop.cameraCurves = Number(await desktop.locator('.mf-lab').getAttribute('data-camera-curves'));
  report.desktop.thresholdRender = await renderStats(desktop);
  report.desktop.thresholdRender.withinBudget = withinRenderBudget(
    report.desktop.thresholdRender,
    renderBudgets.desktopThreshold,
  );
  await desktop.waitForTimeout(300);
  report.desktop.firstCanvas = await signature(await desktop.screenshot());
  report.desktop.thresholdFilled = report.desktop.firstCanvas.entropy >= 3.5;

  await moveWithin(desktop, '.mf-beat--lens', 0.45);
  const lensKnot = desktop.locator('.mf-lens-knot');
  await lensKnot.waitFor({ state: 'visible' });

  await desktop.mouse.move(216, 402);
  await desktop.waitForFunction(() => document.querySelector('.mf-lab')?.getAttribute('data-evidence-cores') === '1');

  await desktop.getByRole('button', { name: 'Segmentation Clasele devin suprafețe' }).click();
  await desktop.mouse.move(1_250, 508);
  await desktop.waitForFunction(() => document.querySelector('.mf-lab')?.getAttribute('data-evidence-cores') === '2');

  await desktop.getByRole('button', { name: 'Detection Semnalele devin limite' }).click();
  await desktop.mouse.move(720, 95);
  await desktop.waitForFunction(() => document.querySelector('.mf-lab')?.getAttribute('data-evidence-cores') === '3');
  report.desktop.nexusEvidenceCores = Number(
    await desktop.locator('.mf-lab').getAttribute('data-evidence-cores'),
  );
  report.desktop.nexusEvidenceHud = await desktop.locator('.mf-evidence-cores [data-collected]').count();
  report.desktop.nexusRender = await renderStats(desktop);
  report.desktop.nexusRender.withinBudget = withinRenderBudget(
    report.desktop.nexusRender,
    renderBudgets.desktopNexus,
  );

  await placeSectionTop(desktop, '#mf-proof', 0.5);
  const forwardHandoff = await proofHandoffState(desktop);
  await placeSectionTop(desktop, '#mf-proof', -0.24);
  await placeSectionTop(desktop, '#mf-proof', 0.5);
  const reverseHandoff = await proofHandoffState(desktop);
  await placeSectionTop(desktop, '#mf-proof', 0);
  const stableProof = await proofHandoffState(desktop);
  report.desktop.proofHandoff = {
    forward: forwardHandoff,
    reverse: reverseHandoff,
    stable: stableProof,
    reversible: Boolean(
      forwardHandoff?.visible
      && reverseHandoff?.visible
      && Math.abs(forwardHandoff.width - reverseHandoff.width) <= 2
      && Math.abs(forwardHandoff.height - reverseHandoff.height) <= 2
      && forwardHandoff.clipPath === reverseHandoff.clipPath
    ),
    clearsAtProof: stableProof?.visible === false,
  };

  await moveWithin(desktop, '.mf-beat--descent', 0.7);
  await desktop.waitForFunction(() => document.querySelector('.mf-lab')?.getAttribute('data-active-chapter') === 'descent');
  await desktop.waitForTimeout(1_200);
  report.desktop.descentCanvas = await signature(await desktop.screenshot());
  report.desktop.descentFilled = report.desktop.descentCanvas.entropy >= 4;
  report.desktop.descentRender = await renderStats(desktop);
  report.desktop.descentRender.withinBudget = withinRenderBudget(
    report.desktop.descentRender,
    renderBudgets.desktopDescent,
  );

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
  await desktop.goto(`${baseUrl}/#mf-lens`, { waitUntil: 'networkidle' });
  await desktop.waitForFunction(() => (
    document.querySelector('.mf-lab')?.getAttribute('data-active-chapter') === 'lens'
  ), undefined, { timeout: 20_000 });
  report.routes['/#mf-lens'] = await desktop.evaluate(() => ({
    chapter: document.querySelector('.mf-lab')?.getAttribute('data-active-chapter'),
    targetTop: Number(document.querySelector('#mf-lens')?.getBoundingClientRect().top.toFixed(1)),
    scrollPaddingTop: Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
  }));
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  collectErrors(mobile, 'mobile');
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(1_200);
  await mobile.waitForFunction(() => document.querySelector('.mf-lab')?.getAttribute('data-camera-curves') === '4');
  report.mobile.cameraCurves = Number(await mobile.locator('.mf-lab').getAttribute('data-camera-curves'));
  report.mobile.thresholdRender = await renderStats(mobile);
  report.mobile.thresholdRender.withinBudget = withinRenderBudget(
    report.mobile.thresholdRender,
    renderBudgets.mobileThreshold,
  );
  await mobile.waitForTimeout(300);
  report.mobile.firstCanvas = await signature(await mobile.screenshot());
  report.mobile.thresholdFilled = report.mobile.firstCanvas.entropy >= 3.2;
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
  || Object.values(report.assets.cameraCurves).some((tier) => (
    !tier.valid || !tier.continuous || !tier.paced || !tier.withinBudget
  ))
  || !report.assets.firstLight.withinBudget
  || !report.assets.firstLight.correctPosterFrame
  || !report.assets.firstLight.authenticAerialReady
  || !report.assets.firstLight.authenticLensExportsReady
  || report.desktop.layout?.scrollWidth !== report.desktop.layout?.width
  || report.mobile.layout?.scrollWidth !== report.mobile.layout?.width
  || report.desktop.layout?.brokenImages.length > 0
  || report.mobile.layout?.brokenImages.length > 0
  || report.desktop.cameraCurves !== 4
  || report.mobile.cameraCurves !== 4
  || !report.desktop.thresholdRender?.withinBudget
  || !report.desktop.nexusRender?.withinBudget
  || !report.desktop.descentRender?.withinBudget
  || !report.mobile.thresholdRender?.withinBudget
  || !report.mobile.thresholdFilled
  || report.desktop.nexusEvidenceCores !== 3
  || report.desktop.nexusEvidenceHud !== 3
  || !report.desktop.proofHandoff?.reversible
  || !report.desktop.proofHandoff?.clearsAtProof
  || !report.desktop.thresholdFilled
  || !report.desktop.descentFilled
  || !report.desktop.evidenceMoved
  || !report.mobile.evidenceMoved;

const deepLink = report.routes['/#mf-lens'];
if (
  deepLink?.chapter !== 'lens'
  || Math.abs(deepLink.targetTop - deepLink.scrollPaddingTop) > 2
) process.exitCode = 1;

if (failed) process.exitCode = 1;
