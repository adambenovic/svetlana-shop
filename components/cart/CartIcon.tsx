'use client'
import { useTranslations } from 'next-intl'
import { useCart } from '@/store/cart'
import styles from './CartIcon.module.css'

export function CartIcon() {
  const t = useTranslations('a11y')
  const items = useCart(s => s.items)
  const openDrawer = useCart(s => s.openDrawer)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <button className={styles.btn} onClick={openDrawer} aria-label={t('cart', { count })}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {count > 0 && <span className={styles.badge}>{count}</span>}
    </button>
  )
}
