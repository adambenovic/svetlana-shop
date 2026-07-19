'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useCart } from '@/store/cart'
import styles from './AnnouncementBar.module.css'

const SESSION_KEY = 'sv_announcement_dismissed'

export function AnnouncementBar() {
  const t = useTranslations('announcement')
  const router = useRouter()
  const items = useCart(s => s.items)
  const setDiscount = useCart(s => s.setDiscount)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) setVisible(true)
  }, [])

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(false)
  }

  async function useCode() {
    // Apply the promo to the cart (server-validated), then take the visitor
    // to their cart — or to the configurator when there is nothing in it yet.
    try {
      const res = await fetch(`/api/discounts/validate?code=${encodeURIComponent(t('code'))}`)
      const data = await res.json() as { valid: boolean; code?: string; percent?: number }
      if (data.valid && data.code && data.percent) {
        setDiscount({ code: data.code, percent: data.percent })
      }
    } catch { /* still navigate — the code can be entered manually in the cart */ }
    router.push(items.length > 0 ? '/cart' : '/configurator')
  }

  if (!visible) return null

  return (
    <div className={styles.bar} role="banner" aria-label="Promotional announcement">
      <p className={styles.text}>
        {t('text')}{' '}
        <button className={styles.code} onClick={useCode} title={t('click_to_use')}>
          {t('code')}
        </button>
        {' '}<button className={styles.use} onClick={useCode}>({t('click_to_use')})</button>
      </p>
      <button className={styles.dismiss} onClick={dismiss} aria-label={t('dismiss')}>✕</button>
    </div>
  )
}
