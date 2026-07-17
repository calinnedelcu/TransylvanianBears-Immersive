import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const BASE_URL = (process.env.BASE_URL ?? process.env.QA_BASE_URL ?? 'http://127.0.0.1:4176').replace(/\/$/, '');
const OUTPUT_DIR = resolve(process.env.QA_OUTPUT_DIR ?? 'artifacts/qa-buried-act');
const REPORT_PATH = resolve(OUTPUT_DIR, 'report.json');
const MODEL_PATH = '/assets/world/buried-act/buried-mausoleum.glb';
const CAMERA_PATHS = {
  desktop: '/assets/vertical-slice/v1/08-10-buried/camera.desktop.json',
  mobile: '/assets/vertical-slice/v1/08-10-buried/camera.mobile.json',
};

const ROUTES = [
  { id: 'mf-descent', chapter: 'descent' },
  { id: 'mf-lamp', chapter: 'lamp' },
  { id: 'mf-build', chapter: 'build' },
];
const THRESHOLD_ROUTE = { id: 'mf-threshold', chapter: 'threshold' };
const INFECT_ROUTE = { id: 'mf-infect', chapter: 'infect' };

const VIEWPORTS = {
  desktop: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
  landscape844: {
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
  landscape780: {
    viewport: { width: 780, height: 390 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
  boundary830: {
    viewport: { width: 830, height: 600 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
  compact320: {
    viewport: { width: 320, height: 568 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
};

const RESPONSIVE_VIEWPORTS = ['landscape844', 'boundary830', 'landscape780', 'compact320'];

const EXPECTED_PROJECT_LINKS = [
  'https://juggypuggy.itch.io/the-buried-hands',
  'https://www.youtube.com/watch?v=RGyx2NxUYr8',
  'https://itch.io/jam/game-jam-vianu-2026/rate/4585325',
];

const EXPECTED_EVIDENCE_IMAGES = [
  '/assets/projects/buried-hands/mechanism.webp',
  '/assets/projects/buried-hands/guards.webp',
  '/assets/projects/buried-hands/mercury.webp',
  '/assets/projects/buried-hands/royal-hall.webp',
];

const EXPECTED_EVIDENCE_TEXTURES = {
  desktop: EXPECTED_EVIDENCE_IMAGES,
  mobile: EXPECTED_EVIDENCE_IMAGES.map((path) => path.replace(
    '/assets/projects/buried-hands/',
    '/assets/projects/buried-hands/mobile/',
  )),
};

const TRIANGLE_LIMIT = 90_000;
const PROCEDURAL_FX_TRIANGLE_MARGIN = 100_000;
const RENDER_TRIANGLE_LIMIT = TRIANGLE_LIMIT + PROCEDURAL_FX_TRIANGLE_MARGIN;
const RENDER_CALL_LIMITS = { desktop: 430, mobile: 170 };
const REQUIRED_NODES = '33/33';
const CAMERA_SAMPLE_COUNT = 241;
const PIXEL_PROGRESS_TOLERANCE = 0.0006;

const TIMEOUT = {
  total: 720_000,
  launch: 10_000,
  navigation: 15_000,
  app: 30_000,
  operation: 8_000,
  telemetry: 12_000,
  camera: 7_000,
  screenshot: 20_000,
  cleanup: 3_000,
};

const report = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  limitsMs: TIMEOUT,
  outputDir: OUTPUT_DIR,
  stages: [],
  viewports: {},
  responsiveViewports: {},
  reducedMotion: null,
  screenshots: [],
  errors: [],
  networkFailures: [],
  functionalFailures: [],
  warnings: [],
};

const warningKeys = new Set();
const managedBrowsers = new Set();
let aborting = false;

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function fail(scope, message, details) {
  report.functionalFailures.push({ scope, message, details });
}

function warn(scope, message, details, key = `${scope}:${message}`) {
  if (warningKeys.has(key)) return;
  warningKeys.add(key);
  report.warnings.push({ scope, message, details });
}

function check(condition, scope, message, details) {
  if (!condition) fail(scope, message, details);
  return condition;
}

function bounded(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function stage(label, operation, timeoutMs = TIMEOUT.operation) {
  if (aborting) throw new Error(`Suite aborted before ${label}`);
  const entry = { label, startedAt: new Date().toISOString(), status: 'running' };
  report.stages.push(entry);
  process.stdout.write(`[qa-buried-act] ${label}\n`);
  try {
    const result = await bounded(Promise.resolve().then(operation), timeoutMs, label);
    entry.status = 'passed';
    entry.durationMs = Date.now() - Date.parse(entry.startedAt);
    return result;
  } catch (error) {
    entry.status = 'failed';
    entry.durationMs = Date.now() - Date.parse(entry.startedAt);
    entry.error = errorMessage(error);
    throw error;
  }
}

async function attemptStage(label, operation, timeoutMs, scope, message) {
  try {
    return { ok: true, value: await stage(label, operation, timeoutMs) };
  } catch (error) {
    fail(scope, message, errorMessage(error));
    return { ok: false, error: errorMessage(error) };
  }
}

function attachDiagnostics(page, scope) {
  page.on('pageerror', (error) => {
    report.errors.push({ scope, type: 'pageerror', message: error.message });
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    report.errors.push({ scope, type: 'console', message: message.text() });
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown request failure';
    if (failure === 'net::ERR_ABORTED') return;
    report.networkFailures.push({
      scope,
      url: request.url(),
      method: request.method(),
      error: failure,
    });
  });
}

async function launchManagedBrowser() {
  const server = await stage(
    'launch browser',
    () => chromium.launchServer({ headless: true, timeout: TIMEOUT.launch }),
    TIMEOUT.launch,
  );
  try {
    const browser = await stage(
      'connect browser',
      () => chromium.connect(server.wsEndpoint(), { timeout: TIMEOUT.launch }),
      TIMEOUT.launch,
    );
    const managed = { browser, server };
    managedBrowsers.add(managed);
    return managed;
  } catch (error) {
    await bounded(server.kill(), TIMEOUT.cleanup, 'kill unconnected browser').catch(() => {
      if (server.process().exitCode === null) server.process().kill('SIGKILL');
    });
    throw error;
  }
}

async function closeManagedBrowser(managed) {
  if (!managed || !managedBrowsers.has(managed)) return;
  managedBrowsers.delete(managed);
  await bounded(managed.browser.close(), TIMEOUT.cleanup, 'browser.close').catch((error) => {
    warn('cleanup', 'Browser connection did not close cleanly', errorMessage(error));
  });
  await bounded(managed.server.kill(), TIMEOUT.cleanup, 'browserServer.kill').catch(() => {
    const process = managed.server.process();
    if (process.exitCode === null) process.kill('SIGKILL');
  });
}

async function cleanupAllBrowsers() {
  await Promise.all([...managedBrowsers].map(closeManagedBrowser));
}

async function safeClose(target, label) {
  if (!target) return;
  await bounded(target.close(), TIMEOUT.cleanup, label).catch((error) => {
    warn('cleanup', `${label} did not close cleanly`, errorMessage(error));
  });
}

async function evaluate(page, pageFunction, argument, label, timeoutMs = TIMEOUT.operation) {
  return bounded(page.evaluate(pageFunction, argument), timeoutMs, label);
}

async function capturePage(page, name, scope) {
  const path = resolve(OUTPUT_DIR, `${name}.png`);
  const result = await attemptStage(
    `screenshot ${name}`,
    () => page.screenshot({ path, animations: 'disabled', timeout: TIMEOUT.screenshot }),
    TIMEOUT.screenshot,
    scope,
    `Could not capture ${name}`,
  );
  if (!result.ok) return null;
  report.screenshots.push(path);
  return path;
}

async function waitForApp(page, scope) {
  await stage(`${scope}: app shell`, async () => {
    await page.locator('.mf-lab').waitFor({ state: 'attached', timeout: TIMEOUT.app });
    await page.waitForFunction(() => (
      ['mf-descent', 'mf-lamp', 'mf-build', 'mf-infect']
        .every((id) => document.getElementById(id) instanceof HTMLElement)
    ), undefined, { timeout: TIMEOUT.app });
    await page.evaluate(() => document.fonts?.ready);
  }, TIMEOUT.app);
}

async function settleHashRoute(
  page,
  route,
  scope,
  { allowDocumentFlowTop = false, phase = 'Direct hash' } = {},
) {
  let settled = true;
  try {
    await stage(`${scope}: settle ${phase.toLowerCase()} #${route.id}`, () => page.waitForFunction(({ id, chapter, allowFlowTop }) => {
      const root = document.querySelector('.mf-lab');
      const target = document.getElementById(id);
      if (!target || root?.getAttribute('data-active-chapter') !== chapter) return false;
      const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const targetTop = target.getBoundingClientRect().top;
      return window.location.hash === `#${id}`
        && (Math.abs(targetTop - padding) <= 2 || (allowFlowTop && Math.abs(targetTop) <= 2));
    }, { ...route, allowFlowTop: allowDocumentFlowTop }, { timeout: TIMEOUT.operation }), TIMEOUT.operation);
  } catch {
    settled = false;
  }

  const state = await evaluate(page, ({ id }) => {
    const root = document.querySelector('.mf-lab');
    const target = document.getElementById(id);
    const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const targetTop = target?.getBoundingClientRect().top ?? null;
    return {
      hash: window.location.hash,
      activeChapter: root?.getAttribute('data-active-chapter') ?? null,
      renderer: root?.getAttribute('data-renderer') ?? null,
      qualityTier: root?.getAttribute('data-quality-tier') ?? null,
      targetTop,
      scrollPaddingTop: padding,
      offsetDelta: targetTop === null ? null : Number((targetTop - padding).toFixed(2)),
      scrollY: Math.round(window.scrollY),
    };
  }, route, `${scope}: inspect ${phase.toLowerCase()}`);

  let valid = settled
    && state.hash === `#${route.id}`
    && state.activeChapter === route.chapter
    && state.offsetDelta !== null
    && (
      Math.abs(state.offsetDelta) <= 2
      || (allowDocumentFlowTop && state.targetTop !== null && Math.abs(state.targetTop) <= 2)
    );

  let recovery = null;
  if (!valid) {
    try {
      await evaluate(page, ({ id }) => {
        const target = document.getElementById(id);
        if (!target) return;
        const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        window.scrollTo({
          top: window.scrollY + target.getBoundingClientRect().top - padding,
          behavior: 'instant',
        });
      }, route, `${scope}: recover ${phase.toLowerCase()}`);
      await page.waitForTimeout(180);
      recovery = await evaluate(page, ({ id }) => {
        const root = document.querySelector('.mf-lab');
        const target = document.getElementById(id);
        const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        const targetTop = target?.getBoundingClientRect().top ?? null;
        return {
          hash: window.location.hash,
          activeChapter: root?.getAttribute('data-active-chapter') ?? null,
          renderer: root?.getAttribute('data-renderer') ?? null,
          qualityTier: root?.getAttribute('data-quality-tier') ?? null,
          targetTop,
          scrollPaddingTop: padding,
          offsetDelta: targetTop === null ? null : Number((targetTop - padding).toFixed(2)),
          scrollY: Math.round(window.scrollY),
        };
      }, route, `${scope}: inspect ${phase.toLowerCase()} recovery`);
      valid = recovery.hash === `#${route.id}`
        && recovery.activeChapter === route.chapter
        && recovery.offsetDelta !== null
        && (
          Math.abs(recovery.offsetDelta) <= 2
          || (allowDocumentFlowTop && recovery.targetTop !== null && Math.abs(recovery.targetTop) <= 2)
        );
    } catch (error) {
      recovery = { error: errorMessage(error) };
    }
  }

  const finalState = valid && recovery && !recovery.error ? recovery : state;
  check(valid, scope, `${phase} #${route.id} did not settle`, finalState);

  return {
    ...finalState,
    settled: valid,
    recovery,
  };
}

async function freshNavigate(
  page,
  route,
  scope,
  { allowDocumentFlowTop = false } = {},
) {
  await stage(
    `${scope}: reset document`,
    () => page.goto('about:blank', { waitUntil: 'commit', timeout: TIMEOUT.navigation }),
    TIMEOUT.navigation,
  );
  const startedAt = Date.now();
  const response = await stage(`${scope}: direct #${route.id}`, () => page.goto(
    `${BASE_URL}/#${route.id}`,
    { waitUntil: 'domcontentloaded', timeout: TIMEOUT.navigation },
  ), TIMEOUT.navigation);
  await waitForApp(page, scope);
  const state = await settleHashRoute(page, route, scope, {
    allowDocumentFlowTop,
    phase: 'Direct hash',
  });
  check(
    response === null || (response.status() >= 200 && response.status() < 400),
    scope,
    `Direct hash #${route.id} returned an invalid response`,
    { status: response?.status() ?? null },
  );
  return {
    ...state,
    responseStatus: response?.status() ?? null,
    settledMs: Date.now() - startedAt,
  };
}

async function reloadHashRoute(
  page,
  route,
  scope,
  { allowDocumentFlowTop = false } = {},
) {
  const startedAt = Date.now();
  const response = await stage(
    `${scope}: reload #${route.id}`,
    () => page.reload({ waitUntil: 'domcontentloaded', timeout: TIMEOUT.navigation }),
    TIMEOUT.navigation,
  );
  await waitForApp(page, scope);
  const state = await settleHashRoute(page, route, scope, {
    allowDocumentFlowTop,
    phase: 'Reloaded direct hash',
  });
  check(
    response === null || (response.status() >= 200 && response.status() < 400),
    scope,
    `Reloaded direct hash #${route.id} returned an invalid response`,
    { status: response?.status() ?? null },
  );
  return {
    ...state,
    responseStatus: response?.status() ?? null,
    settledMs: Date.now() - startedAt,
  };
}

async function moveToRoute(page, route, scope, { allowDocumentFlowTop = false } = {}) {
  await evaluate(page, ({ id }) => {
    const target = document.getElementById(id);
    if (!target) return;
    const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    history.replaceState(history.state, '', `#${id}`);
    window.scrollTo({
      top: window.scrollY + target.getBoundingClientRect().top - padding,
      behavior: 'instant',
    });
  }, route, `${scope}: move to #${route.id}`);
  return settleHashRoute(page, route, scope, {
    allowDocumentFlowTop,
    phase: 'In-document route',
  });
}

async function waitForBuriedTelemetry(page, scope) {
  const renderer = await evaluate(page, () => (
    document.querySelector('.mf-lab')?.getAttribute('data-renderer') ?? null
  ), undefined, `${scope}: renderer`);
  if (!check(renderer === 'webgl', scope, 'Buried Act did not mount the WebGL renderer', { renderer })) {
    return { modelReady: false, cameraReady: false };
  }

  const modelWait = await attemptStage(
    `${scope}: model telemetry ready`,
    () => page.waitForFunction(() => {
      const root = document.querySelector('.mf-lab');
      return root?.getAttribute('data-buried-act-model') === 'ready'
        && root.hasAttribute('data-buried-act-nodes')
        && root.hasAttribute('data-buried-act-triangles');
    }, undefined, { timeout: TIMEOUT.telemetry }),
    TIMEOUT.telemetry,
    scope,
    'Buried Act model telemetry did not become ready',
  );

  const cameraWait = await attemptStage(
    `${scope}: authored camera telemetry ready`,
    () => page.waitForFunction(() => {
      const status = document.querySelector('.mf-lab')?.getAttribute('data-buried-act-camera');
      return status === 'ready' || status === 'fallback';
    }, undefined, { timeout: TIMEOUT.camera }),
    TIMEOUT.camera,
    scope,
    'Buried Act authored camera telemetry did not reach a terminal state',
  );
  const renderWait = await attemptStage(
    `${scope}: render budget telemetry ready`,
    () => page.waitForFunction(() => {
      const root = document.querySelector('.mf-lab');
      const calls = Number(root?.getAttribute('data-render-calls'));
      const triangles = Number(root?.getAttribute('data-render-triangles'));
      return root?.hasAttribute('data-render-calls')
        && root.hasAttribute('data-render-triangles')
        && Number.isFinite(calls)
        && calls > 0
        && Number.isFinite(triangles)
        && triangles > 0;
    }, undefined, { timeout: TIMEOUT.telemetry }),
    TIMEOUT.telemetry,
    scope,
    'Buried Act render budget telemetry did not become ready',
  );
  return { modelReady: modelWait.ok, cameraReady: cameraWait.ok, renderReady: renderWait.ok };
}

async function runtimeTelemetry(page, tier, scope) {
  const renderCallLimit = RENDER_CALL_LIMITS[tier];
  const telemetry = await evaluate(page, () => {
    const root = document.querySelector('.mf-lab');
    const rawTriangles = root?.getAttribute('data-buried-act-triangles');
    return {
      renderer: root?.getAttribute('data-renderer') ?? null,
      qualityTier: root?.getAttribute('data-quality-tier') ?? null,
      model: root?.getAttribute('data-buried-act-model') ?? null,
      nodes: root?.getAttribute('data-buried-act-nodes') ?? null,
      runtimeNodes: Number(root?.getAttribute('data-buried-act-runtime-nodes') ?? Number.NaN),
      triangles: rawTriangles === null ? Number.NaN : Number(rawTriangles),
      camera: root?.getAttribute('data-buried-act-camera') ?? null,
      cameraVariant: root?.getAttribute('data-buried-act-camera-variant') ?? null,
      lamp: root?.getAttribute('data-buried-lamp') ?? null,
      evidence: root?.getAttribute('data-buried-act-evidence') ?? 'none',
      renderCalls: Number(root?.getAttribute('data-render-calls') ?? Number.NaN),
      renderTriangles: Number(root?.getAttribute('data-render-triangles') ?? Number.NaN),
      canvasCount: document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length,
    };
  }, undefined, `${scope}: runtime telemetry`);

  check(telemetry.renderer === 'webgl', scope, 'Expected WebGL renderer for Buried Act QA', telemetry);
  check(telemetry.model === 'ready', scope, 'Buried Act model is not ready', telemetry);
  check(telemetry.nodes === REQUIRED_NODES, scope, `Required GLB nodes are not ${REQUIRED_NODES}`, telemetry);
  check(
    Number.isFinite(telemetry.runtimeNodes) && telemetry.runtimeNodes >= 33,
    scope,
    'Runtime node telemetry is missing or implausible',
    telemetry,
  );
  check(
    Number.isFinite(telemetry.triangles) && telemetry.triangles > 0 && telemetry.triangles < TRIANGLE_LIMIT,
    scope,
    `Buried Act geometry must stay under ${TRIANGLE_LIMIT} triangles`,
    telemetry,
  );
  check(
    Number.isFinite(telemetry.renderCalls)
      && telemetry.renderCalls > 0
      && telemetry.renderCalls <= renderCallLimit,
    scope,
    `Buried Act render calls exceeded the ${tier} ceiling of ${renderCallLimit}`,
    { renderCallLimit, ...telemetry },
  );
  check(
    Number.isFinite(telemetry.renderTriangles)
      && telemetry.renderTriangles > 0
      && telemetry.renderTriangles <= RENDER_TRIANGLE_LIMIT,
    scope,
    `Buried Act rendered triangles exceeded the ${RENDER_TRIANGLE_LIMIT} contract-plus-FX ceiling`,
    {
      geometryContract: TRIANGLE_LIMIT,
      proceduralFxMargin: PROCEDURAL_FX_TRIANGLE_MARGIN,
      renderTriangleLimit: RENDER_TRIANGLE_LIMIT,
      ...telemetry,
    },
  );
  check(telemetry.camera === 'ready', scope, 'Buried Act authored camera is not ready', telemetry);
  check(
    telemetry.cameraVariant === tier,
    scope,
    'Buried Act selected camera variant telemetry is missing or incorrect',
    { expectedCameraVariant: tier, ...telemetry },
  );
  check(telemetry.canvasCount === 1, scope, 'Expected exactly one immersive canvas', telemetry);
  return telemetry;
}

async function collectAssetTelemetry(page, tier, scope) {
  const cameraPath = CAMERA_PATHS[tier];
  const selectedEvidencePaths = EXPECTED_EVIDENCE_TEXTURES[tier];
  const contracts = {
    desktop: {
      id: 'vs08-10.buried.camera.desktop',
      fov: [42, 53],
      start: { position: [0, 3.8, -120], target: [0, 1.65, -128], fovDegrees: 50, rollDegrees: 0 },
      end: { position: [0, -0.45, -191.85], target: [0, -0.52, -195.35], fovDegrees: 42, rollDegrees: 0 },
    },
    mobile: {
      id: 'vs08-10.buried.camera.mobile',
      fov: [52, 64],
      start: { position: [0, 4.25, -120], target: [0, 1.7, -128], fovDegrees: 60, rollDegrees: 0 },
      end: { position: [0, -0.35, -191.85], target: [0, -0.52, -195.35], fovDegrees: 54, rollDegrees: 0 },
    },
  };

  const telemetry = await evaluate(page, async ({
    curvePath,
    modelPath,
    contract,
    fetchTimeout,
    evidencePaths,
    desktopEvidencePaths,
  }) => {
    const fetchAsset = async (path, asJson) => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), fetchTimeout);
      try {
        const response = await fetch(path, { cache: 'no-store', signal: controller.signal });
        const buffer = await response.arrayBuffer();
        let payload = null;
        let parseError = null;
        if (asJson) {
          try {
            payload = JSON.parse(new TextDecoder().decode(buffer));
          } catch (error) {
            parseError = String(error);
          }
        }
        return { ok: response.ok, status: response.status, bytes: buffer.byteLength, payload, parseError };
      } catch (error) {
        return { ok: false, status: null, bytes: 0, payload: null, error: String(error) };
      } finally {
        window.clearTimeout(timer);
      }
    };

    const closeNumber = (first, second) => Math.abs(first - second) <= 1e-4;
    const closeVector = (first, second) => (
      Array.isArray(first)
      && first.length === 3
      && first.every((value, index) => closeNumber(value, second[index]))
    );
    const validVector = (value) => (
      Array.isArray(value) && value.length === 3 && value.every(Number.isFinite)
    );
    const poseMatches = (sample, pose, progress) => Boolean(sample)
      && closeNumber(sample.progress, progress)
      && closeVector(sample.position, pose.position)
      && closeVector(sample.target, pose.target)
      && closeNumber(sample.fovDegrees, pose.fovDegrees)
      && closeNumber(sample.rollDegrees, pose.rollDegrees);

    const absoluteModelUrl = new URL(modelPath, window.location.href).href;
    const absoluteCameraUrl = new URL(curvePath, window.location.href).href;
    const modelRequestedByScene = performance.getEntriesByName(absoluteModelUrl).length > 0;
    const cameraRequestedByScene = performance.getEntriesByName(absoluteCameraUrl).length > 0;
    const normalizePath = (value) => new URL(value, window.location.href).pathname;
    const selectedEvidence = evidencePaths.map(normalizePath);
    const desktopEvidence = desktopEvidencePaths.map(normalizePath);
    const evidenceUniverse = new Set([...selectedEvidence, ...desktopEvidence]);
    const requestedEvidence = [...new Set(
      performance.getEntriesByType('resource')
        .map((entry) => normalizePath(entry.name))
        .filter((path) => evidenceUniverse.has(path)),
    )];
    const [cameraAsset, modelAsset] = await Promise.all([
      fetchAsset(curvePath, true),
      fetchAsset(modelPath, false),
    ]);

    const payload = cameraAsset.payload;
    const samples = Array.isArray(payload?.samples) ? payload.samples : [];
    const [minimumFov, maximumFov] = contract.fov;
    const samplesValid = samples.length === 241 && samples.every((sample, index) => {
      const expectedProgress = Number((index / 240).toFixed(8));
      if (
        !sample
        || !Number.isFinite(sample.progress)
        || sample.progress !== expectedProgress
        || !validVector(sample.position)
        || !validVector(sample.target)
        || !Number.isFinite(sample.fovDegrees)
        || sample.fovDegrees < minimumFov
        || sample.fovDegrees > maximumFov
        || !Number.isFinite(sample.rollDegrees)
        || Math.abs(sample.rollDegrees) > 1
      ) return false;
      const distance = Math.hypot(...sample.target.map((value, axis) => value - sample.position[axis]));
      return distance >= 1.25;
    });
    const holdReference = samples[48];
    const holdValid = Boolean(holdReference)
      && closeVector(holdReference.target, [0, -0.45, -154.15])
      && samples.slice(48, 65).every((sample) => (
        closeVector(sample.position, holdReference.position)
        && closeVector(sample.target, holdReference.target)
        && closeNumber(sample.fovDegrees, holdReference.fovDegrees)
        && closeNumber(sample.rollDegrees, holdReference.rollDegrees)
      ));

    const canvas = document.querySelector('.mf-world canvas, canvas.mf-canvas');
    let graphics = null;
    if (canvas instanceof HTMLCanvasElement) {
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (context) {
        const debugInfo = context.getExtension('WEBGL_debug_renderer_info');
        graphics = {
          api: typeof WebGL2RenderingContext !== 'undefined' && context instanceof WebGL2RenderingContext
            ? 'webgl2'
            : 'webgl',
          renderer: debugInfo
            ? context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            : context.getParameter(context.RENDERER),
          vendor: debugInfo
            ? context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
            : context.getParameter(context.VENDOR),
        };
      }
    }

    return {
      graphics,
      camera: {
        path: curvePath,
        requestedByScene: cameraRequestedByScene,
        ok: cameraAsset.ok,
        status: cameraAsset.status,
        bytes: cameraAsset.bytes,
        schemaVersion: payload?.schemaVersion ?? null,
        id: payload?.id ?? null,
        sampleCount: samples.length,
        samplesValid,
        endpointsValid: poseMatches(samples[0], contract.start, 0)
          && poseMatches(samples.at(-1), contract.end, 1),
        holdValid,
        start: samples[0] ?? null,
        end: samples.at(-1) ?? null,
        error: cameraAsset.error ?? cameraAsset.parseError ?? null,
      },
      model: {
        path: modelPath,
        requestedByScene: modelRequestedByScene,
        ok: modelAsset.ok,
        status: modelAsset.status,
        bytes: modelAsset.bytes,
        error: modelAsset.error ?? null,
      },
      evidence: {
        selectedPaths: selectedEvidence,
        requestedPaths: requestedEvidence,
        selectedRequested: selectedEvidence.filter((path) => requestedEvidence.includes(path)),
        selectedMissing: selectedEvidence.filter((path) => !requestedEvidence.includes(path)),
        desktopRequested: desktopEvidence.filter((path) => requestedEvidence.includes(path)),
      },
    };
  }, {
    curvePath: cameraPath,
    modelPath: MODEL_PATH,
    contract: contracts[tier],
    fetchTimeout: TIMEOUT.telemetry,
    evidencePaths: selectedEvidencePaths,
    desktopEvidencePaths: EXPECTED_EVIDENCE_IMAGES,
  }, `${scope}: asset telemetry`, TIMEOUT.telemetry + 2_000);

  check(
    telemetry.camera.ok
      && telemetry.camera.schemaVersion === 1
      && telemetry.camera.id === contracts[tier].id
      && telemetry.camera.sampleCount === CAMERA_SAMPLE_COUNT
      && telemetry.camera.samplesValid
      && telemetry.camera.endpointsValid
      && telemetry.camera.holdValid,
    scope,
    'Buried Act authored camera asset is invalid',
    telemetry.camera,
  );
  check(
    telemetry.camera.requestedByScene,
    scope,
    'The renderer did not request the selected Buried Act camera curve',
    telemetry.camera,
  );
  check(
    telemetry.model.ok && telemetry.model.bytes > 0,
    scope,
    'Buried Act model asset is unavailable',
    telemetry.model,
  );
  check(
    telemetry.model.requestedByScene,
    scope,
    'The renderer did not request the Buried Act GLB',
    telemetry.model,
  );
  check(
    telemetry.evidence.selectedMissing.length === 0,
    scope,
    `The ${tier} renderer did not request every selected evidence texture variant`,
    telemetry.evidence,
  );
  if (tier === 'mobile') {
    check(
      telemetry.evidence.desktopRequested.length === 0,
      scope,
      'Mobile Buried Act requested desktop evidence textures instead of only the /mobile/ set',
      telemetry.evidence,
    );
  }
  return telemetry;
}

async function evidenceRequestState(page, tier, scope) {
  const state = await evaluate(page, ({ selectedPaths, desktopPaths }) => {
    const normalizePath = (value) => new URL(value, window.location.href).pathname;
    const selected = selectedPaths.map(normalizePath);
    const desktop = desktopPaths.map(normalizePath);
    const universe = new Set([...selected, ...desktop]);
    const requested = [...new Set(
      performance.getEntriesByType('resource')
        .map((entry) => normalizePath(entry.name))
        .filter((path) => universe.has(path)),
    )];
    return {
      selectedPaths: selected,
      requestedPaths: requested,
      selectedRequested: selected.filter((path) => requested.includes(path)),
      selectedMissing: selected.filter((path) => !requested.includes(path)),
      desktopRequested: desktop.filter((path) => requested.includes(path)),
    };
  }, {
    selectedPaths: EXPECTED_EVIDENCE_TEXTURES[tier],
    desktopPaths: EXPECTED_EVIDENCE_IMAGES,
  }, `${scope}: evidence texture requests`);
  check(
    state.selectedMissing.length === 0,
    scope,
    `The ${tier} journey did not request every selected evidence texture variant`,
    state,
  );
  if (tier === 'mobile') {
    check(
      state.desktopRequested.length === 0,
      scope,
      'Mobile evidence journey requested desktop textures in addition to the /mobile/ variants',
      state,
    );
  }
  return state;
}

async function layoutState(page, selector, scope) {
  const layout = await evaluate(page, ({ targetSelector }) => {
    const width = document.documentElement.clientWidth;
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const target = document.querySelector(targetSelector);
    const offenders = scrollWidth > width
      ? Array.from(document.body.querySelectorAll('*')).flatMap((element) => {
          if (!(element instanceof HTMLElement)) return [];
          const style = getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) <= 0.05) return [];
          const rect = element.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0 || (rect.left >= -1 && rect.right <= width + 1)) return [];
          return [{
            element: element.id ? `#${element.id}` : `${element.tagName.toLowerCase()}.${Array.from(element.classList).slice(0, 2).join('.')}`,
            left: Number(rect.left.toFixed(1)),
            right: Number(rect.right.toFixed(1)),
            width: Number(rect.width.toFixed(1)),
          }];
        }).slice(0, 12)
      : [];
    const brokenImages = target
      ? Array.from(target.querySelectorAll('img'))
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => image.getAttribute('src'))
      : [];
    return {
      clientWidth: width,
      scrollWidth,
      overflow: scrollWidth - width,
      offenders,
      brokenImages,
    };
  }, { targetSelector: selector }, `${scope}: layout`);
  check(layout.overflow === 0, scope, 'Horizontal overflow detected', layout);
  check(layout.brokenImages.length === 0, scope, 'Broken chapter image detected', layout);
  return layout;
}

