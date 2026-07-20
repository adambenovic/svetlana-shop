'use client'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useCart } from '@/store/cart'
import { useCurrency, pickPrice, formatPrice } from '@/store/currency'
import { Button } from '@/components/ui/Button'
import { BILLING_COUNTRIES, DEFAULT_COUNTRY } from '@/lib/countries'
import { lampImages } from '@/lib/prices'
import { lampConfigSummary } from '@/lib/lamp-config-display'
import { LampThumb } from '@/components/cart/LampThumb'
import { DiscountCode } from '@/components/cart/DiscountCode'
import { PacketaWidget, type PacketaPoint } from './PacketaWidget'
import styles from './CheckoutForm.module.css'

interface CheckoutFormProps {
  locale: string
}

export function CheckoutForm({ locale }: CheckoutFormProps) {
  const t = useTranslations('checkout')
  const tc = useTranslations('configurator')
  const td = useTranslations('cart_delivery')
  const router = useRouter()
  const { items, subtotal, total, pricedIn, discount } = useCart()
  const selected = useCurrency(s => s.currency)
  // Charge in the selected currency only when every item has a manual price for it
  const currency = pricedIn(selected) ? selected : 'EUR'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY[locale] ?? 'SK')
  const [point, setPoint] = useState<PacketaPoint | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Track cart hydration so we only act on a genuinely-empty cart (the store uses
  // skipHydration; items are [] until rehydration finishes). Start false — the
  // persist API isn't available during SSR, and hydration only matters client-side.
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    if (useCart.persist.hasHydrated()) setHydrated(true)
    return useCart.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  // Empty-cart guard: never present a payable form with an empty cart.
  useEffect(() => {
    if (hydrated && items.length === 0) router.replace('/cart')
  }, [hydrated, items.length, router])

  const countryOptions = useMemo(() => {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' })
    return BILLING_COUNTRIES
      .map(code => ({ code, name: displayNames.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name, locale))
  }, [locale])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!point) { setError(t('error_no_pickup')); return }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name, email, phone },
          billing: { street, city, zip, country },
          items: items.map(i => ({
            productId: i.productId,
            title: i.title,
            configuration: i.configuration,
            quantity: i.quantity,
            unitPrice: i.prices?.[currency] ?? i.unitPrice,
          })),
          shipping: {
            packetaPointId: point.id,
            packetaPointName: point.name,
            packetaPointCity: point.city,
            // ISO alpha-2 (uppercased); Packeta returns a lowercase country code.
            packetaPointCountry: point.country ? point.country.toUpperCase() : undefined,
          },
          totalAmount: total(currency),
          currency,
          locale,
          ...(discount ? { discountCode: discount.code } : {}),
        }),
      })

      if (!res.ok) throw new Error('Order creation failed')
      const { gopayUrl } = await res.json() as { gopayUrl: string }
      // Clear cart only after successful return from GoPay (on success page), not here.
      // If the redirect fails the user would lose their cart with no way to retry.
      window.location.href = gopayUrl
    } catch {
      setError(t('error_generic'))
      setSubmitting(false)
    }
  }

  // Redirecting to /cart — don't flash a payable form with a zero total.
  if (hydrated && items.length === 0) return null

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <section className={styles.summary} aria-label={t('order_summary')}>
        <h2 className={styles.summaryTitle}>{t('order_summary')}</h2>
        <ul className={styles.summaryList}>
          {items.map(item => {
            const unit = pickPrice(item.prices ?? { EUR: item.unitPrice }, currency)
            return (
              <li key={item.id} className={styles.summaryItem}>
                <LampThumb {...lampImages(item.configuration, item)} alt={item.title} />
                <div className={styles.summaryInfo}>
                  <span className={styles.summaryItemTitle}>{item.title}</span>
                  <span className={styles.summaryConfig}>{lampConfigSummary(item.configuration, tc)}</span>
                  <span className={styles.summaryQty}>
                    {t('qty')}: {item.quantity} × {formatPrice(unit.amount, unit.currency, locale)}
                  </span>
                </div>
                <span className={styles.summaryPrice}>
                  {formatPrice(unit.amount * item.quantity, unit.currency, locale)}
                </span>
              </li>
            )
          })}
        </ul>
        <DiscountCode />
        {discount && (
          <span className={styles.discountLine}>
            {discount.code}: {formatPrice(subtotal(currency), currency, locale)} −{discount.percent}%
          </span>
        )}
        <div className={styles.summaryRow}>
          <span>{td('free_shipping')}</span>
          <span>{formatPrice(0, currency, locale)}</span>
        </div>
        <p className={styles.madeToOrder}>{td('made_to_order')}</p>
        <div className={styles.totalRow}>
          <span>{t('total')}</span>
          <strong>{formatPrice(total(currency), currency, locale)}</strong>
        </div>
      </section>

      <div className={styles.field}>
        <label htmlFor="name">{t('name')}</label>
        <input id="name" type="text" required autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label htmlFor="email">{t('email')}</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label htmlFor="phone">{t('phone')}</label>
        <input id="phone" type="tel" required autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} />
      </div>

      <h2 className={styles.sectionTitle}>{t('billing_address')}</h2>
      <div className={styles.field}>
        <label htmlFor="billing-street">{t('street')}</label>
        <input id="billing-street" type="text" required autoComplete="street-address" value={street} onChange={e => setStreet(e.target.value)} />
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="billing-city">{t('city')}</label>
          <input id="billing-city" type="text" required autoComplete="address-level2" value={city} onChange={e => setCity(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="billing-zip">{t('zip')}</label>
          <input id="billing-zip" type="text" required autoComplete="postal-code" value={zip} onChange={e => setZip(e.target.value)} />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="billing-country">{t('country')}</label>
        <select id="billing-country" required value={country} onChange={e => setCountry(e.target.value)}>
          {countryOptions.map(c => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.pickup}>
        <h2 className={styles.sectionTitle}>
          {t('pickup_heading')} <span className={styles.required} aria-hidden="true">*</span>
        </h2>
        <PacketaWidget selected={point} onChange={setPoint} />
        {!point && <p className={styles.pickupRequired}>{t('pickup_required')}</p>}
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? t('submitting') : t('submit')}
      </Button>

      <ul className={styles.trust}>
        <li>{t('trust_payment')}</li>
        <li>{t('trust_free_shipping')}</li>
        <li>{t('trust_returns')}</li>
      </ul>
    </form>
  )
}
