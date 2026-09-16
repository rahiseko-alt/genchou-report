import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

const PORT = Number(process.env.E2E_PORT ?? 3100)

/**
 * この環境には Playwright が期待する版とは別の Chromium が用意されている。
 * 用意されているものがあればそれを使い、無ければ Playwright の既定に任せる。
 */
const PREINSTALLED_CHROMIUM = '/opt/pw-browsers/chromium'
const executablePath = existsSync(PREINSTALLED_CHROMIUM) ? PREINSTALLED_CHROMIUM : undefined

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], launchOptions: { executablePath } },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    // 起動判定には、どの画面が未実装でも必ず 200 を返す静的ファイルを使う。
    // ルートを見にいくと、ページが無い段階で 404 となり起動待ちが延々と続く。
    url: `http://127.0.0.1:${PORT}/manifest.webmanifest`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