async function hitTargetState(page, rootSelector, scope, { minimumCount, minimumSize = 44 }) {
  const state = await evaluate(page, ({ targetRoot, targetSize }) => {
    const root = document.querySelector(targetRoot);
    const targets = root ? Array.from(root.querySelectorAll('button, a[href]')) : [];
    const entries = targets.map((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const visible = style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) > 0.05
        && rect.width > 0
        && rect.height > 0;
      const label = element.getAttribute('aria-label')
        ?? element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80)
        ?? '';
      return {
        index,
        element: `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).trim().replace(/\s+/g, '.')}` : ''}`,
        label,
        visible,
        disabled: element instanceof HTMLButtonElement ? element.disabled : false,
        pointerEvents: style.pointerEvents,
        width: Number(rect.width.toFixed(1)),
        height: Number(rect.height.toFixed(1)),
        left: Number(rect.left.toFixed(1)),
        right: Number(rect.right.toFixed(1)),
        horizontallyContained: rect.left >= -1 && rect.right <= innerWidth + 1,
        meetsMinimum: rect.width >= targetSize && rect.height >= targetSize,
      };
    });
    const visibleTargets = entries.filter((entry) => entry.visible);
    return {
      rootExists: Boolean(root),
      minimumSize: targetSize,
      viewport: { width: innerWidth, height: innerHeight },
      targetCount: entries.length,
      visibleTargetCount: visibleTargets.length,
      violations: visibleTargets.filter((entry) => (
        entry.disabled
        || entry.pointerEvents === 'none'
        || !entry.horizontallyContained
        || !entry.meetsMinimum
      )),
      targets: entries,
    };
  }, { targetRoot: rootSelector, targetSize: minimumSize }, `${scope}: hit targets`);
  check(
    state.rootExists && state.visibleTargetCount >= minimumCount,
    scope,
    `Expected at least ${minimumCount} visible hit targets in ${rootSelector}`,
    state,
  );
  check(
    state.violations.length === 0,
    scope,
    `Interactive targets in ${rootSelector} must be enabled, reachable, and at least ${minimumSize}px square`,
    state,
  );
  return state;
}

async function textOverlapState(page, selector, scope) {
  const state = await evaluate(page, ({ targetSelector }) => {
    const roots = [document.querySelector(targetSelector), document.querySelector('.mf-header')]
      .filter((root) => root instanceof HTMLElement);
    const viewport = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const fragments = [];

    const intersect = (first, second) => ({
      left: Math.max(first.left, second.left),
      top: Math.max(first.top, second.top),
      right: Math.min(first.right, second.right),
      bottom: Math.min(first.bottom, second.bottom),
    });
    const hasArea = (rect) => rect.right - rect.left > 0.5 && rect.bottom - rect.top > 0.5;
    const visible = (element) => {
      if (element.closest('[hidden], [aria-hidden="true"]')) return false;
      let current = element;
      while (current instanceof HTMLElement) {
        const style = getComputedStyle(current);
        if (
          style.display === 'none'
          || style.visibility === 'hidden'
          || style.visibility === 'collapse'
          || Number(style.opacity) <= 0.05
        ) return false;
        current = current.parentElement;
      }
      return true;
    };
    const clippedRect = (source, owner) => {
      let clipped = intersect(source, viewport);
      let current = owner.parentElement;
      while (hasArea(clipped) && current instanceof HTMLElement) {
        const style = getComputedStyle(current);
        const bounds = current.getBoundingClientRect();
        if (['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowX)) {
          clipped.left = Math.max(clipped.left, bounds.left);
          clipped.right = Math.min(clipped.right, bounds.right);
        }
        if (['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowY)) {
          clipped.top = Math.max(clipped.top, bounds.top);
          clipped.bottom = Math.min(clipped.bottom, bounds.bottom);
        }
        current = current.parentElement;
      }
      return clipped;
    };
    const label = (element) => {
      const name = element.id
        ? `${element.tagName.toLowerCase()}#${element.id}`
        : `${element.tagName.toLowerCase()}${Array.from(element.classList).slice(0, 2).map((entry) => `.${entry}`).join('')}`;
      return `${name}: ${(element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)}`;
    };

    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const text = node.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        const owner = node.parentElement;
        if (text && owner && !['SCRIPT', 'STYLE', 'SVG', 'OPTION'].includes(owner.tagName) && visible(owner)) {
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            const clipped = clippedRect(rect, owner);
            if (!hasArea(clipped)) continue;
            fragments.push({
              owner,
              label: label(owner),
              text: text.slice(0, 80),
              left: clipped.left,
              top: clipped.top,
              right: clipped.right,
              bottom: clipped.bottom,
            });
          }
        }
        node = walker.nextNode();
      }
    }

    const overlaps = [];
    const seen = new Set();
    for (let firstIndex = 0; firstIndex < fragments.length; firstIndex += 1) {
      const first = fragments[firstIndex];
      for (let secondIndex = firstIndex + 1; secondIndex < fragments.length; secondIndex += 1) {
        const second = fragments[secondIndex];
        if (
          first.owner === second.owner
          || first.owner.contains(second.owner)
          || second.owner.contains(first.owner)
        ) continue;
        const width = Math.min(first.right, second.right) - Math.max(first.left, second.left);
        const height = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
        if (width < 4 || height < 7) continue;
        const firstWidth = first.right - first.left;
        const secondWidth = second.right - second.left;
        const firstHeight = first.bottom - first.top;
        const secondHeight = second.bottom - second.top;
        const horizontalRatio = width / Math.min(firstWidth, secondWidth);
        const verticalRatio = height / Math.min(firstHeight, secondHeight);
        const areaRatio = (width * height) / Math.min(firstWidth * firstHeight, secondWidth * secondHeight);
        if (horizontalRatio < 0.25 || verticalRatio < 0.35 || areaRatio < 0.18) continue;
        const key = [first.label, second.label].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        overlaps.push({
          first: first.label,
          second: second.label,
          intersection: {
            width: Number(width.toFixed(1)),
            height: Number(height.toFixed(1)),
            areaRatio: Number(areaRatio.toFixed(2)),
          },
        });
        if (overlaps.length >= 20) break;
      }
      if (overlaps.length >= 20) break;
    }
    return { fragmentCount: fragments.length, severeOverlapCount: overlaps.length, overlaps };
  }, { targetSelector: selector }, `${scope}: text overlap`);
  check(state.severeOverlapCount === 0, scope, 'Severe visible text overlap detected', state);
  return state;
}

