import { expect, test } from '@playwright/test'

test('顧客名を入れるまで次へ進めない', async ({ page }) => {
  await page.goto('/customer')

  const next = page.getByRole('button', { name: '次へ' })
  await expect(next).toBeDisabled()
  await expect(page.getByText('顧客名を入れてください')).toBeVisible()

  await page.getByLabel('顧客名').fill('山田')

  await expect(next).toBeEnabled()
  await expect(page.getByText('顧客名を入れてください')).toBeHidden()

  await next.click()
  await expect(page).toHaveURL(/\/exterior$/)
})

test('物件住所が空でも次へ進める', async ({ page }) => {
  await page.goto('/customer')

  await page.getByLabel('顧客名').fill('山田')
  await expect(page.getByLabel('物件住所')).toHaveValue('')

  await page.getByRole('button', { name: '次へ' }).click()
  await expect(page).toHaveURL(/\/exterior$/)
})

test.describe('調査日', () => {
  // 端末の時計を固定して、期待値を実行時に計算し直さずに確かめる。
  test.use({ timezoneId: 'Asia/Tokyo' })

  test('配信される HTML に日付が焼き付いていない', async ({ request }) => {
    // 組み立てた時点の日付が HTML に入っていると、配置したあと何日経っても
    // その日付が出る。日付は端末の暦から入れるため、配信時点では空であること。
    const html = await (await request.get('/customer')).text()

    expect(html).not.toMatch(/value="20\d\d-\d\d-\d\d"/)
  })

  test('端末の暦での今日が入っている', async ({ page }) => {
    // 日本時間の 2026-03-05 01:00。UTC ではまだ前日の 2026-03-04 16:00。
    await page.clock.install({ time: new Date('2026-03-04T16:00:00Z') })

    await page.goto('/customer')

    await expect(page.getByLabel('調査日')).toHaveValue('2026-03-05')
  })
})

test('担当者名は前回の値が入った状態で開く', async ({ page }) => {
  await page.goto('/customer')
  await page.getByLabel('顧客名').fill('山田')
  await page.getByLabel('担当者名').fill('田中')
  await page.getByRole('button', { name: '次へ' }).click()
  await expect(page).toHaveURL(/\/exterior$/)

  await page.goto('/customer')

  await expect(page.getByLabel('担当者名')).toHaveValue('田中')
  await expect(page.getByLabel('顧客名')).toHaveValue('')
})
