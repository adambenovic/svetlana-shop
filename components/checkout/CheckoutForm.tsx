'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { useCart, useCartHydrated, repriceCart, isBlockedLine, type AppliedDiscount } from '@/store/cart'
import { useCurrency, formatPrice } from '@/store/currency'
import { Button } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import { BILLING_COUNTRIES, DEFAULT_COUNTRY, isShippingCountry, SHIPPING_COUNTRIES } from '@/lib/countries'
import { lampImages, chargeCurrencyFor } from '@/lib/prices'
import { lampConfigSummary } from '@/lib/lamp-config-display'
import { LampThumb } from '@/components/cart/LampThumb'
import { DiscountCode } from '@/components/cart/DiscountCode'
import { LineIssue } from '@/components/cart/LineIssue'
import { PacketaWidget, type PacketaPoint } from './PacketaWidget'
import styles from './CheckoutForm.module.css'

interface CheckoutFormProps {
  locale: string
}

/** POST /api/orders response — success carries gopayUrl, failures an error code. */
interface OrderResponse {
  gopayUrl?: string
  error?: string
  productIds?: string[]
  totalAmount?: number
  discount?: AppliedDiscount | null
}

interface FormError {
  message: string
  /** Server-computed total (charge currency) after a price change */
  newTotal?: number
  /** Offer a way back to the cart (lines that can't be ordered) */
  cartLink?: boolean
}

/** Legal page link for the pre-contract block. Opens a new tab: the form isn't
 *  persisted, so leaving the page would lose what the customer typed. */
function PolicyLink({ handle, children }: {
  handle: 'terms-of-service' | 'refund-policy' | 'privacy-policy'
  children: React.ReactNode
}) {
  return (
    <Link href={{ pathname: '/policies/[handle]', params: { handle } }} target="_blank" rel="noopener">
      {children}
    </Link>
  )
}

// Stricter than type="email" (which accepts "jana@example"): require a dot and
// a TLD of 2+ characters so typos are caught before the order is created.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/