async function analyzeCanvas(buffer) {
  const stats = await sharp(buffer).stats();
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .resize({ width: 120, height: 75, fit: 'fill', kernel: sharp.kernel.nearest })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const luminance = [];
  const buckets = new Map();
  for (let index = 0; index < data.length; index += info.channels) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    luminance.push(red * 0.2126 + green * 0.7152 + blue * 0.0722);
    const key = `${red >> 4}:${green >> 4}:${blue >> 4}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const mean = luminance.reduce((total, value) => total + value, 0) / luminance.length;
  const variance = luminance.reduce((total, value) => total + (value - mean) ** 2, 0) / luminance.length;
  const minimum = Math.min(...luminance);
  const maximum = Math.max(...luminance);
  const dominant = Math.max(...buckets.values()) / luminance.length;
  const signature = {
    hash: createHash('sha256').update(buffer).digest('hex').slice(0, 16),
    width: info.width,
    height: info.height,
    entropy: Number(stats.entropy.toFixed(3)),
    channelMeans: stats.channels.slice(0, 3).map((channel) => Number(channel.mean.toFixed(2))),
    channelStdDev: stats.channels.slice(0, 3).map((channel) => Number(channel.stdev.toFixed(2))),
    luminanceMean: Number(mean.toFixed(2)),
    luminanceStdDev: Number(Math.sqrt(variance).toFixed(2)),
    luminanceRange: Number((maximum - minimum).toFixed(2)),
    quantizedColors: buckets.size,
    dominantColorRatio: Number(dominant.toFixed(4)),
  };
  signature.filled = signature.entropy >= 0.35
    && signature.luminanceStdDev >= 1.2
    && signature.luminanceRange >= 6
    && signature.quantizedColors >= 6
    && signature.dominantColorRatio < 0.985;
  return signature;
}

async function canvasState(page, name, scope) {
  const locator = page.locator('.mf-world canvas, canvas.mf-canvas').first();
  const count = await page.locator('.mf-world canvas, canvas.mf-canvas').count();
  if (!check(count === 1, scope, 'Immersive canvas is missing or duplicated', { count })) {
    return { count, filled: false };
  }
  const path = resolve(OUTPUT_DIR, `${name}-canvas.png`);
  const isolation = await page.addStyleTag({ content: `
    .mf-lab > :not(.mf-world) { visibility: hidden !important; }
    .mf-world { background: #000 !important; }
    .mf-world__grade { display: none !important; }
  ` });
  let shot;
  try {
    shot = await attemptStage(
      `screenshot ${name} canvas`,
      () => locator.screenshot({ path, animations: 'disabled', timeout: TIMEOUT.screenshot }),
      TIMEOUT.screenshot,
      scope,
      'Could not capture the immersive canvas',
    );
  } finally {
    await isolation.evaluate((style) => style.remove()).catch(() => {});
  }
  if (!shot.ok) return { count, filled: false, error: shot.error };
  report.screenshots.push(path);
  const signature = await analyzeCanvas(shot.value);
  const box = await locator.boundingBox();
  const state = { count, box, path, ...signature };
  check(
    box !== null && box.width >= 300 && box.height >= 300,
    scope,
    'Immersive canvas has invalid geometry',
    state,
  );
  check(state.filled, scope, 'Immersive canvas appears blank or nearly uniform', state);
  return state;
}

async function lampActionState(
  page,
  tier,
  scope,
  { keyboard = false, requireRootTelemetry = true } = {},
) {
  const initial = await evaluate(page, () => {
    const root = document.querySelector('.mf-lab');
    const section = document.getElementById('mf-lamp');
    const command = section?.querySelector('.mf-lamp-command');
    const status = command?.querySelector('[role="status"]');
    const buttonTexts = section
      ? Array.from(section.querySelectorAll('button')).map((button) => button.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      : [];
    return {
      commandCount: document.querySelectorAll('.mf-lamp-command').length,
      sectionButtonCount: section?.querySelectorAll('button').length ?? 0,
      fakeButtonCount: section?.querySelectorAll('[role="button"]:not(button)').length ?? 0,
      tag: command?.tagName.toLowerCase() ?? null,
      text: command?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      ariaLabel: command?.getAttribute('aria-label') ?? null,
      ariaDisabled: command?.getAttribute('aria-disabled') ?? null,
      disabled: command instanceof HTMLButtonElement ? command.disabled : null,
      visible: command instanceof HTMLElement && command.getBoundingClientRect().width > 0 && command.getBoundingClientRect().height > 0,
      statusCount: command?.querySelectorAll('[role="status"]').length ?? 0,
      statusText: status?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      statusLive: status?.getAttribute('aria-live') ?? null,
      ruleCount: section?.querySelectorAll('.mf-rule-sequence > li').length ?? 0,
      ruleInteractiveCount: section?.querySelectorAll('.mf-rule-sequence button, .mf-rule-sequence [role="button"]').length ?? 0,
      forbiddenButtons: buttonTexts.filter((text) => /(reset|replay|alege|select|descoper|hotspot|reia)/i.test(text)),
      rootLamp: root?.getAttribute('data-buried-lamp') ?? null,
      stageRaised: section?.querySelector('.mf-lamp-chamber__stage')?.hasAttribute('data-lamp-raised') ?? false,
    };
  }, undefined, `${scope}: initial lamp controls`);

  check(initial.commandCount === 1, scope, 'Expected exactly one explicit lamp command', initial);
  check(initial.sectionButtonCount === 1, scope, 'Lamp chapter exposes additional button actions', initial);
  check(initial.fakeButtonCount === 0, scope, 'Lamp chapter contains non-semantic button controls', initial);
  check(initial.tag === 'button' && initial.visible && initial.disabled === false, scope, 'Lamp command is not an operable button', initial);
  check(/^Ridică lampa/i.test(initial.text ?? ''), scope, 'Lamp command does not begin in its canonical offered state', initial);
  check(
    initial.ariaLabel === 'Ridică lampa'
      && initial.ariaDisabled === 'false'
      && !initial.stageRaised
      && (!requireRootTelemetry || initial.rootLamp === 'offered'),
    scope,
    'Initial one-shot lamp accessibility or telemetry state is not offered',
    initial,
  );
  check(
    initial.statusCount === 1
      && initial.statusLive === 'polite'
      && initial.statusText === 'O singură acțiune, fără rută alternativă',
    scope,
    'Initial lamp status announcement is missing or incorrect',
    initial,
  );
  check(initial.ruleCount === 3 && initial.ruleInteractiveCount === 0, scope, 'Lamp evidence rules must remain an ordered passive sequence', initial);
  check(initial.forbiddenButtons.length === 0, scope, 'Lamp chapter exposes alternate/replay controls', initial);

  await evaluate(page, () => {
    window.__buriedQaLampClicks = 0;
    document.querySelector('.mf-lamp-command')?.addEventListener('click', () => {
      window.__buriedQaLampClicks += 1;
    });
  }, undefined, `${scope}: install lamp click counter`);

  const command = page.locator('.mf-lamp-command');
  const action = await attemptStage(
    `${scope}: ${keyboard ? 'keyboard activate' : tier === 'mobile' ? 'tap' : 'click'} lamp`,
    async () => {
      if (keyboard) {
        await command.focus();
        await page.keyboard.press('Space');
      } else if (tier === 'mobile') {
        await command.tap({ timeout: TIMEOUT.operation });
      } else {
        await command.click({ timeout: TIMEOUT.operation });
      }
    },
    TIMEOUT.operation,
    scope,
    'Lamp command could not be activated',
  );

  if (action.ok) {
    await attemptStage(
      `${scope}: raised lamp telemetry`,
      () => page.waitForFunction(({ requireRoot }) => {
        const root = document.querySelector('.mf-lab');
        const commandElement = document.querySelector('.mf-lamp-command');
        const stage = document.querySelector('.mf-lamp-chamber__stage');
        const status = commandElement?.querySelector('[role="status"]');
        return commandElement?.getAttribute('aria-label') === 'Lampa este ridicată'
          && commandElement.getAttribute('aria-disabled') === 'true'
          && status?.textContent?.replace(/\s+/g, ' ').trim() === 'Traseul este acum lizibil'
          && (!requireRoot || root?.getAttribute('data-buried-lamp') === 'raised')
          && stage?.hasAttribute('data-lamp-raised');
      }, { requireRoot: requireRootTelemetry }, { timeout: TIMEOUT.operation }),
      TIMEOUT.operation,
      scope,
      'Lamp did not publish raised telemetry',
    );
  }

  const raised = await evaluate(page, () => {
    const root = document.querySelector('.mf-lab');
    const commandElement = document.querySelector('.mf-lamp-command');
    const stage = document.querySelector('.mf-lamp-chamber__stage');
    const status = commandElement?.querySelector('[role="status"]');
    return {
      clicks: window.__buriedQaLampClicks ?? 0,
      rootLamp: root?.getAttribute('data-buried-lamp') ?? null,
      ariaLabel: commandElement?.getAttribute('aria-label') ?? null,
      ariaDisabled: commandElement?.getAttribute('aria-disabled') ?? null,
      disabled: commandElement instanceof HTMLButtonElement ? commandElement.disabled : null,
      stageRaised: stage?.hasAttribute('data-lamp-raised') ?? false,
      text: commandElement?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      statusCount: commandElement?.querySelectorAll('[role="status"]').length ?? 0,
      statusText: status?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      statusLive: status?.getAttribute('aria-live') ?? null,
      focused: document.activeElement === commandElement,
    };
  }, undefined, `${scope}: raised lamp state`);
  check(
    raised.clicks === 1
      && (!requireRootTelemetry || raised.rootLamp === 'raised')
      && raised.ariaLabel === 'Lampa este ridicată'
      && raised.ariaDisabled === 'true'
      && raised.disabled === false
      && raised.stageRaised
      && raised.statusCount === 1
      && raised.statusLive === 'polite'
      && raised.statusText === 'Traseul este acum lizibil'
      && /^Lampa este ridicată/i.test(raised.text ?? ''),
    scope,
    'Single lamp action did not resolve to the canonical raised state',
    raised,
  );
  if (keyboard) check(raised.focused, scope, 'Keyboard lamp activation lost focus', raised);
  return { initial, raised };
}

async function projectLinksState(page, scope) {
  const state = await evaluate(page, ({ expected }) => {
    const nav = document.querySelector('nav[aria-label="The Buried Hands links"]');
    const links = nav ? Array.from(nav.querySelectorAll('a')).map((link) => {
      let protocol = null;
      try {
        protocol = new URL(link.href).protocol;
      } catch {
        protocol = null;
      }
      const rel = link.rel.split(/\s+/).filter(Boolean);
      return {
        text: link.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        href: link.getAttribute('href'),
        resolvedHref: link.href,
        protocol,
        target: link.target,
        rel,
        secureBlankTarget: link.target === '_blank' && (rel.includes('noreferrer') || rel.includes('noopener')),
      };
    }) : [];
    const internal = Array.from(document.querySelectorAll('#mf-lamp a[href^="#"], #mf-build a[href^="#"]')).map((link) => ({
      href: link.getAttribute('href'),
      targetExists: Boolean(document.querySelector(link.getAttribute('href'))),
    }));
    return {
      navExists: Boolean(nav),
      links,
      expected,
      exactOrder: links.length === expected.length && links.every((link, index) => link.href === expected[index]),
      unique: new Set(links.map((link) => link.href)).size === links.length,
      internal,
    };
  }, { expected: EXPECTED_PROJECT_LINKS }, `${scope}: project links`);

  check(state.navExists && state.exactOrder && state.unique, scope, 'Project links do not match the canonical destinations', state);
  check(
    state.links.every((link) => link.protocol === 'https:' && link.secureBlankTarget),
    scope,
    'Project links must use HTTPS and safe new-tab semantics',
    state,
  );
  check(state.internal.every((link) => link.targetExists), scope, 'Buried Act contains a broken internal hash link', state);
  return state;
}

async function setBuriedProgressPosition(page, progress, scope) {
  return evaluate(page, ({ targetProgress }) => {
    const start = document.getElementById('mf-descent');
    const lamp = document.getElementById('mf-lamp');
    const build = document.getElementById('mf-build');
    const end = document.getElementById('mf-infect');
    if (!start || !lamp || !build || !end) return null;
    const startTop = window.scrollY + start.getBoundingClientRect().top;
    const lampTop = window.scrollY + lamp.getBoundingClientRect().top;
    const buildTop = window.scrollY + build.getBoundingClientRect().top;
    const endTop = window.scrollY + end.getBoundingClientRect().top;
    const totalDistance = endTop - startTop;
    const lampBoundary = (lampTop - startTop) / totalDistance;
    const buildBoundary = (buildTop - startTop) / totalDistance;
    const rawProgress = targetProgress <= 0.18
      ? (targetProgress / 0.18) * lampBoundary
      : targetProgress <= 0.61
        ? lampBoundary + ((targetProgress - 0.18) / 0.43) * (buildBoundary - lampBoundary)
        : buildBoundary + ((targetProgress - 0.61) / 0.39) * (1 - buildBoundary);
    const destination = startTop + totalDistance * rawProgress;
    window.scrollTo({ top: destination, behavior: 'instant' });
    return {
      startTop,
      lampTop,
      buildTop,
      endTop,
      lampBoundary,
      buildBoundary,
      rawProgress,
      destination,
    };
  }, { targetProgress: progress }, `${scope}: set buried progress ${progress}`);
}

async function cycleQualityAtBuriedProgress(page, progress, scope) {
  return evaluate(page, async ({ targetProgress, tolerance }) => {
    const start = document.getElementById('mf-descent');
    const lamp = document.getElementById('mf-lamp');
    const build = document.getElementById('mf-build');
    const end = document.getElementById('mf-infect');
    if (!start || !lamp || !build || !end) return null;

    const startTop = window.scrollY + start.getBoundingClientRect().top;
    const lampTop = window.scrollY + lamp.getBoundingClientRect().top;
    const buildTop = window.scrollY + build.getBoundingClientRect().top;
    const endTop = window.scrollY + end.getBoundingClientRect().top;
    const totalDistance = endTop - startTop;
    const lampBoundary = (lampTop - startTop) / totalDistance;
    const buildBoundary = (buildTop - startTop) / totalDistance;
    const rawProgress = targetProgress <= 0.18
      ? (targetProgress / 0.18) * lampBoundary
      : targetProgress <= 0.61
        ? lampBoundary + ((targetProgress - 0.18) / 0.43) * (buildBoundary - lampBoundary)
        : buildBoundary + ((targetProgress - 0.61) / 0.39) * (1 - buildBoundary);
    const destination = startTop + totalDistance * rawProgress;
    const qualitySelector = '.mf-header__actions .mf-system-control[data-tier]';
    const snapshot = (phase) => {
      const root = document.querySelector('.mf-lab');
      const button = document.querySelector(qualitySelector);
      return {
        phase,
        progress: Number(root?.getAttribute('data-buried-act-progress') ?? Number.NaN),
        qualityTier: root?.getAttribute('data-quality-tier') ?? null,
        qualityLabel: button?.getAttribute('aria-label') ?? null,
        qualityModeToken: button?.querySelector('span')?.textContent?.trim() ?? null,
        renderer: root?.getAttribute('data-renderer') ?? null,
        pixelFrame: root?.getAttribute('data-buried-pixel-frame') ?? null,
        canvasCount: document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length,
        modelTelemetry: root?.getAttribute('data-buried-act-model') ?? null,
        buriedFrame: root?.getAttribute('data-buried-act-frame') ?? null,
      };
    };
    const settle = () => new Promise((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
    });

    const snapshots = [snapshot('before-scroll')];
    window.scrollTo({ top: destination, behavior: 'instant' });
    snapshots.push(snapshot('boundary-scroll'));
    let boundary = snapshot('boundary-settling');
    for (let attempt = 0; attempt < 90; attempt += 1) {
      await settle();
      boundary = snapshot('boundary-settled');
      if (
        Number.isFinite(boundary.progress)
        && Math.abs(boundary.progress - targetProgress) <= tolerance
        && boundary.progress < 0.999
        && boundary.renderer === 'webgl'
        && boundary.canvasCount === 1
        && boundary.pixelFrame === null
        && boundary.modelTelemetry === 'ready'
        && boundary.buriedFrame === 'rendered'
      ) break;
    }
    snapshots.push(boundary);

    let clickCount = 0;
    for (let index = 0; index < 3; index += 1) {
      const button = document.querySelector(qualitySelector);
      if (!(button instanceof HTMLButtonElement)) break;
      button.click();
      clickCount += 1;
      await settle();
      snapshots.push(snapshot(`quality-${index + 1}`));
    }

    let restored = snapshot('quality-restoring');
    for (let attempt = 0; attempt < 90; attempt += 1) {
      await settle();
      restored = snapshot('quality-restored');
      if (
        Number.isFinite(restored.progress)
        && Math.abs(restored.progress - targetProgress) <= tolerance
        && restored.progress < 0.999
        && restored.qualityModeToken === 'A'
        && restored.qualityTier !== 'editorial'
        && restored.renderer === 'webgl'
        && restored.canvasCount === 1
        && restored.pixelFrame === null
        && restored.modelTelemetry === 'ready'
        && restored.buriedFrame === 'rendered'
      ) break;
    }
    snapshots.push(restored);

    return {
      geometry: {
        startTop,
        lampTop,
        buildTop,
        endTop,
        lampBoundary,
        buildBoundary,
        rawProgress,
        destination,
      },
      clickCount,
      snapshots,
    };
  }, {
    targetProgress: progress,
    tolerance: PIXEL_PROGRESS_TOLERANCE,
  }, `${scope}: cycle quality at buried progress ${progress}`);
}

async function moveToBuriedProgress(page, checkpoint, scope) {
  const geometry = await setBuriedProgressPosition(page, checkpoint.progress, scope);
  if (!geometry) {
    fail(scope, 'Buried Act scroll geometry is unavailable', checkpoint);
    return { ...checkpoint, error: 'missing geometry' };
  }

  await attemptStage(
    `${scope}: settle progress ${checkpoint.progress}`,
    () => page.waitForFunction(({ evidence, focus, lamp }) => {
      const root = document.querySelector('.mf-lab');
      const actualEvidence = root?.getAttribute('data-buried-act-evidence') ?? 'none';
      const actualFocus = document.querySelector('.mf-lamp-progress i')?.getAttribute('data-focus') ?? null;
      const actualLamp = root?.getAttribute('data-buried-lamp') ?? null;
      return actualEvidence === evidence && actualFocus === focus && actualLamp === lamp;
    }, checkpoint, { timeout: TIMEOUT.operation }),
    TIMEOUT.operation,
    scope,
    `Canonical state did not settle at Buried Act progress ${checkpoint.progress}`,
  );

  const state = await evaluate(page, () => {
    const root = document.querySelector('.mf-lab');
    const activeRules = Array.from(document.querySelectorAll('.mf-rule-sequence > li[data-active]'));
    return {
      scrollY: Number(window.scrollY.toFixed(1)),
      activeChapter: root?.getAttribute('data-active-chapter') ?? null,
      evidence: root?.getAttribute('data-buried-act-evidence') ?? 'none',
      focus: document.querySelector('.mf-lamp-progress i')?.getAttribute('data-focus') ?? null,
      activeRuleCount: activeRules.length,
      activeRule: activeRules[0]?.querySelector('strong')?.textContent?.trim() ?? null,
      lamp: root?.getAttribute('data-buried-lamp') ?? null,
    };
  }, undefined, `${scope}: inspect progress ${checkpoint.progress}`);
  state.destinationDelta = Number((state.scrollY - geometry.destination).toFixed(1));
  check(Math.abs(state.destinationDelta) <= 2, scope, 'Buried progress scroll missed its destination', { checkpoint, geometry, state });
  check(
    state.evidence === checkpoint.evidence
      && state.focus === checkpoint.focus
      && state.lamp === checkpoint.lamp
      && state.activeRuleCount === 1,
    scope,
    'Buried Act departed from the canonical evidence state',
    { checkpoint, state },
  );
  return { ...checkpoint, ...state };
}

async function canonicalEvidenceJourney(page, scope) {
  const checkpoints = [
    { progress: 0.18, evidence: 'none', focus: 'oil', lamp: 'offered' },
    { progress: 0.39, evidence: 'mechanism', focus: 'oil', lamp: 'raised' },
    { progress: 0.46, evidence: 'mechanism', focus: 'mechanism', lamp: 'raised' },
    { progress: 0.62, evidence: 'guards', focus: 'mercury', lamp: 'raised' },
    { progress: 0.73, evidence: 'mercury', focus: 'mercury', lamp: 'raised' },
    { progress: 0.86, evidence: 'royal-hall', focus: 'mercury', lamp: 'raised' },
    { progress: 0.98, evidence: 'none', focus: 'mercury', lamp: 'raised' },
  ];
  await evaluate(page, () => {
    window.__buriedQaEvidenceTransitions = [];
    window.__buriedQaEvidenceObserver?.disconnect();
    const root = document.querySelector('.mf-lab');
    if (!root) return;
    window.__buriedQaEvidenceObserver = new MutationObserver(() => {
      const value = root.getAttribute('data-buried-act-evidence') ?? 'none';
      if (window.__buriedQaEvidenceTransitions.at(-1) !== value) {
        window.__buriedQaEvidenceTransitions.push(value);
      }
    });
    window.__buriedQaEvidenceObserver.observe(root, { attributes: true, attributeFilter: ['data-buried-act-evidence'] });
  }, undefined, `${scope}: observe evidence telemetry`);

  const observed = [];
  for (const checkpoint of checkpoints) {
    observed.push(await moveToBuriedProgress(page, checkpoint, scope));
  }
  const transitions = await evaluate(page, () => {
    window.__buriedQaEvidenceObserver?.disconnect();
    return window.__buriedQaEvidenceTransitions ?? [];
  }, undefined, `${scope}: evidence transitions`);
  const expectedEvidence = checkpoints.map((checkpoint) => checkpoint.evidence);
  const expectedTransitions = ['mechanism', 'guards', 'mercury', 'royal-hall', 'none'];
  check(
    observed.map((entry) => entry.evidence).join('|') === expectedEvidence.join('|'),
    scope,
    'Canonical evidence progression is incomplete or out of order',
    { expectedEvidence, observed, transitions },
  );
  check(
    transitions.join('|') === expectedTransitions.join('|'),
    scope,
    'Evidence telemetry did not publish the canonical transition order',
    { expectedTransitions, transitions },
  );
  return { checkpoints: observed, transitions };
}

async function pixelHandoffState(page, scope) {
  const inspect = (label) => evaluate(page, () => {
    const root = document.querySelector('.mf-lab');
    const rawProgress = root?.getAttribute('data-buried-act-progress');
    return {
      progress: rawProgress === null || rawProgress === undefined ? null : Number(rawProgress),
      rawProgress: rawProgress ?? null,
      hash: window.location.hash,
      activeChapter: root?.getAttribute('data-active-chapter') ?? null,
      renderer: root?.getAttribute('data-renderer') ?? null,
      qualityTier: root?.getAttribute('data-quality-tier') ?? null,
      qualityModeToken: document.querySelector('.mf-header__actions .mf-system-control[data-tier] span')
        ?.textContent?.trim() ?? null,
      canvasCount: document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length,
      modelTelemetry: root?.getAttribute('data-buried-act-model') ?? null,
      buriedFrame: root?.getAttribute('data-buried-act-frame') ?? null,
      evidence: root?.getAttribute('data-buried-act-evidence') ?? 'none',
      pixelFrame: root?.getAttribute('data-buried-pixel-frame') ?? null,
      pixelHandoffCount: document.querySelectorAll('.mf-pixel-handoff').length,
    };
  }, undefined, `${scope}: ${label}`);

  const beforeProgress = 0.998;
  const beforeGeometry = await setBuriedProgressPosition(page, beforeProgress, scope);
  if (!beforeGeometry) {
    fail(scope, 'Pixel handoff precondition has no Buried Act scroll geometry', { beforeProgress });
    return { error: 'missing pre-handoff geometry' };
  }
  await attemptStage(
    `${scope}: WebGL survives pre-handoff`,
    () => page.waitForFunction(({ expectedProgress, tolerance }) => {
      const root = document.querySelector('.mf-lab');
      const progress = Number(root?.getAttribute('data-buried-act-progress'));
      return Math.abs(progress - expectedProgress) <= tolerance
        && progress < 0.999
        && root?.getAttribute('data-active-chapter') === 'infect'
        && root.getAttribute('data-renderer') === 'webgl'
        && !root.hasAttribute('data-buried-pixel-frame')
        && document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length === 1;
    }, {
      expectedProgress: beforeProgress,
      tolerance: PIXEL_PROGRESS_TOLERANCE,
    }, { timeout: TIMEOUT.operation }),
    TIMEOUT.operation,
    scope,
    'Pixel handoff removed WebGL before canonical progress 1',
  );
  const before = await inspect('inspect pre-handoff');
  check(
    before.progress !== null
      && before.progress < 1
      && before.progress < 0.999
      && Math.abs(before.progress - beforeProgress) <= PIXEL_PROGRESS_TOLERANCE
      && before.activeChapter === 'infect'
      && before.renderer === 'webgl'
      && before.canvasCount === 1
      && before.pixelFrame === null
      && before.pixelHandoffCount === 1,
    scope,
    'Pixel handoff must remain on the WebGL scene before progress 1',
    { expectedProgress: beforeProgress, geometry: beforeGeometry, state: before },
  );

  await evaluate(page, () => {
    window.__buriedQaPixelObserver?.disconnect();
    window.__buriedQaPixelLifecycle = [];
    const root = document.querySelector('.mf-lab');
    if (!root) return;
    const current = {
      activeChapter: root.getAttribute('data-active-chapter'),
      renderer: root.getAttribute('data-renderer'),
      pixelFrame: root.getAttribute('data-buried-pixel-frame'),
      canvasCount: document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length,
    };
    const record = () => {
      const entry = {
        time: Number(performance.now().toFixed(2)),
        ...current,
      };
      const previous = window.__buriedQaPixelLifecycle.at(-1);
      if (
        previous?.activeChapter === entry.activeChapter
        && previous?.renderer === entry.renderer
        && previous?.pixelFrame === entry.pixelFrame
        && previous?.canvasCount === entry.canvasCount
      ) return;
      window.__buriedQaPixelLifecycle.push(entry);
    };
    const canvasDelta = (node, direction) => {
      if (!(node instanceof Element)) return;
      const count = Number(node.matches('canvas')) + node.querySelectorAll('canvas').length;
      current.canvasCount += count * direction;
    };
    const valueAfterMutation = (records, index, mutation) => {
      const next = records.slice(index + 1).find((candidate) => (
        candidate.type === 'attributes'
        && candidate.target === mutation.target
        && candidate.attributeName === mutation.attributeName
      ));
      return next ? next.oldValue : root.getAttribute(mutation.attributeName);
    };
    window.__buriedQaPixelObserver = new MutationObserver((records) => {
      records.forEach((mutation, index) => {
        if (mutation.type === 'attributes' && mutation.target === root) {
          const value = valueAfterMutation(records, index, mutation);
          if (mutation.attributeName === 'data-active-chapter') {
            current.activeChapter = value;
          } else if (mutation.attributeName === 'data-renderer') {
            current.renderer = value;
          } else if (mutation.attributeName === 'data-buried-pixel-frame') {
            current.pixelFrame = value;
          }
          record();
          return;
        }
        if (mutation.type !== 'childList') return;
        const mutationTarget = mutation.target;
        if (!(mutationTarget instanceof Element)) return;
        if (!mutationTarget.matches('.mf-world') && !mutationTarget.closest('.mf-world')) return;
        mutation.removedNodes.forEach((node) => canvasDelta(node, -1));
        mutation.addedNodes.forEach((node) => canvasDelta(node, 1));
        record();
      });
    });
    window.__buriedQaPixelObserver.observe(root, {
      attributes: true,
      attributeOldValue: true,
      childList: true,
      subtree: true,
      attributeFilter: ['data-active-chapter', 'data-renderer', 'data-buried-pixel-frame'],
    });
    record();
  }, undefined, `${scope}: observe pixel lifecycle`);

  const afterGeometry = await setBuriedProgressPosition(page, 1, scope);
  if (!afterGeometry) {
    fail(scope, 'Canonical pixel handoff has no Buried Act scroll geometry', { progress: 1 });
    return { before, error: 'missing handoff geometry' };
  }
  await attemptStage(
    `${scope}: rendered pixel frame precedes teardown`,
    () => page.waitForFunction(() => {
      const lifecycle = window.__buriedQaPixelLifecycle ?? [];
      return lifecycle.some((entry) => (
        entry.activeChapter === 'infect'
        && entry.renderer === 'webgl'
        && entry.pixelFrame === 'rendered'
        && entry.canvasCount === 1
      ));
    }, undefined, { timeout: TIMEOUT.operation }),
    TIMEOUT.operation,
    scope,
    'The final pixel frame was not acknowledged while WebGL was still mounted',
  );

  await stage(
    `${scope}: allow two-RAF paint acknowledgement`,
    () => evaluate(page, () => new Promise((resolvePaint) => {
      requestAnimationFrame(() => requestAnimationFrame(resolvePaint));
    }), undefined, `${scope}: two-RAF paint acknowledgement`),
    TIMEOUT.operation,
  );

  await attemptStage(
    `${scope}: canonical handoff tears down WebGL`,
    () => page.waitForFunction(() => {
      const root = document.querySelector('.mf-lab');
      return Number(root?.getAttribute('data-buried-act-progress')) >= 0.999
        && root?.getAttribute('data-active-chapter') === 'infect'
        && root.getAttribute('data-buried-pixel-frame') === 'rendered'
        && root.getAttribute('data-renderer') === 'editorial'
        && document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length === 0;
    }, undefined, { timeout: TIMEOUT.operation }),
    TIMEOUT.operation,
    scope,
    'Canonical pixel handoff did not tear down WebGL after its paint acknowledgement',
  );
  const after = await inspect('inspect canonical handoff');
  const lifecycle = await evaluate(page, () => {
    window.__buriedQaPixelObserver?.disconnect();
    return window.__buriedQaPixelLifecycle ?? [];
  }, undefined, `${scope}: inspect pixel lifecycle`);
  const renderedIndex = lifecycle.findIndex((entry, index) => (
    index > 0
    && entry.activeChapter === 'infect'
    && entry.renderer === 'webgl'
    && entry.pixelFrame === 'rendered'
    && entry.canvasCount === 1
  ));
  const firstDepartureIndex = lifecycle.findIndex((entry, index) => (
    index > 0
    && (entry.renderer !== 'webgl' || entry.canvasCount !== 1)
  ));
  const teardownIndex = lifecycle.findIndex((entry, index) => (
    index >= firstDepartureIndex
    && entry.renderer === 'editorial'
    && entry.canvasCount === 0
  ));
  check(
    after.progress !== null
      && after.progress >= 0.999
      && after.activeChapter === 'infect'
      && after.renderer === 'editorial'
      && after.canvasCount === 0
      && after.pixelFrame === 'rendered'
      && after.pixelHandoffCount === 1,
    scope,
    'Canonical progress-1 handoff left the WebGL renderer mounted',
    { geometry: afterGeometry, state: after, lifecycle },
  );
  check(
    renderedIndex > 0
      && firstDepartureIndex > renderedIndex
      && teardownIndex >= firstDepartureIndex,
    scope,
    'Pixel-frame acknowledgement and WebGL teardown occurred out of order',
    { renderedIndex, firstDepartureIndex, teardownIndex, lifecycle },
  );

  const nearReverseProgress = 0.998;
  const nearReverseGeometry = await setBuriedProgressPosition(page, nearReverseProgress, scope);
  await attemptStage(
    `${scope}: immediate reverse handoff remounts WebGL`,
    () => page.waitForFunction(({ expectedProgress, tolerance }) => {
      const root = document.querySelector('.mf-lab');
      const progress = Number(root?.getAttribute('data-buried-act-progress'));
      return Math.abs(progress - expectedProgress) <= tolerance
        && progress < 0.999
        && root?.getAttribute('data-active-chapter') === 'infect'
        && root.getAttribute('data-renderer') === 'webgl'
        && root.getAttribute('data-buried-act-model') === 'ready'
        && root.getAttribute('data-buried-act-frame') === 'rendered'
        && !root.hasAttribute('data-buried-pixel-frame')
        && document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length === 1;
    }, {
      expectedProgress: nearReverseProgress,
      tolerance: PIXEL_PROGRESS_TOLERANCE,
    }, { timeout: TIMEOUT.telemetry }),
    TIMEOUT.telemetry,
    scope,
    'A small reverse scroll did not immediately restore the Buried WebGL lifecycle',
  );
  const nearReverse = await inspect('inspect immediate reverse handoff');
  check(
    nearReverseGeometry !== null
      && nearReverse.progress !== null
      && nearReverse.progress < 0.999
      && Math.abs(nearReverse.progress - nearReverseProgress) <= PIXEL_PROGRESS_TOLERANCE
      && nearReverse.activeChapter === 'infect'
      && nearReverse.renderer === 'webgl'
      && nearReverse.canvasCount === 1
      && nearReverse.modelTelemetry === 'ready'
      && nearReverse.buriedFrame === 'rendered'
      && nearReverse.pixelFrame === null,
    scope,
    'Immediate reverse handoff left stale editorial state',
    { geometry: nearReverseGeometry, state: nearReverse },
  );

  const reverseProgress = 0.86;
  const reverseGeometry = await setBuriedProgressPosition(page, reverseProgress, scope);
  if (!reverseGeometry) {
    fail(scope, 'Reverse pixel handoff has no Buried Act scroll geometry', { reverseProgress });
    return { before, after, lifecycle, error: 'missing reverse geometry' };
  }
  await attemptStage(
    `${scope}: reverse handoff remounts WebGL`,
    () => page.waitForFunction(({ expectedProgress }) => {
      const root = document.querySelector('.mf-lab');
      const progress = Number(root?.getAttribute('data-buried-act-progress'));
      return Math.abs(progress - expectedProgress) <= 0.002
        && root?.getAttribute('data-active-chapter') === 'build'
        && root.getAttribute('data-renderer') === 'webgl'
        && root.getAttribute('data-buried-act-model') === 'ready'
        && root.getAttribute('data-buried-act-frame') === 'rendered'
        && root.getAttribute('data-buried-act-evidence') === 'royal-hall'
        && !root.hasAttribute('data-buried-pixel-frame')
        && document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length === 1;
    }, { expectedProgress: reverseProgress }, { timeout: TIMEOUT.telemetry }),
    TIMEOUT.telemetry,
    scope,
    'Reverse scroll did not symmetrically restore the Buried WebGL lifecycle',
  );
  const reverse = await inspect('inspect reverse handoff');
  check(
    reverse.progress !== null
      && Math.abs(reverse.progress - reverseProgress) <= 0.002
      && reverse.activeChapter === 'build'
      && reverse.renderer === 'webgl'
      && reverse.canvasCount === 1
      && reverse.modelTelemetry === 'ready'
      && reverse.buriedFrame === 'rendered'
      && reverse.evidence === 'royal-hall'
      && reverse.pixelFrame === null,
    scope,
    'Reverse scroll did not expose a real first evidence frame after remount',
    { geometry: reverseGeometry, state: reverse },
  );

  const qualityProgress = 0.998;
  const qualityCycle = await cycleQualityAtBuriedProgress(
    page,
    qualityProgress,
    `${scope}:quality-handoff`,
  );
  if (!qualityCycle) {
    fail(scope, 'Quality handoff has no Buried Act scroll geometry', { qualityProgress });
    return { before, after, reverse, lifecycle, error: 'missing quality handoff geometry' };
  }
  const initialQuality = qualityCycle.snapshots.find((entry) => entry.phase === 'boundary-settled') ?? null;
  const finalQuality = qualityCycle.snapshots.at(-1) ?? null;
  const editorialQualityState = qualityCycle.snapshots.find((entry) => (
    entry.qualityTier === 'editorial'
    && entry.renderer === 'editorial'
    && entry.canvasCount === 0
  )) ?? null;
  check(
    qualityCycle.clickCount === 3
      && initialQuality?.qualityModeToken === 'A'
      && initialQuality.qualityTier !== 'editorial'
      && initialQuality.progress < 0.999
      && Math.abs(initialQuality.progress - qualityProgress) <= PIXEL_PROGRESS_TOLERANCE
      && initialQuality.renderer === 'webgl'
      && initialQuality.canvasCount === 1
      && initialQuality.pixelFrame === null
      && initialQuality.modelTelemetry === 'ready'
      && initialQuality.buriedFrame === 'rendered'
      && editorialQualityState !== null
      && finalQuality?.qualityModeToken === 'A'
      && finalQuality.qualityTier !== 'editorial'
      && finalQuality.progress < 0.999
      && Math.abs(finalQuality.progress - qualityProgress) <= PIXEL_PROGRESS_TOLERANCE
      && finalQuality.renderer === 'webgl'
      && finalQuality.canvasCount === 1
      && finalQuality.pixelFrame === null
      && finalQuality.modelTelemetry === 'ready'
      && finalQuality.buriedFrame === 'rendered',
    scope,
    'Quality could not be cycled through editorial and restored to auto during pixel handoff',
    qualityCycle,
  );

  const qualityHandoffGeometry = await setBuriedProgressPosition(
    page,
    1,
    `${scope}:quality-handoff`,
  );
  if (!qualityHandoffGeometry) {
    fail(scope, 'Quality handoff completion has no Buried Act scroll geometry', { progress: 1 });
    return { before, after, reverse, lifecycle, qualityCycle, error: 'missing quality completion geometry' };
  }
  await attemptStage(
    `${scope}: quality handoff tears down WebGL`,
    () => page.waitForFunction(() => {
      const root = document.querySelector('.mf-lab');
      const qualityToken = document.querySelector(
        '.mf-header__actions .mf-system-control[data-tier] span',
      )?.textContent?.trim();
      return Number(root?.getAttribute('data-buried-act-progress')) >= 0.999
        && root?.getAttribute('data-active-chapter') === 'infect'
        && root.getAttribute('data-buried-pixel-frame') === 'rendered'
        && root.getAttribute('data-quality-tier') !== 'editorial'
        && qualityToken === 'A'
        && root.getAttribute('data-renderer') === 'editorial'
        && document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length === 0;
    }, undefined, { timeout: TIMEOUT.telemetry }),
    TIMEOUT.telemetry,
    scope,
    'Quality change in the pixel handoff window left WebGL mounted',
  );
  const qualityAfter = await inspect('inspect quality handoff completion');
  check(
    qualityAfter.progress !== null
      && qualityAfter.progress >= 0.999
      && qualityAfter.activeChapter === 'infect'
      && qualityAfter.qualityTier !== 'editorial'
      && qualityAfter.qualityModeToken === 'A'
      && qualityAfter.pixelFrame === 'rendered'
      && qualityAfter.renderer === 'editorial'
      && qualityAfter.canvasCount === 0,
    scope,
    'Quality handoff did not remain editorial after returning quality to auto',
    { geometry: qualityHandoffGeometry, cycle: qualityCycle, state: qualityAfter },
  );
  return {
    before: { geometry: beforeGeometry, ...before },
    after: { geometry: afterGeometry, ...after },
    nearReverse: { geometry: nearReverseGeometry, ...nearReverse },
    reverse: { geometry: reverseGeometry, ...reverse },
    qualityHandoff: {
      cycle: qualityCycle,
      geometry: qualityHandoffGeometry,
      after: qualityAfter,
    },
    lifecycle,
  };
}

async function moveWithinEvidencePassage(page, checkpoint, scope) {
  const geometry = await evaluate(page, async ({ progress }) => {
    const section = document.getElementById('bh-gameplay');
    if (!section) return null;
    const top = window.scrollY + section.getBoundingClientRect().top;
    const travel = Math.max(1, section.offsetHeight - window.innerHeight);
    const destination = top + travel * progress;
    window.scrollTo({ top: destination, behavior: 'instant' });
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return { top, travel, destination };
  }, checkpoint, `${scope}: evidence passage ${checkpoint.progress}`);
  if (!geometry) {
    fail(scope, 'Authentic evidence passage is missing', checkpoint);
    return { ...checkpoint, error: 'missing passage' };
  }

  await attemptStage(
    `${scope}: settle evidence ${checkpoint.index + 1}`,
    () => page.waitForFunction(({ expectedImage }) => {
      const root = document.querySelector('.mf-lab');
      const active = document.querySelector('.bh-evidence-passage__fallback-media figure[data-active] img');
      const fallback = active?.closest('.bh-evidence-passage__fallback-media');
      const figure = active?.closest('figure');
      const rect = active?.getBoundingClientRect();
      const fallbackStyle = fallback ? getComputedStyle(fallback) : null;
      const figureStyle = figure ? getComputedStyle(figure) : null;
      const imageStyle = active ? getComputedStyle(active) : null;
      const fallbackReady = active instanceof HTMLImageElement
        && active.complete
        && active.naturalWidth > 0
        && fallbackStyle?.display !== 'none'
        && fallbackStyle?.visibility !== 'hidden'
        && Number(fallbackStyle?.opacity ?? 1) > 0.05
        && figureStyle?.display !== 'none'
        && figureStyle?.visibility !== 'hidden'
        && Number(figureStyle?.opacity ?? 0) > 0.05
        && imageStyle?.display !== 'none'
        && imageStyle?.visibility !== 'hidden'
        && Number(imageStyle?.opacity ?? 1) > 0.05
        && rect !== undefined
        && rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.top < innerHeight;
      const webglFrameReady = root?.getAttribute('data-renderer') === 'webgl'
        && root.getAttribute('data-buried-act-frame') === 'rendered'
        && document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length === 1;
      const visualFrameReady = root?.getAttribute('data-quality-tier') === 'editorial'
        ? fallbackReady
        : webglFrameReady;
      return active?.getAttribute('src') === expectedImage
        && document.querySelectorAll('.bh-evidence-passage__route button[data-active]').length === 1
        && visualFrameReady;
    }, checkpoint, { timeout: TIMEOUT.operation }),
    TIMEOUT.operation,
    scope,
    `Authentic evidence ${checkpoint.index + 1} did not expose a rendered frame or visible fallback`,
  );

  // A quality-tier recomposition can reset the frame marker immediately after
  // the first successful sample. Require the replacement frame to settle too.
  await page.waitForTimeout(100);
  await attemptStage(
    `${scope}: stabilize evidence ${checkpoint.index + 1}`,
    () => page.waitForFunction(({ expectedImage }) => {
      const root = document.querySelector('.mf-lab');
      const active = document.querySelector('.bh-evidence-passage__fallback-media figure[data-active] img');
      if (active?.getAttribute('src') !== expectedImage) return false;
      if (root?.getAttribute('data-quality-tier') !== 'editorial') {
        return root?.getAttribute('data-renderer') === 'webgl'
          && root.getAttribute('data-buried-act-frame') === 'rendered'
          && document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length === 1;
      }
      return active instanceof HTMLImageElement
        && active.complete
        && active.naturalWidth > 0;
    }, checkpoint, { timeout: TIMEOUT.operation }),
    TIMEOUT.operation,
    scope,
    `Authentic evidence ${checkpoint.index + 1} did not remain stable after quality recomposition`,
  );

  const state = await evaluate(page, () => {
    const root = document.querySelector('.mf-lab');
    const section = document.getElementById('bh-gameplay');
    const activeButton = section?.querySelector('.bh-evidence-passage__route button[data-active]');
    const activeFigure = section?.querySelector('.bh-evidence-passage__fallback-media figure[data-active]');
    const activeImage = activeFigure?.querySelector('img');
    const fallback = activeFigure?.closest('.bh-evidence-passage__fallback-media');
    const rect = activeImage?.getBoundingClientRect();
    const fallbackStyle = fallback ? getComputedStyle(fallback) : null;
    const figureStyle = activeFigure ? getComputedStyle(activeFigure) : null;
    const imageStyle = activeImage ? getComputedStyle(activeImage) : null;
    const fallbackReady = activeImage instanceof HTMLImageElement
      && activeImage.complete
      && activeImage.naturalWidth > 0
      && fallbackStyle?.display !== 'none'
      && fallbackStyle?.visibility !== 'hidden'
      && Number(fallbackStyle?.opacity ?? 1) > 0.05
      && figureStyle?.display !== 'none'
      && figureStyle?.visibility !== 'hidden'
      && Number(figureStyle?.opacity ?? 0) > 0.05
      && imageStyle?.display !== 'none'
      && imageStyle?.visibility !== 'hidden'
      && Number(imageStyle?.opacity ?? 1) > 0.05
      && rect !== undefined
      && rect.width > 0
      && rect.height > 0
      && rect.bottom > 0
      && rect.top < innerHeight;
    const canvasCount = document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length;
    const webglFrameReady = root?.getAttribute('data-renderer') === 'webgl'
      && root.getAttribute('data-buried-act-frame') === 'rendered'
      && canvasCount === 1;
    return {
      routeButtonCount: section?.querySelectorAll('.bh-evidence-passage__route button').length ?? 0,
      pressedCount: section?.querySelectorAll('.bh-evidence-passage__route button[aria-pressed="true"]').length ?? 0,
      activeButtonCount: section?.querySelectorAll('.bh-evidence-passage__route button[data-active]').length ?? 0,
      activeFigureCount: section?.querySelectorAll('.bh-evidence-passage__fallback-media figure[data-active]').length ?? 0,
      activeLabel: activeButton?.getAttribute('aria-label') ?? null,
      activeImage: activeImage?.getAttribute('src') ?? null,
      activeImageReady: activeImage instanceof HTMLImageElement
        && activeImage.complete
        && activeImage.naturalWidth > 0,
      fallbackDisplay: fallbackStyle?.display ?? null,
      fallbackOpacity: figureStyle?.opacity ?? null,
      fallbackReady,
      renderer: root?.getAttribute('data-renderer') ?? null,
      qualityTier: root?.getAttribute('data-quality-tier') ?? null,
      buriedFrame: root?.getAttribute('data-buried-act-frame') ?? null,
      canvasCount,
      webglFrameReady,
      visualSource: webglFrameReady ? 'webgl-frame' : fallbackReady ? 'fallback' : null,
      cssProgress: section instanceof HTMLElement ? section.style.getPropertyValue('--bh-progress') : null,
      scrollY: Number(window.scrollY.toFixed(1)),
    };
  }, undefined, `${scope}: inspect authentic evidence`);
  check(
    state.routeButtonCount === 4
      && state.pressedCount === 1
      && state.activeButtonCount === 1
      && state.activeFigureCount === 1
      && state.activeImage === checkpoint.expectedImage
      && state.visualSource === (state.qualityTier === 'editorial' ? 'fallback' : 'webgl-frame'),
    scope,
    'Authentic evidence passage relied on a hidden DOM figure instead of a rendered frame or visible fallback',
    { checkpoint, state },
  );
  return { ...checkpoint, ...state };
}

async function authenticEvidenceJourney(page, tier, scope, { captureFrames = false } = {}) {
  const checkpoints = EXPECTED_EVIDENCE_IMAGES.map((expectedImage, index) => ({
    id: expectedImage.split('/').at(-1)?.replace(/\.webp$/, '') ?? `evidence-${index + 1}`,
    index,
    progress: index === 0 ? 0.02 : index / 4 + 0.02,
    expectedImage,
  }));
  const observed = [];
  const overlaps = [];
  for (const checkpoint of checkpoints) {
    const state = await moveWithinEvidencePassage(page, checkpoint, scope);
    if (captureFrames) {
      state.screenshot = await capturePage(
        page,
        `${tier}-evidence-${checkpoint.id}`,
        `${scope}:evidence:${checkpoint.id}`,
      );
    }
    observed.push(state);
    overlaps.push(await textOverlapState(page, '#mf-build', `${scope}:evidence-${checkpoint.index + 1}`));
  }
  check(
    observed.map((entry) => entry.activeImage).join('|') === EXPECTED_EVIDENCE_IMAGES.join('|'),
    scope,
    'Authentic gameplay evidence is not ordered mechanism → guards → mercury → royal hall',
    observed,
  );
  const requests = await evidenceRequestState(page, tier, scope);
  return { checkpoints: observed, overlaps, requests };
}

async function fastScrollBurst(page, ids, scope) {
  return evaluate(page, async ({ routeIds }) => {
    const root = document.querySelector('.mf-lab');
    const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const startedAt = performance.now();
    const samples = [];
    for (const id of routeIds) {
      const target = document.getElementById(id);
      if (!target) {
        samples.push({ id, missing: true });
        continue;
      }
      const destination = window.scrollY + target.getBoundingClientRect().top - padding;
      window.scrollTo({ top: destination, behavior: 'instant' });
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      samples.push({
        id,
        destination: Number(destination.toFixed(1)),
        scrollY: Number(window.scrollY.toFixed(1)),
        activeChapter: root?.getAttribute('data-active-chapter') ?? null,
        renderer: root?.getAttribute('data-renderer') ?? null,
        canvasCount: document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length,
        pixelFrame: root?.getAttribute('data-buried-pixel-frame') ?? null,
        lamp: root?.getAttribute('data-buried-lamp') ?? null,
        evidence: root?.getAttribute('data-buried-act-evidence') ?? 'none',
      });
    }
    return { durationMs: Number((performance.now() - startedAt).toFixed(1)), samples };
  }, { routeIds: ids }, `${scope}: scroll burst`, 5_000);
}

async function fastScrollStress(page, scope) {
  const startedAt = Date.now();
  const forward = await fastScrollBurst(page, ['mf-descent', 'mf-lamp', 'mf-build'], `${scope}:forward`);
  await attemptStage(
    `${scope}: forward settles at build`,
    () => page.waitForFunction(() => {
      const root = document.querySelector('.mf-lab');
      return root?.getAttribute('data-active-chapter') === 'build'
        && root.getAttribute('data-buried-lamp') === 'raised'
        && root.getAttribute('data-renderer') === 'webgl'
        && !root.hasAttribute('data-buried-pixel-frame')
        && document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length === 1;
    }, undefined, { timeout: TIMEOUT.operation }),
    TIMEOUT.operation,
    scope,
    'Fast forward scroll did not settle at the raised build state',
  );
  const reverse = await fastScrollBurst(page, ['mf-build', 'mf-lamp', 'mf-descent'], `${scope}:reverse`);
  await attemptStage(
    `${scope}: reverse settles at descent`,
    () => page.waitForFunction(() => {
      const root = document.querySelector('.mf-lab');
      return root?.getAttribute('data-active-chapter') === 'descent'
        && root.getAttribute('data-buried-lamp') === 'offered'
        && (root.getAttribute('data-buried-act-evidence') ?? 'none') === 'none'
        && root.getAttribute('data-renderer') === 'webgl'
        && !root.hasAttribute('data-buried-pixel-frame')
        && document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length === 1;
    }, undefined, { timeout: TIMEOUT.operation }),
    TIMEOUT.operation,
    scope,
    'Fast reverse scroll did not restore the initial Buried Act state',
  );
  const final = await evaluate(page, () => {
    const root = document.querySelector('.mf-lab');
    const target = document.getElementById('mf-descent');
    const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    return {
      activeChapter: root?.getAttribute('data-active-chapter') ?? null,
      renderer: root?.getAttribute('data-renderer') ?? null,
      canvasCount: document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length,
      pixelFrame: root?.getAttribute('data-buried-pixel-frame') ?? null,
      lamp: root?.getAttribute('data-buried-lamp') ?? null,
      evidence: root?.getAttribute('data-buried-act-evidence') ?? 'none',
      offsetDelta: target ? Number((target.getBoundingClientRect().top - padding).toFixed(1)) : null,
    };
  }, undefined, `${scope}: final reverse state`);
  const durationMs = Date.now() - startedAt;
  check(
    forward.durationMs < 3_000 && reverse.durationMs < 3_000 && durationMs < 6_000,
    scope,
    'Fast forward/reverse scroll exceeded its responsiveness budget',
    { forward, reverse, durationMs },
  );
  check(
    final.activeChapter === 'descent'
      && final.renderer === 'webgl'
      && final.canvasCount === 1
      && final.pixelFrame === null
      && final.lamp === 'offered'
      && final.evidence === 'none'
      && final.offsetDelta !== null
      && Math.abs(final.offsetDelta) <= 2,
    scope,
    'Fast reverse scroll left stale Buried Act state',
    final,
  );
  return { forward, reverse, durationMs, final };
}

async function restoredRendererAfterDirectInfect(page, route, scope, { requireBuriedFrame = false } = {}) {
  const routeState = await moveToRoute(page, route, scope, {
    allowDocumentFlowTop: route.id === 'mf-threshold',
  });
  await attemptStage(
    `${scope}: WebGL returns after direct infect`,
    () => page.waitForFunction(({ chapter, requireFrame }) => {
      const root = document.querySelector('.mf-lab');
      return root?.getAttribute('data-active-chapter') === chapter
        && root.getAttribute('data-quality-tier') !== 'editorial'
        && root.getAttribute('data-renderer') === 'webgl'
        && document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length === 1
        && (!requireFrame || (
          root.getAttribute('data-buried-act-model') === 'ready'
          && root.getAttribute('data-buried-act-frame') === 'rendered'
        ));
    }, { chapter: route.chapter, requireFrame: requireBuriedFrame }, { timeout: TIMEOUT.telemetry }),
    TIMEOUT.telemetry,
    scope,
    `WebGL did not return at #${route.id} after direct #mf-infect`,
  );
  const state = await evaluate(page, () => {
    const root = document.querySelector('.mf-lab');
    return {
      hash: window.location.hash,
      activeChapter: root?.getAttribute('data-active-chapter') ?? null,
      qualityTier: root?.getAttribute('data-quality-tier') ?? null,
      renderer: root?.getAttribute('data-renderer') ?? null,
      canvasCount: document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length,
      model: root?.getAttribute('data-buried-act-model') ?? null,
      buriedFrame: root?.getAttribute('data-buried-act-frame') ?? null,
      pixelFrame: root?.getAttribute('data-buried-pixel-frame') ?? null,
    };
  }, undefined, `${scope}: inspect restored renderer`);
  check(
    routeState.settled
      && state.hash === `#${route.id}`
      && state.activeChapter === route.chapter
      && state.qualityTier !== 'editorial'
      && state.renderer === 'webgl'
      && state.canvasCount === 1
      && (!requireBuriedFrame || (
        state.model === 'ready'
        && state.buriedFrame === 'rendered'
      )),
    scope,
    `Direct #mf-infect left the renderer suppressed after returning to #${route.id}`,
    { route: routeState, state },
  );
  return { route: routeState, state };
}

