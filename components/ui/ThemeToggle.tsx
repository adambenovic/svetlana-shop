'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

function BulbIcon({ lit }: { lit: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill={lit ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Dome */}
      <path d="M9 18c0-1.9-.8-3.7-2.2-5A6 6 0 0 1 6 9a6 6 0 0 1 12 0 6 6 0 0 1-.8 3 8 8 0 0 0-2.2 6" />
      {/* Screw base */}
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="9.5" y1="21" x2="14.5" y2="21" />
      {/* Rays when lit */}
      {lit && (
        <>
          <line x1="12" y1="1" x2="12" y2="2.5" />
          <line x1="18.4" y1="5.6" x2="17.3" y2="6.7" />
          <line x1="5.6" y1="5.6" x2="6.7" y2="6.7" />
        </>
      )}
    </svg>
  )
}

export function ThemeToggle() {
  const t = useTranslations('a11y')
  const [light, setLight] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light') { setLight(true); document.documentElement.classList.add('light') }
  }, [])

  function toggle() {
    const next = !light
    setLight(next)
    document.documentElement.classList.toggle('light', next)
    localStorage.setItem('theme', next ? 'light' : 'dark')
  }

  return (
    <button
      onClick={toggle}
      aria-label={t('theme_toggle')}
      aria-pressed={light}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
    >
      <BulbIcon lit={light} />
    </button>
  )
}
