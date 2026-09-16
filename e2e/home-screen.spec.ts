import { expect, test } from '@playwright/test'

test('ホーム画面に追加するための情報とアイコンが配信されている', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBe(true)

  const manifest = await res.json()
  expect(manifest.name).toBe('現調報告書')

  for (const icon of manifest.icons) {
    const image = await request.get(icon.src)
    expect(image.ok(), `${icon.src} が配信されていない`).toBe(true)
  }
})

test('iPhone のホーム画面用のアイコンが配信されている', async ({ page, request }) => {
  await page.goto('/')

  const href = await page.locator('link[rel="apple-touch-icon"]').first().getAttribute('href')
  expect(href).toBeTruthy()

  const image = await request.get(href!)
  expect(image.ok()).toBe(true)
})
