import type { Page, Route } from '@playwright/test'

export const MOCK_CART_ITEM = {
  id: 'test-product-1-{"baseColor":"white","base":"round","shadeColor":"coral","shade":"cone","cable":"black","switch":"inline","plug":"eu","bulb":"warm"}',
  productId: 'test-product-1',
  title: 'LEAH',
  configuration: {
    baseColor: 'white',
    base: 'round',
    shadeColor: 'coral',
    shade: 'cone',
    cable: 'black',
    switch: 'inline',
    plug: 'eu',
    bulb: 'warm',
  },
  quantity: 1,
  unitPrice: 8900,
  currency: 'EUR',
}

type MockItem = typeof MOCK_CART_ITEM

/** What POST /api/cart/price answers for a line ({prices,titles,valid} contract). */
export type LineAnswer = { price: Record<string, number> | null; title: string | null; valid: boolean }

/**
 * Seed the Zustand cart store via localStorage before page load, and answer the
 * on-load re-price (POST /api/cart/price) for the seeded lines — the mock
 * products don't exist on the server, which would otherwise flag them as
 * unavailable. Pass `answer` to simulate other server answers.
 * Must be called before page.goto().
 */
export async function seedCart(
  page: Page,
  items: MockItem[] = [MOCK_CART_ITEM],
  answer: (item: MockItem) => LineAnswer = item => ({ price: { EUR: item.unitPrice }, title: item.title, valid: true }),
  /** Other persisted cart state, e.g. { discount: { code, percent } } */
  extraState: Record<string, unknown> = {},
) {
  await page.addInitScript(
    ({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)) },
    { key: 'svetlana-cart', value: { state: { items, ...extraState }, version: 0 } },
  )
  await page.route('**/api/cart/price', async (route: Route) => {
    // Index-aligned with the request, which lists the cart lines in order.
    const body = route.request().postDataJSON() as { items: unknown[] }
    const lines = body.items.map((_, i) => answer(items[i] ?? items[0]))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        prices: lines.map(l => l.price),
        titles: lines.map(l => l.title),
        valid: lines.map(l => l.valid),
      }),
    })
  })
}

/**
 * Safety net for checkout specs: never let a test reach the real order endpoint
 * (it creates real GoPay payments). Specs that exercise a response register
 * their own route afterwards — the last registered route wins.
 */
export async function blockOrders(page: Page) {
  await page.route('**/api/orders', route => route.fulfill({
    status: 418,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'blocked_in_e2e' }),
  }))
}

/**
 * Dismiss the cookie consent banner before page load.
 * Must be called before page.goto() — uses addInitScript so localStorage
 * is set before React renders and the banner never mounts.
 */
export async function dismissCookieBanner(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('sv_cookie_consent', 'accepted')
  })
}

/**
 * Mock the Packeta widget to instantly return a fake pickup point, and record
 * the options the page passed (window.__packetaOptions).
 * Call after page.goto() since it injects into the live window object.
 */
export async function mockPacketaWidget(page: Page, country = 'cz') {
  await page.evaluate((pointCountry) => {
    const w = window as Window & { Packeta?: object; __packetaOptions?: unknown }
    w.Packeta = {
      Widget: {
        pick: (
          _key: string,
          callback: (point: { id: number; name: string; city: string; country: string }) => void,
          options?: unknown,
        ) => {
          w.__packetaOptions = options
          callback({ id: 12345, name: 'Praha 1 - Smíchov', city: 'Praha', country: pointCountry })
        },
      },
    }
  }, country)
}

/** Fill every required checkout field (SK test data). */
export async function fillCheckoutForm(page: Page, email = 'jana@example.com') {
  await page.fill('#name', 'Jana Nováková')
  await page.fill('#email', email)
  await page.fill('#phone', '+421900000000')
  await page.fill('#billing-street', 'Hlavná 1')
  await page.fill('#billing-city', 'Bratislava')
  await page.fill('#billing-zip', '81101')
}
