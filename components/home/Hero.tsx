import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getImageProps } from 'next/image'
import styles from './Hero.module.css'

interface HeroProps {
  locale: string
  /** Show the secondary "Gallery" button — only when the gallery has products. */
  showGallery?: boolean
}

// Matches the <source> breakpoint below: narrower viewports get the mobile crop.
const MOBILE_MEDIA = '(max-width: 749px)'

export async function Hero({ locale, showGallery = true }: HeroProps) {
  const t = await getTranslations({ locale, namespace: 'hero' })
  const th = await getTranslations({ locale, namespace: 'sections.header' })
  const ta = await getTranslations({ locale, namespace: 'a11y' })

  // Art direction: getImageProps builds an optimized srcset per banner and the
  // browser downloads only the <source> that matches. (<Image priority> would
  // preload the desktop banner on phones as well.) The hero is the LCP element,
  // so load it eagerly with high fetch priority — no preload link, because that
  // cannot be media-scoped and would fetch both variants.
  const common = {
    alt: ta('hero_alt'),
    fill: true,
    sizes: '100vw',
    loading: 'eager' as const,
    fetchPriority: 'high' as const,
  }
  const { props: { srcSet: mobileSrcSet } } = getImageProps({ ...common, src: '/banner-mobile.webp' })
  const { props: desktop } = getImageProps({ ...common, src: '/banner-desktop.webp' })

  return (
    <section className={styles.hero}>
      <picture>
        <source media={MOBILE_MEDIA} srcSet={mobileSrcSet} sizes={common.sizes} />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
        <img {...desktop} className={styles.heroImg} />
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
            {showGallery && (
              <Link href="/gallery" className={styles.btnSecondary}>
                {th('menu_gallery')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
