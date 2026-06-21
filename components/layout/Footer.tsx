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

function PinterestIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  )
}

function VisaIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="38" height="25" role="img" aria-label="Visa">
      <rect width="48" height="32" rx="4" fill="#1a1f71" />
      <text x="24" y="22" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif" letterSpacing="1">VISA</text>
    </svg>
  )
}

function MastercardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="38" height="25" role="img" aria-label="Mastercard">
      <rect width="48" height="32" rx="4" fill="#252525" />
      <circle cx="18" cy="16" r="9" fill="#eb001b" />
      <circle cx="30" cy="16" r="9" fill="#f79e1b" />
      <path d="M24 9.28a9 9 0 0 1 0 13.44A9 9 0 0 1 24 9.28z" fill="#ff5f00" />
    </svg>
  )
}

function GooglePayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="38" height="25" role="img" aria-label="Google Pay">
      <rect width="48" height="32" rx="4" fill="#fff" stroke="#e0e0e0" strokeWidth="1" />
      <text x="24" y="21" textAnchor="middle" fill="#3c4043" fontSize="10" fontWeight="500" fontFamily="Arial, sans-serif">
        <tspan fill="#4285f4">G</tspan>
        <tspan fill="#3c4043">oogle </tspan>
        <tspan fill="#3c4043">Pay</tspan>
      </text>
    </svg>
  )
}

function ApplePayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="38" height="25" role="img" aria-label="Apple Pay">
      <rect width="48" height="32" rx="4" fill="#000" />
      <text x="24" y="21" textAnchor="middle" fill="white" fontSize="10" fontWeight="500" fontFamily="-apple-system, Arial, sans-serif"> Pay</text>
      <text x="13" y="21" textAnchor="middle" fill="white" fontSize="13" fontFamily="-apple-system, Arial, sans-serif"></text>
    </svg>
  )
}

const SOCIAL = [
  { name: 'Instagram', href: 'https://instagram.com/svetla.na.lampe', Icon: InstagramIcon },
  { name: 'TikTok', href: 'https://tiktok.com/@svetlana.lampe', Icon: TikTokIcon },
  { name: 'Pinterest', href: 'https://pinterest.com/svetlanalampe', Icon: PinterestIcon },
]

const PAYMENT_ICONS = [VisaIcon, MastercardIcon, GooglePayIcon, ApplePayIcon]

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
        <div className={styles.paymentIcons}>
          {PAYMENT_ICONS.map((Icon, i) => <Icon key={i} />)}
        </div>
      </div>
    </footer>
  )
}
