import type { Metadata } from 'next'
import Link from 'next/link'
import { getPathname } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getPayment, type GoPayState } from '@/lib/gopay'
import { syncPayment, type OrderDoc } from '@/lib/payment-sync'
import { ClearCartOnMount } from '@/components/checkout/ClearCartOnMount'

const CONTACT_EMAIL = 'contact@svetlanalampe.sk'

// Per-customer payment result — never indexed.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'checkout' })
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ id?: string; gopayId?: string }>
}) {
  const { locale } = await params
  const sp = await searchParams
  // GoPay appends ?id=<paymentId> to the return URL; gopayId kept for old links
  const rawId = sp.id ?? sp.gopayId
  const gopayId = typeof rawId === 'string' && /^\d{1,20}$/.test(rawId) ? rawId : null
  const t = await getTranslations({ locale, namespace: 'checkout' })

  let orderNumber: string | null = null
  let state: GoPayState | null = null
  let gwUrl: string | null = null

  if (gopayId) {
    try {
      const payload = await getPayload({ config })
      const { docs } = await payload.find({
        collection: 'orders',
        where: { gopayId: { equals: gopayId } },
        limit: 1,
        depth: 0,
      })
      const order = docs[0] as unknown as OrderDoc | undefined
      if (order) {
        orderNumber = order.orderNumber
        const payment = await getPayment(gopayId)
        state = payment.state
        gwUrl = payment.gw_url ?? null
        // The customer is back before (or without) GoPay's notification —
        // fulfil now (invoice, confirmation email) so a paying customer never
        // depends on the webhook arriving. Idempotent with the webhook.
        if (state === 'PAID' && order.status === 'pending') {
          await syncPayment(payload, gopayId, { payment, order, source: 'return' })
            .catch(err => console.error('[checkout/success] payment sync failed:', err))
        }
      }
    } catch (err) {
      console.error('[checkout/success] payment verification failed:', err instanceof Error ? err.message : err)
    }
  }

  const contact = (
    <p style={{ color: 'var(--color-text-muted)', marginTop: 32, fontSize: 14 }}>
      {t.rich('contact_line', {
        email: CONTACT_EMAIL,
        link: chunks => <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--color-accent)' }}>{chunks}</a>,
      })}
    </p>
  )

  if (state === 'PAID' || state === 'AUTHORIZED') {
    return (
      <div className="page-width" style={{ paddingTop: 96, paddingBottom: 96, textAlign: 'center' }}>
        <ClearCartOnMount />
        <h1 style={{ marginBottom: 16 }}>{t('success_title')}</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {t('success_body', { orderNumber: orderNumber ?? '—' })}
        </p>
        <section style={{ maxWidth: 560, margin: '40px auto 0', textAlign: 'left' }} aria-labelledby="next-steps">
          <h2 id="next-steps" style={{ fontSize: 18, marginBottom: 12 }}>{t('next_steps_title')}</h2>
          <ol style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, paddingLeft: 20, display: 'grid', gap: 8 }}>
            <li>{t('next_steps_production')}</li>
            <li>{t('next_steps_shipping')}</li>
            <li>{t('next_steps_invoice')}</li>
          </ol>
        </section>
        {contact}
      </div>
    )
  }

  // Unpaid, cancelled, or unverifiable — the cart is intentionally NOT cleared
  const canRetry = (state === 'CREATED' || state === 'PAYMENT_METHOD_CHOSEN') && gwUrl

  return (
    <div className="page-width" style={{ paddingTop: 96, paddingBottom: 96, textAlign: 'center' }}>
      <h1 style={{ marginBottom: 16 }}>{t('payment_failed_title')}</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
        {orderNumber ? t('payment_failed_body', { orderNumber }) : t('payment_not_found_body')}
      </p>
      {canRetry ? (
        <a href={gwUrl!} style={{ color: 'var(--color-accent)' }}>{t('payment_retry')}</a>
      ) : (
        <Link href={getPathname({ href: '/checkout', locale })} style={{ color: 'var(--color-accent)' }}>{t('back_to_checkout')}</Link>
      )}
      {contact}
    </div>
  )
}
