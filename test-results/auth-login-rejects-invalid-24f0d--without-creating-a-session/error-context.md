# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> login rejects invalid credentials without creating a session
- Location: e2e\auth.spec.js:3:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test('login rejects invalid credentials without creating a session', async ({ page }) => {
> 4  |   await page.goto('/')
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  5  |   await page.getByLabel('Email address').fill('missing-user@ledgerly.app')
  6  |   await page.getByLabel('Password').fill('WrongPassword1!')
  7  |   await page.getByRole('button', { name: 'Sign in' }).click()
  8  | 
  9  |   await expect(page.getByText('Email or password is incorrect.')).toBeVisible()
  10 |   await expect(page.getByText('Welcome back.')).toBeVisible()
  11 |   await expect.poll(() => page.evaluate(() => localStorage.getItem('finance-token'))).toBeNull()
  12 | })
  13 | 
  14 | test('signup opens the empty dashboard and clears on logout', async ({ page }) => {
  15 |   const stamp = Date.now()
  16 |   await page.goto('/')
  17 |   await page.getByRole('button', { name: 'Create account' }).click()
  18 |   await page.getByLabel('Full name').fill(`Test User ${stamp}`)
  19 |   await page.getByLabel('Email address').fill(`new-user-${stamp}@ledgerly.app`)
  20 |   await page.getByLabel('Password').fill('ValidPass123!')
  21 |   await page.getByRole('button', { name: 'Create account' }).click()
  22 | 
  23 |   await expect(page.getByText(/Good morning,/)).toBeVisible()
  24 |   await expect(page.getByText('Monthly overview')).toBeVisible()
  25 |   await expect.poll(() => page.evaluate(() => localStorage.getItem('finance-token'))).not.toBeNull()
  26 | 
  27 |   await page.getByRole('button', { name: 'Log out' }).click()
  28 |   await expect(page.getByText('Welcome back.')).toBeVisible()
  29 | })
  30 | 
  31 | test('signup validates name, email, and password before API submission', async ({ page }) => {
  32 |   await page.goto('/')
  33 |   await page.getByRole('button', { name: 'Create account' }).click()
  34 | 
  35 |   const nameInput = page.getByLabel('Full name')
  36 |   await nameInput.fill('Alex123 Morgan!')
  37 |   await expect(nameInput).toHaveValue('Alex Morgan')
  38 |   await expect(page.getByText('Numbers are not allowed in a name.')).toBeVisible()
  39 | 
  40 |   await page.getByLabel('Email address').fill('parthiv.panchal.9299@gmail.co')
  41 |   await expect(page.getByText('Did you mean gmail.com?')).toBeVisible()
  42 |   await page.getByLabel('Email address').fill('invalid-email')
  43 |   await page.getByLabel('Password').fill('weak')
  44 |   await page.getByRole('button', { name: 'Create account' }).click()
  45 | 
  46 |   await expect(page.getByText('Enter a valid email address.')).toBeVisible()
  47 |   await expect(page.getByText('Password must be at least 8 characters.')).toBeVisible()
  48 | })
  49 | 
  50 | test('login remains readable when dark theme preference is saved', async ({ page }) => {
  51 |   await page.addInitScript(() => localStorage.setItem('finance-theme', JSON.stringify('dark')))
  52 |   await page.goto('/')
  53 | 
  54 |   const styles = await page.evaluate(() => {
  55 |     const card = getComputedStyle(document.querySelector('.auth-card'))
  56 |     const input = getComputedStyle(document.querySelector('.auth-card input'))
  57 |     const label = getComputedStyle(document.querySelector('.auth-card label'))
  58 |     return { cardBackground: card.backgroundColor, inputBackground: input.backgroundColor, labelColor: label.color }
  59 |   })
  60 | 
  61 |   expect(styles.cardBackground).toBe('rgb(252, 251, 248)')
  62 |   expect(styles.inputBackground).toBe('rgb(255, 255, 255)')
  63 |   expect(styles.labelColor).toBe('rgb(69, 76, 64)')
  64 | 
  65 |   await page.getByRole('button', { name: 'Sign in' }).click()
  66 |   await expect(page.getByText('Email address is required.')).toBeVisible()
  67 | })
  68 | 
  69 | test('signup remains centered, readable, and overflow-free on mobile', async ({ page }) => {
  70 |   await page.setViewportSize({ width: 375, height: 812 })
  71 |   await page.goto('/')
  72 |   await page.getByRole('button', { name: 'Create account' }).click()
  73 | 
  74 |   await expect(page.getByRole('heading', { name: 'Create your account.' })).toBeVisible()
  75 |   await expect(page.getByLabel('Full name')).toBeVisible()
  76 |   await expect(page.getByLabel('Email address')).toBeVisible()
  77 | 
  78 |   const layout = await page.evaluate(() => ({
  79 |     documentWidth: document.documentElement.scrollWidth,
  80 |     viewportWidth: document.documentElement.clientWidth,
  81 |     cardWidth: document.querySelector('.auth-card')?.getBoundingClientRect().width ?? 0,
  82 |   }))
  83 |   expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth)
  84 |   expect(layout.cardWidth).toBeLessThanOrEqual(layout.viewportWidth)
  85 | 
  86 |   const placeholder = await page.getByLabel('Email address').evaluate((input) =>
  87 |     getComputedStyle(input, '::placeholder').color
  88 |   )
  89 |   expect(placeholder).toBe('rgb(112, 118, 106)')
  90 | })
  91 | 
```