async function runDirectInfect(page, tier) {
  const scope = `${tier}:direct:infect`;
  await stage(`${scope}: install initial renderer probe`, () => page.addInitScript(() => {
    window.__buriedQaInitialRendererLifecycle = [];
    const record = () => {
      const root = document.querySelector('.mf-lab');
      if (!root) return;
      const entry = {
        time: Number(performance.now().toFixed(2)),
        activeChapter: root.getAttribute('data-active-chapter'),
        renderer: root.getAttribute('data-renderer'),
        canvasCount: document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length,
      };
      const previous = window.__buriedQaInitialRendererLifecycle.at(-1);
      if (
        previous?.activeChapter === entry.activeChapter
        && previous?.renderer === entry.renderer
        && previous?.canvasCount === entry.canvasCount
      ) return;
      window.__buriedQaInitialRendererLifecycle.push(entry);
    };
    const observer = new MutationObserver(record);
    observer.observe(document, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['data-active-chapter', 'data-renderer'],
    });
    window.__buriedQaInitialRendererObserver = observer;
  }));

  const inspect = (label) => evaluate(page, () => {
    const root = document.querySelector('.mf-lab');
    const lifecycle = window.__buriedQaInitialRendererLifecycle ?? [];
    const rendererStates = lifecycle.filter((entry) => entry.renderer !== null);
    return {
      hash: window.location.hash,
      activeChapter: root?.getAttribute('data-active-chapter') ?? null,
      renderer: root?.getAttribute('data-renderer') ?? null,
      canvasCount: document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length,
      pixelFrame: root?.getAttribute('data-buried-pixel-frame') ?? null,
      firstRenderer: rendererStates[0]?.renderer ?? null,
      lifecycle,
    };
  }, undefined, `${scope}: ${label}`);

  const assertImmediateEditorial = (state, phase) => check(
    state.hash === '#mf-infect'
      && state.activeChapter === 'infect'
      && state.renderer === 'editorial'
      && state.canvasCount === 0
      && state.pixelFrame === null
      && state.firstRenderer === 'editorial'
      && state.lifecycle.every((entry) => entry.renderer !== 'webgl' && entry.canvasCount === 0),
    scope,
    `Direct #mf-infect was not immediately editorial ${phase}`,
    state,
  );

  const route = await freshNavigate(page, INFECT_ROUTE, scope);
  const initial = await inspect('inspect initial infect renderer lifecycle');
  assertImmediateEditorial(initial, 'on initial navigation');

  const reload = await reloadHashRoute(page, INFECT_ROUTE, `${scope}:reload`);
  const reloaded = await inspect('inspect reloaded infect renderer lifecycle');
  assertImmediateEditorial(reloaded, 'after reload');
  const backToThreshold = await restoredRendererAfterDirectInfect(
    page,
    THRESHOLD_ROUTE,
    `${scope}:back:threshold`,
  );
  const backToDescent = await restoredRendererAfterDirectInfect(
    page,
    ROUTES[0],
    `${scope}:back:descent`,
    { requireBuriedFrame: true },
  );
  return { route, initial, reload, reloaded, backToThreshold, backToDescent };
}

