'use client'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { SHIPPING_COUNTRIES } from '@/lib/countries'

export interface PacketaPoint {
  id: number
  name: string
  city: string
  /** ISO alpha-2 country of the pickup point (Packeta returns e.g. "cz", "sk") */
  country?: string
}

declare global {
  interface Window {
    Packeta?: {
      Widget: {
        pick: (apiKey: string, callback: (point: PacketaPoint | null) => void, options?: object) => void
      }
    }
  }
}

interface PacketaWidgetProps {
  selected: PacketaPoint | null
  onChange: (point: PacketaPoint) => void
}

// Restrict the map to the countries we deliver to (Packeta wants lowercase,
// comma-separated alpha-2 codes).
const WIDGET_COUNTRIES = SHIPPING_COUNTRIES.map(c => c.toLowerCase()).join(',')

export function PacketaWidget({ selected, onChange }: PacketaWidgetProps) {
  const apiKey = process.env.NEXT_PUBLIC_PACKETA_WIDGET_KEY ?? ''
  const t = useTranslations('checkout')
  const locale = useLocale()
  const [status, setStatus] = useState<'idle' | 'loading' | 'failed'>('idle')

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://widget.packeta.com/v6/www/js/library.js'
    script.async = true
    script.onload = () => setStatus('idle')
    script.onerror = () => setStatus('failed')
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  function openWidget() {
    if (!window.Packeta) {
      // Still downloading (or blocked) — say so inline; no window.alert.
      setStatus(s => s === 'failed' ? 'failed' : 'loading')
      return
    }
    setStatus('idle')
    window.Packeta.Widget.pick(apiKey, point => { if (point) onChange(point) }, {
      country: WIDGET_COUNTRIES,
      language: locale,
    })
  }

  return (
    <div>
      <Button type="button" variant="secondary" onClick={openWidget}>
        {selected ? t('change_point') : t('select_packeta')}
      </Button>
      {status !== 'idle' && (
        <p role="status" style={{ marginTop: 8, color: 'var(--color-text-muted)', fontSize: 14 }}>
          {status === 'failed' ? t('packeta_failed') : t('packeta_loading')}
        </p>
      )}
      {selected && (
        <p style={{ marginTop: 8, color: 'var(--color-text-muted)', fontSize: 14 }}>
          {t('selected_point')}: <strong>{selected.name}</strong>, {selected.city}
        </p>
      )}
    </div>
  )
}
