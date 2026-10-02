import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { Hero } from '@/components/home/Hero'
import { WhySection } from '@/components/home/WhySection'
import { alternatesFor, openGraphFor } from '@/components/layout/seo'
import type { GalleryProduct } from '@/components/gallery/GalleryCard'
import { productPriceMap } from '@/lib/prices'
import { getExchangeRates } from '@/lib/server-pricing'
import styles from './page.module.css'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  const title = t('home_title')
  const description = t('home_description')
  return {
    title,
    description,
    alternates: alternatesFor('/', locale),
    openGraph: openGraphFor({ locale, href: '/', title, description }),
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'gallery' })
  const payload = await getPayload({ config })
  const rates = await getExchangeRates(payload)

  const { docs } = await payload.find({
    collection: 'products',
    where: { and: [{ status: { equals: 'published' } }, { configuratorOnly: { not_equals: true } }] },
    locale,
    limit: 6,
  })

  const products: GalleryProduct[] = docs.map(p => ({
    id: p.id,
    slug: p.slug,
    title: typeof p.title === 'string' ? p.title : '',
    images: (p.images ?? []).map((img: { image: { url: string }; alt?: string }) => ({
      url: img.image?.url ?? '',
      alt: img.alt ?? '',
    })),
    hasBg: !!p.hasBg,
    partsKey: p.partsKey ?? undefined,
    configuration: (p as { configuration?: Record<string, string> | null }).configuration ?? null,
    prices: productPriceMap(p, rates),
  }))

  return (
    <>
      <Hero locale={locale} />

      {products.length > 0 && (
        <section className={styles.gallerySection}>
          <div className="page-width">
            <GalleryGrid products={products} locale={locale} />
            <div className={styles.viewAll}>
              <Link href="/gallery">{t('view_all')}</Link>
            </div>
          </div>
        </section>
      )}

      <WhySection locale={locale} />
    </>
  )
}
