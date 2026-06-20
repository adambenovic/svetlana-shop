import type { Page } from '@playwright/test'

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

/**
 * Seed the Zustand cart store via localStorage before page load.
 * Must be called before page.goto().
 */
export async function seedCart(page: Page, items = [MOCK_CART_ITEM]) {
  await page.addInitScript(
    ({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)) },
    { key: 'svetlana-cart', value: { state: { items }, version: 0 } },
  )
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
 * Mock the Packeta widget to instantly return a fake pickup point.
 * Call after page.goto() since it injects into the live window object.
 */
export async function mockPacketaWidget(page: Page) {
  await page.evaluate(() => {
    (window as Window & { Packeta?: object }).Packeta = {
      Widget: {
        pick: (_key: string, callback: (point: { id: number; name: string; city: string }) => void) => {
          callback({ id: 12345, name: 'Praha 1 - Smíchov', city: 'Praha' })
        },
      },
    }
  })
}
