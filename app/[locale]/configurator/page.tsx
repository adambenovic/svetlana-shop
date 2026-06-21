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

  // Prefer the dedicated configurator product; fall back to partsKey match or any published
  const { docs: configDocs } = await payload.find({
    collection: 'products',
    where: { and: [{ configuratorOnly: { equals: true } }, { status: { equals: 'published' } }] },
    locale,
    limit: 1,
  })

  let doc = configDocs[0]

  if (!doc && partsKey) {
    const { docs: byKey } = await payload.find({
      collection: 'products',
      where: { and: [{ partsKey: { equals: partsKey } }, { status: { equals: 'published' } }] },
      locale,
      limit: 1,
    })
    doc = byKey[0]
  }

  if (!doc) {
    const { docs: any } = await payload.find({
      collection: 'products',
      where: { status: { equals: 'published' } },
      locale,
      limit: 1,
    })
    doc = any[0]
  }

  if (!doc) {
    const t = await getTranslations({ locale, namespace: 'configurator' })
    return (
      <div className="page-width" style={{ padding: '96px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 18 }}>{t('no_products')}</p>
      </div>
    )
  }

  const product = doc

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
