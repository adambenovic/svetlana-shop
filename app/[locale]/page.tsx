import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { Hero } from '@/components/home/Hero'
import { WhySection } from '@/components/home/WhySection'
import type { Product } from '@/types/product'
import styles from './page.module.css'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'gallery' })
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'products',
    where: { and: [{ status: { equals: 'published' } }, { configuratorOnly: { not_equals: true } }] },
    locale,
    limit: 6,
  })

  const products: Product[] = docs.map(p => ({
    id: p.id,
    slug: p.slug,
    title: typeof p.title === 'string' ? p.title : '',
    basePrice: p.basePrice,
    currency: p.currency,
    images: (p.images ?? []).map((img: { image: { url: string }; alt?: string }) => ({
      url: img.image?.url ?? '',
      alt: img.alt ?? '',
    })),
    hasBg: !!p.hasBg,
    partsKey: p.partsKey ?? undefined,
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
