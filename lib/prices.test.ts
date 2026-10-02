import { convertFromEur, productPriceMap, applyModifier, chargeCurrencyFor, CHARGE_CURRENCIES, DEFAULT_RATES } from './prices'

const rates = { CZK: 24.459, PLN: 4.3735, HUF: 367.18 }

test('convertFromEur produces charm-rounded retail prices in minor units', () => {
  // €53.99 → 1320.54 Kč → 1319 Kč ; 236.13 zł → 235,99 zł ; 19824 Ft → 19 790 Ft
  expect(convertFromEur(5399, 'CZK', rates)).toBe(131900)
  expect(convertFromEur(5399, 'PLN', rates)).toBe(23599)
  expect(convertFromEur(5399, 'HUF', rates)).toBe(1979000)
})

test('converted prices stay within ~1% of the exchange rate', () => {
  for (const eur of [990, 2999, 5399, 8900, 15900]) {
    for (const cur of ['CZK', 'PLN', 'HUF'] as const) {
      const expected = eur * rates[cur]
      expect(Math.abs(convertFromEur(eur, cur, rates) - expected) / expected).toBeLessThan(0.02)
    }
  }
})

test('convertFromEur returns 0 for non-positive amounts', () => {
  expect(convertFromEur(0, 'CZK', rates)).toBe(0)
  expect(convertFromEur(-100, 'HUF', rates)).toBe(0)
})

test('productPriceMap converts from EUR when no override is set', () => {
  expect(productPriceMap({ basePrice: 5399, prices: {} }, rates)).toEqual({
    EUR: 5399, CZK: 131900, PLN: 23599, HUF: 1979000,
  })
  // null / missing overrides behave the same
  expect(productPriceMap({ basePrice: 5399, prices: { czk: null } }, rates).CZK).toBe(131900)
  expect(productPriceMap({ basePrice: 5399 }, rates).PLN).toBe(23599)
})

test('a manual override wins over the conversion', () => {
  const map = productPriceMap({ basePrice: 5399, prices: { czk: 129900, pln: null, huf: 0 } }, rates)
  expect(map.CZK).toBe(129900)
  expect(map.PLN).toBe(23599)   // null → converted
  expect(map.HUF).toBe(1979000) // 0 is not a price → converted
})

test('changing the EUR price moves every converted currency with it', () => {
  // Regression: fixed foreign prices seeded for €89 stayed put when EUR dropped
  // to €53.99, making CZK/PLN/HUF ~1.7× too expensive.
  const before = productPriceMap({ basePrice: 8900 }, rates)
  const after = productPriceMap({ basePrice: 5399 }, rates)
  for (const cur of ['CZK', 'PLN', 'HUF'] as const) {
    expect(after[cur]! / before[cur]!).toBeCloseTo(5399 / 8900, 1)
  }
})

test('productPriceMap uses the supplied rates (defaults otherwise)', () => {
  expect(productPriceMap({ basePrice: 10000 }, { CZK: 25, PLN: 4, HUF: 400 }).CZK).toBe(249900)
  expect(productPriceMap({ basePrice: 5399 }).CZK).toBe(convertFromEur(5399, 'CZK', DEFAULT_RATES))
})

test('applyModifier with no surcharge returns the same prices', () => {
  const map = productPriceMap({ basePrice: 5399 }, rates)
  expect(applyModifier(map, 0)).toEqual(map)
})

test('payments are charged in EUR — other currencies are display-only', () => {
  // The GoPay account settles EUR only; CZK/PLN/HUF have no payment methods
  // there, so charging in them dead-ends at the gateway ("Platba nie je aktívna").
  expect(CHARGE_CURRENCIES).toEqual(['EUR'])
  expect(chargeCurrencyFor('EUR')).toBe('EUR')
  expect(chargeCurrencyFor('CZK')).toBe('EUR')
  expect(chargeCurrencyFor('PLN')).toBe('EUR')
  expect(chargeCurrencyFor('HUF')).toBe('EUR')
})
