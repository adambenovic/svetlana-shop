'use client'
import { Link } from '@/i18n/navigation'
import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/store/cart'
import { useCurrency, pickPrice, formatPrice } from '@/store/currency'
import { lampImages, configuratorQuery } from '@/lib/prices'
import { lampConfigSummary } from '@/lib/lamp-config-display'
import { LampThumb } from './LampThumb'
import { QtyInput } from './QtyInput'
import { DiscountCode } from './DiscountCode'
import styles from './CartDrawer.module.css'

export function CartDrawer({ locale }: { locale: string }) {
  const t = useTranslations('cart_drawer')
  const tc = useTranslations('configurator')
  const td = useTranslations('cart_delivery')
  const items = useCart(s => s.items)
  const remove = useCart(s => s.removeItem)
  const updateQuantity = useCart(s => s.updateQuantity)
  const open = useCart(s => s.drawerOpen)
  const close = useCart(s => s.closeDrawer)
  const pricedIn = useCart(s => s.pricedIn)
  const selected = useCurrency(s => s.currency)
  // Totals must be a single currency — fall back to EUR unless every item has a manual price
  const currency = pricedIn(selected) ? selected : 'EUR'
  // Subscribe to the derived total (not the fn reference) so the row re-computes
  // synchronously when items OR the discount change — fixes the first-apply lag.
  const totalAmount = useCart(s => s.total(currency))

  const drawerRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Focus management: focus the close button on open, trap Tab within the drawer,
  // handle Escape, and restore focus to the trigger (cart icon) on close.
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const raf = requestAnimationFrame(() => closeRef.current?.focus())

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return }
      if (e.key !== 'Tab') return
      const root = drawerRef.current
      if (!root) return
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => el.offsetParent !== null || el === document.activeElement)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) { e.preventDefault(); last.focus() }
      } else {
        if (active === last || !root.contains(active)) { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [open, close])

  if (!open) return null

  return (
    <>
      <div className={styles.overlay} onClick={close} />
      <aside ref={drawerRef} className={styles.drawer} role="dialog" aria-modal="true" aria-label={t('title')}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('title')} ({items.length})</h2>
          <button ref={closeRef} className={styles.close} onClick={close} aria-label="Close cart">✕</button>
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
                          {lampConfigSummary(item.configuration, tc)}
                        </span>
                      </div>
                    </Link>
                    <QtyInput value={item.quantity} onChange={q => updateQuantity(item.id, q)} />
                    <span className={styles.price}>
                      {formatPrice(unit.amount * item.quantity, unit.currency, locale)}
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
                <strong>{formatPrice(totalAmount, currency, locale)}</strong>
              </div>
              <p className={styles.deliveryNote}>
                {td('free_shipping')} · {td('made_to_order')}
              </p>
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