export function CheckoutForm({ locale }: CheckoutFormProps) {
  const t = useTranslations('checkout')
  const tc = useTranslations('configurator')
  const td = useTranslations('cart_delivery')
  const tk = useTranslations('cart')
  const ty = useTranslations('a11y')
  const router = useRouter()
  const { items, subtotal, total, pricedIn, discount, setDiscount, removeItem, flagProducts } = useCart()
  const selected = useCurrency(s => s.currency)
  // Display in the selected currency once every line carries a price for it
  // (always true after the server re-price; EUR covers legacy lines until then)…
  const currency = pricedIn(selected) ? selected : 'EUR'
  // …but charge in a currency the GoPay account can settle (EUR). When the two
  // differ, the binding EUR amount is shown before the customer pays.
  const chargeCurrency = chargeCurrencyFor(currency)
  const converted = chargeCurrency !== currency
  const blocked = items.some(isBlockedLine)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY[locale] ?? 'SK')
  const [point, setPoint] = useState<PacketaPoint | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<FormError | null>(null)
  const [emailError, setEmailError] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)

  // The store uses skipHydration; items are [] until CartHydration restores
  // them, so only act on (or render) the cart once that has happened.
  const hydrated = useCartHydrated()

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

  const pickupCountryError = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: 'region' })
    const list = new Intl.ListFormat(locale, { type: 'conjunction' })
      .format(SHIPPING_COUNTRIES.map(c => names.of(c) ?? c))
    return t('error_pickup_country', { countries: list })
  }, [locale, t])

  function showEmailError() {
    setEmailError(t('error_email'))
    emailRef.current?.focus()
  }

  function handlePoint(p: PacketaPoint) {
    // Packeta reports a lowercase alpha-2 code; points outside the delivery
    // countries are refused by the order endpoint, so refuse them here first.
    if (p.country && !isShippingCountry(p.country.toUpperCase())) {
      setPoint(null)
      setError({ message: pickupCountryError })
      return
    }
    setPoint(p)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hydrated || items.length === 0 || submitting) return
    if (blocked) { setError({ message: t('error_items_blocked'), cartLink: true }); return }
    if (!EMAIL_RE.test(email.trim())) { showEmailError(); return }
    if (!point) { setError({ message: t('error_no_pickup') }); return }
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name, email: email.trim(), phone },
          billing: { street, city, zip, country },
          items: items.map(i => ({
            productId: i.productId,
            title: i.title,
            configuration: i.configuration,
            quantity: i.quantity,
            unitPrice: i.prices?.[chargeCurrency] ?? i.unitPrice,
          })),
          shipping: {
            packetaPointId: point.id,
            packetaPointName: point.name,
            packetaPointCity: point.city,
            // ISO alpha-2 (uppercased); Packeta returns a lowercase country code.
            packetaPointCountry: point.country ? point.country.toUpperCase() : undefined,
          },
          totalAmount: total(chargeCurrency),
          currency: chargeCurrency,
          locale,
          ...(discount ? { discountCode: discount.code } : {}),
        }),
      })
      const data = await res.json().catch(() => ({})) as OrderResponse

      if (res.ok && data.gopayUrl) {
        // Clear cart only after successful return from GoPay (on success page), not here.
        // If the redirect fails the user would lose their cart with no way to retry.
        window.location.assign(data.gopayUrl)
        return
      }
      await handleOrderError(res.status, data)
    } catch {
      setError({ message: t('error_generic') })
    }
    setSubmitting(false)
  }

  async function handleOrderError(status: number, data: OrderResponse) {
    if (status === 409 && data.error === 'price_changed') {
      // Prices (or the discount) moved since the cart was priced — adopt the
      // server's discount, refresh the lines and let the customer confirm the
      // new total instead of charging a surprise. If the refresh itself fails,
      // say so rather than letting them resubmit stale prices in a loop.
      if (data.discount !== undefined) setDiscount(data.discount)
      const refreshed = await repriceCart(locale)
      setError(refreshed
        ? { message: t('error_price_changed'), newTotal: data.totalAmount }
        : { message: t('error_reprice_failed') })
      return
    }
    if (status === 429) { setError({ message: t('error_rate_limited') }); return }
    if (status === 502) { setError({ message: t('error_gateway') }); return }

    switch (data.error) {
      case 'invalid_email':
        showEmailError()
        return
      case 'invalid_billing':
        setError({ message: t('error_billing') })
        return
      case 'pickup_country_not_supported':
        setPoint(null)
        setError({ message: pickupCountryError })
        return
      case 'discount_invalid':
        setDiscount(null)
        setError({ message: t('error_discount_invalid') })
        return
      case 'product_unavailable':
      case 'invalid_configuration': {
        const ids = Array.isArray(data.productIds) ? data.productIds.map(String) : []
        flagProducts(ids, data.error === 'product_unavailable' ? 'unavailable' : 'invalidConfig')
        // Flagged lines show the blocked notice below; only explain here if
        // none of them could be matched to a cart line.
        setError(items.some(i => ids.includes(i.productId))
          ? null
          : { message: t('error_items_blocked'), cartLink: true })
        return
      }
      default:
        setError({ message: t('error_generic') })
    }
  }

  // Redirecting to /cart — don't flash a payable form with a zero total.
  if (hydrated && items.length === 0) return null

  const totalDisplay = total(currency)
  const totalCharge = total(chargeCurrency)
  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {!hydrated ? (
        // Persisted cart not restored yet — reserve the summary's space.
        <div className={`${styles.summary} ${styles.summarySkeleton}`} aria-busy="true" data-testid="cart-skeleton" />
      ) : (
        <section className={styles.summary} aria-label={t('order_summary')}>
          <h2 className={styles.summaryTitle}>{t('order_summary')}</h2>
          <ul className={styles.summaryList}>
            {items.map(item => {
              const prices = item.prices ?? { EUR: item.unitPrice }
              return (
                <li key={item.id} className={`${styles.summaryItem} ${isBlockedLine(item) ? styles.summaryItemBlocked : ''}`}>
                  <LampThumb {...lampImages(item.configuration, item)} alt={item.title} />
                  <div className={styles.summaryInfo}>
                    <span className={styles.summaryItemTitle}>{item.title}</span>
                    <span className={styles.summaryConfig}>{lampConfigSummary(item.configuration, tc)}</span>
                    {isBlockedLine(item) ? (
                      <span className={styles.summaryIssue}>
                        <LineIssue item={item} />
                        <button
                          type="button"
                          className={styles.removeLine}
                          onClick={() => removeItem(item.id)}
                          aria-label={ty('remove_item', { item: item.title })}
                        >
                          {tk('remove')}
                        </button>
                      </span>
                    ) : (
                      <span className={styles.summaryQty}>
                        {t('qty')}: {item.quantity} × <Price prices={prices} compact />
                      </span>
                    )}
                  </div>
                  <span className={styles.summaryPrice}>
                    <Price prices={prices} quantity={item.quantity} compact />
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
            <strong className={styles.totalAmount}>
              <Price prices={{ EUR: total('EUR'), [currency]: totalDisplay }} compact={converted} />
            </strong>
          </div>
          {converted && (
            <>
              <div className={styles.chargeRow}>
                <span>{t('amount_to_pay', { currency: chargeCurrency })}</span>
                <strong className={styles.totalAmount}>
                  {/* Only the charge currency in the map → Price shows it with "incl. VAT" */}
                  <Price prices={{ [chargeCurrency]: totalCharge }} />
                </strong>
              </div>
              <p className={styles.chargeNote}>{t('charge_note', { charge: chargeCurrency, display: currency })}</p>
            </>
          )}
        </section>
      )}

      <div className={styles.field}>
        <label htmlFor="name">{t('name')}</label>
        <input id="name" type="text" required autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label htmlFor="email">{t('email')}</label>
        <input
          ref={emailRef}
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setEmailError('') }}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? 'email-error' : undefined}
        />
        {emailError && <p id="email-error" className={styles.fieldError} role="alert">{emailError}</p>}
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
        <PacketaWidget selected={point} onChange={handlePoint} />
        {!point && <p className={styles.pickupRequired}>{t('pickup_required')}</p>}
      </div>

      {/* Pre-contractual information (Consumer Rights Directive Art. 6 + 8(2)):
          total price incl. VAT and delivery, delivery time, terms, withdrawal
          and seller identity — directly above the order button. */}
      <div className={styles.precontract} data-testid="precontract">
        <p className={styles.precontractTotal}>
          {t('precontract_total', {
            amount: hydrated ? formatPrice(totalCharge, chargeCurrency, locale) : '…',
          })}
        </p>
        <ul className={styles.trust}>
          <li>{t('trust_free_shipping')}</li>
          <li>{t('precontract_times')}</li>
          <li>{t('trust_payment')}</li>
          <li>{t('trust_returns')}</li>
        </ul>
        <p className={styles.legal}>
          {t.rich('precontract_terms', {
            terms: chunks => <PolicyLink handle="terms-of-service">{chunks}</PolicyLink>,
            refund: chunks => <PolicyLink handle="refund-policy">{chunks}</PolicyLink>,
            privacy: chunks => <PolicyLink handle="privacy-policy">{chunks}</PolicyLink>,
          })}
        </p>
        <p className={styles.seller}>{t('precontract_seller')}</p>
      </div>

      <Button type="submit" size="lg" disabled={submitting || blocked || !hydrated}>
        {submitting ? t('submitting') : t('submit')}
      </Button>

      {blocked && (
        <p className={styles.error} role="alert">
          {t('error_items_blocked')} <Link href="/cart">{td('go_to_cart')}</Link>
        </p>
      )}

      {error && (
        <div className={styles.error} role="alert">
          <p>{error.message}</p>
          {error.newTotal !== undefined && (
            <p className={styles.newTotal}>
              {t('new_total', { amount: formatPrice(error.newTotal, chargeCurrency, locale) })}
            </p>
          )}
          {error.cartLink && <Link href="/cart">{td('go_to_cart')}</Link>}
        </div>
      )}
    </form>
  )
}
