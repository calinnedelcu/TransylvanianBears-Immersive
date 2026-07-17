import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4176';
const MIB = 1024 * 1024;
const textureGpuByteAttributes = [
  'data-render-texture-gpu-bytes',
  'data-texture-gpu-bytes',
  'data-gpu-texture-bytes',
];
const verticalSliceRenderContracts = {
  source: 'src/greenfield/lab/macro-flow/verticalSliceAssets.ts#VERTICAL_SLICE_BUDGETS',
  slice: {
    desktop: { calls: 70, triangles: 300_000, textureGpuBytes: 96 * MIB },
    mobile: { calls: 40, triangles: 100_000, textureGpuBytes: 48 * MIB },
  },
  chapters: {
    threshold: {
      id: '01-threshold',
      desktop: { calls: 70, triangles: 300_000, textureGpuBytes: 96 * MIB },
      mobile: { calls: 40, triangles: 100_000, textureGpuBytes: 48 * MIB },
    },
    field: {
      id: '02-field',
      desktop: { calls: 58, triangles: 220_000, textureGpuBytes: 72 * MIB },
      mobile: { calls: 30, triangles: 75_000, textureGpuBytes: 36 * MIB },
    },
    lens: {
      id: '03-lens',
      desktop: { calls: 18, triangles: 45_000, textureGpuBytes: 16 * MIB },
      mobile: { calls: 12, triangles: 20_000, textureGpuBytes: 8 * MIB },
    },
    proof: {
      id: '04-proof',
      desktop: { calls: 24, triangles: 55_000, textureGpuBytes: 48 * MIB },
      mobile: { calls: 18, triangles: 30_000, textureGpuBytes: 24 * MIB },
    },
  },
};
const report = {
  assets: {},
  desktop: {},
  mobile: {},
  reduced: {},
  routes: {},
  errors: [],
  hardFailures: [],
  warnings: [],
  policy: {
    performance: {
      contractSource: verticalSliceRenderContracts.source,
      hardFail: 'An exposed whole-frame metric exceeds the desktop/mobile slice ceiling.',
      warning: 'An exposed metric exceeds its chapter budget but not the whole-slice ceiling, or cannot be measured.',
      textureGpuByteAttributes,
    },
  },
};
const browser = await chromium.launch({ headless: true });
const legacyRenderBudgets = {
  desktopDescent: { calls: 150, triangles: 100_000 },
};
const warningKeys = new Set();
const hardFailureKeys = new Set();

function warn(scope, message, details, key = `${scope}:${message}`) {
  if (warningKeys.has(key)) return;
  warningKeys.add(key);
  report.warnings.push({ scope, message, details });
}

function hardFail(scope, message, details, key = `${scope}:${message}`) {
  if (hardFailureKeys.has(key)) return;
  hardFailureKeys.add(key);
  report.hardFailures.push({ scope, message, details });
}

