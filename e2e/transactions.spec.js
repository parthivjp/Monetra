import { test, expect } from '@playwright/test'

test('create, read back, reload, and delete a transaction through MongoDB', async ({ page }) => {
  const note = `Playwright rent ${Date.now()}`
  await page.goto('/')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByLabel('Full name').fill('Transaction User')
  await page.getByLabel('Email address').fill(`transaction-${Date.now()}@ledgerly.app`)
  await page.getByLabel('Password').fill('ValidPass123!')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText(/Good morning,/)).toBeVisible()

  await page.getByRole('button', { name: 'Add transaction' }).first().click()
  await page.getByLabel('Amount').fill('12345')
  await page.getByLabel('Category').selectOption('Housing')
  await page.getByLabel('Note').fill(note)
  await page.getByRole('button', { name: 'Add transaction' }).last().click()
  await expect(page.getByText('Transaction added')).toBeVisible()

  await page.getByRole('button', { name: 'Transactions' }).click()
  await page.getByPlaceholder('Search transactions').fill(note)
  await expect(page.getByText(note)).toBeVisible()

  await page.reload()
  await expect(page.getByText(/Good morning,/)).toBeVisible()
  await page.getByRole('button', { name: 'Transactions' }).click()
  await page.getByPlaceholder('Search transactions').fill(note)
  await expect(page.getByText(note)).toBeVisible()

  await page.getByRole('button', { name: `Delete ${note}` }).click()
  await expect(page.getByText('Transaction deleted')).toBeVisible()
  await expect(page.getByText(note)).not.toBeVisible()
})
