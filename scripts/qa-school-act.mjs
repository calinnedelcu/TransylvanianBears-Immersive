import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = (process.env.BASE_URL ?? 'http://127.0.0.1:4176').replace(/\/$/, '');
const OUTPUT_DIR = resolve('artifacts/qa-school-act');
const REPORT_PATH = resolve(OUTPUT_DIR, 'report.json');
const MODEL_PATH = '/assets/world/school-act/school-passage.glb';
const CAMERA_PATHS = {
  desktop: '/assets/vertical-slice/v1/05-07-school/camera.desktop.json',
  mobile: '/assets/vertical-slice/v1/05-07-school/camera.mobile.json',
};

const ROUTES = [
  { id: 'mf-passage', chapter: 'passage' },
  { id: 'mf-access', chapter: 'access' },
  { id: 'mf-schoolmate', chapter: 'schoolmate' },
];

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
};

const RENDER_BUDGETS = {
  desktop: {
    passage: { calls: 105, triangles: 75_000 },
    access: { calls: 100, triangles: 75_000 },
    schoolmate: { calls: 90, triangles: 75_000 },
  },
  mobile: {
    passage: { calls: 60, triangles: 70_000 },
    access: { calls: 60, triangles: 70_000 },
    schoolmate: { calls: 55, triangles: 70_000 },
  },
};

const TIMEOUT = {
  total: 165_000,
  launch: 10_000,
  navigation: 12_000,
  app: 24_000,
  operation: 6_000,
  telemetry: 3_500,
  screenshot: 8_000,
  cleanup: 2_000,
};

const report = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  limitsMs: TIMEOUT,
  outputDir: OUTPUT_DIR,
  stages: [],
  viewports: {},
  fallback: null,
  screenshots: [],
  errors: [],
  networkFailures: [],
  functionalFailures: [],
  warnings: [],
};

const warningKeys = new Set();
const managedBrowsers = new Set();
let aborting = false;

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
  process.stdout.write(`[qa-school-act] ${label}\n`);
  try {
    const result = await bounded(Promise.resolve().then(operation), timeoutMs, label);
    entry.status = 'passed';
    entry.durationMs = Date.now() - Date.parse(entry.startedAt);
    return result;
  } catch (error) {
    entry.status = 'failed';
    entry.durationMs = Date.now() - Date.parse(entry.startedAt);
    entry.error = error instanceof Error ? error.message : String(error);
    throw error;
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
    report.networkFailures.push({
      scope,
      url: request.url(),
      method: request.method(),
      error: request.failure()?.errorText ?? 'unknown request failure',
    });
  });
}

async function launchManagedBrowser(args = []) {
  const server = await stage(
    `launch browser${args.length ? ' (editorial)' : ''}`,
    () => chromium.launchServer({ headless: true, args, timeout: TIMEOUT.launch }),
    TIMEOUT.launch,
  );
  try {
    const browser = await stage(
      `connect browser${args.length ? ' (editorial)' : ''}`,
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
    warn('cleanup', 'Browser connection did not close cleanly', error.message);
  });
  await bounded(managed.server.kill(), TIMEOUT.cleanup, 'browserServer.kill').catch(() => {
    const process = managed.server.process();
    if (process.exitCode === null) process.kill('SIGKILL');
  });
}

async function cleanupAllBrowsers() {
  const active = [...managedBrowsers];
  await Promise.all(active.map(closeManagedBrowser));
}

async function safeClose(target, label) {
  if (!target) return;
  await bounded(target.close(), TIMEOUT.cleanup, label).catch((error) => {
    warn('cleanup', `${label} did not close cleanly`, error.message);
  });
}

async function evaluate(page, pageFunction, argument, label, timeoutMs = TIMEOUT.operation) {
  return bounded(page.evaluate(pageFunction, argument), timeoutMs, label);
}

async function capture(page, name) {
  const path = resolve(OUTPUT_DIR, `${name}.png`);
  await stage(
    `screenshot ${name}`,
    () => page.screenshot({ path, animations: 'disabled', timeout: TIMEOUT.screenshot }),
    TIMEOUT.screenshot,
  );
  report.screenshots.push(path);
  return path;
}

