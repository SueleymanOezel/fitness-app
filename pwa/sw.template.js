/*
 * VitaLoop service worker. The build (vite.config.ts) fills in VERSION and
 * PRECACHE and writes the result to dist/sw.js; this template is not served.
 *
 * What it does: keeps the app shell (HTML, hashed JS/CSS chunks, icons) so the
 * app opens without a network. Data lives in Supabase and is NOT cached here
 * (cross-origin requests are left alone, see the stale-data cache in the app).
 *
 * Updates: a new worker does not call skipWaiting. It waits until every open
 * window of the app is closed, so a page that is still running never loses the
 * chunks it knows about. The next cold start runs the new version.
 */
const VERSION = '__VERSION__'
const CACHE = `vitaloop-${VERSION}`
const PRECACHE = __PRECACHE__

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith('vitaloop-') && key !== CACHE).map((key) => caches.delete(key))),
      ),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Every route is the same single-page shell. Online the fresh one wins (a deploy shows up at once),
  // offline or after a 4 s stall the cached one is used.
  if (request.mode === 'navigate') {
    const timeout = new Promise((_resolve, reject) => setTimeout(reject, 4000))
    event.respondWith(
      Promise.race([fetch(request), timeout])
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put('/index.html', copy))
          }
          return response
        })
        .catch(() => caches.match('/index.html').then((cached) => cached ?? Response.error())),
    )
    return
  }

  // Hashed chunks and icons never change under the same name: cache first.
  event.respondWith(
    // ignoreVary: a dev/static server may send `Vary: Origin`; module scripts are CORS requests, the precache
    // fetch was not, and without this the stored copy would never match.
    caches.match(request, { ignoreVary: true }).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok && url.pathname !== '/sw.js') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
