import { join } from 'node:path'
import { type Page, expect, test } from '@playwright/test'

const WIDE = join(import.meta.dirname, 'fixtures/exterior-wide.jpg')
const ROTATED = join(import.meta.dirname, 'fixtures/exterior-rotated.jpg')
const DEFECT_A = join(import.meta.dirname, 'fixtures/defect-a.jpg')

async function shoot(page: Page, position: number, file: string, label: string) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: `${position}枚目を撮る` }).click(),
  ])
  await chooser.setFiles(file)
  await expect(page.getByRole('img', { name: `${label} ${position}枚目` })).toBeVisible()
}

/** 顧客情報・外観4枚・不具合を入れて、完成プレビューまで進む。 */
async function openPreview(page: Page, defectCount = 1) {
  await page.goto('/customer')
  await page.getByLabel('顧客名').fill('山田 太郎')
  await page.getByRole('button', { name: '次へ' }).click()
  for (const position of [1, 2, 3, 4]) await shoot(page, position, WIDE, '外観写真')
  await page.getByRole('button', { name: '次へ' }).click()
  for (let i = 0; i < defectCount; i += 1) {
    const position = (i % 4) + 1
    if (i > 0 && position === 1) await page.getByRole('button', { name: 'ページ追加' }).click()
    await shoot(page, position, DEFECT_A, '不具合写真')
  }
  await page.getByRole('button', { name: '作成完了' }).click()
  await expect(page).toHaveURL(/\/preview$/)
}

test('やり直すを押すと、戻れる画面が折りたたみで並ぶ', async ({ page }) => {
  await openPreview(page, 5)

  const toggle = page.getByRole('button', { name: 'やり直す' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('button', { name: /顧客情報/ })).toHaveCount(0)

  await toggle.click()

  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: /顧客情報/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /外観写真/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /不具合写真 1ページ目/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /不具合写真 2ページ目/ })).toBeVisible()
})

test('一覧には、その画面に何が入っているかが添えられる', async ({ page }) => {
  await openPreview(page, 5)
  await page.getByRole('button', { name: 'やり直す' }).click()

  await expect(page.getByRole('button', { name: '顧客情報 山田 太郎' })).toBeVisible()
  await expect(page.getByRole('button', { name: '外観写真 4 枚' })).toBeVisible()
  await expect(page.getByRole('button', { name: '不具合写真 2ページ目 1 枚' })).toBeVisible()
})

test('顧客情報へ戻って直し、一足でプレビューへ戻れる', async ({ page }) => {
  await openPreview(page)
  await page.getByRole('button', { name: 'やり直す' }).click()
  await page.getByRole('button', { name: /顧客情報/ }).click()

  await expect(page).toHaveURL(/\/customer\?from=preview$/)
  await page.getByLabel('顧客名').fill('田中 次郎')

  await page.getByRole('button', { name: 'プレビューへ戻る' }).click()

  await expect(page).toHaveURL(/\/preview$/)
  await expect(page.getByText('田中 次郎')).toBeVisible()
})

test('外観の1枚を差し替えても、他の画面の入力は残る', async ({ page }) => {
  await openPreview(page)
  await page.getByRole('button', { name: 'やり直す' }).click()
  await page.getByRole('button', { name: /外観写真/ }).click()
  await expect(page).toHaveURL(/\/exterior\?from=preview$/)

  await page.getByRole('button', { name: '外観写真 1枚目' }).click()
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: '撮り直す' }).click(),
  ])
  await chooser.setFiles(ROTATED)
  await expect
    .poll(() =>
      page
        .getByRole('img', { name: '外観写真 1枚目' })
        .evaluate((img) => {
          const image = img as HTMLImageElement
          return image.naturalHeight > image.naturalWidth
        }),
    )
    .toBe(true)

  await page.getByRole('button', { name: 'プレビューへ戻る' }).click()

  await expect(page).toHaveURL(/\/preview$/)
  // 顧客情報も不具合もそのまま
  await expect(page.getByText('山田 太郎')).toBeVisible()
  await expect(page.getByRole('img', { name: /不具合写真/ })).toHaveCount(1)
})

test('不具合の2ページ目へ直接戻れる', async ({ page }) => {
  await openPreview(page, 5)
  await page.getByRole('button', { name: 'やり直す' }).click()
  await page.getByRole('button', { name: /不具合写真 2ページ目/ }).click()

  await expect(page).toHaveURL(/\/defects\?page=2&from=preview$/)
  await expect(page.getByText('2 ページ目')).toBeVisible()
  await expect(page.getByRole('img', { name: /不具合写真/ })).toHaveCount(1)

  await page.getByRole('button', { name: 'プレビューへ戻る' }).click()
  await expect(page).toHaveURL(/\/preview$/)
})
