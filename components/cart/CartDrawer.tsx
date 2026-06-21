'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/store/cart'
import styles from './CartDrawer.module.css'

export function CartDrawer({ locale }: { locale: string }) {
  const t = useTranslations('cart_drawer')
  const items = useCart(s => s.items)
  const total = useCart(s => s.total)
  const remove = useCart(s => s.removeItem)
  const updateQuantity = useCart(s => s.updateQuantity)
  const open = useCart(s => s.drawerOpen)
  const close = useCart(s => s.closeDrawer)
  const prefix = locale === 'sk' ? '' : `/${locale}`

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [close])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const currency = items[0]?.currency ?? 'EUR'

  return (
    <>
      <div className={styles.overlay} onClick={close} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={t('title')}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('title')} ({items.length})</h2>
          <button className={styles.close} onClick={close} aria-label="Close cart">✕</button>
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
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.title} className={styles.itemThumb} />
                  ) : (
                    <div className={styles.itemThumbPlaceholder} />
                  )}
                  <div className={styles.info}>
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.itemConfig}>
                      {Object.entries(item.configuration)
                        .filter(([, v]) => v)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </span>
                  </div>
                  <div className={styles.qty}>
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease">−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Increase">+</button>
                  </div>
                  <span className={styles.price}>
                    {((item.unitPrice * item.quantity) / 100).toFixed(2)} {item.currency}
                  </span>
                  <button className={styles.remove} onClick={() => remove(item.id)} aria-label={t('remove')}>
                    {t('remove')}
                  </button>
                </li>
              ))}
            </ul>
            <div className={styles.footer}>
              <div className={styles.totalRow}>
                <span>{t('label_total')}</span>
                <strong>{(total() / 100).toFixed(2)} {currency}</strong>
              </div>
              <Link href={`${prefix}/checkout`} className={styles.checkoutBtn} onClick={close}>
                {t('checkout')}
              </Link>
              <Link href={`${prefix}/cart`} className={styles.viewCart} onClick={close}>
                {t('view_cart')}
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