function checkHard(condition, scope, message, details) {
  if (!condition) hardFail(scope, message, details);
  return condition;
}

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
  const sourceModelPath = 'public/assets/world/first-light-citadel.glb';
  const desktopModelPath = 'public/assets/world/first-light-citadel.desktop.glb';
  const mobileModelPath = 'public/assets/world/first-light-citadel.mobile.glb';
  const posterPath = 'public/assets/world/first-light-poster.webp';
  const nexusAerialPath = 'public/assets/projects/nexus-ue5-aerial.webp';
  const nexusSegmentationPath = 'public/assets/projects/nexus-segmentation.webp';
  const nexusDetectionPath = 'public/assets/projects/nexus-detection.webp';
  const poster = await sharp(posterPath).metadata();
  const nexusAerial = await sharp(nexusAerialPath).metadata();
  const nexusSegmentation = await sharp(nexusSegmentationPath).metadata();
  const nexusDetection = await sharp(nexusDetectionPath).metadata();
  const sourceModelBytes = statSync(sourceModelPath).size;
  const desktopModelBytes = statSync(desktopModelPath).size;
  const mobileModelBytes = statSync(mobileModelPath).size;
  const posterBytes = statSync(posterPath).size;
  const nexusAerialBytes = statSync(nexusAerialPath).size;
  const nexusSegmentationBytes = statSync(nexusSegmentationPath).size;
  const nexusDetectionBytes = statSync(nexusDetectionPath).size;
  return {
    modelBytes: desktopModelBytes,
    sourceModelBytes,
    desktopModelBytes,
    mobileModelBytes,
    posterBytes,
    posterSize: [poster.width, poster.height],
    nexusAerialBytes,
    nexusAerialSize: [nexusAerial.width, nexusAerial.height],
    nexusSegmentationBytes,
    nexusSegmentationSize: [nexusSegmentation.width, nexusSegmentation.height],
    nexusDetectionBytes,
    nexusDetectionSize: [nexusDetection.width, nexusDetection.height],
    withinBudget: desktopModelBytes <= 1.65 * 1024 * 1024
      && mobileModelBytes <= 1.02 * 1024 * 1024
      && posterBytes <= 360 * 1024,
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

async function renderStats(page, expectedChapter, sampleCount = 3) {
  let telemetryWaitTimedOut = false;
  try {
    await page.waitForFunction((chapter) => {
      const root = document.querySelector('.mf-lab');
      if (root?.getAttribute('data-active-chapter') !== chapter) return false;
      return root.getAttribute('data-renderer') !== 'webgl'
        || (root.hasAttribute('data-render-calls') && root.hasAttribute('data-render-triangles'));
    }, expectedChapter, { timeout: 4_500 });
  } catch {
    telemetryWaitTimedOut = true;
  }

  const snapshots = [];
  for (let index = 0; index < sampleCount; index += 1) {
    if (index > 0) await page.waitForTimeout(240);
    snapshots.push(await page.locator('.mf-lab').evaluate((element, textureAttributes) => {
      const metric = (attribute) => {
        const raw = element.getAttribute(attribute);
        const value = raw === null ? null : Number(raw);
        return {
          attribute,
          exposed: raw !== null && Number.isFinite(value) && value >= 0,
          raw,
          value,
        };
      };
      const textureMetric = textureAttributes
        .map((attribute) => metric(attribute))
        .find((candidate) => candidate.raw !== null) ?? {
        attribute: null,
        exposed: false,
        raw: null,
        value: null,
      };
      return {
        chapter: element.getAttribute('data-active-chapter'),
        renderer: element.getAttribute('data-renderer'),
        calls: metric('data-render-calls'),
        triangles: metric('data-render-triangles'),
        textureGpuBytes: textureMetric,
      };
    }, textureGpuByteAttributes));
  }

  const summarizeMetric = (name) => {
    const valid = snapshots.map((snapshot) => snapshot[name]).filter((metric) => metric.exposed);
    const invalid = snapshots
      .map((snapshot) => snapshot[name])
      .filter((metric) => metric.raw !== null && !metric.exposed);
    if (valid.length === 0) {
      return {
        exposed: false,
        value: null,
        minimum: null,
        attribute: invalid.at(-1)?.attribute ?? null,
        invalidRaw: invalid.at(-1)?.raw ?? null,
      };
    }
    const peak = valid.reduce((current, candidate) => (
      candidate.value > current.value ? candidate : current
    ));
    return {
      exposed: true,
      value: peak.value,
      minimum: Math.min(...valid.map((metric) => metric.value)),
      attribute: peak.attribute,
      invalidRaw: null,
    };
  };
  const metrics = {
    calls: summarizeMetric('calls'),
    triangles: summarizeMetric('triangles'),
    textureGpuBytes: summarizeMetric('textureGpuBytes'),
  };
  return {
    expectedChapter,
    chapter: snapshots.at(-1)?.chapter ?? null,
    observedChapters: [...new Set(snapshots.map((snapshot) => snapshot.chapter))],
    renderer: snapshots.at(-1)?.renderer ?? null,
    sampleCount,
    telemetryWaitTimedOut,
    calls: metrics.calls.value,
    triangles: metrics.triangles.value,
    textureGpuBytes: metrics.textureGpuBytes.value,
    metrics,
  };
}

function assessVerticalSliceRender(stats, tier, chapter) {
  const chapterContract = verticalSliceRenderContracts.chapters[chapter];
  const chapterBudget = chapterContract[tier];
  const sliceBudget = verticalSliceRenderContracts.slice[tier];
  const scope = `${tier}:${chapterContract.id}`;
  const metricLabels = {
    calls: 'Draw calls',
    triangles: 'Visible triangles',
    textureGpuBytes: 'Texture GPU bytes',
  };
  let verdict = 'pass';

  stats.contract = {
    chapter: chapterBudget,
    wholeSlice: sliceBudget,
    source: verticalSliceRenderContracts.source,
  };
  stats.withinChapterBudget = true;
  stats.withinSliceBudget = true;

  if (stats.chapter !== chapter) {
    verdict = 'hard-fail';
    hardFail(scope, 'Render telemetry was sampled in the wrong chapter', {
      expected: chapter,
      observed: stats.observedChapters,
    });
  }
  if (stats.renderer !== 'webgl') {
    verdict = verdict === 'hard-fail' ? verdict : 'warning';
    warn(scope, 'WebGL render telemetry is unavailable for this chapter', {
      renderer: stats.renderer,
      telemetryWaitTimedOut: stats.telemetryWaitTimedOut,
    });
  }

  for (const [name, metric] of Object.entries(stats.metrics)) {
    const chapterLimit = chapterBudget[name];
    const sliceLimit = sliceBudget[name];
    metric.chapterLimit = chapterLimit;
    metric.sliceLimit = sliceLimit;
    metric.withinChapterBudget = metric.exposed ? metric.value <= chapterLimit : null;
    metric.withinSliceBudget = metric.exposed ? metric.value <= sliceLimit : null;

    if (!metric.exposed) {
      verdict = verdict === 'hard-fail' ? verdict : 'warning';
      warn(
        scope,
        `${metricLabels[name]} telemetry is not exposed; no budget verdict was made`,
        { attribute: metric.attribute, invalidRaw: metric.invalidRaw },
        name === 'textureGpuBytes' ? `${tier}:${name}:not-exposed` : `${scope}:${name}:not-exposed`,
      );
      continue;
    }

    if (metric.value > sliceLimit) {
      stats.withinSliceBudget = false;
      stats.withinChapterBudget = false;
      verdict = 'hard-fail';
      hardFail(scope, `${metricLabels[name]} exceeded the whole-slice hard ceiling`, {
        value: metric.value,
        chapterLimit,
        sliceLimit,
        attribute: metric.attribute,
      });
    } else if (metric.value > chapterLimit) {
      stats.withinChapterBudget = false;
      verdict = verdict === 'hard-fail' ? verdict : 'warning';
      warn(scope, `${metricLabels[name]} exceeded the chapter budget`, {
        value: metric.value,
        chapterLimit,
        sliceLimit,
        attribute: metric.attribute,
      });
    }
  }

  stats.verdict = verdict;
  return stats;
}

function withinRenderBudget(stats, budget) {
  return stats.metrics.calls.exposed
    && stats.metrics.triangles.exposed
    && stats.calls <= budget.calls
    && stats.triangles <= budget.triangles;
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
  report.desktop.verticalSliceRender = {};
  report.desktop.verticalSliceRender.threshold = assessVerticalSliceRender(
    await renderStats(desktop, 'threshold'),
    'desktop',
    'threshold',
  );
  await desktop.waitForTimeout(300);
  report.desktop.firstCanvas = await signature(await desktop.screenshot());
  report.desktop.thresholdFilled = report.desktop.firstCanvas.entropy >= 3.5;

  await moveWithin(desktop, '.mf-beat--field', 0.45);
  report.desktop.verticalSliceRender.field = assessVerticalSliceRender(
    await renderStats(desktop, 'field'),
    'desktop',
    'field',
  );

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
  report.desktop.verticalSliceRender.lens = assessVerticalSliceRender(
    await renderStats(desktop, 'lens'),
    'desktop',
    'lens',
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
  report.desktop.verticalSliceRender.proof = assessVerticalSliceRender(
    await renderStats(desktop, 'proof'),
    'desktop',
    'proof',
  );

  await moveWithin(desktop, '.mf-beat--descent', 0.7);
  await desktop.waitForFunction(() => document.querySelector('.mf-lab')?.getAttribute('data-active-chapter') === 'descent');
  await desktop.waitForTimeout(1_200);
  report.desktop.descentCanvas = await signature(
    await desktop.locator('.mf-world canvas').screenshot(),
  );
  report.desktop.descentFilled = report.desktop.descentCanvas.entropy >= 4;
  report.desktop.descentRender = await renderStats(desktop, 'descent');
  report.desktop.descentRender.withinBudget = withinRenderBudget(
    report.desktop.descentRender,
    legacyRenderBudgets.desktopDescent,
  );

  await moveWithin(desktop, '.bh-evidence-passage', 0.5);
  await desktop.getByRole('button', { name: 'III. Vaporii limitează expunerea.' }).click();
  await desktop.waitForTimeout(900);
  report.desktop.buried = {
    active: await desktop.locator('.bh-evidence-passage__route button[data-active] strong').textContent(),
    readout: await desktop.locator('.bh-evidence-passage__readout h3').textContent(),
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

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  collectErrors(mobile, 'mobile');
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(1_200);
  await mobile.waitForFunction(() => document.querySelector('.mf-lab')?.getAttribute('data-camera-curves') === '4');
  report.mobile.cameraCurves = Number(await mobile.locator('.mf-lab').getAttribute('data-camera-curves'));
  report.mobile.verticalSliceRender = {};
  report.mobile.verticalSliceRender.threshold = assessVerticalSliceRender(
    await renderStats(mobile, 'threshold'),
    'mobile',
    'threshold',
  );
  await mobile.waitForTimeout(300);
  report.mobile.firstCanvas = await signature(await mobile.screenshot());
  report.mobile.thresholdFilled = report.mobile.firstCanvas.entropy >= 3.2;

  await moveWithin(mobile, '.mf-beat--field', 0.45);
  report.mobile.verticalSliceRender.field = assessVerticalSliceRender(
    await renderStats(mobile, 'field'),
    'mobile',
    'field',
  );

  await moveWithin(mobile, '.mf-beat--lens', 0.45);
  const mobileLensKnot = mobile.locator('.mf-lens-knot');
  await mobileLensKnot.waitFor({ state: 'visible' });
  const mobileLensControls = mobile.locator('.mf-lens-control button');
  const mobileLensModes = [await mobile.locator('.mf-lab').getAttribute('data-lens')];
  await mobileLensControls.nth(1).tap();
  await mobile.waitForFunction(() => document.querySelector('.mf-lab')?.getAttribute('data-lens') === 'segmentation');
  mobileLensModes.push(await mobile.locator('.mf-lab').getAttribute('data-lens'));
  await mobileLensControls.nth(2).tap();
  await mobile.waitForFunction(() => document.querySelector('.mf-lab')?.getAttribute('data-lens') === 'detection');
  mobileLensModes.push(await mobile.locator('.mf-lab').getAttribute('data-lens'));
  await mobile.waitForTimeout(400);
  const mobileLensCanvas = await signature(await mobile.locator('.mf-world canvas').screenshot());
  report.mobile.lens = {
    visible: await mobileLensKnot.isVisible(),
    controlCount: await mobileLensControls.count(),
    modes: mobileLensModes,
    canvas: mobileLensCanvas,
    filled: mobileLensCanvas.entropy >= 3.2,
  };
  report.mobile.verticalSliceRender.lens = assessVerticalSliceRender(
    await renderStats(mobile, 'lens'),
    'mobile',
    'lens',
  );

  await placeSectionTop(mobile, '#mf-proof', 0);
  report.mobile.verticalSliceRender.proof = assessVerticalSliceRender(
    await renderStats(mobile, 'proof'),
    'mobile',
    'proof',
  );

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
} catch (error) {
  hardFail('suite', 'QA execution aborted before all checks completed', {
    message: error instanceof Error ? error.message : String(error),
  });
} finally {
  await browser.close();
}

checkHard(report.errors.length === 0, 'runtime', 'Page or console errors were reported', report.errors);
for (const tier of ['desktop', 'mobile']) {
  const camera = report.assets.cameraCurves?.[tier];
  checkHard(camera?.valid === true, `camera:${tier}`, 'Camera curve schema or samples are invalid', camera);
  checkHard(camera?.continuous === true, `camera:${tier}`, 'Camera continuity failed between chapters 01-04', camera);
  checkHard(camera?.paced === true, `camera:${tier}`, 'Camera curves lost their authored pacing', camera);
  checkHard(camera?.withinBudget === true, `camera:${tier}`, 'Camera curve files exceeded 40 KiB', camera);
}

const firstLight = report.assets.firstLight;
checkHard(firstLight?.withinBudget === true, 'assets:first-light', 'First-light model or poster exceeded its transfer budget', firstLight);
checkHard(firstLight?.correctPosterFrame === true, 'assets:first-light', 'First-light poster dimensions are incorrect', firstLight);
checkHard(firstLight?.authenticAerialReady === true, 'assets:nexus', 'Nexus aerial evidence asset is not production-ready', firstLight);
checkHard(firstLight?.authenticLensExportsReady === true, 'assets:nexus', 'Nexus Lens exports are not production-ready', firstLight);

checkHard(
  report.desktop.layout?.scrollWidth === report.desktop.layout?.width,
  'desktop:layout',
  'Horizontal overflow detected',
  report.desktop.layout,
);
checkHard(
  report.mobile.layout?.scrollWidth === report.mobile.layout?.width,
  'mobile:layout',
  'Horizontal overflow detected',
  report.mobile.layout,
);
checkHard(
  report.desktop.layout?.brokenImages.length === 0,
  'desktop:assets',
  'Broken images detected',
  report.desktop.layout?.brokenImages,
);
checkHard(
  report.mobile.layout?.brokenImages.length === 0,
  'mobile:assets',
  'Broken images detected',
  report.mobile.layout?.brokenImages,
);
checkHard(report.desktop.cameraCurves === 4, 'desktop:camera', 'Runtime did not load all four camera curves', report.desktop.cameraCurves);
checkHard(report.mobile.cameraCurves === 4, 'mobile:camera', 'Runtime did not load all four camera curves', report.mobile.cameraCurves);
checkHard(report.desktop.descentRender?.withinBudget === true, 'desktop:descent', 'Existing descent render budget failed', report.desktop.descentRender);
checkHard(report.desktop.thresholdFilled === true, 'desktop:threshold', 'Threshold canvas entropy is too low', report.desktop.firstCanvas);
checkHard(report.desktop.descentFilled === true, 'desktop:descent', 'Descent canvas entropy is too low', report.desktop.descentCanvas);
checkHard(report.mobile.thresholdFilled === true, 'mobile:threshold', 'Threshold canvas entropy is too low', report.mobile.firstCanvas);
checkHard(report.mobile.lens?.filled === true, 'mobile:03-lens', 'Lens canvas entropy is too low', report.mobile.lens?.canvas);
checkHard(report.mobile.lens?.visible === true, 'mobile:03-lens', 'Lens did not become visible', report.mobile.lens);
checkHard(report.mobile.lens?.controlCount === 3, 'mobile:03-lens', 'Lens does not expose all three mode controls', report.mobile.lens);
checkHard(
  JSON.stringify(report.mobile.lens?.modes) === JSON.stringify(['raw', 'segmentation', 'detection']),
  'mobile:03-lens',
  'Lens modes did not respond to touch in order',
  report.mobile.lens?.modes,
);
checkHard(report.desktop.nexusEvidenceCores === 3, 'desktop:03-lens', 'Not all Nexus evidence cores were collected', report.desktop.nexusEvidenceCores);
checkHard(report.desktop.nexusEvidenceHud === 3, 'desktop:03-lens', 'Evidence core HUD is incomplete', report.desktop.nexusEvidenceHud);
checkHard(report.desktop.proofHandoff?.reversible === true, 'desktop:04-proof', 'Proof handoff is not reversible', report.desktop.proofHandoff);
checkHard(report.desktop.proofHandoff?.clearsAtProof === true, 'desktop:04-proof', 'Proof handoff does not clear at the proof section', report.desktop.proofHandoff);
checkHard(report.desktop.evidenceMoved === true, 'desktop:evidence-weave', 'Evidence canvas did not advance', {
  map: report.desktop.evidenceMap,
  dawn: report.desktop.evidenceDawn,
});
checkHard(report.mobile.evidenceMoved === true, 'mobile:evidence-weave', 'Evidence canvas did not advance', {
  map: report.mobile.evidenceMap,
  dawn: report.mobile.evidenceDawn,
});

const deepLink = report.routes['/#mf-lens'];
checkHard(
  deepLink?.chapter !== 'lens'
    ? false
    : Math.abs(deepLink.targetTop - deepLink.scrollPaddingTop) <= 2,
  'route:/#mf-lens',
  'Lens deep link did not restore the chapter at the scroll-padding offset',
  deepLink,
);

report.summary = {
  baseUrl,
  status: report.hardFailures.length === 0 ? 'passed' : 'failed',
  hardFailCount: report.hardFailures.length,
  warningCount: report.warnings.length,
};
console.log(JSON.stringify(report, null, 2));

if (report.hardFailures.length > 0) process.exitCode = 1;
