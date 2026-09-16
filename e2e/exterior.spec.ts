import { join } from 'node:path'
import { type Page, expect, test } from '@playwright/test'

const WIDE = join(import.meta.dirname, 'fixtures/exterior-wide.jpg')
const ROTATED = join(import.meta.dirname, 'fixtures/exterior-rotated.jpg')

async function openExterior(page: Page) {
  await page.goto('/customer')
  await page.getByLabel('顧客名').fill('山田')
  await page.getByRole('button', { name: '次へ' }).click()
  await expect(page).toHaveURL(/\/exterior$/)
}

async function shoot(page: Page, slot: number, file: string) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: `${slot}枚目を撮る` }).click(),
  ])
  await chooser.setFiles(file)
  await expect(page.getByRole('img', { name: `外観写真 ${slot}枚目` })).toBeVisible()
}

test('4枚揃うまで次へ進めない', async ({ page }) => {
  await openExterior(page)

  const next = page.getByRole('button', { name: '次へ' })
  await expect(next).toBeDisabled()

  for (const slot of [1, 2, 3]) {
    await shoot(page, slot, WIDE)
    await expect(next).toBeDisabled()
  }

  await shoot(page, 4, WIDE)
  await expect(next).toBeEnabled()

  await next.click()
  await expect(page).toHaveURL(/\/defects$/)
})

test('枠を押すと背面カメラが立ち上がる', async ({ page }) => {
  await openExterior(page)

  const camera = page.locator('input[type="file"][capture="environment"]').first()
  await expect(camera).toHaveAttribute('accept', 'image/*')
})

test('画像添付からも枠を埋められる', async ({ page }) => {
  await openExterior(page)

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: '1枚目を画像から選ぶ' }).click(),
  ])
  await chooser.setFiles(WIDE)

  await expect(page.getByRole('img', { name: '外観写真 1枚目' })).toBeVisible()
})

test('大きな写真は長辺1600に縮む', async ({ page }) => {
  await openExterior(page)
  await shoot(page, 1, WIDE)

  const size = await page
    .getByRole('img', { name: '外観写真 1枚目' })
    .evaluate((img) => ({
      width: (img as HTMLImageElement).naturalWidth,
      height: (img as HTMLImageElement).naturalHeight,
    }))

  // もとは 3000x2000。長辺が 1600 に収まり、縦横の比は保たれる
  expect(size).toEqual({ width: 1600, height: 1067 })
})

test('縦位置で撮った写真が横倒しにならない', async ({ page }) => {
  await openExterior(page)
  await shoot(page, 1, ROTATED)

  const size = await page
    .getByRole('img', { name: '外観写真 1枚目' })
    .evaluate((img) => ({
      width: (img as HTMLImageElement).naturalWidth,
      height: (img as HTMLImageElement).naturalHeight,
    }))

  // 保存は横長 1200x800 だが、回転の指示は「右に90度」。縦長として現れるのが正しい
  expect(size.height).toBeGreaterThan(size.width)
})

test('入った写真は撮り直しと削除ができる', async ({ page }) => {
  await openExterior(page)
  await shoot(page, 1, WIDE)

  await page.getByRole('button', { name: '外観写真 1枚目' }).click()
  await expect(page.getByRole('button', { name: '撮り直す' })).toBeVisible()
  await expect(page.getByRole('button', { name: '削除する' })).toBeVisible()

  await page.getByRole('button', { name: 'やめる' }).click()
  await expect(page.getByRole('img', { name: '外観写真 1枚目' })).toBeVisible()

  await page.getByRole('button', { name: '外観写真 1枚目' }).click()
  await page.getByRole('button', { name: '削除する' }).click()

  await expect(page.getByRole('img', { name: '外観写真 1枚目' })).toBeHidden()
  await expect(page.getByRole('button', { name: '1枚目を撮る' })).toBeVisible()
})

test('顧客情報を入れずに外観へ来たら、顧客情報へ戻される', async ({ page }) => {
  await page.goto('/exterior')

  await expect(page).toHaveURL(/\/customer$/)
})