async function chapterRailState(page, route, scope) {
  await page.waitForTimeout(420);
  const state = await evaluate(page, ({ id }) => {
    const rail = document.querySelector('.mf-rail');
    const target = document.getElementById(id);
    const active = rail?.querySelector(`a[href="#${id}"]`);
    const railBox = rail?.getBoundingClientRect();
    const activeBox = active?.getBoundingClientRect();
    return {
      activeHref: active?.getAttribute('href') ?? null,
      ariaCurrent: active?.getAttribute('aria-current') ?? null,
      focusWithinTarget: target instanceof HTMLElement
        && target.contains(document.activeElement),
      activeElement: document.activeElement?.id
        || document.activeElement?.tagName.toLowerCase()
        || null,
      scrollLeft: rail instanceof HTMLElement ? Number(rail.scrollLeft.toFixed(1)) : null,
      fullyVisible: Boolean(
        railBox
          && activeBox
          && activeBox.left >= railBox.left - 1
          && activeBox.right <= railBox.right + 1
          && activeBox.top >= railBox.top - 1
          && activeBox.bottom <= railBox.bottom + 1
      ),
    };
  }, { id: route.id }, `${scope}: chapter rail state`);
  check(
    state.activeHref === `#${route.id}`
      && state.ariaCurrent === 'step'
      && state.focusWithinTarget
      && state.fullyVisible,
    scope,
    'Active chapter marker is not identified and visible in the rail',
    state,
  );
  return state;
}

