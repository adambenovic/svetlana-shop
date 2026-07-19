'use client'
import { useCurrency, pickPrice, formatPrice, type PriceMap } from '@/store/currency'

/** Renders an amount in the visitor's selected currency (manual per-currency
 *  prices; falls back to EUR when the product has no price for the selection). */
export function Price({ prices, quantity = 1 }: { prices: PriceMap; quantity?: number }) {
  const currency = useCurrency(s => s.currency)
  const { amount, currency: cur } = pickPrice(prices, currency)
  return <>{formatPrice(amount * quantity, cur)}</>
}
