// Maps a lamp configuration (raw config keys + part/color ids) to human-readable,
// localized label/value pairs for display in cart, drawer, checkout and product page.
//
// Labels reuse the existing `configurator` message namespace (label_base, …).
// Part/color values resolve to their display names from public/parts.json.
// The bulb value is localized via the configurator `bulb_*` keys.
import partsData from '../public/parts.json'
import type { PartsData } from '@/types/parts'

const parts = partsData as unknown as PartsData

/** A translator scoped to the `configurator` namespace (useTranslations or getTranslations). */
type Translate = (key: string) => string

export interface ConfigLine {
  /** Config key, e.g. "base" — stable, usable as a React key */
  key: string
  /** Localized label, e.g. "Base color" */
  label: string
  /** Human-readable value, e.g. "White" / "Base 1" */
  value: string
}

// Config key -> configurator label message key. Order defines display order.
const LABELS: [key: string, labelKey: string][] = [
  ['base', 'label_base'],
  ['baseColor', 'label_base_color'],
  ['shade', 'label_shade'],
  ['shadeColor', 'label_shade_color'],
  ['cable', 'label_cable_color'],
  ['switch', 'label_switch'],
  ['plug', 'label_plug'],
  ['bulb', 'label_bulb'],
]

function nameOf(list: { id: string; name: string }[], id: string): string {
  return list.find(p => p.id === id)?.name ?? id
}

function displayValue(key: string, raw: string, t: Translate): string {
  switch (key) {
    // Base/shade ids ("Base 1", "Shade 3") already read cleanly.
    case 'base':
    case 'shade':
      return raw
    case 'baseColor':
    case 'shadeColor':
      return nameOf(parts.colors, raw)
    case 'cable':
      return nameOf(parts.cable_colors, raw)
    case 'switch':
      return nameOf(parts.switch_options, raw)
    case 'plug':
      return nameOf(parts.plug_options, raw)
    case 'bulb':
      // warm | cold | none -> configurator.bulb_warm etc.
      return ['warm', 'cold', 'none'].includes(raw) ? t(`bulb_${raw}`) : raw
    default:
      return raw
  }
}

/** Build the ordered list of localized label/value pairs for a configuration. */
export function lampConfigLines(
  configuration: Record<string, string> | null | undefined,
  t: Translate,
): ConfigLine[] {
  const config = configuration ?? {}
  const lines: ConfigLine[] = []
  for (const [key, labelKey] of LABELS) {
    const raw = config[key]
    if (!raw) continue
    lines.push({ key, label: t(labelKey), value: displayValue(key, raw, t) })
  }
  return lines
}

/** Compact single-line summary: "Base: Base 1 · Base color: White · …". */
export function lampConfigSummary(
  configuration: Record<string, string> | null | undefined,
  t: Translate,
): string {
  return lampConfigLines(configuration, t)
    .map(l => `${l.label}: ${l.value}`)
    .join(' · ')
}
