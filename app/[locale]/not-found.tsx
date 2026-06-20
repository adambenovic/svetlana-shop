import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import styles from './not-found.module.css'

export default async function NotFound() {
  const t = await getTranslations('not_found')
  return (
    <div className={`page-width ${styles.wrap}`}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.desc}>{t('desc')}</p>
      <Link href="/" className={styles.back}>{t('back')}</Link>
    </div>
  )
}
