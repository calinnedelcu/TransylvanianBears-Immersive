import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { SITE } from './src/data'
import { CONTENT, LANGS, type Lang } from './src/i18n/content'

const escapeAttribute = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

type PageMeta = { lang: Lang; path: string; title: string; description: string }

/** index.html with the title, description, language, canonical and hreflang links of one page. */
function renderPage(template: string, { lang, path, title, description }: PageMeta) {
  const content = CONTENT[lang]
  const url = `${SITE.url}${content.path(path)}`
  const t = escapeAttribute(title)
  const d = escapeAttribute(description)
  const alternates = [
    ...LANGS.map((code) => `<link rel="alternate" hreflang="${code}" href="${SITE.url}${CONTENT[code].path(path)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${SITE.url}${CONTENT.ro.path(path)}" />`,
  ].join('\n    ')
  const locale = lang === 'en' ? 'en_GB' : 'ro_RO'
  const otherLocale = lang === 'en' ? 'ro_RO' : 'en_GB'

  return template
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(" \/>)/, `$1${url}$2\n    ${alternates}`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1${locale}$2`)
    .replace(/(<meta property="og:locale:alternate" content=")[^"]*(")/, `$1${otherLocale}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:image:alt" content=")([^"]*)(")/, (_match, open, alt, close) =>
      lang === 'en' ? `${open}${escapeAttribute(`${SITE.name} — the team’s six builders`)}${close}` : `${open}${alt}${close}`,
    )
}

/** Writes `html` for `path`, both as path.html (Vercel "cleanUrls") and path/index.html. */
function writePage(outDir: string, path: string, html: string) {
  if (path === '/') {
    writeFileSync(join(outDir, 'index.html'), html)
    return
  }
  const folder = join(outDir, path)
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, 'index.html'), html)
  writeFileSync(join(outDir, `${path.replace(/^\//, '')}.html`), html)
}

/**
 * The site is a single-page app, but link previews (WhatsApp, LinkedIn, Slack …) and
 * crawlers read the HTML they are given. After the build, write one copy of index.html
 * per page and language with its own title, description, canonical URL and hreflang links.
 */
function prerenderedPages(): Plugin {
  let outDir = 'dist'

  return {
    name: 'prerendered-pages',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const template = readFileSync(join(outDir, 'index.html'), 'utf-8')

      for (const lang of LANGS) {
        const content = CONTENT[lang]
        writePage(
          outDir,
          content.path('/'),
          renderPage(template, {
            lang,
            path: '/',
            title: `${content.SITE.name} — ${content.UI.homeTitle}`,
            description: content.SITE.defaultDescription,
          }),
        )

        for (const project of content.PROJECTS) {
          const path = `/work/${project.slug}`
          writePage(
            outDir,
            content.path(path),
            renderPage(template, {
              lang,
              path,
              title: `${project.title} — ${content.SITE.name}`,
              description: `${project.summary} ${content.UI.caseStudy} ${content.SITE.name}.`,
            }),
          )
        }
      }
    },
  }
}

/** Start fetching the two fonts the first screen needs before the CSS has been parsed. */
function fontPreload(): Plugin {
  return {
    name: 'font-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const critical = /(big-shoulders-latin-900-normal|bricolage-grotesque-latin-wght-normal)-[\w-]+\.woff2$/
        return Object.keys(context.bundle ?? {})
          .filter((file) => critical.test(file))
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `/${file}` },
            injectTo: 'head' as const,
          }))
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), fontPreload(), prerenderedPages()],
  // three.js lives in its own lazily loaded chunk (≈220 kB gzipped), fetched after first paint.
  build: { chunkSizeWarningLimit: 900 },
})
