'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { SwatchPicker } from './SwatchPicker'
import { ShapeGrid } from './ShapeGrid'
import { BulbPicker } from './BulbPicker'
import { PriceSummary } from './PriceSummary'
import { ConfiguratorPreview } from './ConfiguratorPreview'
import { useCart } from '@/store/cart'
import type { PartsData } from '@/types/parts'
import styles from './Configurator.module.css'

interface ConfiguratorProps {
  partsKey: string
  basePrice: number
  currency: string
  productId: string
  productTitle: string
}

type BulbType = 'warm' | 'cold' | 'none'
type Tab = 'base' | 'shade' | 'cable' | 'bulb'

export function Configurator({ partsKey, basePrice, currency, productId, productTitle }: ConfiguratorProps) {
  const t = useTranslations('configurator')
  const router = useRouter()
  const searchParams = useSearchParams()
  const addItem = useCart(s => s.addItem)

  const [parts, setParts] = useState<PartsData | null>(null)
  const [tab, setTab] = useState<Tab>('base')

  // State synced to URL query params for deep-linking
  const [baseColor, setBaseColor] = useState(searchParams.get('baseColor') ?? '')
  const [base, setBase] = useState(searchParams.get('base') ?? '')
  const [shadeColor, setShadeColor] = useState(searchParams.get('shadeColor') ?? '')
  const [shade, setShade] = useState(searchParams.get('shade') ?? '')
  const [cable, setCable] = useState(searchParams.get('cable') ?? '')
  const [sw, setSw] = useState(searchParams.get('switch') ?? '')
  const [plug, setPlug] = useState(searchParams.get('plug') ?? '')
  const [bulb, setBulb] = useState<BulbType>((searchParams.get('bulb') as BulbType) ?? 'warm')
  const [copied, setCopied] = useState(false)

  const [partsError, setPartsError] = useState(false)

  // Load parts.json once
  useEffect(() => {
    fetch('/parts.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((data: PartsData) => setParts(data))
      .catch(() => setPartsError(true))
  }, [])

  // Set defaults after parts load (only if not already set from URL)
  useEffect(() => {
    if (!parts) return
    if (!baseColor) setBaseColor(parts.colors[0]?.id ?? '')
    if (!base) setBase(parts.bases[0]?.id ?? '')
    if (!shadeColor) setShadeColor(parts.colors[0]?.id ?? '')
    if (!shade) setShade(parts.shades[0]?.id ?? '')
    if (!cable) setCable(parts.cable_colors[0]?.id ?? '')
    if (!sw) setSw(parts.switch_options[0]?.id ?? '')
    if (!plug) setPlug(parts.plug_options[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts])

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncUrl = useCallback(
    (updates: Record<string, string>) => {
      if (syncTimer.current) clearTimeout(syncTimer.current)
      syncTimer.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())
        Object.entries(updates).forEach(([k, v]) => params.set(k, v))
        router.replace(`?${params.toString()}`, { scroll: false })
      }, 150)
    },
    [router, searchParams]
  )

  const configuration = useMemo(
    () => ({
      baseColor,
      base,
      shadeColor,
      shade,
      cable,
      switch: sw,
      plug,
      bulb,
    }),
    [baseColor, base, shadeColor, shade, cable, sw, plug, bulb]
  )

  // Price = basePrice + priceModifiers on selected shapes (colors have no modifier in current data)
  const totalPrice = useMemo(() => {
    if (!parts) return basePrice
    const baseMod = parts.bases.find(p => p.id === base)?.priceModifier ?? 0
    const shadeMod = parts.shades.find(p => p.id === shade)?.priceModifier ?? 0
    return basePrice + baseMod + shadeMod
  }, [parts, basePrice, base, shade])

  function handleAddToCart() {
    addItem({
      productId,
      title: productTitle,
      configuration,
      quantity: 1,
      unitPrice: totalPrice,
      currency,
    })
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'base', label: t('tab_base') },
    { id: 'shade', label: t('tab_shade') },
    { id: 'cable', label: t('tab_cable') },
    { id: 'bulb', label: t('tab_bulb') },
  ]

  if (partsError) {
    return <div className={styles.loading} style={{ color: 'var(--color-accent)' }}>{t('error_loading') ?? 'Failed to load configurator data. Please refresh.'}</div>
  }

  if (!parts) {
    return <div className={styles.loading}>{t('loading') ?? 'Loading...'}</div>
  }

  return (
    <div className={styles.configurator}>
      {/* Tab bar */}
      <div className={styles.tabs} role="tablist">
        {tabs.map(tb => (
          <button
            key={tb.id}
            role="tab"
            aria-selected={tab === tb.id}
            className={[styles.tab, tab === tb.id ? styles.tabActive : ''].join(' ')}
            onClick={() => setTab(tb.id)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className={styles.panel} role="tabpanel">
        {tab === 'base' && (
          <>
            <h4 className={styles.sectionLabel}>{t('pick_color')}</h4>
            <SwatchPicker
              parts={parts.colors}
              selected={baseColor}
              onChange={v => { setBaseColor(v); syncUrl({ baseColor: v }) }}
            />
            <h4 className={styles.sectionLabel}>{t('pick_shape')}</h4>
            <ShapeGrid
              parts={parts.bases}
              selected={base}
              onChange={v => { setBase(v); syncUrl({ base: v }) }}
            />
          </>
        )}

        {tab === 'shade' && (
          <>
            <h4 className={styles.sectionLabel}>{t('pick_color')}</h4>
            <SwatchPicker
              parts={parts.colors}
              selected={shadeColor}
              onChange={v => { setShadeColor(v); syncUrl({ shadeColor: v }) }}
            />
            <h4 className={styles.sectionLabel}>{t('pick_shape')}</h4>
            <ShapeGrid
              parts={parts.shades}
              selected={shade}
              onChange={v => { setShade(v); syncUrl({ shade: v }) }}
            />
          </>
        )}

        {tab === 'cable' && (
          <>
            <h4 className={styles.sectionLabel}>{t('pick_cable_color')}</h4>
            <SwatchPicker
              parts={parts.cable_colors}
              selected={cable}
              onChange={v => { setCable(v); syncUrl({ cable: v }) }}
            />
            <h4 className={styles.sectionLabel}>{t('pick_switch')}</h4>
            <SwatchPicker
              parts={parts.switch_options}
              selected={sw}
              onChange={v => { setSw(v); syncUrl({ switch: v }) }}
            />
            <h4 className={styles.sectionLabel}>{t('pick_plug')}</h4>
            <SwatchPicker
              parts={parts.plug_options}
              selected={plug}
              onChange={v => { setPlug(v); syncUrl({ plug: v }) }}
            />
          </>
        )}

        {tab === 'bulb' && (
          <BulbPicker
            selected={bulb}
            onChange={v => { setBulb(v); syncUrl({ bulb: v }) }}
          />
        )}
      </div>

      {/* Live preview — right column, spans all rows */}
      <ConfiguratorPreview
        base={base}
        baseColor={baseColor}
        shade={shade}
        shadeColor={shadeColor}
      />

      {/* Price summary + actions */}
      <PriceSummary
        totalPrice={totalPrice}
        currency={currency}
        copied={copied}
        onAddToCart={handleAddToCart}
        onShare={handleShare}
      />
    </div>
  )
}
