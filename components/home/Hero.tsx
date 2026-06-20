import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
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
      <div className={`page-width ${styles.inner}`}>
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
    </section>
  )
}
