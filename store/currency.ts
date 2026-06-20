import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Currency = 'EUR' | 'CZK'

const EUR_TO_CZK = 25.5

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

  if (productCurrency === 'EUR' && displayCurrency === 'CZK') {
    amount = amount * EUR_TO_CZK
    outCurrency = 'CZK'
  } else if (productCurrency === 'CZK' && displayCurrency === 'EUR') {
    amount = amount / EUR_TO_CZK
    outCurrency = 'EUR'
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: outCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
