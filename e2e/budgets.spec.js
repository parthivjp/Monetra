import { test, expect } from '@playwright/test'

test('update budgets and profile, then verify persistence after reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Explore with demo account' }).click()
  await expect(page.getByText(/Good morning,/)).toBeVisible()

  await page.getByRole('button', { name: 'Budgets' }).click()
  const housingLimit = page.getByRole('heading', { name: 'Housing' }).locator('..').locator('..').getByRole('spinbutton')
  await housingLimit.fill('23000')
  await page.getByRole('button', { name: 'Save budgets' }).click()
  await expect(page.getByText('Budgets saved')).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Budgets' }).click()
  await expect(page.getByRole('heading', { name: 'Housing' }).locator('..').locator('..').getByRole('spinbutton')).toHaveValue('23000')

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Full name').fill('Playwright Morgan')
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByText('Profile updated')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByLabel('Full name')).toHaveValue('Playwright Morgan')
})
