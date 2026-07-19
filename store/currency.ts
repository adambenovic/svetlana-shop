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

export function formatPrice(amountInCents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountInCents / 100)
}
