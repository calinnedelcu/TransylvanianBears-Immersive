#!/usr/bin/env node
/**
 * Smoke test for the production build.
 *
 *   npm run build && npm run qa
 *
 * Starts `vite preview` (or uses BASE_URL when set), then walks every route at
 * phone, tablet and desktop widths and checks what a visitor would notice:
 * console errors, horizontal overflow, broken images, headings, landmarks,
 * and the interactive pieces (menu, lightbox, copy button), plus the 3D world.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4174;
const SLUGS = [
  'project-nexus',
  'aegis',
  'schoolmate',
  'the-buried-hands',
  'economy-news',
  'automation-risk',
  'infect-exe',
];
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
];

const failures = [];
const passes = [];
const check = (ok, label, detail = '') => {
  (ok ? passes : failures).push(ok ? label : `${label}${detail ? ` — ${detail}` : ''}`);
};

async function startPreview() {
  if (process.env.BASE_URL) return { url: process.env.BASE_URL.replace(/\/$/, ''), stop: () => {} };
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
    console.error('No dist/ found. Run `npm run build` first.');
    process.exit(2);
  }
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  const url = `http://localhost:${PORT}`;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return { url, stop: () => server.kill() };
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error('vite preview did not start');
}

async function openPage(context, url, errors) {
  const page = await context.newPage();
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) errors.push(`[${message.type()}] ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`));
  page.on('requestfailed', (request) => errors.push(`[requestfailed] ${request.url()}`));
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return { page, response };
}

async function auditPage(page, label) {
  // Show everything: make lazy images load and wait for them.
  await page.evaluate(async () => {
    const images = [...document.querySelectorAll('img')];
    images.forEach((image) => {
      image.loading = 'eager';
    });
    await Promise.all(images.map((image) => (image.complete ? 0 : new Promise((resolve) => { image.onload = image.onerror = resolve; }))));
  });

  const report = await page.evaluate(() => {
    const broken = [...document.querySelectorAll('img')].filter((image) => image.naturalWidth === 0).map((image) => image.getAttribute('src'));
    const missingAlt = [...document.querySelectorAll('img:not([alt])')].map((image) => image.getAttribute('src'));
    const hashes = [...document.querySelectorAll('a[href^="#"]')]
      .map((anchor) => anchor.getAttribute('href').slice(1))
      .filter((id) => id && !document.getElementById(id));
    return {
      title: document.title,
      h1: document.querySelectorAll('h1').length,
      main: document.querySelectorAll('main').length,
      header: document.querySelectorAll('header').length,
      footer: document.querySelectorAll('footer').length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      broken,
      missingAlt,
      hashes,
    };
  });

  check(report.h1 === 1, `${label}: exactly one <h1>`, `found ${report.h1}`);
  check(report.main === 1 && report.header >= 1 && report.footer === 1, `${label}: landmarks present`);
  check(report.title.length > 8 && report.title.includes('Transylvanian Bears'), `${label}: document title`, report.title);
  check(report.overflow <= 0, `${label}: no horizontal overflow`, `${report.overflow}px`);
  check(report.broken.length === 0, `${label}: all images load`, report.broken.join(', '));
  check(report.missingAlt.length === 0, `${label}: every image has an alt attribute`, report.missingAlt.join(', '));
  check(report.hashes.length === 0, `${label}: in-page links have targets`, report.hashes.join(', '));
}

async function interactions(browser, baseUrl) {
  // ----- phone: menu, project list, lightbox -----
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = [];
  const { page } = await openPage(phone, `${baseUrl}/`, errors);

  await page.getByRole('button', { name: 'Deschide meniul' }).click();
  check(await page.locator('dialog.menu[open]').count() === 1, 'menu opens on phone');
  await page.keyboard.press('Escape');
  check(await page.locator('dialog.menu[open]').count() === 0, 'Escape closes the menu');

  await page.getByRole('button', { name: 'Deschide meniul' }).click();
  await page.locator('dialog.menu a', { hasText: 'Echipa' }).click();
  await page.waitForTimeout(400);
  check(await page.locator('dialog.menu[open]').count() === 0, 'choosing a menu link closes it');
  check(await page.evaluate(() => window.location.hash) === '#echipa', 'menu link navigates to its section');
  const teamTop = await page.evaluate(() => document.getElementById('echipa').getBoundingClientRect().top);
  check(teamTop < 200, 'section is scrolled into view after navigation', `top=${Math.round(teamTop)}`);

  await page.locator('#proiecte').scrollIntoViewIfNeeded();
  const total = await page.locator('.pgrid > li').count();
  check(total === 7, 'projects section lists all 7 projects', `got ${total}`);

  await page.locator('.ledger__thumb').first().scrollIntoViewIfNeeded();
  await page.locator('.ledger__thumb').first().click();
  await page.waitForSelector('dialog.lightbox[open]', { timeout: 3000 }).catch(() => undefined);
  check(await page.locator('dialog.lightbox[open]').count() === 1, 'result proof opens in the lightbox');
  await page.keyboard.press('Escape');
  check(await page.locator('dialog.lightbox[open]').count() === 0, 'Escape closes the lightbox');
  check(errors.length === 0, 'phone interactions: no console errors', errors.slice(0, 2).join(' | '));
  await phone.close();

  // ----- desktop: navigation, project page, keyboard, copy -----
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const desktopErrors = [];
  const { page: home } = await openPage(desktop, `${baseUrl}/`, desktopErrors);

  await home.getByRole('navigation', { name: 'Navigație principală' }).getByRole('link', { name: 'Rezultate' }).click();
  await home.waitForTimeout(500);
  const current = await home.locator('.site-nav a[aria-current="location"]').allTextContents();
  check(current.join('') === 'Rezultate', 'header highlights the section in view', current.join(','));

  await home.locator('#contact').scrollIntoViewIfNeeded();
  await home.getByRole('button', { name: 'Copiază adresa' }).click();
  const clipboard = await home.evaluate(() => navigator.clipboard.readText());
  check(clipboard.includes('@'), 'copy button puts the e-mail address on the clipboard', clipboard);

  await home.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await home.locator('.pcard a').first().click();
  await home.waitForURL(/\/work\//);
  check(/\/work\/project-nexus$/.test(home.url()), 'project card opens its case study', home.url());
  await home.locator('.proj__next[data-direction="next"]').click();
  await home.waitForURL(/\/work\/aegis$/);
  check(true, 'next-project link works');

  await home.goBack();
  await home.waitForURL(/\/work\/project-nexus$/);
  await home.goBack();
  await home.waitForURL((url) => url.pathname === '/');
  check(true, 'browser back returns to the home page');

  // keyboard: the very first Tab stop is the skip link
  await home.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await home.keyboard.press('Tab');
  const first = await home.evaluate(() => document.activeElement?.className ?? '');
  check(String(first).includes('skip-link'), 'first Tab stop is the skip link', String(first));

  // legacy URLs
  for (const [from, hash] of [['/work', '#proiecte'], ['/team', '#echipa'], ['/archive', '#rezultate'], ['/team/vlad-colan', '#vlad-colan']]) {
    await home.goto(`${baseUrl}${from}`, { waitUntil: 'networkidle' });
    check(new URL(home.url()).pathname === '/' && new URL(home.url()).hash === hash, `legacy ${from} → ${hash}`, home.url());
  }

  // 404
  await home.goto(`${baseUrl}/nu-exista`, { waitUntil: 'networkidle' });
  check((await home.locator('h1').textContent())?.includes('Drumul acesta'), 'unknown URL shows the 404 page');
  check(await home.locator('meta[name="robots"][content="noindex"]').count() === 1, '404 page is noindex');
  check(desktopErrors.filter((entry) => !entry.includes('/nu-exista')).length === 0, 'desktop interactions: no console errors', desktopErrors.slice(0, 2).join(' | '));
  await desktop.close();
}

/** The English site: language, translated text, and the RO / EN switch in both directions. */
async function englishChecks(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  const { page } = await openPage(context, `${baseUrl}/`, errors);
  await page.locator('.lang-switch').click();
  await page.waitForURL(/\/en$/);
  check(await page.evaluate(() => document.documentElement.lang) === 'en', 'EN switch opens the English home page');
  check(await page.getByRole('link', { name: 'See the projects' }).count() === 1, 'English home page is translated');
  await page.locator('.pcard a').first().click();
  await page.waitForURL(/\/en\/work\/project-nexus$/);
  // The card opens its page with a view transition: let it finish.
  await page.waitForTimeout(800);
  check(await page.getByText('All projects').count() > 0, 'English project card opens the English case study');
  await page.locator('.lang-switch').click();
  await page.waitForURL(/\/work\/project-nexus$/);
  await page.waitForTimeout(800);
  check(!page.url().includes('/en/'), 'RO switch keeps the same case study', page.url());
  check(await page.evaluate(() => document.documentElement.lang) === 'ro', 'Romanian page sets lang="ro"');
  check(errors.length === 0, 'language switching: no console errors', errors.slice(0, 2).join(' | '));
  await context.close();
}

