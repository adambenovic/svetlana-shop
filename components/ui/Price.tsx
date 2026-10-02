'use client'
import { useLocale } from 'next-intl'
import { useCurrency, pickPrice, formatPrice, type PriceMap } from '@/store/currency'

/** Renders an amount in the visitor's selected currency, formatted for the page
 *  locale (e.g. "1 319 Kč" on /cs). Falls back to EUR when the price map has no
 *  amount for the selection. */
export function Price({ prices, quantity = 1 }: { prices: PriceMap; quantity?: number }) {
  const locale = useLocale()
  const currency = useCurrency(s => s.currency)
  const { amount, currency: cur } = pickPrice(prices, currency)
  return <>{formatPrice(amount * quantity, cur, locale)}</>
}
