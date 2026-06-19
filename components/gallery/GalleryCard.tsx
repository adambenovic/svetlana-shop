import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types/product'
import styles from './GalleryCard.module.css'

interface GalleryCardProps {
  product: Product
  locale: string
}

export function GalleryCard({ product, locale }: GalleryCardProps) {
  const prefix = locale === 'sk' ? '' : `/${locale}`
  const image = product.images[0]

  return (
    <Link
      href={`${prefix}/products/${product.slug}`}
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
          {(product.basePrice / 100).toFixed(2)} {product.currency}
        </span>
      </div>
    </Link>
  )
}
