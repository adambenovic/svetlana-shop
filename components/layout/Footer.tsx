'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import styles from './Footer.module.css'

const SOCIAL = [
  { name: 'Instagram', href: 'https://www.instagram.com/svetlana.lampe/' },
  { name: 'Facebook', href: 'https://www.facebook.com/svetlanalampe' },
  { name: 'TikTok', href: 'https://www.tiktok.com/@svetlana.lampe' },
]

function NewsletterForm() {
  const t = useTranslations('sections.footer')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('newsletter_invalid'))
      return
    }
    setError('')
    setDone(true)
  }

  if (done) return <p className={styles.newsletterSuccess}>{t('newsletter_success')}</p>

  return (
    <form className={styles.newsletterForm} onSubmit={handleSubmit} noValidate>
      <input
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError('') }}
        placeholder={t('newsletter_placeholder')}
        className={styles.newsletterInput}
        aria-label={t('newsletter_label')}
      />
      <button type="submit" className={styles.newsletterBtn}>{t('newsletter_submit')}</button>
      {error && <p className={styles.newsletterError} role="alert">{error}</p>}
    </form>
  )
}

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
    { label: t('policy_privacy'), href: `${prefix}/policies/privacy-policy` },
    { label: t('policy_shipping'), href: `${prefix}/policies/shipping-policy` },
    { label: t('policy_refund'), href: `${prefix}/policies/refund-policy` },
    { label: t('policy_terms'), href: `${prefix}/policies/terms-of-service` },
    { label: t('policy_legal'), href: `${prefix}/pages/legal-notice` },
  ]

  return (
    <footer className={styles.footer}>
      <div className={`page-width ${styles.grid}`}>
        <div className={styles.brand}>
          <span className={styles.brandName}>Svetlana Lampe</span>
          <p className={styles.brandDesc}>{t('brand_desc')}</p>
          <div className={styles.social}>
            {SOCIAL.map(s => (
              <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                {s.name}
              </a>
            ))}
          </div>
          <div className={styles.newsletter}>
            <p className={styles.newsletterLabel}>{t('newsletter_label')}</p>
            <NewsletterForm />
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
        <div className={styles.policyRow}>
          {docLinks.slice(0, 3).map(l => (
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
