import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * 圏外用の控えの仕組み（`src/pwa/sw-source.js`）を、版を差し込んで配る。
 *
 * 版が変わると古い控えが捨てられる。配置ごとに変わる値（コミットの印）を使い、
 * 無ければ `dev` とする。ここを静的なファイルのまま配ると、直したはずの画面が
 * 古い控えから出続ける。
 */
export const dynamic = 'force-static'

function version(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID ?? 'dev'
}

export async function GET(): Promise<Response> {
  const source = await readFile(join(process.cwd(), 'src/pwa/sw-source.js'), 'utf8')

  return new Response(source.replace('__BUILD_ID__', version()), {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      // 控えの仕組みそのものは、毎回新しいものを取りにいかせる。
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/',
    },
  })
}
