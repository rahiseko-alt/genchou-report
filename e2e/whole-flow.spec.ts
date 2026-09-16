import { join } from 'node:path'
import { type Page, expect, test } from '@playwright/test'

const WIDE = join(import.meta.dirname, 'fixtures/exterior-wide.jpg')
const ROTATED = join(import.meta.dirname, 'fixtures/exterior-rotated.jpg')
const A = join(import.meta.dirname, 'fixtures/defect-a.jpg')
const B = join(import.meta.dirname, 'fixtures/defect-b.jpg')

async function shoot(page: Page, position: number, file: string, label: string) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: `${position}枚目を撮る` }).click(),
  ])
  await chooser.setFiles(file)
  await expect(page.getByRole('img', { name: `${label} ${position}枚目` })).toBeVisible()
}

/** 送付は本物のサーバーへ出さず、送ろうとした中身だけを覚える。 */
async function interceptSend(page: Page) {
  const calls: SentBody[] = []
  await page.route('**/api/send-report', async (route) => {
    calls.push(JSON.parse(route.request().postData() ?? 'null'))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, fileName: 'x.pdf', pageCount: 2 }),
    })
  })
  return calls
}

type SentBody = {
  customer: { customerName: string; propertyAddress: string; surveyorName: string }
  exteriorFrames: ({ jpeg: string } | null)[]
  defectPages: ({ photo: { jpeg: string }; statuses: string[]; note: string } | null)[][]
}

