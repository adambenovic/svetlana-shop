'use client'
import { useEffect, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import styles from './ThemeToggle.module.css'

function BulbIcon() {
  // Lit/unlit look is pure CSS keyed off html.light (see the module), so the
  // server-rendered icon is already right on first paint.
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Dome */}
      <path className={styles.dome} d="M9 18c0-1.9-.8-3.7-2.2-5A6 6 0 0 1 6 9a6 6 0 0 1 12 0 6 6 0 0 1-.8 3 8 8 0 0 0-2.2 6" />
      {/* Screw base */}
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="9.5" y1="21" x2="14.5" y2="21" />
      {/* Rays when lit */}
      <g className={styles.rays}>
        <line x1="12" y1="1" x2="12" y2="2.5" />
        <line x1="18.4" y1="5.6" x2="17.3" y2="6.7" />
        <line x1="5.6" y1="5.6" x2="6.7" y2="6.7" />
      </g>
    </svg>
  )
}

// The theme lives on <html class="light">, set before first paint by the inline
// bootstrap script in the locale layout (stored choice, else the OS preference).
// This toggle only reads and flips that class — it never decides the initial theme.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}
const isLight = () => document.documentElement.classList.contains('light')
const isLightOnServer = () => false

function storedTheme(): string | null {
  try { return localStorage.getItem('theme') } catch { return null }
}

export function ThemeToggle() {
  const t = useTranslations('a11y')
  const light = useSyncExternalStore(subscribe, isLight, isLightOnServer)

  // No explicit choice yet: keep following the OS setting while the page is open.
  useEffect(() => {
    if (storedTheme() || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const follow = () => { if (!storedTheme()) document.documentElement.classList.toggle('light', mq.matches) }
    mq.addEventListener('change', follow)
    return () => mq.removeEventListener('change', follow)
  }, [])

  function toggle() {
    const next = !isLight()
    document.documentElement.classList.toggle('light', next)
    try { localStorage.setItem('theme', next ? 'light' : 'dark') } catch { /* storage blocked — session only */ }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('theme_toggle')}
      aria-pressed={light}
      className={styles.toggle}
    >
      <BulbIcon />
    </button>
  )
}