async function waitForApp(page, scope) {
  await stage(`${scope}: app shell`, async () => {
    await page.locator('.mf-lab').waitFor({ state: 'attached', timeout: TIMEOUT.app });
    await page.waitForFunction(() => (
      ['mf-passage', 'mf-access', 'mf-schoolmate']
        .every((id) => document.getElementById(id) instanceof HTMLElement)
    ), undefined, { timeout: TIMEOUT.app });
  }, TIMEOUT.app);
}

async function navigateToRoute(page, route, scope, initial = false) {
  const startedAt = Date.now();
  const response = await stage(`${scope}: navigate #${route.id}`, () => page.goto(
    `${BASE_URL}/#${route.id}`,
    { waitUntil: initial ? 'domcontentloaded' : 'commit', timeout: TIMEOUT.navigation },
  ), TIMEOUT.navigation);
  if (initial) await waitForApp(page, scope);

  let settled = true;
  try {
    await stage(`${scope}: settle #${route.id}`, () => page.waitForFunction(({ id, chapter }) => {
      const root = document.querySelector('.mf-lab');
      const target = document.getElementById(id);
      if (!target || root?.getAttribute('data-active-chapter') !== chapter) return false;
      const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      return window.location.hash === `#${id}`
        && Math.abs(target.getBoundingClientRect().top - padding) <= 2;
    }, route, { timeout: TIMEOUT.operation }), TIMEOUT.operation);
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
      targetTop,
      scrollPaddingTop: padding,
      offsetDelta: targetTop === null ? null : Number((targetTop - padding).toFixed(2)),
      scrollY: Math.round(window.scrollY),
      renderer: root?.getAttribute('data-renderer') ?? null,
      traceOutcome: root?.getAttribute('data-trace-outcome') ?? null,
    };
  }, route, `${scope}: inspect #${route.id}`);

  const valid = settled
    && state.hash === `#${route.id}`
    && state.activeChapter === route.chapter
    && state.offsetDelta !== null
    && Math.abs(state.offsetDelta) <= 2;
  check(valid, scope, `Deep link #${route.id} did not settle`, state);
  let recovery = null;
  if (!valid) {
    try {
      await stage(`${scope}: recover #${route.id}`, async () => {
        await evaluate(page, ({ id }) => {
          const target = document.getElementById(id);
          if (!target) return;
          const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
          window.scrollTo({
            top: window.scrollY + target.getBoundingClientRect().top - padding,
            behavior: 'instant',
          });
        }, route, `${scope}: force #${route.id}`);
        await page.waitForFunction(({ chapter }) => (
          document.querySelector('.mf-lab')?.getAttribute('data-active-chapter') === chapter
        ), route, { timeout: TIMEOUT.operation });
      }, TIMEOUT.operation);
      recovery = await evaluate(page, ({ id }) => {
        const root = document.querySelector('.mf-lab');
        const target = document.getElementById(id);
        return {
          activeChapter: root?.getAttribute('data-active-chapter') ?? null,
          targetTop: target?.getBoundingClientRect().top ?? null,
        };
      }, route, `${scope}: inspect recovered #${route.id}`);
    } catch (error) {
      recovery = { error: error instanceof Error ? error.message : String(error) };
    }
  }
  return {
    ...state,
    settled: valid,
    responseStatus: response?.status() ?? null,
    settledMs: Date.now() - startedAt,
    recovery,
  };
}

