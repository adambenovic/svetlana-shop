'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher'
import { CurrencySwitcher } from '@/components/ui/CurrencySwitcher'
import styles from './Footer.module.css'

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.28 8.28 0 0 0 4.84 1.54V6.79a4.84 4.84 0 0 1-1.07-.1z" />
    </svg>
  )
}

const SOCIAL = [
  { name: 'Instagram', href: 'https://instagram.com/svetla.na.lampe', Icon: InstagramIcon },
  { name: 'TikTok', href: 'https://tiktok.com/@svetlana.lampe', Icon: TikTokIcon },
]

export function Footer({ locale }: { locale: string }) {
  const t = useTranslations('sections.footer')
  const year = new Date().getFullYear()
  const prefix = locale === 'sk' ? '' : `/${locale}`

  const shopLinks = [
    { label: t('menu_home'), href: `${prefix}/` },
    { label: t('menu_configurator'), href: `${prefix}/configurator` },
    { label: t('menu_gallery'), href: `${prefix}/gallery` },
  ]

  const docLinks = [
    { label: t('doc_manual'), href: `${prefix}/pages/lamp-manual` },
    { label: t('doc_conformity'), href: `${prefix}/pages/declaration-of-conformity` },
  ]

  const policyLinks = [
    { label: t('policy_privacy'), href: `${prefix}/policies/privacy-policy` },
    { label: t('policy_shipping'), href: `${prefix}/policies/shipping-policy` },
    { label: t('policy_refund'), href: `${prefix}/policies/refund-policy` },
    { label: t('policy_terms'), href: `${prefix}/policies/terms-of-service` },
  ]

  return (
    <footer className={styles.footer}>
      <div className={`page-width ${styles.grid}`}>
        <div className={styles.brand}>
          <span className={styles.brandName}>Svetlana Lampe</span>
          <p className={styles.brandDesc}>{t('brand_desc')}</p>
          <div className={styles.social}>
            {SOCIAL.map(({ name, href, Icon }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label={name}>
                <Icon />
              </a>
            ))}
          </div>
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>{t('shop_title')}</p>
          <ul className={styles.linkList}>
            {shopLinks.map(l => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
          </ul>
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>{t('docs_title')}</p>
          <ul className={styles.linkList}>
            {docLinks.map(l => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
          </ul>
        </div>
      </div>

      <div className={`page-width ${styles.bottom}`}>
        <p className={styles.copy}>{t('copyright', { year })}</p>
        <div className={styles.controls}>
          <LocaleSwitcher currentLocale={locale} />
          <CurrencySwitcher />
        </div>
        <div className={styles.policyRow}>
          {policyLinks.map(l => (
            <Link key={l.href} href={l.href} className={styles.policyLink}>{l.label}</Link>
          ))}
          <button
            className={styles.policyLink}
            onClick={() => window.dispatchEvent(new Event('reopenCookieBanner'))}
          >
            {t('cookie_prefs')}
          </button>
        </div>
      </div>
    </footer>
  )
}
