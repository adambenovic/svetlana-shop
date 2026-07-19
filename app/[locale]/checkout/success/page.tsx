import Link from 'next/link'
import { getPathname } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getPayment, type GoPayState } from '@/lib/gopay'
import { ClearCartOnMount } from '@/components/checkout/ClearCartOnMount'

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
  const gopayId = sp.id ?? sp.gopayId
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
      })
      if (docs[0]) {
        orderNumber = docs[0].orderNumber as string
        const payment = await getPayment(gopayId)
        state = payment.state
        gwUrl = payment.gw_url ?? null
      }
    } catch (err) {
      console.error('[checkout/success] payment verification failed:', err)
    }
  }

  if (state === 'PAID' || state === 'AUTHORIZED') {
    return (
      <div className="page-width" style={{ paddingTop: 96, textAlign: 'center' }}>
        <ClearCartOnMount />
        <h1 style={{ marginBottom: 16 }}>{t('success_title')}</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {t('success_body', { orderNumber: orderNumber ?? '—' })}
        </p>
      </div>
    )
  }

  // Unpaid, cancelled, or unverifiable — the cart is intentionally NOT cleared
  const canRetry = (state === 'CREATED' || state === 'PAYMENT_METHOD_CHOSEN') && gwUrl

  return (
    <div className="page-width" style={{ paddingTop: 96, textAlign: 'center' }}>
      <h1 style={{ marginBottom: 16 }}>{t('payment_failed_title')}</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
        {orderNumber ? t('payment_failed_body', { orderNumber }) : t('payment_not_found_body')}
      </p>
      {canRetry ? (
        <a href={gwUrl!} style={{ color: 'var(--color-accent)' }}>{t('payment_retry')}</a>
      ) : (
        <Link href={getPathname({ href: '/checkout', locale })} style={{ color: 'var(--color-accent)' }}>{t('back_to_checkout')}</Link>
      )}
    </div>
  )
}
