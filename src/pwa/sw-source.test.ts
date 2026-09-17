import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 圏外用の控えの仕組みを、偽のブラウザに読み込ませて振る舞いを確かめる。
 *
 * 開発サーバーでは登録しないため、通し操作テストでは動かせない。
 * ここで「何を控えるか」「何を控えないか」を見張る。
 */

const SOURCE = readFileSync(join(process.cwd(), 'src/pwa/sw-source.js'), 'utf8').replace(
  '__BUILD_ID__',
  'test',
)

type Handler = (event: FakeEvent) => void
/** 控えの仕組みが読むのは、この3つだけ。`mode: 'navigate'` は本物の Request に入れられない。 */
type FakeRequest = { url: string; method: string; mode: string }
type FakeEvent = {
  request: FakeRequest
  waitUntil: (promise: Promise<unknown>) => void
  respondWith: (response: Promise<Response> | Response) => void
}

/** 控えの中身。URL をそのまま鍵にする。 */
class FakeCache {
  entries = new Map<string, Response>()
  async addAll(paths: string[]) {
    for (const path of paths) this.entries.set(new URL(path, ORIGIN).toString(), new Response(path))
  }
  async put(request: FakeRequest, response: Response) {
    this.entries.set(request.url, response)
  }
  async match(request: FakeRequest | string) {
    const url = typeof request === 'string' ? new URL(request, ORIGIN).toString() : request.url
    return this.entries.get(url)
  }
}

const ORIGIN = 'https://genchou.example.com'

function loadServiceWorker(fetchFromNetwork: (request: FakeRequest) => Promise<Response>) {
  const handlers = new Map<string, Handler>()
  const cache = new FakeCache()
  const deleted: string[] = []

  const self = {
    location: new URL(ORIGIN),
    addEventListener: (name: string, handler: Handler) => void handlers.set(name, handler),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  }

  const caches = {
    open: async () => cache,
    keys: async () => ['genchou-report-old', 'genchou-report-test'],
    delete: async (name: string) => void deleted.push(name),
    match: (request: FakeRequest | string) => cache.match(request),
  }

  // グローバルを差し替えて読み込む。
  const run = new Function('self', 'caches', 'fetch', 'Response', 'URL', SOURCE)
  run(self, caches, fetchFromNetwork, Response, URL)

  return { handlers, cache, deleted, self }
}

/** fetch の求めを1つ流し、返ってきたものを受け取る。 */
async function handleFetch(
  sw: ReturnType<typeof loadServiceWorker>,
  url: string,
  { method = 'GET', mode = 'cors' }: { method?: string; mode?: string } = {},
): Promise<Response | null> {
  const handler = sw.handlers.get('fetch')
  if (handler === undefined) throw new Error('fetch の受け手が無い')

  let answer: Promise<Response> | Response | null = null
  handler({
    request: { url, method, mode },
    waitUntil: () => undefined,
    respondWith: (response) => void (answer = response),
  })
  return answer === null ? null : await answer
}

const networkWorks = async (request: FakeRequest) => new Response(`網から: ${request.url}`)
const networkDown = async () => {
  throw new Error('圏外')
}

describe('圏外用の控え', () => {
  let sw: ReturnType<typeof loadServiceWorker>

  beforeEach(() => {
    sw = loadServiceWorker(networkWorks)
  })

  it('入れたときに、入力の前に通る画面を控える', async () => {
    const install = sw.handlers.get('install')
    const waited: Promise<unknown>[] = []
    install?.({
      request: { url: ORIGIN, method: 'GET', mode: 'cors' },
      waitUntil: (p) => void waited.push(p),
      respondWith: () => undefined,
    })
    await Promise.all(waited)

    for (const path of ['/', '/customer', '/exterior', '/defects', '/preview']) {
      expect(await sw.cache.match(path), path).toBeDefined()
    }
  })

  it('版が変わると、古い控えを捨てる', async () => {
    const activate = sw.handlers.get('activate')
    const waited: Promise<unknown>[] = []
    activate?.({
      request: { url: ORIGIN, method: 'GET', mode: 'cors' },
      waitUntil: (p) => void waited.push(p),
      respondWith: () => undefined,
    })
    await Promise.all(waited)

    expect(sw.deleted).toEqual(['genchou-report-old'])
  })

  it('送付は控えに触れず、必ず網へ出す', async () => {
    // 控えから返してしまうと、送ったつもりで届かない
    const answer = await handleFetch(sw, `${ORIGIN}/api/send-report`, { method: 'POST' })

    expect(answer).toBeNull()
  })

  it('送付の GET であっても、控えに触れない', async () => {
    expect(await handleFetch(sw, `${ORIGIN}/api/send-report`)).toBeNull()
  })

  it('他所への求めには手を出さない', async () => {
    expect(await handleFetch(sw, 'https://example.com/other')).toBeNull()
  })

  it('書き込みの求めには手を出さない', async () => {
    expect(await handleFetch(sw, `${ORIGIN}/customer`, { method: 'POST' })).toBeNull()
  })

  it('網が通れば網の答えを返し、控えを新しくする', async () => {
    const answer = await handleFetch(sw, `${ORIGIN}/customer`)

    expect(await answer?.text()).toContain('網から')
    expect(await sw.cache.match(`${ORIGIN}/customer`)).toBeDefined()
  })

  it('圏外では控えを返す', async () => {
    await handleFetch(sw, `${ORIGIN}/customer`)

    const offline = loadServiceWorker(networkDown)
    offline.cache.entries = sw.cache.entries
    const answer = await handleFetch(offline, `${ORIGIN}/customer`)

    expect(await answer?.text()).toContain('網から')
  })

  it('圏外で控えにも無い画面は、控えたトップを返す', async () => {
    const offline = loadServiceWorker(networkDown)
    await offline.cache.addAll(['/'])

    const answer = await handleFetch(offline, `${ORIGIN}/unknown`, { mode: 'navigate' })

    expect(answer).not.toBeNull()
  })

  it('圏外で控えにも無い資源は、諦める', async () => {
    const offline = loadServiceWorker(networkDown)

    await expect(handleFetch(offline, `${ORIGIN}/missing.js`)).rejects.toThrow()
  })
})
