'use client'
import { useTranslations } from 'next-intl'
import type { CartItem } from '@/store/cart'
import styles from './LineIssue.module.css'

/** Why a cart line can't be ordered (product gone / configuration no longer
 *  valid). Shared by the cart page, drawer and checkout summary; the caller
 *  renders the remove action next to it. */
export function LineIssue({ item, className }: { item: CartItem; className?: string }) {
  const t = useTranslations('cart')
  if (!item.unavailable && !item.invalidConfig) return null
  return (
    <span className={className ? `${styles.issue} ${className}` : styles.issue}>
      {item.unavailable ? t('line_unavailable') : t('line_invalid')}
    </span>
  )
}
