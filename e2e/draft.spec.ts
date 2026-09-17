import { join } from 'node:path'
import { type Page, expect, test } from '@playwright/test'

const WIDE = join(import.meta.dirname, 'fixtures/exterior-wide.jpg')
const DEFECT_A = join(import.meta.dirname, 'fixtures/defect-a.jpg')

/** 外観の枠は見出し（正面・右・左・裏）で押す。不具合は何枚目かで押す。 */
const EXTERIOR_LABELS = ['正面', '右', '左', '裏']
const takeName = (position: number, label: string) =>
  label === '外観写真' ? `${EXTERIOR_LABELS[position - 1]}を撮る` : `${position}枚目を撮る`

async function shoot(page: Page, position: number, file: string, label: string) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: takeName(position, label) }).click(),
  ])
  await chooser.setFiles(file)
  await expect(page.getByRole('img', { name: `${label} ${position}枚目` })).toBeVisible()
}

test('顧客情報を入れて閉じても、続きから再開できる', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'スタート' }).click()
  await page.getByLabel('顧客名').fill('山田 太郎')
  await page.getByLabel('物件住所').fill('東京都渋谷区 1-2-3')

  await page.reload()

  await expect(page.getByLabel('顧客名')).toHaveValue('山田 太郎')
  await expect(page.getByLabel('物件住所')).toHaveValue('東京都渋谷区 1-2-3')
})

test('撮った写真も残る', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'スタート' }).click()
  await page.getByLabel('顧客名').fill('山田')
  await page.getByRole('button', { name: '次へ' }).click()
  await shoot(page, 1, WIDE, '外観写真')
  await shoot(page, 2, WIDE, '外観写真')

  await page.reload()

  await expect(page.getByRole('img', { name: '外観写真 1枚目' })).toBeVisible()
  await expect(page.getByRole('img', { name: '外観写真 2枚目' })).toBeVisible()
  await expect(page.getByText('2 / 4 枚')).toBeVisible()
})

test('ステータスと補足も残る', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'スタート' }).click()
  await page.getByLabel('顧客名').fill('山田')
  await page.getByRole('button', { name: '次へ' }).click()
  for (const position of [1, 2, 3, 4]) await shoot(page, position, WIDE, '外観写真')
  await page.getByRole('button', { name: '次へ' }).click()
  await shoot(page, 1, DEFECT_A, '不具合写真')
  await page.getByRole('button', { name: 'A', exact: true }).click()
  await page.getByLabel('1枚目の補足').fill('外壁のひび割れ')

  await page.reload()

  await expect(page.getByRole('button', { name: 'A', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByLabel('1枚目の補足')).toHaveValue('外壁のひび割れ')
})

test('トップに戻ると、続きからと新しく始めるが出る', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'スタート' }).click()
  await page.getByLabel('顧客名').fill('山田 太郎')

  await page.goto('/')

  await expect(page.getByText('作りかけの報告書があります（山田 太郎 様）')).toBeVisible()
  await page.getByRole('button', { name: '続きから' }).click()

  // 顧客名は入っているので、まだ足りない外観の画面から続く
  await expect(page).toHaveURL(/\/exterior$/)
  await expect(page.getByText('0 / 4 枚')).toBeVisible()
})

test('続きからは、まだ足りない画面へ直に戻る', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'スタート' }).click()
  await page.getByLabel('顧客名').fill('山田')
  await page.getByRole('button', { name: '次へ' }).click()
  for (const position of [1, 2, 3, 4]) await shoot(page, position, WIDE, '外観写真')
  await page.getByRole('button', { name: '次へ' }).click()
  await shoot(page, 1, DEFECT_A, '不具合写真')

  // ここまで入っていれば、完成プレビューまで一足で戻れる
  await page.goto('/')
  await page.getByRole('button', { name: '続きから' }).click()

  await expect(page).toHaveURL(/\/preview$/)
})

test('新しく始めるを選ぶと、確かめてから下書きを捨てる', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'スタート' }).click()
  await page.getByLabel('顧客名').fill('山田 太郎')
  await page.goto('/')

  // まず断る。下書きは残ったまま
  page.once('dialog', (dialog) => void dialog.dismiss())
  await page.getByRole('button', { name: '新しく始める' }).click()
  await expect(page.getByText('作りかけの報告書があります（山田 太郎 様）')).toBeVisible()

  // 次は承知する
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: '新しく始める' }).click()

  await expect(page).toHaveURL(/\/customer$/)
  await expect(page.getByLabel('顧客名')).toHaveValue('')
})

test('送り終えると下書きは消える', async ({ page }) => {
  await page.route('**/api/send-report', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, fileName: 'x.pdf', pageCount: 1 }),
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'スタート' }).click()
  await page.getByLabel('顧客名').fill('山田')
  await page.getByRole('button', { name: '次へ' }).click()
  for (const position of [1, 2, 3, 4]) await shoot(page, position, WIDE, '外観写真')
  await page.getByRole('button', { name: '次へ' }).click()
  await shoot(page, 1, DEFECT_A, '不具合写真')
  await page.getByRole('button', { name: '作成完了' }).click()
  await page.getByRole('button', { name: '完了（会社へ送る）' }).click()
  await expect(page.getByRole('heading', { name: '送りました' })).toBeVisible()
  await page.getByRole('button', { name: '最初の画面へ' }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.reload()

  await expect(page.getByRole('button', { name: 'スタート' })).toBeVisible()
  await expect(page.getByRole('button', { name: '続きから' })).toHaveCount(0)
})