test('スタートから送信完了まで、一本で通る', async ({ page }) => {
  const sent = await interceptSend(page)

  // 1. スタート
  await page.goto('/')
  await page.getByRole('button', { name: 'スタート' }).click()

  // 2. 顧客情報
  await expect(page).toHaveURL(/\/customer$/)
  await page.getByLabel('顧客名').fill('山田 太郎')
  await page.getByLabel('物件住所').fill('東京都渋谷区神宮前 1-2-3')
  await page.getByLabel('担当者名').fill('鈴木 一郎')
  await page.getByRole('button', { name: '次へ' }).click()

  // 3. 外観4枚
  await expect(page).toHaveURL(/\/exterior$/)
  for (const position of [1, 2, 3, 4]) await shoot(page, position, WIDE, '外観写真')
  await page.getByRole('button', { name: '次へ' }).click()

  // 4. 不具合1ページ目（ステータスと補足つき）
  await expect(page).toHaveURL(/\/defects$/)
  for (const position of [1, 2, 3, 4]) await shoot(page, position, position % 2 ? A : B, '不具合写真')
  await page.getByRole('button', { name: 'A', exact: true }).first().click()
  await page.getByLabel('1枚目の補足').fill('外壁のひび割れ、幅2mm')

  // 5. 2ページ目を足して2枚だけ
  await page.getByRole('button', { name: 'ページ追加' }).click()
  await expect(page.getByText('2 ページ目')).toBeVisible()
  for (const position of [1, 2]) await shoot(page, position, A, '不具合写真')

  // 6. 完成プレビュー（用紙2枚）
  await page.getByRole('button', { name: '作成完了' }).click()
  await expect(page).toHaveURL(/\/preview$/)
  await expect(page.getByText('全 2 ページ')).toBeVisible()
  await expect(page.getByRole('region', { name: /報告書 \d+ページ目/ })).toHaveCount(2)

  // 7. 送付
  await page.getByRole('button', { name: '完了（会社へ送る）' }).click()
  await expect(page.getByRole('heading', { name: '送りました' })).toBeVisible()

  // 送った中身が、入れたとおりになっている
  expect(sent).toHaveLength(1)
  const body = sent[0]
  expect(body.customer).toMatchObject({
    customerName: '山田 太郎',
    propertyAddress: '東京都渋谷区神宮前 1-2-3',
    surveyorName: '鈴木 一郎',
  })
  expect(body.exteriorFrames.filter(Boolean)).toHaveLength(4)
  const defects = body.defectPages.flat().filter((frame) => frame !== null)
  expect(defects).toHaveLength(6)
  expect(defects[0].statuses).toEqual(['A'])
  expect(defects[0].note).toBe('外壁のひび割れ、幅2mm')

  // 8. 送り終えると案件は残らない
  await page.getByRole('button', { name: '最初の画面へ' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.reload()
  await expect(page.getByRole('button', { name: 'スタート' })).toBeVisible()
})

test('やり直しで直してから送っても、直した内容が送られる', async ({ page }) => {
  const sent = await interceptSend(page)

  await page.goto('/')
  await page.getByRole('button', { name: 'スタート' }).click()
  await page.getByLabel('顧客名').fill('最初の名前')
  await page.getByRole('button', { name: '次へ' }).click()
  for (const position of [1, 2, 3, 4]) await shoot(page, position, WIDE, '外観写真')
  await page.getByRole('button', { name: '次へ' }).click()
  await shoot(page, 1, A, '不具合写真')
  await page.getByRole('button', { name: '作成完了' }).click()

  // やり直して顧客名を直す
  await page.getByRole('button', { name: 'やり直す' }).click()
  await page.getByRole('button', { name: /顧客情報/ }).click()
  await page.getByLabel('顧客名').fill('直した名前')
  await page.getByRole('button', { name: 'プレビューへ戻る' }).click()
  await expect(page).toHaveURL(/\/preview$/)

  await page.getByRole('button', { name: '完了（会社へ送る）' }).click()
  await expect(page.getByRole('heading', { name: '送りました' })).toBeVisible()

  expect(sent[0].customer.customerName).toBe('直した名前')
})

test('途中で閉じても、続きから最後まで通せる', async ({ page }) => {
  const sent = await interceptSend(page)

  await page.goto('/')
  await page.getByRole('button', { name: 'スタート' }).click()
  await page.getByLabel('顧客名').fill('山田')
  await page.getByRole('button', { name: '次へ' }).click()
  await shoot(page, 1, WIDE, '外観写真')
  await shoot(page, 2, WIDE, '外観写真')

  // ここで閉じる
  await page.reload()

  await expect(page.getByText('2 / 4 枚')).toBeVisible()
  await shoot(page, 3, WIDE, '外観写真')
  await shoot(page, 4, WIDE, '外観写真')
  await page.getByRole('button', { name: '次へ' }).click()
  await shoot(page, 1, A, '不具合写真')
  await page.getByRole('button', { name: '作成完了' }).click()
  await page.getByRole('button', { name: '完了（会社へ送る）' }).click()

  await expect(page.getByRole('heading', { name: '送りました' })).toBeVisible()
  expect(sent[0].customer.customerName).toBe('山田')
})

test('縦位置で撮った写真が、報告書まで横倒しにならない', async ({ page }) => {
  const sent = await interceptSend(page)

  await page.goto('/')
  await page.getByRole('button', { name: 'スタート' }).click()
  await page.getByLabel('顧客名').fill('山田')
  await page.getByRole('button', { name: '次へ' }).click()
  // 1枚目だけ、回転の指示が付いた写真を入れる
  await shoot(page, 1, ROTATED, '外観写真')
  for (const position of [2, 3, 4]) await shoot(page, position, WIDE, '外観写真')
  await page.getByRole('button', { name: '次へ' }).click()
  await shoot(page, 1, A, '不具合写真')
  await page.getByRole('button', { name: '作成完了' }).click()

  // プレビューでも縦長のまま
  const inPreview = await page
    .getByRole('region', { name: '報告書 1ページ目' })
    .getByRole('img', { name: '外観写真 1枚目' })
    .evaluate((img) => {
      const image = img as HTMLImageElement
      return { width: image.naturalWidth, height: image.naturalHeight }
    })
  expect(inPreview.height).toBeGreaterThan(inPreview.width)

  await page.getByRole('button', { name: '完了（会社へ送る）' }).click()
  await expect(page.getByRole('heading', { name: '送りました' })).toBeVisible()

  // サーバーへ渡す寸法も縦長
  const first = sent[0].exteriorFrames[0] as { width: number; height: number } | null
  expect(first).not.toBeNull()
  expect(first!.height).toBeGreaterThan(first!.width)
})
