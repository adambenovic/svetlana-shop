import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import type { Product } from '@/types/product'
import { Price } from '@/components/ui/Price'
import { productPriceMap } from '@/lib/prices'
import styles from './GalleryCard.module.css'

interface GalleryCardProps {
  product: Product
  locale: string
}

export function GalleryCard({ product, locale }: GalleryCardProps) {
  const image = product.images[0]

  return (
    <Link
      href={{ pathname: '/products/[slug]', params: { slug: product.slug } }}
      className={[styles.card, product.hasBg ? styles.hasBg : ''].join(' ')}
      aria-label={product.title}
    >
      {image && (
        <div className={styles.imageWrap}>
          <Image
            src={image.url}
            alt={image.alt || product.title}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        </div>
      )}
      <div className={styles.label}>
        <span className={styles.title}>{product.title}</span>
        <span className={styles.price}>
          <Price prices={productPriceMap(product)} />
        </span>
      </div>
    </Link>
  )
}
