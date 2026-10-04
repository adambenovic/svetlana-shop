'use client'
import { COOKIE_NOTICE_REOPEN_EVENT } from './CookieBanner'

/** Footer control that brings the cookie notice back (the Footer itself renders on the server). */
export function CookieSettingsButton({ label, className }: { label: string; className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(COOKIE_NOTICE_REOPEN_EVENT))}
    >
      {label}
    </button>
  )
}
