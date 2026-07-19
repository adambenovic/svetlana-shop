import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Button } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import { productPriceMap, lampImages, configuratorQuery } from '@/lib/prices'
import { lexicalToHtml } from '@/lib/lexical-to-html'
import { getTranslations } from 'next-intl/server'
import { getPathname } from '@/i18n/navigation'
import styles from './page.module.css'

type ProductDoc = {
  id: string | number
  title?: unknown
  description?: unknown
  images?: { image?: { url?: string }; alt?: string }[]
  configuration?: Record<string, string> | null
  partsKey?: string | null
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

function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const product = await findProduct(locale, slug)
  if (!product) return {}
  const title = typeof product.title === 'string' ? product.title : slug
  const description = plainText(lexicalToHtml(product.description)).slice(0, 160)
  return {
    // The root layout's title template already appends " | Svetlana Lampe"
    title,
    ...(description ? { description } : {}),
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

  const title = typeof product.title === 'string' ? product.title : slug
  const descriptionHtml = lexicalToHtml(product.description)
  const configuration = product.configuration ?? undefined
  const render = configuration ? lampImages(configuration) : null
  const uploaded = (product.images ?? []).filter(img => img.image?.url)

  const configuratorHref = getPathname({
    href: {
      pathname: '/configurator',
      query: configuration
        ? configuratorQuery(configuration)
        : (product.partsKey ? { product: product.partsKey } : {}),
    },
    locale,
  })

  return (
    <div className={`page-width ${styles.wrap}`}>
      <div className={styles.images}>
        {render?.imageUrl && (
          <div className={styles.imageSlot}>
            {render.baseImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={render.baseImageUrl} alt="" aria-hidden className={styles.renderLayer} />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={render.imageUrl} alt={title} className={styles.renderLayer} />
          </div>
        )}
        {uploaded.map((img, i) => (
          <div key={i} className={styles.imageSlot}>
            <Image src={img.image!.url!} alt={img.alt ?? title} fill className={styles.img} sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
        ))}
      </div>
      <div className={styles.info}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.price}>
          <Price prices={productPriceMap(product)} />
        </p>
        {descriptionHtml && (
          <div className={`prose ${styles.description}`} dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
        )}
        <Button as="a" href={configuratorHref} size="lg">
          {t('cta')}
        </Button>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
