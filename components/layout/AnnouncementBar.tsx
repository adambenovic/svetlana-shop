'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import styles from './AnnouncementBar.module.css'

const SESSION_KEY = 'sv_announcement_dismissed'

export function AnnouncementBar() {
  const t = useTranslations('announcement')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) setVisible(true)
  }, [])

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(false)
  }

  function copyCode() {
    navigator.clipboard.writeText(t('code')).catch(() => {})
  }

  if (!visible) return null

  return (
    <div className={styles.bar} role="banner" aria-label="Promotional announcement">
      <p className={styles.text}>
        {t('text')}{' '}
        <button className={styles.code} onClick={copyCode} title="Click to copy">
          {t('code')}
        </button>
      </p>
      <button className={styles.dismiss} onClick={dismiss} aria-label={t('dismiss')}>✕</button>
    </div>
  )
}