async function collectAssetTelemetry(page, tier, scope) {
  const cameraPath = CAMERA_PATHS[tier];
  const telemetry = await evaluate(page, async ({ curvePath, modelPath, fetchTimeout }) => {
    const fetchAsset = async (path, asJson) => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), fetchTimeout);
      try {
        const response = await fetch(path, { cache: 'no-store', signal: controller.signal });
        const buffer = await response.arrayBuffer();
        const text = asJson ? new TextDecoder().decode(buffer) : null;
        return {
          ok: response.ok,
          status: response.status,
          bytes: buffer.byteLength,
          payload: text ? JSON.parse(text) : null,
        };
      } catch (error) {
        return { ok: false, status: null, bytes: 0, payload: null, error: String(error) };
      } finally {
        window.clearTimeout(timer);
      }
    };

    const root = document.querySelector('.mf-lab');
    const canvas = document.querySelector('.mf-canvas canvas, canvas.mf-canvas, .mf-world canvas');
    const absoluteModelUrl = new URL(modelPath, window.location.href).href;
    const absoluteCameraUrl = new URL(curvePath, window.location.href).href;
    const modelRequestedByScene = performance.getEntriesByName(absoluteModelUrl).length > 0;
    const cameraRequestedByScene = performance.getEntriesByName(absoluteCameraUrl).length > 0;
    const [cameraAsset, modelAsset] = await Promise.all([
      fetchAsset(curvePath, true),
      fetchAsset(modelPath, false),
    ]);

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
          maxTextureSize: context.getParameter(context.MAX_TEXTURE_SIZE),
        };
      }
    }

    const cameraPayload = cameraAsset.payload;
    return {
      renderer: root?.getAttribute('data-renderer') ?? null,
      qualityTier: root?.getAttribute('data-quality-tier') ?? null,
      firstSliceCameraCurves: Number(root?.getAttribute('data-camera-curves') ?? 0),
      canvasCount: document.querySelectorAll('.mf-canvas canvas, canvas.mf-canvas, .mf-world canvas').length,
      graphics,
      camera: {
        path: curvePath,
        requestedByScene: cameraRequestedByScene,
        ok: cameraAsset.ok,
        status: cameraAsset.status,
        bytes: cameraAsset.bytes,
        schemaVersion: cameraPayload?.schemaVersion ?? null,
        id: cameraPayload?.id ?? null,
        sampleCount: Array.isArray(cameraPayload?.samples) ? cameraPayload.samples.length : 0,
        start: cameraPayload?.samples?.[0] ?? null,
        end: cameraPayload?.samples?.at?.(-1) ?? null,
        error: cameraAsset.error ?? null,
      },
      model: {
        path: modelPath,
        requestedByScene: modelRequestedByScene,
        ok: modelAsset.ok,
        status: modelAsset.status,
        bytes: modelAsset.bytes,
        error: modelAsset.error ?? null,
      },
    };
  }, {
    curvePath: cameraPath,
    modelPath: MODEL_PATH,
    fetchTimeout: TIMEOUT.telemetry,
  }, `${scope}: asset telemetry`, TIMEOUT.telemetry + 1_000);

  const expectedCameraId = `vs05-07.school.camera.${tier}`;
  check(
    telemetry.camera.ok
      && telemetry.camera.schemaVersion === 1
      && telemetry.camera.id === expectedCameraId
      && telemetry.camera.sampleCount === 241,
    scope,
    'School Act camera asset is invalid',
    telemetry.camera,
  );
  check(
    telemetry.model.ok && telemetry.model.bytes > 0,
    scope,
    'School Act model asset is unavailable',
    telemetry.model,
  );
  if (!telemetry.model.requestedByScene) {
    warn(scope, 'The School Act GLB is available but was not requested by the renderer', telemetry.model, `${tier}:model-not-integrated`);
  }
  return telemetry;
}

async function collectRouteTelemetry(page, tier, chapter, scope) {
  try {
    await bounded(page.waitForFunction(() => {
      const root = document.querySelector('.mf-lab');
      return root?.getAttribute('data-renderer') !== 'webgl'
        || (root.hasAttribute('data-render-calls') && root.hasAttribute('data-render-triangles'));
    }, undefined, { timeout: TIMEOUT.telemetry }), TIMEOUT.telemetry, `${scope}: render telemetry`);
  } catch {
    // Missing performance counters are reported as warnings below.
  }

  const telemetry = await evaluate(page, () => {
    const root = document.querySelector('.mf-lab');
    return {
      activeChapter: root?.getAttribute('data-active-chapter') ?? null,
      renderer: root?.getAttribute('data-renderer') ?? null,
      calls: Number(root?.getAttribute('data-render-calls') ?? Number.NaN),
      triangles: Number(root?.getAttribute('data-render-triangles') ?? Number.NaN),
    };
  }, undefined, `${scope}: read render telemetry`);

  const budget = RENDER_BUDGETS[tier][chapter];
  const hasValues = Number.isFinite(telemetry.calls) && Number.isFinite(telemetry.triangles);
  telemetry.budget = budget;
  telemetry.withinBudget = hasValues
    && telemetry.calls <= budget.calls
    && telemetry.triangles <= budget.triangles;
  if (!hasValues) warn(scope, 'Render telemetry was not produced', telemetry, `${tier}:${chapter}:render-missing`);
  else if (!telemetry.withinBudget) {
    warn(scope, 'Render budget exceeded', telemetry, `${tier}:${chapter}:render-budget`);
  }
  return telemetry;
}

