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

test('調査日に今日の日付が入っている', async ({ page }) => {
  await page.goto('/customer')

  const today = new Date().toLocaleDateString('sv-SE')
  await expect(page.getByLabel('調査日')).toHaveValue(today)
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
