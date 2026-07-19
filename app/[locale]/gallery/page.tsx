import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getPathname } from '@/i18n/navigation'
import { Button } from '@/components/ui/Button'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import type { GalleryProduct } from '@/components/gallery/GalleryCard'
import { productPriceMap } from '@/lib/prices'
import styles from './page.module.css'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'gallery' })
  return { title: t('title') }
}

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'gallery' })
  const tp = await getTranslations({ locale, namespace: 'configurator_product' })
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'products',
    where: { and: [{ status: { equals: 'published' } }, { configuratorOnly: { not_equals: true } }] },
    locale,
    limit: 100,
  })

  const products: GalleryProduct[] = docs.map(p => {
    const doc = p as typeof p & { configuration?: Record<string, string> | null }
    return {
      id: String(doc.id),
      slug: doc.slug,
      title: typeof doc.title === 'string' ? doc.title : '',
      hasBg: !!doc.hasBg,
      images: (doc.images ?? []).map((img: { image: { url: string }; alt?: string }) => ({
        url: img.image?.url ?? '',
        alt: img.alt ?? '',
      })),
      configuration: doc.configuration ?? null,
      prices: productPriceMap(doc),
    }
  })

  return (
    <div className="page-width" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <h1 style={{ marginBottom: 32 }}>{t('title')}</h1>
      {products.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{t('empty_title')}</h2>
          <p className={styles.emptyBody}>{t('empty_body')}</p>
          <Button as="a" href={getPathname({ href: '/configurator', locale })} size="lg">{tp('cta')}</Button>
        </div>
      ) : (
        <GalleryGrid products={products} locale={locale} />
      )}
    </div>
  )
}
