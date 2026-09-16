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

async function openPreview(page: Page) {
  await page.goto('/customer')
  await page.getByLabel('顧客名').fill('山田 太郎')
  await page.getByRole('button', { name: '次へ' }).click()
  for (const position of [1, 2, 3, 4]) await shoot(page, position, WIDE, '外観写真')
  await page.getByRole('button', { name: '次へ' }).click()
  await shoot(page, 1, DEFECT_A, '不具合写真')
  await page.getByRole('button', { name: '作成完了' }).click()
  await expect(page).toHaveURL(/\/preview$/)
}

/** サーバーへ実際には出さず、送ろうとした中身だけを覚える。 */
async function interceptSend(page: Page, respond: { status: number; body: unknown }) {
  const calls: unknown[] = []
  await page.route('**/api/send-report', async (route) => {
    calls.push(JSON.parse(route.request().postData() ?? 'null'))
    await route.fulfill({
      status: respond.status,
      contentType: 'application/json',
      body: JSON.stringify(respond.body),
    })
  })
  return calls
}

test('完了を押すと報告書が送られ、送れたことが分かる', async ({ page }) => {
  const calls = await interceptSend(page, {
    status: 200,
    body: { ok: true, fileName: '20260916_山田 太郎_現調報告書.pdf', pageCount: 1 },
  })
  await openPreview(page)

  await page.getByRole('button', { name: '完了（会社へ送る）' }).click()

  await expect(page.getByRole('heading', { name: '送りました' })).toBeVisible()
  expect(calls).toHaveLength(1)
})

test('送るときに顧客情報と写真が一緒に運ばれる', async ({ page }) => {
  const calls = await interceptSend(page, {
    status: 200,
    body: { ok: true, fileName: 'x.pdf', pageCount: 1 },
  })
  await openPreview(page)

  await page.getByRole('button', { name: '完了（会社へ送る）' }).click()
  await expect(page.getByRole('heading', { name: '送りました' })).toBeVisible()

  const body = calls[0] as {
    customer: { customerName: string }
    exteriorFrames: unknown[]
    defectPages: unknown[][]
  }
  expect(body.customer.customerName).toBe('山田 太郎')
  expect(body.exteriorFrames.filter(Boolean)).toHaveLength(4)
  expect(body.defectPages.flat().filter(Boolean)).toHaveLength(1)
})

test('送っている間は二重に押せない', async ({ page }) => {
  await page.route('**/api/send-report', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, fileName: 'x.pdf', pageCount: 1 }),
    })
  })
  await openPreview(page)

  const send = page.getByRole('button', { name: '完了（会社へ送る）' })
  await send.click()

  await expect(page.getByRole('button', { name: '送っています…' })).toBeDisabled()
})

test('送れなかったときは再送とあとで送るが出る', async ({ page }) => {
  await interceptSend(page, { status: 502, body: { ok: false, reason: 'mailFailed' } })
  await openPreview(page)

  await page.getByRole('button', { name: '完了（会社へ送る）' }).click()

  await expect(page.getByRole('button', { name: '再送する' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'あとで送る' })).toBeVisible()
  await expect(page.getByText('送れませんでした。もう一度お試しください')).toBeVisible()
})

test('再送で成功したら、送れたことが分かる', async ({ page }) => {
  let attempt = 0
  await page.route('**/api/send-report', async (route) => {
    attempt += 1
    const ok = attempt > 1
    await route.fulfill({
      status: ok ? 200 : 502,
      contentType: 'application/json',
      body: JSON.stringify(ok ? { ok: true, fileName: 'x.pdf', pageCount: 1 } : { ok: false }),
    })
  })
  await openPreview(page)

  await page.getByRole('button', { name: '完了（会社へ送る）' }).click()
  await page.getByRole('button', { name: '再送する' }).click()

  await expect(page.getByRole('heading', { name: '送りました' })).toBeVisible()
  expect(attempt).toBe(2)
})

test('あとで送るを選ぶと、入力を残したまま不具合の画面へ戻る', async ({ page }) => {
  await interceptSend(page, { status: 502, body: { ok: false } })
  await openPreview(page)

  await page.getByRole('button', { name: '完了（会社へ送る）' }).click()
  await page.getByRole('button', { name: 'あとで送る' }).click()

  await expect(page).toHaveURL(/\/defects$/)
  await expect(page.getByRole('img', { name: '不具合写真 1枚目' })).toBeVisible()
})

test('送り先が設定されていなければ、その旨が出る', async ({ page }) => {
  await interceptSend(page, { status: 503, body: { ok: false, reason: 'notConfigured' } })
  await openPreview(page)

  await page.getByRole('button', { name: '完了（会社へ送る）' }).click()

  await expect(page.getByText('送り先がまだ設定されていません。管理者に連絡してください')).toBeVisible()
})

test('送り終えたあと最初の画面へ戻ると、案件は残っていない', async ({ page }) => {
  await interceptSend(page, { status: 200, body: { ok: true, fileName: 'x.pdf', pageCount: 1 } })
  await openPreview(page)

  await page.getByRole('button', { name: '完了（会社へ送る）' }).click()
  await page.getByRole('button', { name: '最初の画面へ' }).click()

  await expect(page).toHaveURL(/\/$/)
  // 前の案件は消えているので、顧客情報は空から始まる
  await page.getByRole('link', { name: 'スタート' }).click()
  await expect(page.getByLabel('顧客名')).toHaveValue('')
})
