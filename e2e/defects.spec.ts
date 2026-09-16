import { join } from 'node:path'
import { type Page, expect, test } from '@playwright/test'

const WIDE = join(import.meta.dirname, 'fixtures/exterior-wide.jpg')
const DEFECT_A = join(import.meta.dirname, 'fixtures/defect-a.jpg')

/** 顧客情報と外観4枚を埋めて、不具合ページまで進む。 */
async function openDefects(page: Page) {
  await page.goto('/customer')
  await page.getByLabel('顧客名').fill('山田')
  await page.getByRole('button', { name: '次へ' }).click()
  await expect(page).toHaveURL(/\/exterior$/)

  for (const position of [1, 2, 3, 4]) {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: `${position}枚目を撮る` }).click(),
    ])
    await chooser.setFiles(WIDE)
    await expect(page.getByRole('img', { name: `外観写真 ${position}枚目` })).toBeVisible()
  }
  await page.getByRole('button', { name: '次へ' }).click()
  await expect(page).toHaveURL(/\/defects$/)
}

async function shootDefect(page: Page, position: number, file = DEFECT_A) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: `${position}枚目を撮る` }).click(),
  ])
  await chooser.setFiles(file)
  await expect(page.getByRole('img', { name: `不具合写真 ${position}枚目` })).toBeVisible()
}

test('写真を入れるとステータスのボタンと補足が現れる', async ({ page }) => {
  await openDefects(page)

  await expect(page.getByRole('button', { name: 'A', exact: true })).toHaveCount(0)

  await shootDefect(page, 1)

  await expect(page.getByRole('button', { name: 'A', exact: true })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'B', exact: true })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'C', exact: true })).toHaveCount(1)
  await expect(page.getByLabel('1枚目の補足')).toBeVisible()
})

test('ステータスは複数付けられ、もう一度押すと外れる', async ({ page }) => {
  await openDefects(page)
  await shootDefect(page, 1)

  const a = page.getByRole('button', { name: 'A', exact: true })
  const c = page.getByRole('button', { name: 'C', exact: true })

  await a.click()
  await c.click()
  await expect(a).toHaveAttribute('aria-pressed', 'true')
  await expect(c).toHaveAttribute('aria-pressed', 'true')

  await a.click()
  await expect(a).toHaveAttribute('aria-pressed', 'false')
  await expect(c).toHaveAttribute('aria-pressed', 'true')
})

test('補足を書き込める', async ({ page }) => {
  await openDefects(page)
  await shootDefect(page, 1)

  await page.getByLabel('1枚目の補足').fill('外壁のひび割れ、幅2mm')

  await expect(page.getByLabel('1枚目の補足')).toHaveValue('外壁のひび割れ、幅2mm')
})

test('1枚も無いと作成完了を押せない', async ({ page }) => {
  await openDefects(page)

  await expect(page.getByRole('button', { name: '作成完了' })).toBeDisabled()

  await shootDefect(page, 1)

  await expect(page.getByRole('button', { name: '作成完了' })).toBeEnabled()
})

test('4枠埋まるまでページを追加できない', async ({ page }) => {
  await openDefects(page)

  await expect(page.getByRole('button', { name: 'ページ追加' })).toBeDisabled()

  for (const position of [1, 2, 3]) await shootDefect(page, position)
  await expect(page.getByRole('button', { name: 'ページ追加' })).toBeDisabled()

  await shootDefect(page, 4)
  await expect(page.getByRole('button', { name: 'ページ追加' })).toBeEnabled()
})

test('ページを追加すると空の4枠が出て、前のページへ戻れる', async ({ page }) => {
  await openDefects(page)
  for (const position of [1, 2, 3, 4]) await shootDefect(page, position)

  await page.getByRole('button', { name: 'ページ追加' }).click()

  await expect(page.getByText('2 ページ目')).toBeVisible()
  await expect(page.getByRole('img', { name: /不具合写真/ })).toHaveCount(0)
  // 前のページに写真があるので、2枚目が空でも完了は押せる
  await expect(page.getByRole('button', { name: '作成完了' })).toBeEnabled()

  await page.getByRole('button', { name: 'ページ戻る' }).click()

  await expect(page.getByText('1 ページ目')).toBeVisible()
  await expect(page.getByRole('img', { name: /不具合写真/ })).toHaveCount(4)
})

test('1ページ目には「ページ戻る」が無い', async ({ page }) => {
  await openDefects(page)

  await expect(page.getByRole('button', { name: 'ページ戻る' })).toHaveCount(0)
})

test('最後のページが2枚でも作成完了へ進める', async ({ page }) => {
  await openDefects(page)
  for (const position of [1, 2, 3, 4]) await shootDefect(page, position)
  await page.getByRole('button', { name: 'ページ追加' }).click()
  for (const position of [1, 2]) await shootDefect(page, position)

  await page.getByRole('button', { name: '作成完了' }).click()

  await expect(page).toHaveURL(/\/preview$/)
})

test('写真を外すと、その枠のステータスと補足も消える', async ({ page }) => {
  await openDefects(page)
  await shootDefect(page, 1)
  await page.getByRole('button', { name: 'A', exact: true }).click()
  await page.getByLabel('1枚目の補足').fill('あとで消える')

  await page.getByRole('button', { name: '不具合写真 1枚目' }).click()
  await page.getByRole('button', { name: '削除する' }).click()

  await expect(page.getByRole('button', { name: 'A', exact: true })).toHaveCount(0)
  await expect(page.getByLabel('1枚目の補足')).toHaveCount(0)
})

test('途中の画面をいきなり開いても、半端な状態で始まらない', async ({ page }) => {
  // 案件は画面が生きている間しか残らないため、読み込み直すと消える（保存は Issue #12）。
  // 半端な画面に落ちず、始まりへ戻されることを確かめる。
  await page.goto('/defects')
  await expect(page).toHaveURL(/\/customer$/)

  await page.goto('/preview')
  await expect(page).toHaveURL(/\/customer$/)
})
