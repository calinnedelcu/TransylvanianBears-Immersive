import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { PROJECTS, SITE } from './src/data'

const escapeAttribute = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/**
 * The site is a single-page app, but link previews (WhatsApp, LinkedIn, Slack …) and
 * crawlers read the HTML they are given. After the build, write one copy of index.html
 * per project with that project's own title, description and canonical URL.
 */
function projectPages(): Plugin {
  let outDir = 'dist'

  return {
    name: 'project-pages',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const template = readFileSync(join(outDir, 'index.html'), 'utf-8')

      for (const project of PROJECTS) {
        const title = escapeAttribute(`${project.title} — ${SITE.name}`)
        const description = escapeAttribute(`${project.summary} Studiu de caz ${SITE.name}.`)
        const url = `${SITE.url}/work/${project.slug}`

        const html = template
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
          .replace(/(<meta name="description" content=")[^"]*(")/, `$1${description}$2`)
          .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
          .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
          .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${description}$2`)
          .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
          .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`)
          .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${description}$2`)

        // work/<slug>.html is served at /work/<slug> (Vercel "cleanUrls"); the folder copy covers
        // hosts that map /work/<slug>/ to a directory index instead.
        const folder = join(outDir, 'work', project.slug)
        mkdirSync(folder, { recursive: true })
        writeFileSync(join(folder, 'index.html'), html)
        writeFileSync(join(outDir, 'work', `${project.slug}.html`), html)
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
  plugins: [react(), fontPreload(), projectPages()],
})
