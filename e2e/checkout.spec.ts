import { test, expect, type Page } from '@playwright/test'
import { seedCart, dismissCookieBanner, mockPacketaWidget, blockOrders, fillCheckoutForm, MOCK_CART_ITEM } from './helpers'

// NOTE: every checkout spec blocks POST /api/orders (blockOrders) — the real
// endpoint creates real GoPay payments. Specs that need a response mock it.

const SUBMIT_SK = 'Objednať s povinnosťou platby'
const SUBMIT_EN = 'Order with obligation to pay'

/** Mock POST /api/orders with a fixed response and count the calls. */
async function mockOrders(page: Page, status: number, body: object) {
  const calls: unknown[] = []
  await page.route('**/api/orders', route => {
    calls.push(route.request().postDataJSON())
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  })
  return calls
}

async function pickPoint(page: Page, country = 'cz') {
  await mockPacketaWidget(page, country)
  await page.getByRole('button', { name: /Vybra|Select/i }).click()
}

test.describe('Checkout form — SK', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
    // Block Packeta widget script to prevent external dependency
    await page.route('https://widget.packeta.com/**', route => route.abort())
    await blockOrders(page)
    await seedCart(page)
  })

  test('shows form fields after cart hydration', async ({ page }) => {
    await page.goto('/pokladna')
    // Wait for cart to hydrate (CartHydration calls rehydrate in useEffect)
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#phone')).toBeVisible()
    await expect(page.getByText('LEAH')).toBeVisible()
    await expect(page.getByTestId('cart-skeleton')).toHaveCount(0)
  })

  test('SK form labels are in Slovak', async ({ page }) => {
    await page.goto('/pokladna')
    await expect(page.locator('label[for="name"]')).toContainText('Meno a priezvisko')
    await expect(page.locator('label[for="email"]')).toContainText('E-mail')
    await expect(page.locator('label[for="phone"]')).toContainText('Telefón')
  })

  test('checkout is noindex with a localized title', async ({ page }) => {
    await page.goto('/pokladna')
    await expect(page).toHaveTitle(/Objednávka/)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })

  test('order button says "order with obligation to pay"', async ({ page }) => {
    await page.goto('/pokladna')
    await expect(page.getByRole('button', { name: SUBMIT_SK })).toBeVisible({ timeout: 5000 })
  })

  test('pre-contract information sits directly above the order button', async ({ page }) => {
    await page.goto('/pokladna')
    await expect(page.getByText('LEAH')).toBeVisible({ timeout: 5000 })
    const block = page.getByTestId('precontract')
    await expect(block).toContainText(/89\s€\svrátane DPH/)
    await expect(block).toContainText('Doprava na výdajné miesto zdarma')
    await expect(block).toContainText('výroba 3 – 5 pracovných dní')
    await expect(block).toContainText('doručenie 2 – 5 pracovných dní')
    await expect(block).toContainText('Predávajúci: BenoCode s.r.o., Rázusova 6, 949 01 Nitra, Slovensko')
    await expect(block.getByRole('link', { name: 'obchodnými podmienkami' })).toHaveAttribute('href', '/podmienky/terms-of-service')
    await expect(block.getByRole('link', { name: 'Odstúpenie od zmluvy a reklamácie' })).toHaveAttribute('href', '/podmienky/refund-policy')
    await expect(block.getByRole('link', { name: 'Ochrana osobných údajov' })).toHaveAttribute('href', '/podmienky/privacy-policy')
    // No consent checkbox — placing the order is the agreement.
    await expect(page.locator('main form input[type="checkbox"]')).toHaveCount(0)

    // Directly above: the block is the button's previous sibling.
    const precedingTestId = await page.getByRole('button', { name: SUBMIT_SK })
      .evaluate(btn => btn.previousElementSibling?.getAttribute('data-testid'))
    expect(precedingTestId).toBe('precontract')
  })

  test('submitting without Packeta shows error', async ({ page }) => {
    await page.goto('/pokladna')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })
    await fillCheckoutForm(page)
    await page.getByRole('button', { name: SUBMIT_SK }).click()
    await expect(page.locator('main form')).toContainText('Vyberte prosím výdajné miesto Packeta.')
  })

  test('email without a TLD is rejected before the order is sent', async ({ page }) => {
    const calls = await mockOrders(page, 200, { gopayUrl: 'https://example.com/never' })
    await page.goto('/pokladna')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })
    await pickPoint(page)
    await fillCheckoutForm(page, 'jana@example')
    await page.getByRole('button', { name: SUBMIT_SK }).click()
    await expect(page.locator('#email-error')).toContainText('platnú e-mailovú adresu')
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#email')).toBeFocused()
    expect(calls).toHaveLength(0)
  })

  test('selecting Packeta point via mocked widget shows point name', async ({ page }) => {
    await page.goto('/pokladna')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })
    await pickPoint(page)
    // Mock widget calls callback immediately — selected point should appear
    await expect(page.locator('main form')).toContainText('Praha 1 - Smíchov', { timeout: 3000 })
  })

  test('Packeta widget is limited to the delivery countries and the page language', async ({ page }) => {
    await page.goto('/pokladna')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })
    await pickPoint(page)
    const options = await page.evaluate(() => (window as Window & { __packetaOptions?: unknown }).__packetaOptions)
    expect(options).toEqual({ country: 'sk,cz,at,pl,hu', language: 'sk' })
  })

  test('a pickup point outside the delivery countries is refused', async ({ page }) => {
    await page.goto('/pokladna')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })
    await pickPoint(page, 'de')
    await expect(page.locator('main form')).toContainText('Doručujeme len na výdajné miesta Packeta')
    await expect(page.locator('main form')).not.toContainText('Praha 1 - Smíchov')
  })

  test('full form fill + mocked order creation redirects', async ({ page }) => {
    const calls = await mockOrders(page, 200, { gopayUrl: 'https://example.com/payment-redirect', orderId: 'SL-TEST-001' })
    await page.route('https://example.com/**', route => route.fulfill({ status: 200, body: 'ok' }))

    await page.goto('/pokladna')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })
    await pickPoint(page)
    await expect(page.locator('main form')).toContainText('Praha 1 - Smíchov', { timeout: 3000 })
    await fillCheckoutForm(page)
    await page.getByRole('button', { name: SUBMIT_SK }).click()

    // Should redirect to mock GoPay URL
    await expect(page).toHaveURL('https://example.com/payment-redirect', { timeout: 5000 })
    expect(calls[0]).toMatchObject({
      currency: 'EUR',
      totalAmount: 8900,
      locale: 'sk',
      customer: { email: 'jana@example.com' },
      shipping: { packetaPointId: 12345, packetaPointCountry: 'CZ' },
    })
  })
})