async function runDirectHash(page, tier, route, collectAssets) {
  const scope = `${tier}:direct:${route.chapter}`;
  const result = { route: await freshNavigate(page, route, scope) };
  result.reload = await reloadHashRoute(page, route, `${scope}:reload`);
  await waitForBuriedTelemetry(page, scope);
  result.runtime = await runtimeTelemetry(page, tier, scope);
  result.rail = await chapterRailState(page, route, scope);
  if (collectAssets) result.assets = await collectAssetTelemetry(page, tier, scope);
  result.layout = await layoutState(page, `#${route.id}`, scope);
  result.text = await textOverlapState(page, `#${route.id}`, scope);
  result.canvas = await canvasState(page, `${tier}-${route.chapter}`, scope);
  result.screenshot = await capturePage(page, `${tier}-${route.chapter}`, scope);

  if (route.chapter === 'lamp') {
    result.lamp = await lampActionState(page, tier, scope);
    result.raisedScreenshot = await capturePage(page, `${tier}-lamp-raised`, scope);
  }
  if (route.chapter === 'build') result.links = await projectLinksState(page, scope);
  return result;
}

async function runJourney(page, tier) {
  const scope = `${tier}:journey`;
  const result = {};
  try {
    result.route = await freshNavigate(page, ROUTES[0], scope);
    await waitForBuriedTelemetry(page, scope);
    result.runtime = await runtimeTelemetry(page, tier, scope);
    result.canonical = await canonicalEvidenceJourney(page, scope);
    result.authentic = await authenticEvidenceJourney(page, tier, scope, {
      captureFrames: true,
    });
    result.links = await projectLinksState(page, scope);
    result.pixelHandoff = await pixelHandoffState(page, `${scope}:pixel-handoff`);
    result.scrollStress = await fastScrollStress(page, scope);
    result.layout = await layoutState(page, '#mf-descent', scope);
    return result;
  } catch (error) {
    fail(scope, 'Buried Act journey test threw', errorMessage(error));
    result.error = errorMessage(error);
    return result;
  }
}

