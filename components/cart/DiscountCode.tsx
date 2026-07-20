'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/store/cart'
import styles from './DiscountCode.module.css'

/** Discount code entry — shared by the cart page and the cart drawer. */
export function DiscountCode() {
  const t = useTranslations('cart')
  const discount = useCart(s => s.discount)
  const setDiscount = useCart(s => s.setDiscount)
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  async function apply() {
    if (!code.trim() || checking) return
    setChecking(true)
    setError(false)
    try {
      const res = await fetch(`/api/discounts/validate?code=${encodeURIComponent(code.trim())}`)
      const data = await res.json() as { valid: boolean; code?: string; percent?: number }
      if (data.valid && data.code && data.percent) {
        setDiscount({ code: data.code, percent: data.percent })
        setCode('')
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setChecking(false)
    }
  }

  if (discount) {
    return (
      <p className={styles.applied}>
        <span>{t('discount_applied', { code: discount.code, percent: discount.percent })}</span>
        <button type="button" className={styles.remove} onClick={() => setDiscount(null)}>{t('remove')}</button>
      </p>
    )
  }

  // Not a <form> — this component is embedded inside the checkout <form>, and
  // nested forms are invalid HTML. Enter and the button call apply() directly.
  return (
    <div className={styles.row}>
      <input
        type="text"
        value={code}
        placeholder={t('discount_placeholder')}
        onChange={e => { setCode(e.target.value); setError(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); apply() } }}
        aria-label={t('discount_placeholder')}
      />
      <button type="button" className={styles.apply} disabled={checking || !code.trim()} onClick={apply}>
        {t('discount_apply')}
      </button>
      {error && <p className={styles.error} role="alert">{t('discount_invalid')}</p>}
    </div>
  )
}
