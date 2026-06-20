'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import styles from './LocaleSwitcher.module.css'

const LOCALES = ['sk', 'en', 'cs', 'de', 'es', 'fr', 'hu', 'it', 'pl', 'uk'] as const
const DEFAULT_LOCALE = 'sk'

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations('locales')
  const pathname = usePathname()
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    // Strip existing locale prefix from pathname
    let path = pathname
    if (currentLocale !== DEFAULT_LOCALE) {
      path = pathname.replace(new RegExp(`^/${currentLocale}(?=/|$)`), '') || '/'
    }
    const newPath = next === DEFAULT_LOCALE ? path || '/' : `/${next}${path}`
    router.push(newPath)
  }

  return (
    <select
      value={currentLocale}
      onChange={handleChange}
      className={styles.select}
      aria-label="Language"
    >
      {LOCALES.map(l => (
        <option key={l} value={l}>{t(l)}</option>
      ))}
    </select>
  )
}
