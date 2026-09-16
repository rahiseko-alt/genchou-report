import { join } from 'node:path'
import { type Page, expect, test } from '@playwright/test'

const WIDE = join(import.meta.dirname, 'fixtures/exterior-wide.jpg')

async function shoot(page: Page, position: number, file: string, label: string) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: `${position}枚目を撮る` }).click(),
  ])
  await chooser.setFiles(file)
  await expect(page.getByRole('img', { name: `${label} ${position}枚目` })).toBeVisible()
}

// 控えの仕組みそのものの振る舞いは src/pwa/sw-source.test.ts で確かめる。
// 開発サーバーでは登録しないため（作りかけの画面が控えに残ると紛らわしい）、
// ここでは配られ方と、圏外での画面の見え方だけを見る。
test('控えの仕組みが版つきで配られる', async ({ request }) => {
  const response = await request.get('/sw.js')

  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('javascript')

  const source = await response.text()
  // 版が差し込まれ、雛形のままではない
  expect(source).not.toContain('__BUILD_ID__')
  expect(source).toMatch(/genchou-report-/)
})

test('圏外でも、入力した内容は端末に残って続きから開ける', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'スタート' }).click()
  await page.getByLabel('顧客名').fill('山田 太郎')
  await page.getByRole('button', { name: '次へ' }).click()
  await shoot(page, 1, WIDE, '外観写真')

  // 電波が切れる
  await context.setOffline(true)

  // 入力は端末の中にあるので、そのまま続けられる
  await shoot(page, 2, WIDE, '外観写真')
  await expect(page.getByText('2 / 4 枚')).toBeVisible()

  await context.setOffline(false)
})

test('圏外で完了を押すと、送れなかったことと次の手が出る', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'スタート' }).click()
  await page.getByLabel('顧客名').fill('山田')
  await page.getByRole('button', { name: '次へ' }).click()
  for (const position of [1, 2, 3, 4]) await shoot(page, position, WIDE, '外観写真')
  await page.getByRole('button', { name: '次へ' }).click()
  await shoot(page, 1, WIDE, '不具合写真')
  await page.getByRole('button', { name: '作成完了' }).click()
  await expect(page).toHaveURL(/\/preview$/)

  await context.setOffline(true)
  await page.getByRole('button', { name: '完了（会社へ送る）' }).click()

  await expect(
    page.getByText('送れませんでした。電波の届く場所でもう一度お試しください'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'あとで送る' })).toBeVisible()

  await context.setOffline(false)
})
