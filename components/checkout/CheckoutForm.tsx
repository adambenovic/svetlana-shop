'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useCart } from '@/store/cart'
import { Button } from '@/components/ui/Button'
import { PacketaWidget, type PacketaPoint } from './PacketaWidget'
import styles from './CheckoutForm.module.css'

interface CheckoutFormProps {
  locale: string
}

export function CheckoutForm({ locale }: CheckoutFormProps) {
  const t = useTranslations('checkout')
  const router = useRouter()
  const { items, total, clear } = useCart()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [point, setPoint] = useState<PacketaPoint | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!point) { setError('Please select a Packeta pickup point.'); return }
    setSubmitting(true)
    setError('')

    const currency = items[0]?.currency ?? 'EUR'

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name, email, phone },
          items: items.map(i => ({
            productId: i.productId,
            title: i.title,
            configuration: i.configuration,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          shipping: {
            packetaPointId: point.id,
            packetaPointName: point.name,
            packetaPointCity: point.city,
          },
          totalAmount: total(),
          currency,
          locale,
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

      <PacketaWidget selected={point} onChange={setPoint} />

      <div className={styles.summary}>
        <span>{t('total')}: <strong>{(total() / 100).toFixed(2)} {items[0]?.currency}</strong></span>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? t('submitting') : t('submit')}
      </Button>
    </form>
  )
}
