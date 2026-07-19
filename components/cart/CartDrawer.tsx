'use client'
import { Link } from '@/i18n/navigation'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/store/cart'
import { useCurrency, pickPrice, formatPrice } from '@/store/currency'
import { lampImages, configuratorQuery } from '@/lib/prices'
import { LampThumb } from './LampThumb'
import { QtyInput } from './QtyInput'
import { DiscountCode } from './DiscountCode'
import styles from './CartDrawer.module.css'

export function CartDrawer({ locale }: { locale: string }) {
  const t = useTranslations('cart_drawer')
  const items = useCart(s => s.items)
  const total = useCart(s => s.total)
  const remove = useCart(s => s.removeItem)
  const updateQuantity = useCart(s => s.updateQuantity)
  const open = useCart(s => s.drawerOpen)
  const close = useCart(s => s.closeDrawer)
  const pricedIn = useCart(s => s.pricedIn)
  const selected = useCurrency(s => s.currency)
  // Totals must be a single currency — fall back to EUR unless every item has a manual price
  const currency = pricedIn(selected) ? selected : 'EUR'

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
              {items.map(item => {
                const unit = pickPrice(item.prices ?? { EUR: item.unitPrice }, currency)
                return (
                  <li key={item.id} className={styles.item}>
                    <Link
                      href={{ pathname: '/configurator', query: configuratorQuery(item.configuration) }}
                      className={styles.itemLink}
                      onClick={close}
                      aria-label={item.title}
                    >
                      <LampThumb {...lampImages(item.configuration, item)} alt={item.title} />
                      <div className={styles.info}>
                        <span className={styles.itemTitle}>{item.title}</span>
                        <span className={styles.itemConfig}>
                          {Object.entries(item.configuration)
                            .filter(([, v]) => v)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ')}
                        </span>
                      </div>
                    </Link>
                    <QtyInput value={item.quantity} onChange={q => updateQuantity(item.id, q)} />
                    <span className={styles.price}>
                      {formatPrice(unit.amount * item.quantity, unit.currency)}
                    </span>
                    <button className={styles.remove} onClick={() => remove(item.id)} aria-label={t('remove')}>
                      {t('remove')}
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className={styles.footer}>
              <DiscountCode />
              <div className={styles.totalRow}>
                <span>{t('label_total')}</span>
                <strong>{formatPrice(total(currency), currency)}</strong>
              </div>
              <Link href="/checkout" className={styles.checkoutBtn} onClick={close}>
                {t('checkout')}
              </Link>
              <Link href="/cart" className={styles.viewCart} onClick={close}>
                {t('view_cart')}
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
