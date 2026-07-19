import { test, expect } from '@playwright/test'
import { seedCart, dismissCookieBanner, mockPacketaWidget } from './helpers'

test.describe('Checkout form — SK', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
    // Block Packeta widget script to prevent external dependency
    await page.route('https://widget.packeta.com/**', route => route.abort())
    await seedCart(page)
  })

  test('shows form fields after cart hydration', async ({ page }) => {
    await page.goto('/pokladna')
    // Wait for cart to hydrate (CartHydration calls rehydrate in useEffect)
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#phone')).toBeVisible()
  })

  test('SK form labels are in Slovak', async ({ page }) => {
    await page.goto('/pokladna')
    await expect(page.locator('label[for="name"]')).toContainText('Meno a priezvisko')
    await expect(page.locator('label[for="email"]')).toContainText('E-mail')
    await expect(page.locator('label[for="phone"]')).toContainText('Telefón')
  })

  test('submit button shows GoPay text', async ({ page }) => {
    await page.goto('/pokladna')
    await expect(page.getByRole('button', { name: 'Zaplatiť cez GoPay' })).toBeVisible({ timeout: 5000 })
  })

  test('submitting without Packeta shows error', async ({ page }) => {
    await page.goto('/pokladna')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })

    await page.fill('#name', 'Jana Nováková')
    await page.fill('#email', 'jana@example.com')
    await page.fill('#phone', '+421900000000')
    await page.fill('#billing-street', 'Hlavná 1')
    await page.fill('#billing-city', 'Bratislava')
    await page.fill('#billing-zip', '81101')

    await page.getByRole('button', { name: 'Zaplatiť cez GoPay' }).click()

    await expect(page.locator('main form')).toContainText('Please select a Packeta pickup point.')
  })

  test('selecting Packeta point via mocked widget shows point name', async ({ page }) => {
    await page.goto('/pokladna')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })

    await mockPacketaWidget(page)

    // Click the Packeta select button
    await page.getByRole('button', { name: /Vybra|Select|select/i }).click()

    // Mock widget calls callback immediately — selected point should appear
    await expect(page.locator('main form')).toContainText('Praha 1 - Smíchov', { timeout: 3000 })
  })

  test('full form fill + mocked order creation redirects', async ({ page }) => {
    await page.route('/api/orders', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ gopayUrl: 'https://example.com/payment-redirect', orderId: 'SL-TEST-001' }),
    }))

    await page.goto('/pokladna')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })

    await mockPacketaWidget(page)
    await page.getByRole('button', { name: /Vybra|Select/i }).click()
    await expect(page.locator('main form')).toContainText('Praha 1 - Smíchov', { timeout: 3000 })

    await page.fill('#name', 'Jana Nováková')
    await page.fill('#email', 'jana@example.com')
    await page.fill('#phone', '+421900000000')
    await page.fill('#billing-street', 'Hlavná 1')
    await page.fill('#billing-city', 'Bratislava')
    await page.fill('#billing-zip', '81101')

    await page.getByRole('button', { name: 'Zaplatiť cez GoPay' }).click()

    // Should redirect to mock GoPay URL
    await expect(page).toHaveURL('https://example.com/payment-redirect', { timeout: 5000 })
  })
})

test.describe('Checkout form — EN', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
    await page.route('https://widget.packeta.com/**', route => route.abort())
    await seedCart(page)
  })

  test('EN checkout shows English labels', async ({ page }) => {
    await page.goto('/en/checkout')
    await expect(page.locator('h1')).toContainText('Order')
    await expect(page.locator('label[for="name"]')).toContainText('Full name', { timeout: 5000 })
    await expect(page.locator('label[for="email"]')).toContainText('Email')
    await expect(page.locator('label[for="phone"]')).toContainText('Phone')
  })
})

test.describe('Success page', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
  })

  // The page verifies the payment state with GoPay server-side; an unknown or
  // unverifiable payment id must NOT render the thank-you (or clear the cart).
  test('unverifiable payment shows not-completed message in SK', async ({ page }) => {
    await page.goto('/pokladna/uspech?id=TEST-123')
    await expect(page.locator('h1')).toContainText('Platba nebola dokončená')
    await expect(page.locator('main')).toContainText('Platbu sa nepodarilo overiť')
  })

  test('unverifiable payment links back to checkout', async ({ page }) => {
    await page.goto('/pokladna/uspech?id=TEST-123')
    await expect(page.getByRole('link', { name: 'Späť na pokladňu' })).toHaveAttribute('href', '/pokladna')
  })

  test('EN unverifiable payment shows English message', async ({ page }) => {
    await page.goto('/en/checkout/success?id=TEST-456')
    await expect(page.locator('h1')).toContainText('Payment not completed')
  })
})
