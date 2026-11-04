import { test, expect } from '@playwright/test'

test('login rejects invalid credentials without creating a session', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email address').fill('missing-user@ledgerly.app')
  await page.getByLabel('Password').fill('WrongPassword1!')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByText('Email or password is incorrect.')).toBeVisible()
  await expect(page.getByText('Welcome back.')).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('finance-token'))).toBeNull()
})

test('demo login opens the dashboard and clears on logout', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Explore with demo account' }).click()

  await expect(page.getByText(/Good morning,/)).toBeVisible()
  await expect(page.getByText('Monthly overview')).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('finance-token'))).not.toBeNull()

  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByText('Welcome back.')).toBeVisible()
})
