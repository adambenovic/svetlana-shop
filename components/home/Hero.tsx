import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Hero.module.css'

interface HeroProps {
  locale: string
  heroImageUrl?: string
}

// Static collage of lamp part thumbnails used as hero visual until real product photos are added
const COLLAGE = [
  '/assets/Shade 1-thumb.webp',
  '/assets/Shade 5-thumb.webp',
  '/assets/Shade 10-thumb.webp',
  '/assets/Shade 15-thumb.webp',
]

export async function Hero({ locale, heroImageUrl }: HeroProps) {
  const t = await getTranslations({ locale, namespace: 'hero' })
  const th = await getTranslations({ locale, namespace: 'sections.header' })
  const prefix = locale === 'sk' ? '' : `/${locale}`

  return (
    <section className={styles.hero}>
      <div className={`page-width ${styles.inner}`}>
        <div className={styles.content}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.sub}>{t('subtitle')}</p>
          <div className={styles.actions}>
            <Link href={`${prefix}/configurator`} className={styles.btnPrimary}>
              {th('menu_configurator')}
            </Link>
            <Link href={`${prefix}/gallery`} className={styles.btnSecondary}>
              {th('menu_gallery')}
            </Link>
          </div>
        </div>
        <div className={styles.visual}>
          {heroImageUrl ? (
            <Image src={heroImageUrl} alt="Svetlana Lampe" fill className={styles.heroImg} />
          ) : (
            <div className={styles.collage}>
              {COLLAGE.map((src, i) => (
                <div key={i} className={styles.collageCell}>
                  <Image src={src} alt="" fill className={styles.collageImg} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
