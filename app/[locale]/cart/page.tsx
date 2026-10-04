'use client'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Link, getPathname } from '@/i18n/navigation'
import { useCart, useCartHydrated, isBlockedLine } from '@/store/cart'
import { useCurrency, formatPrice } from '@/store/currency'
import { Button } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import { lampImages, configuratorQuery, chargeCurrencyFor } from '@/lib/prices'
import { lampConfigSummary } from '@/lib/lamp-config-display'
import { LampThumb } from '@/components/cart/LampThumb'
import { DiscountCode } from '@/components/cart/DiscountCode'
import { QtyInput } from '@/components/cart/QtyInput'
import { LineIssue } from '@/components/cart/LineIssue'
import styles from './page.module.css'

export default function CartPage() {
  const t = useTranslations('cart')
  const tc = useTranslations('configurator')
  const td = useTranslations('cart_delivery')
  const tk = useTranslations('checkout')
  const ty = useTranslations('a11y')
  const locale = useLocale()
  const hydrated = useCartHydrated()
  const { items, removeItem, updateQuantity, subtotal, total, pricedIn, discount } = useCart()
  const selected = useCurrency(s => s.currency)
  const currency = pricedIn(selected) ? selected : 'EUR'
  const chargeCurrency = chargeCurrencyFor(currency)
  const blocked = items.some(isBlockedLine)

  let body: React.ReactNode
  if (!hydrated) {
    // The persisted cart is restored after mount — hold its space instead of
    // flashing the empty state (and shifting the footer) on every visit.
    body = <div className={styles.skeleton} aria-busy="true" data-testid="cart-skeleton" />
  } else if (items.length === 0) {
    body = (
      <div className={styles.empty}>
        <p>{t('empty')}</p>
        <Link href="/">{t('continue_shopping')}</Link>
      </div>
    )
  } else {
    body = (
      <>
        <ul className={styles.list}>
          {items.map(item => (
            <li key={item.id} className={`${styles.item} ${isBlockedLine(item) ? styles.itemBlocked : ''}`}>
              <Link
                href={{ pathname: '/configurator', query: configuratorQuery(item.configuration) }}
                className={styles.itemLink}
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
              <div className={styles.controls}>
                {isBlockedLine(item) ? (
                  <LineIssue item={item} />
                ) : (
                  <>
                    <QtyInput value={item.quantity} onChange={q => updateQuantity(item.id, q)} label={item.title} />
                    <span className={styles.itemPrice}>
                      <Price prices={item.prices ?? { EUR: item.unitPrice }} quantity={item.quantity} compact />
                    </span>
                  </>
                )}
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => removeItem(item.id)}
                  aria-label={ty('remove_item', { item: item.title })}
                >
                  {t('remove')}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <DiscountCode />

        <div className={styles.footer}>
          <div className={styles.totals}>
            {discount && (
              <span className={styles.subtotalLine}>
                {formatPrice(subtotal(currency), currency, locale)} → −{discount.percent}%
              </span>
            )}
            <span className={styles.totalLabel}>
              {t('total')}: <strong><Price prices={{ EUR: total('EUR'), [currency]: total(currency) }} /></strong>
            </span>
            <span className={styles.subtotalLine}>
              {td('free_shipping')} · {td('made_to_order')}
            </span>
            {chargeCurrency !== currency && (
              <span className={styles.subtotalLine}>
                {tk('charge_note', { charge: chargeCurrency, display: currency })}
              </span>
            )}
          </div>
          {blocked ? (
            <p className={styles.blocked} role="alert">{t('blocked')}</p>
          ) : (
            <Button as="a" href={getPathname({ href: '/checkout', locale })} size="lg">{t('checkout')}</Button>
          )}
        </div>
      </>
    )
  }

  return (
    <div className={`page-width ${styles.wrap}`}>
      <h1>{t('title')}</h1>
      {body}
    </div>
  )
}
