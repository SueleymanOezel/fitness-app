import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

// Writes dist/sw.js: pwa/sw.template.js with the list of everything the build
// emitted (hashed chunks included), so the whole app is available offline after
// the first visit. The version changes whenever any file name changes, i.e.
// whenever a file's content does. A hand-written worker instead of a PWA plugin:
// the list above is the only build-dependent part.
function serviceWorker(): Plugin {
  const shell = ['/', '/index.html', '/manifest.webmanifest', '/logo.webp', '/favicon.png', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png']
  return {
    name: 'vitaloop-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const emitted = Object.keys(bundle)
        .filter((file) => !file.endsWith('.map'))
        .map((file) => `/${file}`)
      const precache = [...new Set([...shell, ...emitted])]
      const template = readFileSync('pwa/sw.template.js', 'utf-8')
      // Unhashed public files (icons, manifest) keep their name when their content changes: hash them too.
      const publicFiles = shell.filter((file) => file !== '/' && file !== '/index.html').map((file) => readFileSync(`public${file}`))
      const version = createHash('sha256')
        .update(template + precache.join())
        .update(Buffer.concat(publicFiles))
        .digest('hex')
        .slice(0, 12)
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache)),
      })
    },
  }
}

// `npm run dev:mobile` serves over HTTPS on the local network so a phone can
// reach the app: getUserMedia (the barcode scanner) only runs in a secure
// context, and plain http:// over the LAN is not one. Plain `npm run dev` stays
// http on localhost, which counts as secure and needs no certificate prompt.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), serviceWorker(), ...(mode === 'mobile' ? [basicSsl()] : [])],
  // '0.0.0.0', not `true`: the latter binds to '::' and this machine's dual-stack
  // does not accept IPv4 through it, so phones on the LAN could not connect.
  server: mode === 'mobile' ? { host: '0.0.0.0' } : {},
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    env: {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,vite.config,vitest.config,jest.config,ava.config,babel.config,nuxt.config,karma.conf,rollup.config,webpack.config}.*',
      // Deno edge function tests run via `deno test`, not vitest — Deno
      // globals and remote https:// imports break the Node/jsdom runner.
      'supabase/functions/**',
    ],
  },
}))
