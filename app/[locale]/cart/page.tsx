'use client'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Link, getPathname } from '@/i18n/navigation'
import { useCart } from '@/store/cart'
import { useCurrency, pickPrice, formatPrice } from '@/store/currency'
import { Button } from '@/components/ui/Button'
import { lampImages, configuratorQuery } from '@/lib/prices'
import { lampConfigSummary } from '@/lib/lamp-config-display'
import { LampThumb } from '@/components/cart/LampThumb'
import { DiscountCode } from '@/components/cart/DiscountCode'
import { QtyInput } from '@/components/cart/QtyInput'
import styles from './page.module.css'

export default function CartPage() {
  const t = useTranslations('cart')
  const tc = useTranslations('configurator')
  const td = useTranslations('cart_delivery')
  const locale = useLocale()
  const { items, removeItem, updateQuantity, subtotal, total, pricedIn, discount } = useCart()
  const selected = useCurrency(s => s.currency)
  const currency = pricedIn(selected) ? selected : 'EUR'

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
        {items.map(item => {
          const unit = pickPrice(item.prices ?? { EUR: item.unitPrice }, currency)
          return (
            <li key={item.id} className={styles.item}>
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
                <QtyInput value={item.quantity} onChange={q => updateQuantity(item.id, q)} />
                <span className={styles.itemPrice}>{formatPrice(unit.amount * item.quantity, unit.currency, locale)}</span>
                <button className={styles.remove} onClick={() => removeItem(item.id)}>
                  {t('remove')}
                </button>
              </div>
            </li>
          )
        })}
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
            {t('total')}: <strong>{formatPrice(total(currency), currency, locale)}</strong>
          </span>
          <span className={styles.subtotalLine}>
            {td('free_shipping')} · {td('made_to_order')}
          </span>
        </div>
        <Button as="a" href={getPathname({ href: '/checkout', locale })} size="lg">{t('checkout')}</Button>
      </div>
    </div>
  )
}
