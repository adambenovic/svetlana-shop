import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Configurator } from '@/components/configurator/Configurator'
import { productPriceMap } from '@/lib/prices'
import { getTranslations } from 'next-intl/server'
import { alternatesFor, absoluteUrl, openGraphFor } from '@/components/layout/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  const title = t('configurator_title')
  const description = t('configurator_description')
  return {
    title,
    description,
    alternates: alternatesFor('/configurator', locale),
    openGraph: openGraphFor({ locale, href: '/configurator', title, description }),
  }
}

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

  const t = await getTranslations({ locale, namespace: 'configurator' })
  const tHeader = await getTranslations({ locale, namespace: 'sections.header' })
  const tMeta = await getTranslations({ locale, namespace: 'meta' })

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: tHeader('menu_home'),
        item: absoluteUrl(locale, '/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: tMeta('configurator_title'),
        item: absoluteUrl(locale, '/configurator'),
      },
    ],
  }

  return (
    <div className="page-width" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Server-rendered h1 (visually hidden) so it is always present in the
          initial HTML — the client Configurator gates its render on parts. */}
      <h1 className="visually-hidden">{t('page_heading')}</h1>
      {/* Suspense required because Configurator uses useSearchParams() */}
      <Suspense fallback={<div style={{ color: 'var(--color-text-muted)' }}>{t('loading')}</div>}>
        <Configurator
          partsKey={product.partsKey ?? ''}
          prices={productPriceMap(product)}
          productId={String(product.id)}
          productTitle={typeof product.title === 'string' ? product.title : ''}
        />
      </Suspense>
    </div>
  )
}
