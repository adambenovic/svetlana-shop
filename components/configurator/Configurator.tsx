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
import type { PriceMap } from '@/store/currency'
import { applyModifier } from '@/lib/prices'
import type { PartsData } from '@/types/parts'
import styles from './Configurator.module.css'

interface ConfiguratorProps {
  partsKey: string
  prices: PriceMap
  productId: string
  productTitle: string
}

type BulbType = 'warm' | 'cold' | 'none'
type Tab = 'base' | 'shade' | 'cable' | 'bulb'

export function Configurator({ partsKey, prices, productId, productTitle }: ConfiguratorProps) {
  const t = useTranslations('configurator')
  const router = useRouter()
  const searchParams = useSearchParams()
  const addItem = useCart(s => s.addItem)

  const [parts, setParts] = useState<PartsData | null>(null)
  const [tab, setTab] = useState<Tab>('base')

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

  useEffect(() => {
    fetch('/parts.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((data: PartsData) => setParts(data))
      .catch(() => setPartsError(true))
  }, [])

  useEffect(() => {
    if (!parts) return
    const solidColors = parts.colors.filter(c => c.id !== 'clear' && !c.id.startsWith('translucent'))
    const firstSolid = solidColors[0]?.id ?? ''
    if (!baseColor || baseColor === 'clear' || baseColor.startsWith('translucent')) setBaseColor(firstSolid)
    if (!base) setBase(parts.bases[0]?.id ?? '')
    // Skip colors without shade images (white, yellow have no image files)
    const firstShadeColor = parts.colors.find(c => c.id !== 'white' && c.id !== 'yellow' && c.id !== 'clear' && !c.id.startsWith('translucent'))?.id ?? parts.colors[0]?.id ?? ''
    if (!shadeColor) setShadeColor(firstShadeColor)
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

  const configuration = useMemo(() => ({
    baseColor, base, shadeColor, shade, cable, switch: sw, plug, bulb,
  }), [baseColor, base, shadeColor, shade, cable, sw, plug, bulb])

  const totalPrices = useMemo(() => {
    if (!parts) return prices
    const baseMod = parts.bases.find(p => p.id === base)?.priceModifier ?? 0
    const shadeMod = parts.shades.find(p => p.id === shade)?.priceModifier ?? 0
    return applyModifier(prices, baseMod + shadeMod)
  }, [parts, prices, base, shade])

  // Derived display values
  const selectedBase = parts?.bases.find(p => p.id === base)
  const selectedShade = parts?.shades.find(p => p.id === shade)
  const selectedBaseColor = parts?.colors.find(c => c.id === baseColor)
  const selectedShadeColor = parts?.colors.find(c => c.id === shadeColor)
  const selectedCable = parts?.cable_colors.find(c => c.id === cable)
  const selectedSwitch = parts?.switch_options.find(c => c.id === sw)
  const selectedPlug = parts?.plug_options.find(c => c.id === plug)

  function handleAddToCart() {
    const shadeImg = shade && shadeColor ? `/assets/shades/${shade.replace(/ /g, '%20')}-${shadeColor}.webp` : undefined
    const baseImg = base && baseColor ? `/assets/bases/${base.replace(/ /g, '%20')}-${baseColor}.webp` : undefined
    addItem({
      productId,
      title: productTitle,
      configuration,
      quantity: 1,
      unitPrice: totalPrices.EUR ?? 0,
      currency: 'EUR',
      prices: totalPrices,
      imageUrl: shadeImg ?? baseImg,
      baseImageUrl: shadeImg ? baseImg : undefined,
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
    return <div className={styles.loading} style={{ color: 'var(--color-accent)' }}>{t('error_loading')}</div>
  }

  if (!parts) {
    return <div className={styles.loading}>{t('loading')}</div>
  }

  return (
    <div className={styles.configurator}>
      {/* Preview — left column, sticky */}
      <ConfiguratorPreview
        base={base}
        baseColor={baseColor}
        shade={shade}
        shadeColor={shadeColor}
      />

      {/* Controls — right column */}
      <div className={styles.controls}>
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
              <h4 className={styles.sectionLabel}>{t('pick_base_color')}</h4>
              <SwatchPicker
                parts={parts.colors.filter(c => c.id !== 'clear' && !c.id.startsWith('translucent'))}
                selected={baseColor}
                onChange={v => { setBaseColor(v); syncUrl({ baseColor: v }) }}
              />
              <h4 className={styles.sectionLabel}>{t('pick_base')}</h4>
              <ShapeGrid
                parts={parts.bases}
                selected={base}
                onChange={v => { setBase(v); syncUrl({ base: v }) }}
              />
              {selectedBase && (
                <p className={styles.dims}>
                  {t('label_height')}: {selectedBase.height_mm}mm · {t('label_diameter')}: {selectedBase.diameter_mm}mm
                </p>
              )}
            </>
          )}

          {tab === 'shade' && (
            <>
              <h4 className={styles.sectionLabel}>{t('pick_shade_color')}</h4>
              <SwatchPicker
                parts={parts.colors}
                selected={shadeColor}
                onChange={v => { setShadeColor(v); syncUrl({ shadeColor: v }) }}
              />
              <h4 className={styles.sectionLabel}>{t('pick_shade')}</h4>
              <ShapeGrid
                parts={parts.shades}
                selected={shade}
                onChange={v => { setShade(v); syncUrl({ shade: v }) }}
              />
              {selectedShade && (
                <p className={styles.dims}>
                  {t('label_height')}: {selectedShade.height_mm}mm · {t('label_diameter')}: {selectedShade.diameter_mm}mm
                </p>
              )}
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
              {selectedCable?.swatch && (
                <div className={styles.cablePreview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedCable.swatch} alt={selectedCable.name} className={styles.cablePreviewImg} />
                  <span className={styles.cablePreviewName}>{selectedCable.name}</span>
                </div>
              )}
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

        {/* Price + actions */}
        <PriceSummary
          prices={totalPrices}
          copied={copied}
          onAddToCart={handleAddToCart}
          onShare={handleShare}
        />

        {/* Disclaimer */}
        <p className={styles.disclaimer}>{t('render_disclaimer')}</p>

        {/* Combination summary */}
        <table className={styles.summaryTable} aria-label={t('label_combination')}>
          <tbody>
            <tr><td>{t('label_base')}</td><td>{selectedBase?.name ?? '—'}</td></tr>
            <tr><td>{t('label_base_color')}</td><td>{selectedBaseColor?.name ?? '—'}</td></tr>
            <tr><td>{t('label_shade')}</td><td>{selectedShade?.name ?? '—'}</td></tr>
            <tr><td>{t('label_shade_color')}</td><td>{selectedShadeColor?.name ?? '—'}</td></tr>
            <tr><td>{t('label_cable_color')}</td><td>{selectedCable?.name ?? '—'}</td></tr>
            <tr><td>{t('label_switch')}</td><td>{selectedSwitch?.name ?? '—'}</td></tr>
            <tr><td>{t('label_plug')}</td><td>{selectedPlug?.name ?? '—'}</td></tr>
            <tr><td>{t('label_bulb')}</td><td>{t(`bulb_${bulb}`)}</td></tr>
            {selectedBase && selectedShade && (
              <tr>
                <td>{t('label_total_dimensions')}</td>
                <td>{selectedBase.height_mm + selectedShade.height_mm}mm × {Math.max(selectedBase.diameter_mm, selectedShade.diameter_mm)}mm</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Info accordions */}
        <div className={styles.accordions}>
          {([
            ['info_specs', 'specs_content'],
            ['info_shipping', 'shipping_content'],
            ['info_safety', 'safety_content'],
            ['info_care', 'care_content'],
          ] as const).map(([titleKey, bodyKey]) => (
            <details key={titleKey} className={styles.accordion}>
              <summary>{t(titleKey)}</summary>
              <div className={styles.accordionBody}>{t(bodyKey)}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
