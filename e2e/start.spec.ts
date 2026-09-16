import { expect, test } from '@playwright/test'

test('スタートを押すと顧客情報の画面が出る', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '現調報告書' })).toBeVisible()

  await page.getByRole('link', { name: 'スタート' }).click()

  await expect(page).toHaveURL(/\/customer$/)
  await expect(page.getByRole('heading', { name: '顧客情報' })).toBeVisible()
})

test('ホーム画面に追加するための情報が配信されている', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')

  expect(res.ok()).toBe(true)
  const manifest = await res.json()
  expect(manifest.name).toBe('現調報告書')
  expect(manifest.start_url).toBe('/')
})
