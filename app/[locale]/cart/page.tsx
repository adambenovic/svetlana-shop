'use client'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCart } from '@/store/cart'
import { Button } from '@/components/ui/Button'
import styles from './page.module.css'

export default function CartPage() {
  const t = useTranslations('cart')
  const { items, removeItem, updateQuantity, total } = useCart()

  if (items.length === 0) {
    return (
      <div className={`page-width ${styles.empty}`}>
        <p>{t('empty')}</p>
        <Link href="/">{t('continue_shopping')}</Link>
      </div>
    )
  }

  return (
    <div className={`page-width ${styles.wrap}`}>
      <h1>{t('title')}</h1>
      <ul className={styles.list}>
        {items.map(item => (
          <li key={item.id} className={styles.item}>
            <div className={styles.info}>
              <span className={styles.itemTitle}>{item.title}</span>
              <span className={styles.itemConfig}>
                {Object.entries(item.configuration).map(([k, v]) => `${k}: ${v}`).join(' · ')}
              </span>
            </div>
            <div className={styles.qty}>
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
              <span>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
            </div>
            <span className={styles.itemPrice}>
              {((item.unitPrice * item.quantity) / 100).toFixed(2)} {item.currency}
            </span>
            <button className={styles.remove} onClick={() => removeItem(item.id)}>
              {t('remove')}
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.footer}>
        <span className={styles.totalLabel}>
          {t('total')}: <strong>{(total() / 100).toFixed(2)}</strong>
        </span>
        <Button as="a" href="/checkout" size="lg">{t('checkout')}</Button>
      </div>
    </div>
  )
}
