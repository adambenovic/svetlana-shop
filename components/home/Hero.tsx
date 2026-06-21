import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Hero.module.css'

interface HeroProps {
  locale: string
  heroImageUrl?: string
}

const DEFAULT_HERO_IMAGE = '/banner-desktop.webp'

export async function Hero({ locale, heroImageUrl = DEFAULT_HERO_IMAGE }: HeroProps) {
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
          <Image src={heroImageUrl} alt="Svetlana Lampe" fill className={styles.heroImg} />
        </div>
      </div>
    </section>
  )
}
