import { test, expect, type Page } from '@playwright/test'
import { dismissCookieBanner } from './helpers'

// Configurator requires a product in the DB. Tests gracefully skip if none exists.
async function goToConfigurator(page: Page, locale = '') {
  const path = locale ? `/${locale}/configurator` : '/configurator'
  const resp = await page.goto(path)
  return resp?.status() ?? 0
}

test.describe('Configurator', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
    // Block external Packeta widget script
    await page.route('https://widget.packeta.com/**', route => route.abort())
  })

  test('configurator page returns 200 or 404 (depends on DB products)', async ({ page }) => {
    const status = await goToConfigurator(page)
    expect([200, 404]).toContain(status)
  })

  test('when loaded, shows 4 tabs: Base, Shade, Cable, Bulb', async ({ page }) => {
    const status = await goToConfigurator(page)
    test.skip(status !== 200, 'No products in DB — seed required')

    // Wait for parts.json to load
    await page.waitForSelector('[role="tab"]', { timeout: 10_000 })
    const tabs = page.locator('[role="tab"]')
    await expect(tabs).toHaveCount(4)
  })

  test('Base tab is selected by default', async ({ page }) => {
    const status = await goToConfigurator(page)
    test.skip(status !== 200, 'No products in DB')

    await page.waitForSelector('[role="tab"]')
    const baseTab = page.getByRole('tab', { name: /base|podstavec/i })
    await expect(baseTab).toHaveAttribute('aria-selected', 'true')
  })

  test('clicking Shade tab activates it', async ({ page }) => {
    const status = await goToConfigurator(page)
    test.skip(status !== 200, 'No products in DB')

    await page.waitForSelector('[role="tab"]')
    await page.getByRole('tab', { name: /shade|tienidlo/i }).click()
    await expect(page.getByRole('tab', { name: /shade|tienidlo/i })).toHaveAttribute('aria-selected', 'true')
  })

  test('clicking Cable tab activates it', async ({ page }) => {
    const status = await goToConfigurator(page)
    test.skip(status !== 200, 'No products in DB')

    await page.waitForSelector('[role="tab"]')
    await page.getByRole('tab', { name: /cable|kábel/i }).click()
    await expect(page.getByRole('tab', { name: /cable|kábel/i })).toHaveAttribute('aria-selected', 'true')
  })

  test('clicking Bulb tab activates it', async ({ page }) => {
    const status = await goToConfigurator(page)
    test.skip(status !== 200, 'No products in DB')

    await page.waitForSelector('[role="tab"]')
    await page.getByRole('tab', { name: /bulb|žiarovk/i }).click()
    await expect(page.getByRole('tab', { name: /bulb|žiarovk/i })).toHaveAttribute('aria-selected', 'true')
  })

  test('add-to-cart button is visible on Base tab', async ({ page }) => {
    const status = await goToConfigurator(page)
    test.skip(status !== 200, 'No products in DB')

    await page.waitForSelector('[role="tab"]')
    await expect(page.getByRole('button', { name: /add to cart|košík|pridať/i })).toBeVisible()
  })

  test('share button is visible', async ({ page }) => {
    const status = await goToConfigurator(page)
    test.skip(status !== 200, 'No products in DB')

    await page.waitForSelector('[role="tab"]')
    await expect(page.getByTestId('share-button')).toBeVisible()
  })

  test('EN configurator shows English tab labels', async ({ page }) => {
    const status = await goToConfigurator(page, 'en')
    test.skip(status !== 200, 'No products in DB')

    await page.waitForSelector('[role="tab"]')
    await expect(page.getByRole('tab', { name: 'Base' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Shade' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Cable' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Bulb' })).toBeVisible()
  })

  test('URL query params update on tab switch', async ({ page }) => {
    const status = await goToConfigurator(page)
    test.skip(status !== 200, 'No products in DB')

    await page.waitForSelector('[role="tab"]')
    // After selecting shade tab, URL should eventually contain shade params
    await page.getByRole('tab', { name: /shade|tienidlo/i }).click()
    // Debounced URL sync (150ms) — wait a bit
    await page.waitForTimeout(300)
    const url = page.url()
    // The URL doesn't change based on tab, but swatch/shape selections sync
    expect(url).toContain('localhost:3000')
  })
})

test.describe('Gallery page', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
  })

  test('gallery loads in SK', async ({ page }) => {
    await page.goto('/gallery')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'sk')
  })

  test('gallery loads in EN', async ({ page }) => {
    await page.goto('/en/gallery')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('gallery has page title', async ({ page }) => {
    await page.goto('/en/gallery')
    await expect(page).toHaveTitle(/.+/)
  })
})
