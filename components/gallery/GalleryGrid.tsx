import { GalleryCard, type GalleryProduct } from './GalleryCard'
import styles from './GalleryGrid.module.css'

export function GalleryGrid({ products, locale }: { products: GalleryProduct[]; locale: string }) {
  return (
    <div className={styles.grid}>
      {products.map(p => (
        <GalleryCard key={p.id} product={p} locale={locale} />
      ))}
    </div>
  )
}
