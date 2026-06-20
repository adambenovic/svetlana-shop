'use client'
import { useCurrency, type Currency } from '@/store/currency'
import styles from './LocaleSwitcher.module.css'

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency()

  return (
    <select
      value={currency}
      onChange={e => setCurrency(e.target.value as Currency)}
      className={styles.select}
      aria-label="Currency"
    >
      <option value="EUR">EUR</option>
      <option value="CZK">CZK</option>
    </select>
  )
}
