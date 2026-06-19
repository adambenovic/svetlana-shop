import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import type { Product } from '@/types/product'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'gallery' })
  return { title: t('title') }
}

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'gallery' })
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'products',
    where: { status: { equals: 'published' } },
    locale,
    limit: 100,
  })

  const products: Product[] = docs.map(p => ({
    id: String(p.id),
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
    <div className="page-width" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <h1 style={{ marginBottom: 32 }}>{t('title')}</h1>
      <GalleryGrid products={products} locale={locale} />
    </div>
  )
}
