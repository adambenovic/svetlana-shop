import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import type { PriceMap } from '@/store/currency'
import { Price } from '@/components/ui/Price'
import { lampImages, productPriceMap } from '@/lib/prices'
import styles from './GalleryCard.module.css'

/** Gallery product shape — a signature product carries a `configuration` we
 *  composite into a render; older products fall back to uploaded images.
 *  Superset of the legacy `Product` type so the home page can keep passing it. */
export interface GalleryProduct {
  id: string | number
  slug: string
  title: string
  hasBg: boolean
  images: { url: string; alt: string }[]
  configuration?: Record<string, string> | null
  /** Full per-currency price map (gallery page); legacy callers pass basePrice instead. */
  prices?: PriceMap
  basePrice?: number
  currency?: string
  partsKey?: string
}

interface GalleryCardProps {
  product: GalleryProduct
  locale: string
}

export function GalleryCard({ product }: GalleryCardProps) {
  const render = product.configuration ? lampImages(product.configuration) : null
  const image = product.images[0]
  const prices = product.prices ?? productPriceMap(product)

  return (
    <Link
      href={{ pathname: '/products/[slug]', params: { slug: product.slug } }}
      className={[styles.card, product.hasBg ? styles.hasBg : ''].join(' ')}
      aria-label={product.title}
    >
      <div className={styles.imageWrap}>
        {render?.imageUrl ? (
          <>
            {render.baseImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={render.baseImageUrl} alt="" aria-hidden className={styles.render} />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={render.imageUrl} alt={product.title} className={styles.render} />
          </>
        ) : image ? (
          <Image
            src={image.url}
            alt={image.alt || product.title}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : null}
      </div>
      <div className={styles.label}>
        <span className={styles.title}>{product.title}</span>
        <span className={styles.price}>
          <Price prices={prices} />
        </span>
      </div>
    </Link>
  )
}