async function runViewport(browser, tier) {
  const context = await stage(`${tier}: new context`, () => browser.newContext({
    ...VIEWPORTS[tier],
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
  }));
  context.setDefaultTimeout(TIMEOUT.operation);
  context.setDefaultNavigationTimeout(TIMEOUT.navigation);
  let page;
  try {
    page = await stage(`${tier}: new page`, () => context.newPage());
    attachDiagnostics(page, tier);
    await stage(`${tier}: retain resource timings`, () => page.addInitScript(() => {
      performance.setResourceTimingBufferSize(2_000);
    }));
    const directHashes = {};
    for (const [index, route] of ROUTES.entries()) {
      directHashes[route.id] = await runDirectHash(page, tier, route, index === 0);
    }
    const directInfect = await runDirectInfect(page, tier);
    return {
      viewport: VIEWPORTS[tier].viewport,
      directHashes,
      directInfect,
      journey: await runJourney(page, tier),
    };
  } finally {
    await safeClose(page, `${tier}: page.close`);
    await safeClose(context, `${tier}: context.close`);
  }
}

async function responsiveAssetVariantState(page, expectedVariant, scope) {
  await attemptStage(
    `${scope}: responsive Buried package ready`,
    () => page.waitForFunction(() => {
      const root = document.querySelector('.mf-lab');
      return root?.getAttribute('data-buried-act-model') === 'ready'
        && root.getAttribute('data-buried-act-camera') === 'ready'
        && root.getAttribute('data-buried-act-frame') === 'rendered';
    }, undefined, { timeout: TIMEOUT.telemetry }),
    TIMEOUT.telemetry,
    scope,
    'Responsive Buried package did not become ready',
  );
  const state = await evaluate(page, () => {
    const root = document.querySelector('.mf-lab');
    const evidencePaths = [...new Set(
      performance.getEntriesByType('resource')
        .map((entry) => new URL(entry.name, location.href).pathname)
        .filter((path) => /\/assets\/projects\/buried-hands\/(?:mobile\/)?(?:mechanism|guards|mercury|royal-hall)\.webp$/.test(path)),
    )];
    return {
      cameraVariant: root?.getAttribute('data-buried-act-camera-variant') ?? null,
      compactMediaQuery: matchMedia('(max-width: 820px)').matches,
      desktopEvidence: evidencePaths.filter((path) => !path.includes('/mobile/')),
      mobileEvidence: evidencePaths.filter((path) => path.includes('/mobile/')),
    };
  }, undefined, `${scope}: responsive asset variant`);
  const selected = expectedVariant === 'mobile' ? state.mobileEvidence : state.desktopEvidence;
  const rejected = expectedVariant === 'mobile' ? state.desktopEvidence : state.mobileEvidence;
  check(
    state.cameraVariant === expectedVariant
      && state.compactMediaQuery === (expectedVariant === 'mobile')
      && selected.length === 4
      && rejected.length === 0,
    scope,
    'Responsive camera, CSS, and evidence media variants are inconsistent',
    { expectedVariant, ...state },
  );
  return state;
}

