'use client'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import styles from './CookieBanner.module.css'

// Remembers that the notice was acknowledged (any value counts; older visits
// stored 'accepted'/'declined' from the former consent banner).
const STORAGE_KEY = 'sv_cookie_consent'

/** Window event that brings the notice back (footer "Cookie settings"). */
export const COOKIE_NOTICE_REOPEN_EVENT = 'reopenCookieBanner'

// Acknowledgement as an external store: read on the client only (the server
// renders nothing — the notice is a fixed overlay, so appearing after hydration
// shifts no layout); other tabs' acknowledgements arrive via 'storage' events.
function subscribeStorage(onChange: () => void) {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}
function readAcknowledged(): boolean {
  // Storage blocked: the notice can't be remembered — stay quiet rather than nag.
  try { return !!localStorage.getItem(STORAGE_KEY) } catch { return true }
}
const acknowledgedOnServer = () => true

/**
 * The site only uses strictly necessary storage (cart, display preferences), so
 * there is nothing to consent to — just a non-modal one-line notice with a link
 * to the cookie policy and a single acknowledge button.
 */
export function CookieBanner() {
  const t = useTranslations('cookies')
  const stored = useSyncExternalStore(subscribeStorage, readAcknowledged, acknowledgedOnServer)
  const [acknowledgedNow, setAcknowledgedNow] = useState(false)
  const [reopened, setReopened] = useState(false)
  const okRef = useRef<HTMLButtonElement>(null)
  // Focus to restore when the notice was opened from the footer.
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    function reopen() {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setReopened(true)
      // Opened on request: move focus into it (first appearance never steals focus).
      requestAnimationFrame(() => okRef.current?.focus())
    }
    window.addEventListener(COOKIE_NOTICE_REOPEN_EVENT, reopen)
    return () => window.removeEventListener(COOKIE_NOTICE_REOPEN_EVENT, reopen)
  }, [])

  function acknowledge() {
    try { localStorage.setItem(STORAGE_KEY, 'acknowledged') } catch { /* session only */ }
    setAcknowledgedNow(true)
    setReopened(false)
    returnFocus.current?.focus()
    returnFocus.current = null
  }

  const visible = reopened || (!stored && !acknowledgedNow)
  if (!visible) return null

  return (
    // Non-modal: a role="region" landmark announces itself without trapping or
    // hijacking focus; Escape dismisses it like the button.
    <div className={styles.overlay}>
      <div
        className={styles.banner}
        role="region"
        aria-label={t('title')}
        onKeyDown={e => { if (e.key === 'Escape') acknowledge() }}
      >
        <p className={styles.desc}>
          {t('notice')}{' '}
          <Link
            href={{ pathname: '/policies/[handle]', params: { handle: 'cookie-preferences' } }}
            prefetch={false}
            className={styles.policyLink}
          >
            {t('policy_link')}
          </Link>
        </p>
        <button ref={okRef} type="button" className={styles.accept} onClick={acknowledge}>
          {t('ok')}
        </button>
      </div>
    </div>
  )
}
