import type { Product } from '@/types/product'
import { GalleryCard } from './GalleryCard'
import styles from './GalleryGrid.module.css'

export function GalleryGrid({ products, locale }: { products: Product[]; locale: string }) {
  return (
    <div className={styles.grid}>
      {products.map(p => (
        <GalleryCard key={p.id} product={p} locale={locale} />
      ))}
    </div>
  )
}
