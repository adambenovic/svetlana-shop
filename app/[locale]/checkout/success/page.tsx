import { getTranslations } from 'next-intl/server'
import { ClearCartOnMount } from '@/components/checkout/ClearCartOnMount'

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ gopayId?: string }>
}) {
  const { locale } = await params
  const { gopayId } = await searchParams
  const t = await getTranslations({ locale, namespace: 'checkout' })

  return (
    <div className="page-width" style={{ paddingTop: 96, textAlign: 'center' }}>
      <ClearCartOnMount />
      <h1 style={{ marginBottom: 16 }}>{t('success_title')}</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        {t('success_body', { orderNumber: gopayId ?? '—' })}
      </p>
    </div>
  )
}
