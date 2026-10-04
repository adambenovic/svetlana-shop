import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import styles from './not-found.module.css'

// Robots is deliberately not set: Next.js already emits the single
// <meta name="robots" content="noindex"> for not-found responses.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('not_found')
  return { title: t('title') }
}

export default async function NotFound() {
  const t = await getTranslations('not_found')
  return (
    <div className={`page-width ${styles.wrap}`}>
      {/* Next.js 16 serves notFound() responses as an error shell and renders this
          on the client, where the head keeps the layout's default title — this
          React-hoisted <title> gives the tab the localized one. (The
          generateMetadata title above is what the server HTML carries.) */}
      <title>{`${t('title')} | Svetlana Lampe`}</title>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.desc}>{t('desc')}</p>
      <Link href="/" className={styles.back}>{t('back')}</Link>
    </div>
  )
}
