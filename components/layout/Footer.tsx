'use client'
import { Link } from '@/i18n/navigation'
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
    // Official Google Pay acceptance mark (flat variant) — do not restyle; brand
    // guidelines require the mark as-is: https://developers.google.com/pay/api/web/guides/brand-guidelines
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="170.7 170 752 400" width="47" height="25" role="img" aria-label="Google Pay">
      <path fill="#FFFFFF" d="M722.7,170h-352c-110,0-200,90-200,200l0,0c0,110,90,200,200,200h352c110,0,200-90,200-200l0,0 C922.7,260,832.7,170,722.7,170z"/> <path fill="#3C4043" d="M722.7,186.2c24.7,0,48.7,4.9,71.3,14.5c21.9,9.3,41.5,22.6,58.5,39.5 c16.9,16.9,30.2,36.6,39.5,58.5c9.6,22.6,14.5,46.6,14.5,71.3s-4.9,48.7-14.5,71.3c-9.3,21.9-22.6,41.5-39.5,58.5 c-16.9,16.9-36.6,30.2-58.5,39.5c-22.6,9.6-46.6,14.5-71.3,14.5h-352c-24.7,0-48.7-4.9-71.3-14.5c-21.9-9.3-41.5-22.6-58.5-39.5 c-16.9-16.9-30.2-36.6-39.5-58.5c-9.6-22.6-14.5-46.6-14.5-71.3s4.9-48.7,14.5-71.3c9.3-21.9,22.6-41.5,39.5-58.5 c16.9-16.9,36.6-30.2,58.5-39.5c22.6-9.6,46.6-14.5,71.3-14.5L722.7,186.2 M722.7,170h-352c-110,0-200,90-200,200l0,0 c0,110,90,200,200,200h352c110,0,200-90,200-200l0,0C922.7,260,832.7,170,722.7,170L722.7,170z"/> <g> <g> <path fill="#3C4043" d="M529.3,384.2v60.5h-19.2V295.3H561c12.9,0,23.9,4.3,32.9,12.9 c9.2,8.6,13.8,19.1,13.8,31.5c0,12.7-4.6,23.2-13.8,31.7c-8.9,8.5-19.9,12.7-32.9,12.7h-31.7V384.2z M529.3,313.7v52.1h32.1 c7.6,0,14-2.6,19-7.7c5.1-5.1,7.7-11.3,7.7-18.3c0-6.9-2.6-13-7.7-18.1c-5-5.3-11.3-7.9-19-7.9h-32.1V313.7z"/> <path fill="#3C4043" d="M657.9,339.1c14.2,0,25.4,3.8,33.6,11.4c8.2,7.6,12.3,18,12.3,31.2v63h-18.3v-14.2h-0.8 c-7.9,11.7-18.5,17.5-31.7,17.5c-11.3,0-20.7-3.3-28.3-10s-11.4-15-11.4-25c0-10.6,4-19,12-25.2c8-6.3,18.7-9.4,32-9.4 c11.4,0,20.8,2.1,28.1,6.3v-4.4c0-6.7-2.6-12.3-7.9-17c-5.3-4.7-11.5-7-18.6-7c-10.7,0-19.2,4.5-25.4,13.6l-16.9-10.6 C625.9,345.8,639.7,339.1,657.9,339.1z M633.1,413.3c0,5,2.1,9.2,6.4,12.5c4.2,3.3,9.2,5,14.9,5c8.1,0,15.3-3,21.6-9 s9.5-13,9.5-21.1c-6-4.7-14.3-7.1-25-7.1c-7.8,0-14.3,1.9-19.5,5.6C635.7,403.1,633.1,407.8,633.1,413.3z"/> <path fill="#3C4043" d="M808.2,342.4l-64,147.2h-19.8l23.8-51.5L706,342.4h20.9l30.4,73.4h0.4l29.6-73.4H808.2z"/> </g> <g> <path fill="#4285F4" d="M452.93,372c0-6.26-0.56-12.25-1.6-18.01h-80.48v33L417.2,387 c-1.88,10.98-7.93,20.34-17.2,26.58v21.41h27.59C443.7,420.08,452.93,398.04,452.93,372z"/> <path fill="#34A853" d="M400.01,413.58c-7.68,5.18-17.57,8.21-29.14,8.21c-22.35,0-41.31-15.06-48.1-35.36 h-28.46v22.08c14.1,27.98,43.08,47.18,76.56,47.18c23.14,0,42.58-7.61,56.73-20.71L400.01,413.58z"/> <path fill="#FABB05" d="M320.09,370.05c0-5.7,0.95-11.21,2.68-16.39v-22.08h-28.46 c-5.83,11.57-9.11,24.63-9.11,38.47s3.29,26.9,9.11,38.47l28.46-22.08C321.04,381.26,320.09,375.75,320.09,370.05z"/> <path fill="#E94235" d="M370.87,318.3c12.63,0,23.94,4.35,32.87,12.85l24.45-24.43 c-14.85-13.83-34.21-22.32-57.32-22.32c-33.47,0-62.46,19.2-76.56,47.18l28.46,22.08C329.56,333.36,348.52,318.3,370.87,318.3z"/> </g> </g>
    </svg>
  )
}

function ApplePayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="38" height="25" role="img" aria-label="Apple Pay">
      <rect width="48" height="32" rx="4" fill="#000" />
      {/* Apple logo path */}
      <path d="M13.5 11.2c.6-.7 1-1.7.9-2.7-.9.1-2 .6-2.6 1.3-.6.6-1.1 1.6-.9 2.6.9.1 1.9-.4 2.6-1.2zm.9 1.4c-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.7-1.5.1-2.8.8-3.6 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.8 2.1 1.1-.1 1.5-.7 2.8-.7 1.3 0 1.7.7 2.8.7 1.2 0 2-.9 2.8-2 .9-1.3 1.2-2.5 1.2-2.6-.1 0-2.4-.9-2.4-3.5 0-2.2 1.8-3.2 1.9-3.3-.9-1.5-2.4-1.5-2.8-1.6h-.5z" fill="white" />
      <text x="34" y="21" textAnchor="middle" fill="white" fontSize="10" fontWeight="500" fontFamily="-apple-system, Arial, sans-serif">Pay</text>
    </svg>
  )
}

const SOCIAL = [
  { name: 'Instagram', href: 'https://instagram.com/svetla.na.lampe', Icon: InstagramIcon },
  { name: 'TikTok', href: 'https://tiktok.com/@svetlana.lampe', Icon: TikTokIcon },
  { name: 'Pinterest', href: 'https://pinterest.com/svetlanalampe3d', Icon: PinterestIcon },
]

const PAYMENT_ICONS = [VisaIcon, MastercardIcon, GooglePayIcon, ApplePayIcon]

export function Footer({ locale }: { locale: string }) {
  const t = useTranslations('sections.footer')
  const year = new Date().getFullYear()
  type Href = React.ComponentProps<typeof Link>['href']

  const shopLinks: Array<{ label: string; href: Href }> = [
    { label: t('menu_home'), href: '/' },
    { label: t('menu_configurator'), href: '/configurator' },
    { label: t('menu_gallery'), href: '/gallery' },
  ]

  const docLinks: Array<{ label: string; href: Href }> = [
    { label: t('doc_manual'), href: { pathname: '/pages/[slug]', params: { slug: 'lamp-manual' } } },
    { label: t('doc_conformity'), href: { pathname: '/pages/[slug]', params: { slug: 'declaration-of-conformity' } } },
  ]

  const policyLinks: Array<{ label: string; href: Href }> = [
    { label: t('policy_privacy'), href: { pathname: '/policies/[handle]', params: { handle: 'privacy-policy' } } },
    { label: t('policy_shipping'), href: { pathname: '/policies/[handle]', params: { handle: 'shipping-policy' } } },
    { label: t('policy_refund'), href: { pathname: '/policies/[handle]', params: { handle: 'refund-policy' } } },
    { label: t('policy_terms'), href: { pathname: '/policies/[handle]', params: { handle: 'terms-of-service' } } },
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
          <div className={styles.paymentIcons}>
            {PAYMENT_ICONS.map((Icon, i) => <Icon key={i} />)}
          </div>
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>{t('shop_title')}</p>
          <ul className={styles.linkList}>
            {shopLinks.map(l => <li key={l.label}><Link href={l.href}>{l.label}</Link></li>)}
          </ul>
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>{t('docs_title')}</p>
          <ul className={styles.linkList}>
            {docLinks.map(l => <li key={l.label}><Link href={l.href}>{l.label}</Link></li>)}
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
            <Link key={l.label} href={l.href} className={styles.policyLink}>{l.label}</Link>
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
