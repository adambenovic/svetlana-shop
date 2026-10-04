'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useCart } from '@/store/cart'
import styles from './AnnouncementBar.module.css'

const SESSION_KEY = 'sv_announcement_dismissed'
/** How long the "code applied" confirmation stays up before navigating. */
const CONFIRM_MS = 1200

// Rendered on the server for everyone (no CLS). A dismissal is remembered for
// the session: the inline bootstrap script in the locale layout turns the
// session key into html[data-ann-dismissed] before first paint, and globals.css
// hides [data-announcement] under it (contract C-f).
export function AnnouncementBar() {
  const t = useTranslations('announcement')
  const tc = useTranslations('cart')
  const ta = useTranslations('a11y')
  const router = useRouter()
  const items = useCart(s => s.items)
  const setDiscount = useCart(s => s.setDiscount)
  const [dismissed, setDismissed] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function dismiss() {
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* storage blocked — hide for this page view */ }
    document.documentElement.dataset.annDismissed = '1'
    setDismissed(true)
  }

  async function applyCode() {
    if (busy) return
    setBusy(true)
    // Apply the promo to the cart (server-validated), confirm it briefly, then
    // take the visitor to their cart — or to the configurator when it is empty.
    const target = items.length > 0 ? '/cart' : '/configurator'
    try {
      const res = await fetch(`/api/discounts/validate?code=${encodeURIComponent(t('code'))}`)
      const data = await res.json() as { valid: boolean; code?: string; percent?: number }
      if (!data.valid || !data.code || !data.percent) {
        // Expired / used up: say so and stay — sending them on would be pointless.
        setStatus({ ok: false, text: tc('discount_invalid') })
        setBusy(false)
        return
      }
      setDiscount({ code: data.code, percent: data.percent })
      setStatus({ ok: true, text: tc('discount_applied', { code: data.code, percent: data.percent }) })
      timer.current = setTimeout(() => router.push(target), CONFIRM_MS)
    } catch {
      // Network trouble: still navigate — the code can be entered manually in the cart.
      router.push(target)
    }
  }

  if (dismissed) return null

  return (
    <div className={styles.bar} role="region" aria-label={ta('announcement_region')} data-announcement="">
      <p className={styles.text}>
        {t('text')}{' '}
        <button
          type="button"
          className={styles.code}
          onClick={applyCode}
          aria-label={ta('use_promo_code', { code: t('code') })}
          aria-disabled={busy || undefined}
        >
          {t('code')}
        </button>
        {/* Always mounted so screen readers announce the confirmation. */}
        <span className={styles.status} role="status">
          {status && <>{status.ok ? '✓ ' : ''}{status.text}</>}
        </span>
      </p>
      <button type="button" className={styles.dismiss} onClick={dismiss} aria-label={t('dismiss')}>✕</button>
    </div>
  )
}
