import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Currency = 'EUR' | 'CZK' | 'PLN' | 'HUF'

const EUR_RATES: Record<Currency, number> = {
  EUR: 1,
  CZK: 25.5,
  PLN: 4.25,
  HUF: 395,
}

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

export function formatPrice(amountInCents: number, productCurrency: string, displayCurrency: Currency): string {
  let amount = amountInCents / 100
  let outCurrency: string = productCurrency

  const srcRate = EUR_RATES[productCurrency as Currency] ?? 1
  const dstRate = EUR_RATES[displayCurrency] ?? 1

  if (productCurrency !== displayCurrency) {
    amount = (amount / srcRate) * dstRate
    outCurrency = displayCurrency
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: outCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
