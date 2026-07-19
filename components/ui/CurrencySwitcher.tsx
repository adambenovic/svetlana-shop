'use client'
import { useTranslations } from 'next-intl'
import { useCurrency, type Currency } from '@/store/currency'
import styles from './LocaleSwitcher.module.css'

const CURRENCIES: Currency[] = ['EUR', 'CZK', 'PLN', 'HUF']

export function CurrencySwitcher() {
  const t = useTranslations('a11y')
  const { currency, setCurrency } = useCurrency()

  return (
    <select
      value={currency}
      onChange={e => setCurrency(e.target.value as Currency)}
      className={styles.select}
      aria-label={t('currency')}
    >
      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  )
}
