// Maps a lamp configuration (raw config keys + part/color ids) to human-readable,
// localized label/value pairs for display in cart, drawer, checkout, email and invoice.
//
// Labels reuse the existing `configurator` message namespace (label_base, …).
// Part/colour values are localized via `configurator` keys derived from the id
// (color_<id>, cable_<id>, switch_<id>, plug_<id>; bases/shades via base_name /
// shade_name + shape_with_dims). Any id without a message falls back to its
// parts.json name, and an id unknown to parts.json to the raw id — old carts and
// orders keep rendering whatever the catalogue does later.
import partsData from '../public/parts.json'
import type { PartsData, ShapePart } from '@/types/parts'

const parts = partsData as unknown as PartsData

/** A translator scoped to the `configurator` namespace (useTranslations or getTranslations). */
type Translate = {
  (key: string, values?: Record<string, string | number>): string
  /** next-intl translators have it; plain test doubles may not */
  has?: (key: string) => boolean
}

export interface ConfigLine {
  /** Config key, e.g. "base" — stable, usable as a React key */
  key: string
  /** Localized label, e.g. "Base color" */
  label: string
  /** Human-readable value, e.g. "White" / "Base no. 1 (68 × 114 mm)" */
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

/** Message if the translator has it, otherwise the fallback (never the raw key path). */
function msg(t: Translate, key: string, fallback: string, values?: Record<string, string | number>): string {
  try {
    if (typeof t.has === 'function') return t.has(key) ? t(key, values) : fallback
    // No has(): next-intl echoes a missing key as "<namespace>.<key>".
    const v = t(key, values)
    return v && v !== key && !v.endsWith(`.${key}`) ? v : fallback
  } catch {
    return fallback
  }
}

/** "texture-grey" -> "texture_grey"; message keys avoid hyphens and dots. */
function keyPart(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export type SwatchKind = 'color' | 'cable' | 'switch' | 'plug'

const SWATCH_LISTS: Record<SwatchKind, () => { id: string; name: string }[]> = {
  color: () => parts.colors,
  cable: () => parts.cable_colors,
  switch: () => parts.switch_options,
  plug: () => parts.plug_options,
}

/** Localized name of a colour / cable / switch / plug id. */
export function swatchName(kind: SwatchKind, id: string, t: Translate): string {
  const fallback = SWATCH_LISTS[kind]().find(p => p.id === id)?.name ?? id
  // switch/plug ids already carry their kind ("switch-white") — don't double it.
  const part = keyPart(id).replace(new RegExp(`^${kind}_`), '')
  return msg(t, `${kind}_${part}`, fallback)
}

export type ShapeKind = 'base' | 'shade'

function findShape(kind: ShapeKind, id: string): ShapePart | undefined {
  return (kind === 'base' ? parts.bases : parts.shades).find(p => p.id === id)
}

/** Part number of a base/shade: its parts.json name when numeric, else the digits of its id. */
function shapeNumber(id: string, shape?: ShapePart): string | null {
  if (shape && /^\d+$/.test(shape.name)) return shape.name
  return id.match(/\d+/)?.[0] ?? null
}

/** Localized interim name of a base/shade id, e.g. "Base no. 1" / "Podstavec č. 1". */
export function shapeName(kind: ShapeKind, id: string, t: Translate): string {
  const number = shapeNumber(id, findShape(kind, id))
  if (!number) return id
  return msg(t, `${kind}_name`, id, { number })
}

/** Name plus dimensions, e.g. "Base no. 1 (68 × 114 mm)"; unknown ids stay as they are. */
export function shapeNameWithDims(kind: ShapeKind, id: string, t: Translate): string {
  const shape = findShape(kind, id)
  const name = shapeName(kind, id, t)
  if (!shape) return name
  const fallback = `${name} (${shape.height_mm} × ${shape.diameter_mm} mm)`
  return msg(t, 'shape_with_dims', fallback, { name, height: shape.height_mm, diameter: shape.diameter_mm })
}

function displayValue(key: string, raw: string, t: Translate): string {
  switch (key) {
    case 'base':
    case 'shade':
      return shapeNameWithDims(key, raw, t)
    case 'baseColor':
    case 'shadeColor':
      return swatchName('color', raw, t)
    case 'cable':
      return swatchName('cable', raw, t)
    case 'switch':
      return swatchName('switch', raw, t)
    case 'plug':
      return swatchName('plug', raw, t)
    case 'bulb':
      // warm | cold | none -> configurator.bulb_warm etc.
      return ['warm', 'cold', 'none'].includes(raw) ? msg(t, `bulb_${raw}`, raw) : raw
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
    lines.push({ key, label: msg(t, labelKey, key), value: displayValue(key, raw, t) })
  }
  return lines
}

/** Compact single-line summary: "Base: Base no. 1 (68 × 114 mm) · Base color: White · …". */
export function lampConfigSummary(
  configuration: Record<string, string> | null | undefined,
  t: Translate,
): string {
  return lampConfigLines(configuration, t)
    .map(l => `${l.label}: ${l.value}`)
    .join(' · ')
}
