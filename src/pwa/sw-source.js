/*
 * 圏外でもアプリが立ち上がるようにするための、画面と資源の控え。
 *
 * 写真や入力した内容はここでは扱わない。それらは IndexedDB にある
 * （src/storage/draft.ts）。ここが持つのは「アプリの見た目と仕組み」だけ。
 *
 * 版を上げると古い控えは捨てられる。組み立てのたびに書き換わる値を入れてある。
 */
const VERSION = '__BUILD_ID__'
const CACHE = `genchou-report-${VERSION}`

/** 先に控えておく画面。どれも入力の前に必ず通る。 */
const SCREENS = ['/', '/customer', '/exterior', '/defects', '/preview']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SCREENS))
      // 1つでも取れなければ控えは作らないが、それで動かなくなるわけではない。
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // 送付は必ず本物のサーバーへ。控えを返してはいけない。
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    // まずは網に取りにいく。取れたら控えを新しくする。
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          void caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached !== undefined) return cached
        // 画面の求めなら、控えたどれかを返す。真っ白より、開いたほうがよい。
        if (request.mode === 'navigate') {
          const fallback = await caches.match('/')
          if (fallback !== undefined) return fallback
        }
        throw new Error('圏外で、控えもない')
      }),
  )
})