async function layoutState(page, scope) {
  const layout = await evaluate(page, () => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }), undefined, `${scope}: layout`);
  check(layout.overflow === 0, scope, 'Horizontal overflow detected', layout);
  return layout;
}

async function controlState(page, scope) {
  return evaluate(page, () => {
    const forbiddenPattern = /(expired|already[\s_-]*used|reset|replay|ruleaz[ăa]\s+trace|reseteaz[ăa])/i;
    const buttonTexts = Array.from(document.querySelectorAll('button'))
      .map((button) => button.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter(Boolean);
    const responses = ['EXPIRED', 'ALREADY_USED'].map((code) => {
      const term = Array.from(document.querySelectorAll('.sa-server-evidence dt'))
        .find((element) => element.textContent?.trim() === code);
      const row = term?.parentElement ?? null;
      return {
        code,
        exists: Boolean(term),
        insideButton: Boolean(term?.closest('button')),
        descendantButtons: row?.querySelectorAll('button').length ?? 0,
      };
    });
    return {
      scanCtaCount: document.querySelectorAll('.sa-scan-command').length,
      forbiddenButtons: buttonTexts.filter((text) => forbiddenPattern.test(text)),
      responses,
    };
  }, undefined, `${scope}: controls`);
}

function validateControls(controls, scope) {
  check(controls.scanCtaCount === 1, scope, 'Expected exactly one scan CTA', controls);
  check(controls.forbiddenButtons.length === 0, scope, 'Found scenario/reset/replay controls', controls);
  for (const response of controls.responses) {
    check(
      response.exists && !response.insideButton && response.descendantButtons === 0,
      scope,
      `${response.code} must remain passive evidence`,
      response,
    );
  }
}

async function traceSnapshot(page, scope) {
  return evaluate(page, () => {
    const root = document.querySelector('.mf-lab');
    const result = document.querySelector('.sa-trace__result strong');
    const progress = document.querySelector('.sa-trace__meter');
    const steps = Array.from(document.querySelectorAll('.sa-trace__steps > li'));
    const cta = document.querySelector('.sa-scan-command');
    return {
      outcome: root?.getAttribute('data-trace-outcome') ?? null,
      result: result?.textContent?.trim() ?? null,
      progress: Number(progress?.getAttribute('aria-valuenow') ?? Number.NaN),
      stepCount: steps.length,
      completedSteps: steps.filter((step) => step.getAttribute('data-complete') === 'true').length,
      ctaDisabled: cta instanceof HTMLButtonElement ? cta.disabled : null,
    };
  }, undefined, `${scope}: trace state`);
}

async function scrollToRouteWithWheel(page, route, scope) {
  const geometry = await evaluate(page, ({ id }) => {
    const target = document.getElementById(id);
    if (!target) return null;
    const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const start = window.scrollY;
    return {
      start,
      destination: start + target.getBoundingClientRect().top - padding,
    };
  }, route, `${scope}: measure scroll`);
  if (!geometry) throw new Error(`${scope}: target #${route.id} is missing`);

  await stage(`${scope}: scroll past access`, async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = await evaluate(
        page,
        () => window.scrollY,
        undefined,
        `${scope}: read wheel position ${attempt + 1}`,
        1_000,
      );
      const remaining = geometry.destination - current;
      if (Math.abs(remaining) <= 3) return;
      await page.mouse.wheel(0, remaining / 0.86);
      await page.waitForTimeout(1_150);
    }

    const finalPosition = await evaluate(
      page,
      () => window.scrollY,
      undefined,
      `${scope}: read final wheel position`,
      1_000,
    );
    if (Math.abs(finalPosition - geometry.destination) > 4) {
      throw new Error(`${scope}: wheel stopped ${Math.round(finalPosition - geometry.destination)}px from target`);
    }
  }, 8_000);
}