async function runResponsiveViewport(browser, viewportName) {
  const config = VIEWPORTS[viewportName];
  const size = `${config.viewport.width}x${config.viewport.height}`;
  const scope = `responsive:${size}`;
  const context = await stage(`${scope}: new context`, () => browser.newContext({
    ...config,
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
  }));
  context.setDefaultTimeout(TIMEOUT.operation);
  context.setDefaultNavigationTimeout(TIMEOUT.navigation);
  let page;
  const result = { viewport: config.viewport };
  try {
    page = await stage(`${scope}: new page`, () => context.newPage());
    attachDiagnostics(page, scope);

    const lampScope = `${scope}:lamp`;
    result.lamp = {
      route: await freshNavigate(page, ROUTES[1], lampScope),
    };
    result.lamp.assets = await responsiveAssetVariantState(
      page,
      config.viewport.width <= 820 ? 'mobile' : 'desktop',
      lampScope,
    );
    result.lamp.layout = await layoutState(page, '#mf-lamp', lampScope);
    result.lamp.text = await textOverlapState(page, '#mf-lamp', lampScope);
    result.lamp.hitTargets = await hitTargetState(page, '#mf-lamp', lampScope, {
      minimumCount: 2,
    });
    result.lamp.action = await lampActionState(page, 'mobile', lampScope, {
      requireRootTelemetry: false,
    });

    const buildScope = `${scope}:build`;
    result.build = {
      route: await moveToRoute(page, ROUTES[2], buildScope),
    };
    result.build.layout = await layoutState(page, '#mf-build', buildScope);
    result.build.text = await textOverlapState(page, '#mf-build', buildScope);
    result.build.hitTargets = await hitTargetState(page, '#mf-build', buildScope, {
      minimumCount: 8,
    });
    result.build.links = await projectLinksState(page, buildScope);
    return result;
  } catch (error) {
    fail(scope, 'Responsive lamp/build QA threw', errorMessage(error));
    result.error = errorMessage(error);
    return result;
  } finally {
    await safeClose(page, `${scope}: page.close`);
    await safeClose(context, `${scope}: context.close`);
  }
}

async function reducedMotionState(page, route, scope) {
  await page.waitForTimeout(420);
  const state = await evaluate(page, ({ id, chapter }) => {
    const root = document.querySelector('.mf-lab');
    const routeTarget = document.getElementById(id);
    const command = document.querySelector('.mf-lamp-command');
    const commandBox = command?.getBoundingClientRect();
    const lampStage = document.querySelector('.mf-lamp-chamber__stage');
    const commandPanel = document.querySelector('.mf-lamp-command-panel');
    const passage = document.querySelector('.bh-evidence-passage');
    const passageStage = document.querySelector('.bh-evidence-passage__stage');
    const routeButtons = Array.from(document.querySelectorAll('.bh-evidence-passage__route button'));
    const activeAnimations = document.getAnimations({ subtree: true }).flatMap((animation) => {
      const target = animation.effect?.target;
      if (!(target instanceof Element) || !target.closest('#mf-descent, #mf-lamp, #mf-build')) return [];
      if (animation.playState !== 'running' && animation.playState !== 'pending') return [];
      return [{
        target: target.className,
        playState: animation.playState,
        duration: animation.effect?.getTiming().duration ?? null,
        iterations: animation.effect?.getTiming().iterations ?? null,
      }];
    });
    return {
      expectedHash: `#${id}`,
      expectedChapter: chapter,
      hash: window.location.hash,
      activeChapter: root?.getAttribute('data-active-chapter') ?? null,
      targetChapter: routeTarget?.getAttribute('data-chapter') ?? null,
      targetExists: routeTarget instanceof HTMLElement,
      mediaQuery: matchMedia('(prefers-reduced-motion: reduce)').matches,
      renderer: root?.getAttribute('data-renderer') ?? null,
      qualityTier: root?.getAttribute('data-quality-tier') ?? null,
      canvasCount: document.querySelectorAll('.mf-world canvas, canvas.mf-canvas').length,
      headerPosition: getComputedStyle(document.querySelector('.mf-header')).position,
      railPosition: getComputedStyle(document.querySelector('.mf-rail')).position,
      lampStagePosition: lampStage ? getComputedStyle(lampStage).position : null,
      commandPanelPosition: commandPanel ? getComputedStyle(commandPanel).position : null,
      commandHeight: commandBox ? Number(commandBox.height.toFixed(1)) : null,
      commandWidth: commandBox ? Number(commandBox.width.toFixed(1)) : null,
      commandWithinViewport: commandBox
        ? commandBox.left >= -1 && commandBox.right <= innerWidth + 1
        : false,
      lampFallbackDisplay: getComputedStyle(document.querySelector('.mf-lamp-chamber__fallback-media')).display,
      lampFallbackReady: document.querySelector('.mf-lamp-chamber__fallback-media img')?.naturalWidth > 0,
      ruleCount: document.querySelectorAll('.mf-rule-sequence > li').length,
      ruleInteractiveCount: document.querySelectorAll('.mf-rule-sequence button, .mf-rule-sequence [role="button"]').length,
      passageStagePosition: passageStage ? getComputedStyle(passageStage).position : null,
      passageFallbackDisplay: passage
        ? getComputedStyle(passage.querySelector('.bh-evidence-passage__fallback-media')).display
        : null,
      passageButtonCount: routeButtons.length,
      passagePressedCount: routeButtons.filter((button) => button.getAttribute('aria-pressed') === 'true').length,
      passageMinimumTarget: routeButtons.length
        ? Math.min(...routeButtons.map((button) => button.getBoundingClientRect().height))
        : null,
      passageAltCount: Array.from(document.querySelectorAll('.bh-evidence-passage__fallback-media img'))
        .filter((image) => Boolean(image.getAttribute('alt')?.trim())).length,
      activeAnimations,
    };
  }, route, `${scope}: reduced motion state`);
  check(state.mediaQuery, scope, 'Reduced-motion media query is not active', state);
  check(
    state.targetExists
      && state.hash === state.expectedHash
      && state.activeChapter === state.expectedChapter
      && state.targetChapter === state.expectedChapter,
    scope,
    'Reduced-motion direct route did not preserve its hash and active chapter state',
    state,
  );
  check(
    state.renderer === 'editorial'
      && state.qualityTier === 'editorial'
      && state.canvasCount === 0
      && state.lampFallbackDisplay === 'block'
      && state.lampFallbackReady,
    scope,
    'Reduced motion did not select the complete editorial fallback',
    state,
  );
  check(
    state.headerPosition === 'relative' && state.railPosition === 'relative',
    scope,
    'Reduced motion did not return fixed navigation to document flow',
    state,
  );
  check(
    state.lampStagePosition === 'relative'
      && state.commandPanelPosition !== 'absolute'
      && state.commandPanelPosition !== 'fixed',
    scope,
    'Reduced-motion lamp controls are not in static document flow',
    state,
  );
  check(
    state.commandHeight >= 44 && state.commandWithinViewport,
    scope,
    'Reduced-motion lamp command is not a reachable touch target',
    state,
  );
  check(state.ruleCount === 3 && state.ruleInteractiveCount === 0, scope, 'Reduced motion lost the ordered passive lamp evidence', state);
  if (state.passageButtonCount > 0) {
    check(
      state.passageStagePosition === 'relative'
        && state.passageFallbackDisplay === 'block'
        && state.passageButtonCount === 4
        && state.passagePressedCount === 1
        && state.passageMinimumTarget >= 44
        && state.passageAltCount === 4,
      scope,
      'Reduced-motion authentic evidence passage is incomplete or inaccessible',
      state,
    );
  }
  check(state.activeAnimations.length === 0, scope, 'Reduced-motion Buried Act still has active CSS animation', state);
  return state;
}

async function runReducedMotion(browser) {
  const scope = 'reduced-motion';
  const context = await stage(`${scope}: new context`, () => browser.newContext({
    ...VIEWPORTS.mobile,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  }));
  context.setDefaultTimeout(TIMEOUT.operation);
  context.setDefaultNavigationTimeout(TIMEOUT.navigation);
  let page;
  const result = {};
  try {
    page = await stage(`${scope}: new page`, () => context.newPage());
    attachDiagnostics(page, scope);

    result.lampRoute = await freshNavigate(page, ROUTES[1], `${scope}:lamp`, {
      allowDocumentFlowTop: true,
    });
    result.lampStatic = await reducedMotionState(page, ROUTES[1], `${scope}:lamp`);
    result.lampLayout = await layoutState(page, '#mf-lamp', `${scope}:lamp`);
    result.lampText = await textOverlapState(page, '#mf-lamp', `${scope}:lamp`);
    result.keyboardLamp = await lampActionState(page, 'mobile', `${scope}:lamp`, {
      keyboard: true,
      requireRootTelemetry: false,
    });
    result.lampScreenshot = await capturePage(page, 'reduced-motion-lamp', `${scope}:lamp`);

    result.buildRoute = await freshNavigate(page, ROUTES[2], `${scope}:build`, {
      allowDocumentFlowTop: true,
    });
    result.buildStatic = await reducedMotionState(page, ROUTES[2], `${scope}:build`);
    result.buildLayout = await layoutState(page, '#mf-build', `${scope}:build`);
    result.buildText = await textOverlapState(page, '#mf-build', `${scope}:build`);
    result.links = await projectLinksState(page, `${scope}:build`);
    result.buildScreenshot = await capturePage(page, 'reduced-motion-build', `${scope}:build`);
    return result;
  } catch (error) {
    fail(scope, 'Reduced-motion test threw', errorMessage(error));
    result.error = errorMessage(error);
    return result;
  } finally {
    await safeClose(page, `${scope}: page.close`);
    await safeClose(context, `${scope}: context.close`);
  }
}

async function runSuite() {
  const managed = await launchManagedBrowser();
  try {
    report.viewports.desktop = await runViewport(managed.browser, 'desktop');
    report.viewports.mobile = await runViewport(managed.browser, 'mobile');
    for (const viewportName of RESPONSIVE_VIEWPORTS) {
      const { width, height } = VIEWPORTS[viewportName].viewport;
      report.responsiveViewports[`${width}x${height}`] = await runResponsiveViewport(
        managed.browser,
        viewportName,
      );
    }
    report.reducedMotion = await runReducedMotion(managed.browser);
  } finally {
    await closeManagedBrowser(managed);
  }
}

async function finalize() {
  report.finishedAt = new Date().toISOString();
  const failedStageCount = report.stages.filter((entry) => entry.status === 'failed').length;
  report.summary = {
    passed: report.functionalFailures.length === 0
      && report.errors.length === 0
      && report.networkFailures.length === 0
      && failedStageCount === 0,
    functionalFailureCount: report.functionalFailures.length,
    consoleOrPageErrorCount: report.errors.length,
    failedStageCount,
    warningCount: report.warnings.length,
    networkFailureCount: report.networkFailures.length,
    screenshotCount: report.screenshots.length,
    durationMs: Date.parse(report.finishedAt) - Date.parse(report.startedAt),
  };
  await bounded(
    writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
    TIMEOUT.operation,
    'write QA report',
  );
  console.log(JSON.stringify({ report: REPORT_PATH, ...report.summary, warnings: report.warnings }, null, 2));
  if (!report.summary.passed) process.exitCode = 1;
}

async function shutdown(signal) {
  if (aborting) return;
  aborting = true;
  fail('suite', `Interrupted by ${signal}`);
  await cleanupAllBrowsers();
  await finalize().catch(() => {});
  process.exit(signal === 'SIGINT' ? 130 : 143);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

async function main() {
  await bounded(rm(OUTPUT_DIR, { recursive: true, force: true }), TIMEOUT.operation, 'clean QA output');
  await bounded(mkdir(OUTPUT_DIR, { recursive: true }), TIMEOUT.operation, 'create QA output');
  try {
    await bounded(runSuite(), TIMEOUT.total, 'complete QA suite');
  } catch (error) {
    aborting = true;
    fail('suite', 'QA suite aborted or exceeded its global deadline', errorMessage(error));
  } finally {
    await cleanupAllBrowsers();
    await finalize();
  }
}

await main();
