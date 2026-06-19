import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
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

  test('cart icon links to /cart', async ({ page }) => {
    await page.goto('/')
    const cartLink = page.locator('[aria-label="Cart"]')
    await expect(cartLink).toBeVisible()
    await expect(cartLink).toHaveAttribute('href', '/cart')
  })

  test('clicking cart icon navigates to cart page', async ({ page }) => {
    await page.goto('/')
    await page.locator('[aria-label="Cart"]').click()
    await expect(page).toHaveURL('/cart')
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
