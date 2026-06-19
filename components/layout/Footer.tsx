import { useTranslations } from 'next-intl'
import styles from './Footer.module.css'

export function Footer() {
  const t = useTranslations('sections.footer')
  return (
    <footer className={styles.footer}>
      <div className="page-width">
        <p className={styles.copy}>{t('copyright', { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  )
}
