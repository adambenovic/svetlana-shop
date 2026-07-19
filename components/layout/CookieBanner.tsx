'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import styles from './CookieBanner.module.css'

const STORAGE_KEY = 'sv_cookie_consent'

export type ConsentValue = 'accepted' | 'declined'

export function getCookieConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null
  return (localStorage.getItem(STORAGE_KEY) as ConsentValue) ?? null
}

export function CookieBanner() {
  const t = useTranslations('cookies')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)

    function handler() {
      localStorage.removeItem(STORAGE_KEY)
      setVisible(true)
    }
    window.addEventListener('reopenCookieBanner', handler)
    return () => window.removeEventListener('reopenCookieBanner', handler)
  }, [])

  function choose(value: ConsentValue) {
    localStorage.setItem(STORAGE_KEY, value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    // Non-modal: essential-only cookies mean there is no consent to trap the
    // user for. A role="region" banner announces itself without hijacking focus.
    <div className={styles.overlay}>
      <div className={styles.banner} role="region" aria-label={t('title')}>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.desc}>{t('desc')}</p>
        <div className={styles.necessary}>
          <span className={styles.necessaryLabel}>{t('necessary')}</span>
          <span className={styles.necessaryDesc}>{t('necessary_desc')}</span>
        </div>
        <div className={styles.actions}>
          <button className={styles.decline} onClick={() => choose('declined')}>{t('decline')}</button>
          <button className={styles.accept} onClick={() => choose('accepted')}>{t('accept')}</button>
        </div>
      </div>
    </div>
  )
}
