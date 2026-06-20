import { Suspense } from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Configurator } from '@/components/configurator/Configurator'
import { getTranslations } from 'next-intl/server'

export default async function ConfiguratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ product?: string }>
}) {
  const { locale } = await params
  const { product: partsKey } = await searchParams
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'products',
    where: partsKey
      ? { and: [{ partsKey: { equals: partsKey } }, { status: { equals: 'published' } }] }
      : { status: { equals: 'published' } },
    locale,
    limit: 1,
  })

  if (!docs[0]) {
    const t = await getTranslations({ locale, namespace: 'configurator' })
    return (
      <div className="page-width" style={{ padding: '96px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 18 }}>{t('no_products')}</p>
      </div>
    )
  }

  const product = docs[0]

  return (
    <div className="page-width" style={{ paddingTop: 48, paddingBottom: 48 }}>
      {/* Suspense required because Configurator uses useSearchParams() */}
      <Suspense fallback={<div style={{ color: 'var(--color-text-muted)' }}>Loading configurator...</div>}>
        <Configurator
          partsKey={product.partsKey ?? ''}
          basePrice={product.basePrice as number}
          currency={product.currency as string}
          productId={String(product.id)}
          productTitle={typeof product.title === 'string' ? product.title : ''}
        />
      </Suspense>
    </div>
  )
}
