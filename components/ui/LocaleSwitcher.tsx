'use client'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import styles from './LocaleSwitcher.module.css'

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations('locales')
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const locale = e.target.value as (typeof routing.locales)[number]
    // @ts-expect-error -- pathname/params always match for the current route;
    // next-intl maps them to the target locale's translated pathname
    router.replace({ pathname, params }, { locale })
  }

  return (
    <select
      value={currentLocale}
      onChange={handleChange}
      className={styles.select}
      aria-label="Language"
    >
      {routing.locales.map(l => (
        <option key={l} value={l}>{t(l)}</option>
      ))}
    </select>
  )
}
