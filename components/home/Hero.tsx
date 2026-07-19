import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import styles from './Hero.module.css'

interface HeroProps {
  locale: string
}

export async function Hero({ locale }: HeroProps) {
  const t = await getTranslations({ locale, namespace: 'hero' })
  const th = await getTranslations({ locale, namespace: 'sections.header' })
  const ta = await getTranslations({ locale, namespace: 'a11y' })

  return (
    <section className={styles.hero}>
      <picture>
        <source media="(max-width: 749px)" srcSet="/banner-mobile.webp" />
        <Image
          src="/banner-desktop.webp"
          alt={ta('hero_alt')}
          fill
          className={styles.heroImg}
          priority
        />
      </picture>
      <div className={styles.overlay}>
        <div className={styles.content}>
          <p className={styles.eyebrow}>{t('tagline')}</p>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.sub}>{t('subtitle')}</p>
          <div className={styles.actions}>
            <Link href="/configurator" className={styles.btnPrimary}>
              {th('menu_configurator')}
            </Link>
            <Link href="/gallery" className={styles.btnSecondary}>
              {th('menu_gallery')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
