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

  test('empty cart still has the page heading', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.locator('main')).toContainText('Váš košík je prázdny')
    await expect(page.locator('h1')).toContainText('Košík')
  })

  test('empty cart EN shows English empty text', async ({ page }) => {
    await page.goto('/en/cart')
    await expect(page.locator('main')).toContainText('Your cart is empty')
  })

  test('cart page is noindex with a localized title', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page).toHaveTitle(/Košík/)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })
})

test.describe('Cart page — server render (before the cart hydrates)', () => {
  // Without JS the page stays exactly as server-rendered: the persisted cart is
  // never restored, so this is what every visitor sees before hydration.
  test.use({ javaScriptEnabled: false })

  test('renders a skeleton, not the empty state', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.getByTestId('cart-skeleton')).toBeVisible()
    await expect(page.locator('main')).not.toContainText('Váš košík je prázdny', { useInnerText: true })
    await expect(page.locator('h1')).toContainText('Košík')
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
    await expect(page.getByTestId('cart-skeleton')).toHaveCount(0)
  })

  test('shows item price (89 €) and the total incl. VAT', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('main')).toContainText(/89\s€/)
    await expect(page.locator('main')).toContainText(/89\s€\svrátane DPH/)
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
    await page.getByRole('button', { name: 'Zvýšiť počet: LEAH' }).click()
    await expect(page.getByRole('spinbutton', { name: 'Počet kusov: LEAH' })).toHaveValue('2')
    await expect(page.locator('main')).toContainText(/178\s€/) // 2 × €89
  })

  test('checkout link is present', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('link', { name: 'Pokračovať k objednávke' })).toBeVisible()
  })

  test('checkout link navigates to the checkout', async ({ page }) => {
    await page.goto('/kosik')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await page.getByRole('link', { name: 'Pokračovať k objednávke' }).click()
    await expect(page).toHaveURL('/pokladna')
  })

  test('EN cart shows seeded item with English labels', async ({ page }) => {
    await page.goto('/en/cart')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible()
    await expect(page.locator('main')).toContainText('incl. VAT')
  })
})

test.describe('Cart page — display currency', () => {
  test('CZK shows an approximate amount with the binding EUR price under it', async ({ page }) => {
    await dismissCookieBanner(page)
    await page.addInitScript(() => {
      localStorage.setItem('svetlana-currency', JSON.stringify({ state: { currency: 'CZK' }, version: 0 }))
    })
    await seedCart(page, [MOCK_CART_ITEM], item => ({
      price: { EUR: item.unitPrice, CZK: 217900, PLN: 38999, HUF: 3269000 },
      title: item.title,
      valid: true,
    }))
    await page.goto('/cs/kosik')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('main')).toContainText(/≈\s2\s179\sKč/)
    await expect(page.locator('main')).toContainText(/89\s€\svč\. DPH/)
  })
})

test.describe('Cart page — lines the server rejects', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
  })

  test('unavailable product is marked and blocks checkout until removed', async ({ page }) => {
    await seedCart(page, [MOCK_CART_ITEM], () => ({ price: null, title: null, valid: true }))
    await page.goto('/kosik')
    await expect(page.locator('main')).toContainText('Tento produkt už nie je dostupný.', { timeout: 5000 })
    await expect(page.getByRole('link', { name: 'Pokračovať k objednávke' })).toHaveCount(0)
    await expect(page.locator('main').getByRole('alert')).toContainText('odstráňte prosím nedostupné položky')
    await page.getByRole('button', { name: 'Odstrániť' }).click()
    await expect(page.locator('main')).toContainText('Váš košík je prázdny')
  })

  test('invalid configuration is marked', async ({ page }) => {
    await seedCart(page, [MOCK_CART_ITEM], item => ({ price: { EUR: item.unitPrice }, title: item.title, valid: false }))
    await page.goto('/kosik')
    await expect(page.locator('main')).toContainText('Táto konfigurácia už nie je dostupná', { timeout: 5000 })
    await expect(page.getByRole('link', { name: 'Pokračovať k objednávke' })).toHaveCount(0)
  })

  test('server-refreshed title replaces the stored one', async ({ page }) => {
    await seedCart(page, [MOCK_CART_ITEM], item => ({ price: { EUR: item.unitPrice }, title: 'Svetlana Lampa', valid: true }))
    await page.goto('/kosik')
    await expect(page.getByText('Svetlana Lampa')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Cart — multiple items', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
  })

  test('two seeded items both appear', async ({ page }) => {
    await seedCart(page, [
      MOCK_CART_ITEM,
      { ...MOCK_CART_ITEM, id: 'test-product-2', productId: 'test-product-2', title: 'EVA', unitPrice: 9900 },
    ])
    await page.goto('/kosik')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('EVA')).toBeVisible()
  })
})

test.describe('Cart drawer', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
  })

  test('heading counts units like the header badge', async ({ page }) => {
    await seedCart(page, [{ ...MOCK_CART_ITEM, quantity: 2 }])
    await page.goto('/')
    await page.getByRole('button', { name: 'Košík (2)' }).click()
    const drawer = page.getByRole('dialog', { name: 'Košík' })
    await expect(drawer.getByRole('heading')).toHaveText('Košík (2)')
    await expect(drawer.getByRole('button', { name: 'Zavrieť' })).toBeVisible()
    await expect(drawer).toContainText(/178\s€\svrátane DPH/)
  })

  test('empty drawer offers a way to the configurator', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^Košík/ }).click()
    const drawer = page.getByRole('dialog', { name: 'Košík' })
    await expect(drawer).toContainText('Váš košík je prázdny.')
    await expect(drawer.getByRole('link', { name: 'Navrhnite si lampu' })).toHaveAttribute('href', '/konfigurator')
  })
})
