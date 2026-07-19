import { test, expect } from '@playwright/test'
import { seedCart, dismissCookieBanner, MOCK_CART_ITEM } from './helpers'

test.describe('Cart page — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
  })

  test('shows empty message in SK', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.locator('main')).toContainText('Váš košík je prázdny')
  })

  test('shows "continue shopping" link in SK', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.getByRole('link', { name: 'Pokračovať v nákupe' })).toBeVisible()
  })

  test('empty cart EN shows English empty text', async ({ page }) => {
    await page.goto('/en/cart')
    await expect(page.locator('main')).toContainText('Your cart is empty')
  })
})

test.describe('Cart page — with seeded item', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
    await seedCart(page)
  })

  test('shows item title after hydration', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
  })

  test('shows item price (89.00 EUR)', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('main')).toContainText('89.00')
  })

  test('shows cart h1 title', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.locator('h1')).toContainText('Košík', { timeout: 5000 })
  })

  test('remove button is visible per item', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Odstrániť' })).toBeVisible()
  })

  test('clicking remove clears item and shows empty state', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Odstrániť' }).click()
    await expect(page.locator('main')).toContainText('Váš košík je prázdny')
  })

  test('quantity increment updates displayed quantity', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '+' }).click()
    await expect(page.locator('main')).toContainText('178') // 2 × €89
  })

  test('checkout link is present', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('link', { name: 'Pokračovať k platbe' })).toBeVisible()
  })

  test('checkout link navigates to /checkout', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await page.getByRole('link', { name: 'Pokračovať k platbe' }).click()
    await expect(page).toHaveURL('/checkout')
  })

  test('EN cart shows seeded item with English labels', async ({ page }) => {
    await page.goto('/en/cart')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible()
  })
})

test.describe('Cart — multiple items', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
  })

  test('two seeded items both appear', async ({ page }) => {
    await seedCart(page, [
      MOCK_CART_ITEM,
      { ...MOCK_CART_ITEM, id: 'test-product-2', title: 'EVA', unitPrice: 9900 },
    ])
    await page.goto('/kosik')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('EVA')).toBeVisible()
  })
})
