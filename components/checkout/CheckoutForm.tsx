'use client'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useCart } from '@/store/cart'
import { useCurrency, formatPrice } from '@/store/currency'
import { Button } from '@/components/ui/Button'
import { BILLING_COUNTRIES, DEFAULT_COUNTRY } from '@/lib/countries'
import { PacketaWidget, type PacketaPoint } from './PacketaWidget'
import styles from './CheckoutForm.module.css'

interface CheckoutFormProps {
  locale: string
}

export function CheckoutForm({ locale }: CheckoutFormProps) {
  const t = useTranslations('checkout')
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

  const countryOptions = useMemo(() => {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' })
    return BILLING_COUNTRIES
      .map(code => ({ code, name: displayNames.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name, locale))
  }, [locale])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!point) { setError('Please select a Packeta pickup point.'); return }
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

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="name">{t('name')}</label>
        <input id="name" type="text" required value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label htmlFor="email">{t('email')}</label>
        <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label htmlFor="phone">{t('phone')}</label>
        <input id="phone" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} />
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

      <PacketaWidget selected={point} onChange={setPoint} />

      <div className={styles.summary}>
        {discount && (
          <span className={styles.discountLine}>
            {discount.code}: {formatPrice(subtotal(currency), currency)} −{discount.percent}%
          </span>
        )}
        <span>{t('total')}: <strong>{formatPrice(total(currency), currency)}</strong></span>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? t('submitting') : t('submit')}
      </Button>
    </form>
  )
}
