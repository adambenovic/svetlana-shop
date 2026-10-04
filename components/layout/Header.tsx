import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { CartIcon } from '@/components/cart/CartIcon'
import { Logo } from './Logo'
import { hasGalleryProducts } from './gallery-visibility'
import styles from './Header.module.css'

export async function Header({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'sections.header' })
  const ta = await getTranslations({ locale, namespace: 'a11y' })
  const showGallery = await hasGalleryProducts()

  return (
    <header className={styles.header}>
      <div className={`page-width ${styles.inner}`}>
        {/* Accessible name comes from the logo's own role="img" label — an
            aria-label here would not match the visible text. */}
        <Link href="/" className={styles.logo}>
          <Logo width={140} height={34} />
        </Link>
        <nav className={styles.nav} aria-label={ta('main_nav')}>
          <Link href="/">{t('menu_home')}</Link>
          <Link href="/configurator">{t('menu_configurator')}</Link>
          {showGallery && <Link href="/gallery">{t('menu_gallery')}</Link>}
        </nav>
        <div className={styles.actions}>
          <ThemeToggle />
          <CartIcon />
        </div>
      </div>
    </header>
  )
}
