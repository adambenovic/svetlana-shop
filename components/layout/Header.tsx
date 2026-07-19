import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { CartIcon } from '@/components/cart/CartIcon'
import { Logo } from './Logo'
import styles from './Header.module.css'

export function Header({ locale }: { locale: string }) {
  const t = useTranslations('sections.header')

  return (
    <header className={styles.header}>
      <div className={`page-width ${styles.inner}`}>
        <Link href="/" className={styles.logo} aria-label="Svetlana Lampe">
          <Logo width={140} height={34} />
        </Link>
        <nav className={styles.nav}>
          <Link href="/">{t('menu_home')}</Link>
          <Link href="/configurator">{t('menu_configurator')}</Link>
          <Link href="/gallery">{t('menu_gallery')}</Link>
        </nav>
        <div className={styles.actions}>
          <ThemeToggle />
          <CartIcon />
        </div>
      </div>
    </header>
  )
}
