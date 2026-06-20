import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher'
import { CartIcon } from '@/components/cart/CartIcon'
import styles from './Header.module.css'

export function Header({ locale }: { locale: string }) {
  const t = useTranslations('sections.header')
  const prefix = locale === 'sk' ? '' : `/${locale}`

  return (
    <header className={styles.header}>
      <div className={`page-width ${styles.inner}`}>
        <Link href={`${prefix}/`} className={styles.logo}>Svetlana Lampe</Link>
        <nav className={styles.nav}>
          <Link href={`${prefix}/`}>{t('menu_home')}</Link>
          <Link href={`${prefix}/configurator`}>{t('menu_configurator')}</Link>
          <Link href={`${prefix}/gallery`}>{t('menu_gallery')}</Link>
        </nav>
        <div className={styles.actions}>
          <LocaleSwitcher currentLocale={locale} />
          <ThemeToggle />
          <CartIcon />
        </div>
      </div>
    </header>
  )
}
