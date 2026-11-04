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

test('signup opens the empty dashboard and clears on logout', async ({ page }) => {
  const stamp = Date.now()
  await page.goto('/')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByLabel('Full name').fill(`Test User ${stamp}`)
  await page.getByLabel('Email address').fill(`new-user-${stamp}@ledgerly.app`)
  await page.getByLabel('Password').fill('ValidPass123!')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText(/Good morning,/)).toBeVisible()
  await expect(page.getByText('Monthly overview')).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('finance-token'))).not.toBeNull()

  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByText('Welcome back.')).toBeVisible()
})

test('signup validates name, email, and password before API submission', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create account' }).click()

  const nameInput = page.getByLabel('Full name')
  await nameInput.fill('Alex123 Morgan!')
  await expect(nameInput).toHaveValue('Alex Morgan')
  await expect(page.getByText('Numbers are not allowed in a name.')).toBeVisible()

  await page.getByLabel('Email address').fill('invalid-email')
  await page.getByLabel('Password').fill('weak')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Enter a valid email address.')).toBeVisible()
  await expect(page.getByText('Password must be at least 8 characters.')).toBeVisible()
})
