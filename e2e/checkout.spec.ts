import { test, expect } from '@playwright/test'
import { seedCart, mockPacketaWidget } from './helpers'

test.describe('Checkout form — SK', () => {
  test.beforeEach(async ({ page }) => {
    // Block Packeta widget script to prevent external dependency
    await page.route('https://widget.packeta.com/**', route => route.abort())
    await seedCart(page)
  })

  test('shows form fields after cart hydration', async ({ page }) => {
    await page.goto('/checkout')
    // Wait for cart to hydrate (CartHydration calls rehydrate in useEffect)
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#phone')).toBeVisible()
  })

  test('SK form labels are in Slovak', async ({ page }) => {
    await page.goto('/checkout')
    await expect(page.locator('label[for="name"]')).toContainText('Meno a priezvisko')
    await expect(page.locator('label[for="email"]')).toContainText('E-mail')
    await expect(page.locator('label[for="phone"]')).toContainText('Telefón')
  })

  test('submit button shows GoPay text', async ({ page }) => {
    await page.goto('/checkout')
    await expect(page.getByRole('button', { name: 'Zaplatiť cez GoPay' })).toBeVisible({ timeout: 5000 })
  })

  test('submitting without Packeta shows error', async ({ page }) => {
    await page.goto('/checkout')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })

    await page.fill('#name', 'Jana Nováková')
    await page.fill('#email', 'jana@example.com')
    await page.fill('#phone', '+421900000000')

    await page.getByRole('button', { name: 'Zaplatiť cez GoPay' }).click()

    await expect(page.locator('form')).toContainText('Please select a Packeta pickup point.')
  })

  test('selecting Packeta point via mocked widget shows point name', async ({ page }) => {
    await page.goto('/checkout')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })

    await mockPacketaWidget(page)

    // Click the Packeta select button
    await page.getByRole('button', { name: /Vybra|Select|select/i }).click()

    // Mock widget calls callback immediately — selected point should appear
    await expect(page.locator('form')).toContainText('Praha 1 - Smíchov', { timeout: 3000 })
  })

  test('full form fill + mocked order creation redirects', async ({ page }) => {
    await page.route('/api/orders', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ gopayUrl: 'https://example.com/payment-redirect', orderId: 'SL-TEST-001' }),
    }))

    await page.goto('/checkout')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })

    await mockPacketaWidget(page)
    await page.getByRole('button', { name: /Vybra|Select/i }).click()
    await expect(page.locator('form')).toContainText('Praha 1 - Smíchov', { timeout: 3000 })

    await page.fill('#name', 'Jana Nováková')
    await page.fill('#email', 'jana@example.com')
    await page.fill('#phone', '+421900000000')

    await page.getByRole('button', { name: 'Zaplatiť cez GoPay' }).click()

    // Should redirect to mock GoPay URL
    await expect(page).toHaveURL('https://example.com/payment-redirect', { timeout: 5000 })
  })
})

test.describe('Checkout form — EN', () => {
  test.beforeEach(async ({ page }) => {
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
  test('success page shows thank-you message in SK', async ({ page }) => {
    await page.goto('/checkout/success?gopayId=TEST-123')
    await expect(page.locator('h1')).toContainText('Ďakujeme')
  })

  test('success page shows order number from query param', async ({ page }) => {
    await page.goto('/checkout/success?gopayId=SL-2026-abc123')
    await expect(page.locator('main')).toContainText('SL-2026-abc123')
  })

  test('EN success page shows English thank-you', async ({ page }) => {
    await page.goto('/en/checkout/success?gopayId=TEST-456')
    await expect(page.locator('h1')).toContainText('Thank')
  })
})