test.describe('Checkout — order endpoint errors (mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
    await page.route('https://widget.packeta.com/**', route => route.abort())
    await blockOrders(page)
  })

  async function submit(page: Page) {
    await page.goto('/pokladna')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })
    await pickPoint(page)
    await fillCheckoutForm(page)
    await page.getByRole('button', { name: SUBMIT_SK }).click()
  }

  test('409 price_changed re-prices the cart and shows the server total', async ({ page }) => {
    let repriced = 0
    await seedCart(page, [MOCK_CART_ITEM], item => {
      repriced++
      // First answer = on-load price; later answers = the new price
      return { price: { EUR: repriced > 1 ? 9900 : item.unitPrice }, title: item.title, valid: true }
    })
    await mockOrders(page, 409, { error: 'price_changed', totalAmount: 8910, discount: { code: 'JESEN10', percent: 10 } })
    await submit(page)
    const alert = page.locator('main form').getByRole('alert')
    await expect(alert).toContainText('Ceny sa medzičasom aktualizovali')
    await expect(alert).toContainText(/Nová suma: 89,10\s€/)
    // The server's discount is applied and the line shows the refreshed price
    await expect(page.locator('main form')).toContainText('JESEN10')
    await expect(page.getByTestId('precontract')).toContainText(/89,10\s€/)
  })

  test('409 with a failed re-price shows a distinct retry message', async ({ page }) => {
    await seedCart(page)
    await mockOrders(page, 409, { error: 'price_changed', totalAmount: 9900, discount: null })
    await page.goto('/pokladna')
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 })
    // Re-price endpoint fails from now on
    await page.route('**/api/cart/price', route => route.fulfill({ status: 500, body: '{}' }))
    await pickPoint(page)
    await fillCheckoutForm(page)
    await page.getByRole('button', { name: SUBMIT_SK }).click()
    await expect(page.locator('main form').getByRole('alert')).toContainText('Ceny sa nepodarilo aktualizovať')
  })

  test('product_unavailable marks the line and blocks the order', async ({ page }) => {
    await seedCart(page)
    await mockOrders(page, 400, { error: 'product_unavailable', productIds: [MOCK_CART_ITEM.productId] })
    await submit(page)
    await expect(page.locator('main form')).toContainText('Tento produkt už nie je dostupný.')
    await expect(page.getByRole('button', { name: SUBMIT_SK })).toBeDisabled()
    await expect(page.locator('main form').getByRole('link', { name: 'Prejsť do košíka' })).toHaveAttribute('href', '/kosik')
  })

  test('invalid_email from the server marks the email field', async ({ page }) => {
    await seedCart(page)
    await mockOrders(page, 400, { error: 'invalid_email' })
    await submit(page)
    await expect(page.locator('#email-error')).toBeVisible()
    await expect(page.locator('#email')).toBeFocused()
  })

  test('pickup_country_not_supported clears the point', async ({ page }) => {
    await seedCart(page)
    await mockOrders(page, 400, { error: 'pickup_country_not_supported' })
    await submit(page)
    await expect(page.locator('main form')).toContainText('Doručujeme len na výdajné miesta Packeta')
    await expect(page.locator('main form')).not.toContainText('Praha 1 - Smíchov')
  })

  test('discount_invalid removes the discount', async ({ page }) => {
    await seedCart(page, [MOCK_CART_ITEM], undefined, { discount: { code: 'STARY', percent: 10 } })
    await mockOrders(page, 400, { error: 'discount_invalid' })
    await page.goto('/pokladna')
    await expect(page.locator('main form')).toContainText('STARY', { timeout: 5000 })
    await pickPoint(page)
    await fillCheckoutForm(page)
    await page.getByRole('button', { name: SUBMIT_SK }).click()
    await expect(page.locator('main form').getByRole('alert')).toContainText('zľavový kód už nie je platný')
    await expect(page.locator('main form')).not.toContainText('STARY')
  })

  test('429 shows a rate-limit message', async ({ page }) => {
    await seedCart(page)
    await mockOrders(page, 429, { error: 'Too many requests' })
    await submit(page)
    await expect(page.locator('main form').getByRole('alert')).toContainText('Príliš veľa pokusov')
  })

  test('502 shows a gateway message', async ({ page }) => {
    await seedCart(page)
    await mockOrders(page, 502, { error: 'payment_gateway_unavailable' })
    await submit(page)
    await expect(page.locator('main form').getByRole('alert')).toContainText('Platobná brána je dočasne nedostupná')
  })
})

test.describe('Checkout form — EN', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page)
    await page.route('https://widget.packeta.com/**', route => route.abort())
    await blockOrders(page)
    await seedCart(page)
  })

  test('EN checkout shows English labels', async ({ page }) => {
    await page.goto('/en/checkout')
    await expect(page.locator('h1')).toContainText('Order')
    await expect(page.locator('label[for="name"]')).toContainText('Full name', { timeout: 5000 })
    await expect(page.locator('label[for="email"]')).toContainText('Email')
    await expect(page.locator('label[for="phone"]')).toContainText('Phone')
  })

  test('EN order button and pre-contract block', async ({ page }) => {
    await page.goto('/en/checkout')
    await expect(page.getByRole('button', { name: SUBMIT_EN })).toBeVisible({ timeout: 5000 })
    const block = page.getByTestId('precontract')
    await expect(block).toContainText('incl. VAT')
    await expect(block).toContainText('Seller: BenoCode s.r.o., Rázusova 6, 949 01 Nitra, Slovakia')
    await expect(block.getByRole('link', { name: 'Refund Policy' })).toHaveAttribute('href', '/en/policies/refund-policy')
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
