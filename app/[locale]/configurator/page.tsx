import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Configurator } from '@/components/configurator/Configurator'
import { SELECTION_KEYS, resolveSelection } from '@/components/configurator/selection'
import partsData from '@/public/parts.json'
import type { PartsData } from '@/types/parts'
import { lampImages, productPriceMap } from '@/lib/prices'
import { getExchangeRates } from '@/lib/server-pricing'
import { getTranslations } from 'next-intl/server'
import { BASE_URL, OFFER_TERMS, OG_IMAGE, alternatesFor, absoluteUrl, openGraphFor } from '@/components/layout/seo'

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
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const query = await searchParams
  const partsKey = typeof query.product === 'string' ? query.product : undefined
  const payload = await getPayload({ config })
  const rates = await getExchangeRates(payload)

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
  const initial = resolveSelection(query, partsData as unknown as PartsData)

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

  // The configurator is the shop's main product page: price is the default
  // configuration's (the base price), charged in EUR.
  const prices = productPriceMap(product, rates)
  const render = lampImages({ ...initial })
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: typeof product.title === 'string' && product.title ? product.title : 'Svetlana Lampe',
    description: tMeta('configurator_description'),
    image: [OG_IMAGE.url, render.imageUrl, render.baseImageUrl]
      .filter((u): u is string => !!u)
      .map(u => new URL(u, BASE_URL).toString()),
    brand: { '@type': 'Brand', name: 'Svetlana Lampe' },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(locale, '/configurator'),
      price: ((prices.EUR ?? 0) / 100).toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      ...OFFER_TERMS,
    },
  }

  return (
    <div className="page-width" style={{ paddingTop: 48, paddingBottom: 48 }}>
      {/* `<` escaped so CMS text containing "</script>" cannot end the block. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([productJsonLd, breadcrumbJsonLd]).replace(/</g, '\\u003c') }}
      />
      <h1 className="visually-hidden">{t('page_heading')}</h1>
      {/* Selection resolved here, so the server HTML is the finished configurator
          (unknown/missing URL ids already replaced by defaults). */}
      <Configurator
        // Remount when a link brings in a different configuration.
        key={SELECTION_KEYS.map(k => initial[k]).join('|')}
        partsKey={product.partsKey ?? ''}
        prices={productPriceMap(product, rates)}
        rates={rates}
        productId={String(product.id)}
        productTitle={typeof product.title === 'string' ? product.title : ''}
        initial={initial}
      />
    </div>
  )
}
