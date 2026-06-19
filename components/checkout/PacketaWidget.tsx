'use client'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'

export interface PacketaPoint {
  id: number
  name: string
  city: string
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
  apiKey: string
  selected: PacketaPoint | null
  onChange: (point: PacketaPoint) => void
}

export function PacketaWidget({ apiKey, selected, onChange }: PacketaWidgetProps) {
  const t = useTranslations('checkout')

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://widget.packeta.com/v6/www/js/library.js'
    script.async = true
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  function openWidget() {
    if (!window.Packeta) { alert('Packeta widget is loading, please try again.'); return }
    window.Packeta.Widget.pick(apiKey, point => { if (point) onChange(point) })
  }

  return (
    <div>
      <Button type="button" variant="secondary" onClick={openWidget}>
        {selected ? t('change_point') : t('select_packeta')}
      </Button>
      {selected && (
        <p style={{ marginTop: 8, color: 'var(--color-text-muted)', fontSize: 14 }}>
          {t('selected_point')}: <strong>{selected.name}</strong>, {selected.city}
        </p>
      )}
    </div>
  )
}
