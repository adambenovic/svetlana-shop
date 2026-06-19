'use client'
import { useTranslations } from 'next-intl'
import { useCart } from '@/store/cart'
import styles from './CartDrawer.module.css'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
  locale: string
}

export function CartDrawer({ open, onClose, locale }: CartDrawerProps) {
  const t = useTranslations('cart')
  const { items, removeItem, updateQuantity, total } = useCart()
  const prefix = locale === 'sk' ? '' : `/${locale}`

  return (
    <>
      {open && <div className={styles.overlay} onClick={onClose} />}
      <aside className={[styles.drawer, open ? styles.open : ''].join(' ')}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('title')}</h2>
          <button className={styles.close} onClick={onClose} aria-label={t('title')}>✕</button>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>{t('empty')}</p>
          </div>
        ) : (
          <>
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
                  <span className={styles.price}>
                    {((item.unitPrice * item.quantity) / 100).toFixed(2)} {item.currency}
                  </span>
                  <button className={styles.remove} onClick={() => removeItem(item.id)}>
                    {t('remove')}
                  </button>
                </li>
              ))}
            </ul>
            <div className={styles.footer}>
              <span className={styles.total}>
                {t('total')}: <strong>{(total() / 100).toFixed(2)}</strong>
              </span>
              <a href={`${prefix}/checkout`} className={styles.checkoutBtn}>
                {t('checkout')}
              </a>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
