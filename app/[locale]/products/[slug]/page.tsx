import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Image from 'next/image'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Button } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import { productPriceMap, lampImages, configuratorQuery } from '@/lib/prices'
import { lexicalToHtml } from '@/lib/lexical-to-html'
import { getExchangeRates } from '@/lib/server-pricing'
import { getTranslations } from 'next-intl/server'
import { getPathname } from '@/i18n/navigation'
import { BASE_URL, absoluteUrl, alternatesFor, openGraphFor } from '@/components/layout/seo'
import styles from './page.module.css'

type ProductDoc = {
  id: string | number
  title?: unknown
  description?: unknown
  images?: { image?: { url?: string }; alt?: string }[]
  configuration?: Record<string, string> | null
  partsKey?: string | null
  configuratorOnly?: boolean | null
}

async function findProduct(locale: string, slug: string): Promise<ProductDoc | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug }, status: { equals: 'published' } },
    locale,
    limit: 1,
  })
  return (docs[0] as ProductDoc | undefined) ?? null
}

/** The configurator base product (configuratorOnly) has no page of its own —
 *  its URL permanently redirects to the localized configurator. */
function redirectIfConfiguratorOnly(product: ProductDoc, locale: string) {
  if (product.configuratorOnly) permanentRedirect(getPathname({ href: '/configurator', locale }))
}

function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** `description` is a plain textarea today; older documents may hold Lexical JSON. */
function descriptionText(product: ProductDoc): string {
  if (typeof product.description === 'string') return product.description.replace(/\s+/g, ' ').trim()
  return plainText(lexicalToHtml(product.description))
}

function productTitle(product: ProductDoc, slug: string): string {
  return typeof product.title === 'string' ? product.title : slug
}

const productHref = (slug: string) => ({ pathname: '/products/[slug]' as const, params: { slug } })

function absoluteAsset(url: string): string {
  return new URL(url, BASE_URL).toString()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const product = await findProduct(locale, slug)
  if (!product) return {}
  redirectIfConfiguratorOnly(product, locale)

  const t = await getTranslations({ locale, namespace: 'meta' })
  // The [locale] layout's title template appends " | Svetlana Lampe".
  const title = productTitle(product, slug)
  const description = descriptionText(product).slice(0, 160) || t('product_description', { title })
  const og = openGraphFor({ locale, href: productHref(slug), title, description })
  const photo = product.images?.find(img => img.image?.url)
  return {
    title,
    description,
    alternates: alternatesFor(productHref(slug), locale),
    // A product photo makes a better share preview than the site banner. The
    // transparent render layers are not used here: on their own they show an
    // incomplete lamp on whatever background the sharing app picks.
    openGraph: photo
      ? { ...og, images: [{ url: photo.image!.url!, alt: photo.alt || title }] }
      : og,
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const t = await getTranslations({ locale, namespace: 'configurator_product' })

  const product = await findProduct(locale, slug)
  if (!product) notFound()
  redirectIfConfiguratorOnly(product, locale)
  const rates = await getExchangeRates(await getPayload({ config }))

  const title = productTitle(product, slug)
  const descriptionHtml = typeof product.description === 'string' ? '' : lexicalToHtml(product.description)
  const descriptionPlain = typeof product.description === 'string' ? product.description.trim() : ''
  const configuration = product.configuration ?? undefined
  const render = configuration ? lampImages(configuration) : null
  const uploaded = (product.images ?? []).filter(img => img.image?.url)
  const prices = productPriceMap(product, rates)

  const configuratorHref = getPathname({
    href: {
      pathname: '/configurator',
      query: configuration
        ? configuratorQuery(configuration)
        : (product.partsKey ? { product: product.partsKey } : {}),
    },
    locale,
  })

  const tm = await getTranslations({ locale, namespace: 'meta' })
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: descriptionText(product) || tm('product_description', { title }),
    // Uploaded photos first; otherwise the render layers (shade + base).
    image: [
      ...uploaded.map(img => img.image!.url!),
      ...(render?.imageUrl ? [render.imageUrl] : []),
      ...(render?.baseImageUrl ? [render.baseImageUrl] : []),
    ].map(absoluteAsset),
    brand: { '@type': 'Brand', name: 'Svetlana Lampe' },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(locale, productHref(slug)),
      // Payments are charged in EUR (CHARGE_CURRENCIES); prices are EUR cents.
      price: ((prices.EUR ?? 0) / 100).toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  }

  return (
    <div className={`page-width ${styles.wrap}`}>
      {/* `<` escaped so CMS text containing "</script>" cannot end the block. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c') }}
      />
      <div className={styles.images}>
        {render?.imageUrl && (
          <div className={styles.imageSlot}>
            {/* Above the fold: the render is the page's LCP image. */}
            {render.baseImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={render.baseImageUrl} alt="" aria-hidden className={styles.renderLayer} fetchPriority="high" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={render.imageUrl} alt={title} className={styles.renderLayer} fetchPriority="high" />
          </div>
        )}
        {uploaded.map((img, i) => (
          <div key={i} className={styles.imageSlot}>
            <Image
              src={img.image!.url!}
              alt={img.alt ?? title}
              fill
              className={styles.img}
              sizes="(max-width: 768px) 100vw, 50vw"
              // First photo is the LCP image when there is no render.
              {...(i === 0 && !render?.imageUrl ? { loading: 'eager' as const, fetchPriority: 'high' as const } : {})}
            />
          </div>
        ))}
      </div>
      <div className={styles.info}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.price}>
          <Price prices={prices} />
        </p>
        {descriptionHtml && (
          <div className={`prose ${styles.description}`} dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
        )}
        {descriptionPlain && (
          <div className={`prose ${styles.description}`}>
            {descriptionPlain.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}
          </div>
        )}
        <Button as="a" href={configuratorHref} size="lg">
          {t('cta')}
        </Button>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