async function runJourneyPage(context, tier) {
  const scope = `${tier}:journey`;
  const page = await stage(`${scope}: new page`, () => context.newPage());
  attachDiagnostics(page, scope);
  const result = { deepLinks: {}, render: {} };
  try {
    const passage = ROUTES[0];
    result.deepLinks[passage.id] = await navigateToRoute(page, passage, scope, true);
    result.assets = await collectAssetTelemetry(page, tier, scope);
    result.render[passage.chapter] = await collectRouteTelemetry(page, tier, passage.chapter, scope);
    result.layouts = { passage: await layoutState(page, scope) };
    await capture(page, `${tier}-passage`);

    const access = ROUTES[1];
    result.deepLinks[access.id] = await navigateToRoute(page, access, scope);
    result.render[access.chapter] = await collectRouteTelemetry(page, tier, access.chapter, scope);
    result.controls = await controlState(page, scope);
    validateControls(result.controls, scope);
    result.idle = await traceSnapshot(page, scope);
    check(result.idle.outcome === 'idle' && result.idle.result === 'READY', scope, 'Canonical scan did not begin in idle', result.idle);
    check(result.idle.stepCount === 5, scope, 'Canonical trace must expose five steps', result.idle);

    await stage(`${scope}: click canonical scan`, () => page.locator('.sa-scan-command').click({ timeout: TIMEOUT.operation }));
    await stage(`${scope}: observe running`, () => page.waitForFunction(() => (
      document.querySelector('.mf-lab')?.getAttribute('data-trace-outcome') === 'running'
    ), undefined, { timeout: 1_500 }), 1_500);
    result.running = await traceSnapshot(page, scope);
    await stage(`${scope}: observe allowed`, () => page.waitForFunction(() => (
      document.querySelector('.mf-lab')?.getAttribute('data-trace-outcome') === 'allowed'
    ), undefined, { timeout: 5_000 }), 5_000);
    result.allowed = await traceSnapshot(page, scope);
    check(
      result.running.outcome === 'running',
      scope,
      'Canonical scan skipped running state',
      result.running,
    );
    check(
      result.allowed.outcome === 'allowed'
        && result.allowed.result === 'ALLOW'
        && result.allowed.stepCount === 5
        && result.allowed.completedSteps === 5
        && result.allowed.progress === 100
        && result.allowed.ctaDisabled === true,
      scope,
      'Canonical scan did not complete all five steps as ALLOW',
      result.allowed,
    );
    result.layouts.access = await layoutState(page, scope);
    await capture(page, `${tier}-access-allowed`);

    const schoolmate = ROUTES[2];
    result.deepLinks[schoolmate.id] = await navigateToRoute(page, schoolmate, scope);
    result.render[schoolmate.chapter] = await collectRouteTelemetry(page, tier, schoolmate.chapter, scope);
    const passiveControls = await controlState(page, scope);
    validateControls(passiveControls, scope);
    result.layouts.schoolmate = await layoutState(page, scope);
    await capture(page, `${tier}-schoolmate`);

    const resetPassage = await navigateToRoute(page, passage, `${scope}:auto-resolve`);
    await stage(`${scope}:auto-resolve: observe idle`, () => page.waitForFunction(() => (
      document.querySelector('.mf-lab')?.getAttribute('data-trace-outcome') === 'idle'
    ), undefined, { timeout: TIMEOUT.operation }), TIMEOUT.operation);
    const autoIdle = await traceSnapshot(page, `${scope}:auto-resolve`);
    await evaluate(page, () => {
      window.__schoolActQaClicks = 0;
      document.querySelector('.sa-scan-command')?.addEventListener('click', () => {
        window.__schoolActQaClicks += 1;
      });
    }, undefined, `${scope}:auto-resolve: install click counter`);
    await scrollToRouteWithWheel(page, schoolmate, `${scope}:auto-resolve`);
    await stage(`${scope}:auto-resolve: observe ALLOW`, () => page.waitForFunction(() => (
      document.querySelector('.mf-lab')?.getAttribute('data-trace-outcome') === 'allowed'
    ), undefined, { timeout: TIMEOUT.operation }), TIMEOUT.operation);
    const autoAllowed = await traceSnapshot(page, `${scope}:auto-resolve`);
    const manualClicks = await evaluate(
      page,
      () => window.__schoolActQaClicks ?? 0,
      undefined,
      `${scope}:auto-resolve: read click counter`,
    );
    check(manualClicks === 0, scope, 'Auto-resolve emitted a scan CTA click', { manualClicks });
    check(
      autoAllowed.result === 'ALLOW' && autoAllowed.completedSteps === 5,
      scope,
      'Scroll did not auto-resolve the canonical trace',
      autoAllowed,
    );
    result.autoResolve = {
      resetPassage,
      idle: autoIdle,
      allowed: autoAllowed,
      manualClicks,
    };
    return result;
  } catch (error) {
    fail(scope, 'Journey test threw', error instanceof Error ? error.message : String(error));
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  } finally {
    await safeClose(page, `${scope}: page.close`);
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
  try {
    return {
      viewport: VIEWPORTS[tier].viewport,
      journey: await runJourneyPage(context, tier),
    };
  } finally {
    await safeClose(context, `${tier}: context.close`);
  }
}

async function runEditorialFallback() {
  const scope = 'editorial-fallback';
  let managed;
  let context;
  let page;
  try {
    managed = await launchManagedBrowser([
      '--disable-3d-apis',
      '--disable-webgl',
      '--disable-webgl2',
      '--disable-gpu',
    ]);
    context = await stage(`${scope}: new context`, () => managed.browser.newContext({
      viewport: { width: 1280, height: 800 },
      colorScheme: 'dark',
      reducedMotion: 'no-preference',
    }));
    context.setDefaultTimeout(TIMEOUT.operation);
    context.setDefaultNavigationTimeout(TIMEOUT.navigation);
    page = await stage(`${scope}: new page`, () => context.newPage());
    attachDiagnostics(page, scope);
    const deepLink = await navigateToRoute(page, ROUTES[1], scope, true);
    const initial = await evaluate(page, () => {
      const root = document.querySelector('.mf-lab');
      return {
        renderer: root?.getAttribute('data-renderer') ?? null,
        rootChildren: root?.children.length ?? 0,
        canvasCount: document.querySelectorAll('canvas.mf-canvas').length,
        sections: ['mf-passage', 'mf-access', 'mf-schoolmate']
          .every((id) => Boolean(document.getElementById(id))),
        accessHeading: document.getElementById('sa-access-title')?.textContent?.trim() ?? null,
      };
    }, undefined, `${scope}: inspect route`);
    const supported = initial.renderer === 'editorial';
    if (!supported) warn(scope, 'Chromium ignored the WebGL-disable flags', initial);
    else {
      check(initial.rootChildren > 0, scope, 'Editorial fallback mounted an empty root', initial);
      check(initial.canvasCount === 0, scope, 'Editorial fallback still mounted the immersive canvas', initial);
      check(initial.sections && Boolean(initial.accessHeading), scope, 'Editorial fallback is incomplete', initial);
    }

    const controls = await controlState(page, scope);
    validateControls(controls, scope);
    await stage(`${scope}: click scan`, () => page.locator('.sa-scan-command').click({ timeout: TIMEOUT.operation }));
    await stage(`${scope}: observe ALLOW`, () => page.waitForFunction(() => (
      document.querySelector('.mf-lab')?.getAttribute('data-trace-outcome') === 'allowed'
    ), undefined, { timeout: 5_000 }), 5_000);
    const allowed = await traceSnapshot(page, scope);
    check(allowed.result === 'ALLOW' && allowed.completedSteps === 5, scope, 'Editorial scan did not resolve', allowed);
    const layout = await layoutState(page, scope);
    const screenshot = await capture(page, 'editorial-fallback-access');
    return { attempted: true, supported, deepLink, initial, controls, allowed, layout, screenshot };
  } catch (error) {
    fail(scope, 'Editorial fallback test threw', error instanceof Error ? error.message : String(error));
    return { attempted: true, supported: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    await safeClose(page, `${scope}: page.close`);
    await safeClose(context, `${scope}: context.close`);
    await closeManagedBrowser(managed);
  }
}

async function runSuite() {
  report.fallback = await runEditorialFallback();
  const managed = await launchManagedBrowser();
  try {
    report.viewports.mobile = await runViewport(managed.browser, 'mobile');
    report.viewports.desktop = await runViewport(managed.browser, 'desktop');
  } finally {
    await closeManagedBrowser(managed);
  }
}

async function finalize() {
  report.finishedAt = new Date().toISOString();
  report.summary = {
    passed: report.functionalFailures.length === 0 && report.errors.length === 0,
    functionalFailureCount: report.functionalFailures.length,
    consoleOrPageErrorCount: report.errors.length,
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
    fail('suite', 'QA suite aborted or exceeded its global deadline', error instanceof Error ? error.message : String(error));
  } finally {
    await cleanupAllBrowsers();
    await finalize();
  }
}

await main();
