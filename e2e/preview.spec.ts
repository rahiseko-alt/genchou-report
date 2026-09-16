import { join } from 'node:path'
import { type Page, expect, test } from '@playwright/test'

const WIDE = join(import.meta.dirname, 'fixtures/exterior-wide.jpg')
const DEFECT_A = join(import.meta.dirname, 'fixtures/defect-a.jpg')

async function shoot(page: Page, position: number, file: string, label: string) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: `${position}枚目を撮る` }).click(),
  ])
  await chooser.setFiles(file)
  await expect(page.getByRole('img', { name: `${label} ${position}枚目` })).toBeVisible()
}

/** 顧客情報・外観4枚・不具合を指定枚数入れて、完成プレビューまで進む。 */
async function openPreview(page: Page, defectCount: number) {
  await page.goto('/customer')
  await page.getByLabel('顧客名').fill('山田 太郎')
  await page.getByLabel('物件住所').fill('東京都渋谷区 1-2-3')
  await page.getByLabel('担当者名').fill('鈴木')
  await page.getByRole('button', { name: '次へ' }).click()

  for (const position of [1, 2, 3, 4]) await shoot(page, position, WIDE, '外観写真')
  await page.getByRole('button', { name: '次へ' }).click()
  await expect(page).toHaveURL(/\/defects$/)

  for (let i = 0; i < defectCount; i += 1) {
    const position = (i % 4) + 1
    if (i > 0 && position === 1) await page.getByRole('button', { name: 'ページ追加' }).click()
    await shoot(page, position, DEFECT_A, '不具合写真')
  }

  await page.getByRole('button', { name: '作成完了' }).click()
  await expect(page).toHaveURL(/\/preview$/)
}

test('不具合4枚なら用紙1枚が出る', async ({ page }) => {
  await openPreview(page, 4)

  await expect(page.getByRole('region', { name: /報告書 \d+ページ目/ })).toHaveCount(1)
  await expect(page.getByText('全 1 ページ')).toBeVisible()
})

test('不具合5枚なら用紙2枚が出る', async ({ page }) => {
  await openPreview(page, 5)

  await expect(page.getByRole('region', { name: /報告書 \d+ページ目/ })).toHaveCount(2)
  await expect(page.getByText('全 2 ページ')).toBeVisible()
})

test('1枚目に顧客情報と外観4枚と不具合4枚が並ぶ', async ({ page }) => {
  await openPreview(page, 5)

  const first = page.getByRole('region', { name: '報告書 1ページ目' })
  await expect(first.getByText('山田 太郎')).toBeVisible()
  await expect(first.getByText('東京都渋谷区 1-2-3')).toBeVisible()
  await expect(first.getByText('鈴木')).toBeVisible()
  await expect(first.getByRole('img', { name: /外観写真/ })).toHaveCount(4)
  await expect(first.getByRole('img', { name: /不具合写真/ })).toHaveCount(4)
})

test('2枚目に顧客情報と外観は出ない', async ({ page }) => {
  await openPreview(page, 5)

  const second = page.getByRole('region', { name: '報告書 2ページ目' })
  await expect(second.getByRole('img', { name: /外観写真/ })).toHaveCount(0)
  await expect(second.getByRole('img', { name: /不具合写真/ })).toHaveCount(1)
  await expect(second.getByText('山田 太郎')).toHaveCount(0)
})

test('ステータスと補足が写真の下に並ぶ', async ({ page }) => {
  await page.goto('/customer')
  await page.getByLabel('顧客名').fill('山田')
  await page.getByRole('button', { name: '次へ' }).click()
  for (const position of [1, 2, 3, 4]) await shoot(page, position, WIDE, '外観写真')
  await page.getByRole('button', { name: '次へ' }).click()

  await shoot(page, 1, DEFECT_A, '不具合写真')
  await page.getByRole('button', { name: 'A', exact: true }).click()
  await page.getByRole('button', { name: 'C', exact: true }).click()
  await page.getByLabel('1枚目の補足').fill('外壁のひび割れ')
  await page.getByRole('button', { name: '作成完了' }).click()

  const sheet = page.getByRole('region', { name: '報告書 1ページ目' })
  await expect(sheet.getByText('A　C')).toBeVisible()
  await expect(sheet.getByText('外壁のひび割れ')).toBeVisible()
})

test('不具合が無いまま完成プレビューへ来たら、不具合の画面へ戻される', async ({ page }) => {
  await page.goto('/customer')
  await page.getByLabel('顧客名').fill('山田')
  await page.getByRole('button', { name: '次へ' }).click()
  for (const position of [1, 2, 3, 4]) await shoot(page, position, WIDE, '外観写真')
  await page.getByRole('button', { name: '次へ' }).click()
  await expect(page).toHaveURL(/\/defects$/)

  // 不具合を1枚も入れずにプレビューへ進もうとする
  await page.evaluate(() => window.history.pushState({}, '', '/preview'))
  await page.goto('/preview')

  await expect(page).toHaveURL(/\/customer$/)
})
