import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Hero.module.css'

interface HeroProps {
  locale: string
}

export async function Hero({ locale }: HeroProps) {
  const t = await getTranslations({ locale, namespace: 'hero' })
  const th = await getTranslations({ locale, namespace: 'sections.header' })
  const prefix = locale === 'sk' ? '' : `/${locale}`

  return (
    <section className={styles.hero}>
      <picture>
        <source media="(max-width: 749px)" srcSet="/banner-mobile.webp" />
        <Image
          src="/banner-desktop.webp"
          alt="Svetlana Lampe"
          fill
          className={styles.heroImg}
          priority
        />
      </picture>
      <div className={styles.overlay}>
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
      </div>
    </section>
  )
}
