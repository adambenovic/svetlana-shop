import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Currency = 'EUR' | 'CZK' | 'PLN' | 'HUF'
export const CURRENCIES: Currency[] = ['EUR', 'CZK', 'PLN', 'HUF']

// Prices are entered manually per currency in the admin (no FX conversion).
// A missing currency falls back to EUR — see pickPrice.
export type PriceMap = Partial<Record<Currency, number>>

interface CurrencyState {
  currency: Currency
  setCurrency: (c: Currency) => void
}

export const useCurrency = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: 'EUR',
      setCurrency: (currency) => set({ currency }),
    }),
    { name: 'svetlana-currency' }
  )
)

/** Resolve the amount to display: the selected currency if the product has a
 *  manual price for it, otherwise the EUR price. */
export function pickPrice(prices: PriceMap, currency: Currency): { amount: number; currency: Currency } {
  const amount = prices[currency]
  if (typeof amount === 'number') return { amount, currency }
  return { amount: prices.EUR ?? 0, currency: 'EUR' }
}

/** Locale-formatted money. Whole units drop the decimals ("89 €", "1 319 Kč");
 *  anything else always shows both ("43,20 €" — never "43,2 €"). */
export function formatPrice(amountInCents: number, currency: string, locale?: string): string {
  const cents = Math.round(amountInCents)
  const digits = cents % 100 === 0 ? 0 : 2
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(cents / 100)
}
