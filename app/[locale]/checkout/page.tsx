import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { getTranslations } from 'next-intl/server'

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'checkout' })
  const packetaApiKey = process.env.NEXT_PUBLIC_PACKETA_WIDGET_KEY ?? ''

  return (
    <div className="page-width" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <h1 style={{ marginBottom: 32 }}>{t('title')}</h1>
      <CheckoutForm locale={locale} packetaApiKey={packetaApiKey} />
    </div>
  )
}
