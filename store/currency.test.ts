import { formatPrice } from './currency'

// Intl separates the amount and symbol with (narrow) no-break spaces.
const plain = (s: string) => s.replace(/[  ]/g, ' ')

test('formatPrice drops decimals only for whole units', () => {
  expect(plain(formatPrice(8900, 'EUR', 'sk'))).toBe('89 €')
  expect(plain(formatPrice(5399, 'EUR', 'sk'))).toBe('53,99 €')
  expect(plain(formatPrice(4320, 'EUR', 'sk'))).toBe('43,20 €')
  expect(plain(formatPrice(105520, 'CZK', 'cs'))).toBe('1 055,20 Kč')
  expect(plain(formatPrice(131900, 'CZK', 'cs'))).toBe('1 319 Kč')
  expect(formatPrice(4320, 'EUR', 'en')).toBe('€43.20')
})
