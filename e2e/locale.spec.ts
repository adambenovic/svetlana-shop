import { test, expect } from '@playwright/test'

const SUPPORTED_LOCALES = [
  { path: '/', lang: 'sk' },
  { path: '/en', lang: 'en' },
  { path: '/de', lang: 'de' },
  { path: '/cs', lang: 'cs' },
  { path: '/pl', lang: 'pl' },
  { path: '/hu', lang: 'hu' },
  { path: '/uk', lang: 'uk' },
]

test.describe('Locale routing — html[lang] attribute', () => {
  for (const { path, lang } of SUPPORTED_LOCALES) {
    test(`${path} sets lang="${lang}"`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('html')).toHaveAttribute('lang', lang)
    })
  }
})

test.describe('Locale — translated content', () => {
  test('EN homepage has English nav', async ({ page }) => {
    await page.goto('/en')
    await expect(page.locator('header nav')).toContainText('Build your lamp')
    await expect(page.locator('header nav')).toContainText('Gallery')
  })

  test('SK nav differs from EN', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header nav')).not.toContainText('Build your lamp')
    await expect(page.locator('header nav')).toContainText('Vytvorte si lampu')
  })

  test('EN /en/cart shows English cart title', async ({ page }) => {
    await page.goto('/en/cart')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    // Empty cart in EN shows "Your cart is empty"
    await expect(page.locator('main')).toContainText('Your cart is empty')
  })

  test('SK /cart shows Slovak cart text', async ({ page }) => {
    await page.goto('/cart')
    await expect(page.locator('main')).toContainText('Váš košík je prázdny')
  })

  test('EN /en/checkout shows English checkout title', async ({ page }) => {
    await page.goto('/en/checkout')
    await expect(page.locator('h1')).toContainText('Order')
  })

  test('SK /checkout shows Slovak checkout title', async ({ page }) => {
    await page.goto('/checkout')
    await expect(page.locator('h1')).toContainText('Objednávka')
  })

  test('EN /en/gallery shows English heading', async ({ page }) => {
    await page.goto('/en/gallery')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('locale-prefixed pages keep consistent lang', async ({ page }) => {
    await page.goto('/de/cart')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  })
})
