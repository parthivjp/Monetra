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

  await page.getByLabel('Email address').fill('parthiv.panchal.9299@gmail.co')
  await expect(page.getByText('Did you mean gmail.com?')).toBeVisible()
  await page.getByLabel('Email address').fill('invalid-email')
  await page.getByLabel('Password').fill('weak')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Enter a valid email address.')).toBeVisible()
  await expect(page.getByText('Password must be at least 8 characters.')).toBeVisible()
})

test('login remains readable when dark theme preference is saved', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('finance-theme', JSON.stringify('dark')))
  await page.goto('/')

  const styles = await page.evaluate(() => {
    const card = getComputedStyle(document.querySelector('.auth-card'))
    const input = getComputedStyle(document.querySelector('.auth-card input'))
    const label = getComputedStyle(document.querySelector('.auth-card label'))
    return { cardBackground: card.backgroundColor, inputBackground: input.backgroundColor, labelColor: label.color }
  })

  expect(styles.cardBackground).toBe('rgb(252, 251, 248)')
  expect(styles.inputBackground).toBe('rgb(255, 255, 255)')
  expect(styles.labelColor).toBe('rgb(69, 76, 64)')

  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Email address is required.')).toBeVisible()
})

test('signup remains centered, readable, and overflow-free on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByRole('heading', { name: 'Create your account.' })).toBeVisible()
  await expect(page.getByLabel('Full name')).toBeVisible()
  await expect(page.getByLabel('Email address')).toBeVisible()

  const layout = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    cardWidth: document.querySelector('.auth-card')?.getBoundingClientRect().width ?? 0,
  }))
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth)
  expect(layout.cardWidth).toBeLessThanOrEqual(layout.viewportWidth)

  const placeholder = await page.getByLabel('Email address').evaluate((input) =>
    getComputedStyle(input, '::placeholder').color
  )
  expect(placeholder).toBe('rgb(112, 118, 106)')
})
