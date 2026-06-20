import { test, expect } from '@playwright/test'
import { dismissCookieBanner } from './helpers'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
  })

  test('loads and shows brand logo', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Svetlana Lampe').first()).toBeVisible()
  })

  test('has lang="sk" at root', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'sk')
  })

  test('header shows SK navigation', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('header nav')
    await expect(nav).toContainText('Vytvorte si lampu')
    await expect(nav).toContainText('Galéria')
  })

  test('cart icon button is visible in header', async ({ page }) => {
    await page.goto('/')
    // Cart icon is now a button that opens the drawer (not a link to /cart)
    const cartBtn = page.locator('button[aria-label^="Cart"]')
    await expect(cartBtn).toBeVisible()
  })

  test('clicking cart icon opens cart drawer', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[aria-label^="Cart"]').click()
    // Drawer opens as a dialog
    await expect(page.getByRole('dialog', { name: /košík|cart/i })).toBeVisible()
  })

  test('footer shows copyright with Svetlana Lampe', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('footer')).toContainText('Svetlana Lampe')
  })

  test('clicking configurator nav link navigates to /configurator', async ({ page }) => {
    await page.goto('/')
    await page.locator('header nav').getByText('Vytvorte si lampu').click()
    await expect(page).toHaveURL('/configurator')
  })

  test('clicking gallery nav link navigates to /gallery', async ({ page }) => {
    await page.goto('/')
    await page.locator('header nav').getByText('Galéria').click()
    await expect(page).toHaveURL('/gallery')
  })
})