/** The 3D world (motion allowed): it starts, every station is in place, scrolling end to end is clean. */
async function worldChecks(browser, baseUrl) {
  for (const viewport of VIEWPORTS.filter((item) => item.name !== 'tablet')) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const errors = [];
    const { page } = await openPage(context, `${baseUrl}/`, errors);
    const label = `${viewport.name} 3D world`;
    const webgl = await page.evaluate(() => Boolean(document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl')));
    if (!webgl) {
      console.log(`  (skipped ${label}: this browser has no WebGL)`);
      await context.close();
      continue;
    }
    const started = await page
      .waitForFunction(() => document.documentElement.classList.contains('has-world'), null, { timeout: 20000 })
      .then(() => true, () => false);
    check(started, `${label}: starts`);
    const stations = await page.locator('[data-station]').count();
    check(stations === 1 + 1 + 4 + 1 + 7 + 1 + 1 + 6 + 1, `${label}: every section is a station`, `got ${stations}`);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += viewport.height * 0.8) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(120);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflow <= 0, `${label}: no horizontal overflow`, `${overflow}px`);
    // Software GPUs used in CI log performance notes about read-backs: not page errors.
    const real = errors.filter((entry) => !/GL Driver Message|GPU stall|WebGL-/.test(entry));
    check(real.length === 0, `${label}: no console errors while scrolling`, real.slice(0, 2).join(' | '));
    await context.close();
  }
}

const preview = await startPreview();
const browser = await chromium.launch();
try {
  const routes = ['/', ...SLUGS.map((slug) => `/work/${slug}`), '/en', ...SLUGS.map((slug) => `/en/work/${slug}`)];
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
    for (const route of routes) {
      const errors = [];
      const label = `${viewport.name} ${route}`;
      const { page, response } = await openPage(context, `${preview.url}${route}`, errors);
      check(response?.status() === 200, `${label}: HTTP 200`, String(response?.status()));
      await auditPage(page, label);
      check(errors.length === 0, `${label}: no console errors or failed requests`, errors.slice(0, 2).join(' | '));
      await page.close();
    }
    await context.close();
  }
  await interactions(browser, preview.url);
  await englishChecks(browser, preview.url);
  await worldChecks(browser, preview.url);
} finally {
  await browser.close();
  preview.stop();
}

console.log(`\n${passes.length} checks passed, ${failures.length} failed.`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((failure) => console.log(`  ✗ ${failure}`));
  process.exit(1);
}
