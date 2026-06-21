'use client'
import { useEffect, useState } from 'react'

function LampIcon({ lit }: { lit: boolean }) {
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
      {/* Shade */}
      <path d="M7 12l2.5-7h5l2.5 7H7z" />
      {/* Stem */}
      <line x1="12" y1="12" x2="12" y2="17" />
      {/* Base */}
      <path d="M8 17h8" />
      <path d="M9.5 19h5" strokeWidth="2" />
      {/* Rays when lit */}
      {lit && (
        <>
          <line x1="12" y1="3" x2="12" y2="1.5" />
          <line x1="15.5" y1="4.5" x2="16.5" y2="3" />
          <line x1="8.5" y1="4.5" x2="7.5" y2="3" />
        </>
      )}
    </svg>
  )
}

export function ThemeToggle() {
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
      aria-label="Toggle theme"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
    >
      <LampIcon lit={light} />
    </button>
  )
}
