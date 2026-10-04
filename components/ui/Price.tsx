'use client'
import { useLocale, useTranslations } from 'next-intl'
import { useCurrency, pickPrice, formatPrice, type Currency, type PriceMap } from '@/store/currency'
import { chargeCurrencyFor } from '@/lib/prices'

const noteStyle: React.CSSProperties = {
  fontSize: '0.75em',
  fontWeight: 400,
  color: 'var(--color-text-muted)',
  whiteSpace: 'nowrap',
}

interface PriceProps {
  /** Full per-currency price map (needs EUR for the binding amount) */
  prices: PriceMap
  quantity?: number
  /** Main amount only — no "incl. VAT" note or EUR line. For tight spots such as
   *  cart lines; totals should always use the full form. */
  compact?: boolean
}

/** Renders an amount in the visitor's selected currency, formatted for the page
 *  locale. Payments are charged in EUR, so:
 *  - EUR:       "53,99 € vrátane DPH"
 *  - CZK/PLN/HUF (display-only): "≈ 1 319 Kč" with "53,99 € incl. VAT" under it.
 *  Falls back to EUR when the price map has no amount for the selection. */
export function Price({ prices, quantity = 1, compact = false }: PriceProps) {
  const locale = useLocale()
  const t = useTranslations('price')
  const selected = useCurrency(s => s.currency)
  const { amount, currency } = pickPrice(prices, selected)
  const charge: Currency = chargeCurrencyFor(currency)
  const main = formatPrice(amount * quantity, currency, locale)

  if (charge === currency) {
    return (
      <>
        {main}
        {!compact && <> <span style={noteStyle}>{t('incl_vat')}</span></>}
      </>
    )
  }

  const charged = prices[charge]
  return (
    <>
      {'≈ '}{main}
      {!compact && typeof charged === 'number' && (
        <span style={{ ...noteStyle, display: 'block' }}>
          {formatPrice(charged * quantity, charge, locale)} {t('incl_vat')}
        </span>
      )}
    </>
  )
}
