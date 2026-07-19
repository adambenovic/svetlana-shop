import { Link } from '@/i18n/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { GalleryGrid } from './GalleryGrid'
import type { Product } from '@/types/product'

interface GalleryPreviewProps {
  locale: string
  viewAllLabel?: string
}

export async function GalleryPreview({ locale, viewAllLabel = 'View all lamps →' }: GalleryPreviewProps) {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'products',
    where: { status: { equals: 'published' } },
    locale,
    limit: 6,
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
    <div>
      <GalleryGrid products={products} locale={locale} />
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <Link
          href="/gallery"
          style={{ color: 'var(--color-accent)', fontWeight: 500, fontSize: '16px' }}
        >
          {viewAllLabel}
        </Link>
      </div>
    </div>
  )
}
