// Server-side validation of a lamp configuration against public/parts.json.
// The configuration is stored on the order and printed in the confirmation
// email and invoice — it must name parts that exist, not arbitrary client text.
import partsData from '../public/parts.json'
import type { PartsData } from '@/types/parts'

export const CONFIG_KEYS = ['base', 'baseColor', 'shade', 'shadeColor', 'cable', 'switch', 'plug', 'bulb'] as const
export type ConfigKey = (typeof CONFIG_KEYS)[number]

type IdLists = Record<ConfigKey, Set<string>>

function idLists(parts: PartsData): IdLists {
  const ids = (list: { id: string }[] | undefined) => new Set((list ?? []).map(p => p.id))
  const colors = ids(parts.colors)
  return {
    base: ids(parts.bases),
    baseColor: colors,
    shade: ids(parts.shades),
    shadeColor: colors,
    cable: ids(parts.cable_colors),
    switch: ids(parts.switch_options),
    plug: ids(parts.plug_options),
    bulb: ids(parts.bulb_options),
  }
}

const defaultLists = idLists(partsData as unknown as PartsData)

export type ConfigurationCheck =
  | { valid: true; configuration: Partial<Record<ConfigKey, string>> }
  | { valid: false; reason: string }

/**
 * Validates a cart line's configuration.
 * - must be absent or a plain object of string values, using only CONFIG_KEYS;
 * - every value must be a known id of its part list (empty string = not set);
 * - a base needs a base colour and a shade a shade colour (and vice versa);
 * - `complete` (configurator lamps): all eight keys must be set (bar part
 *   lists that are empty in parts.json).
 * Returns the normalized configuration (only set keys) on success.
 */
export function validateConfiguration(
  input: unknown,
  { complete = false }: { complete?: boolean } = {},
  parts?: PartsData,
): ConfigurationCheck {
  const lists = parts ? idLists(parts) : defaultLists
  if (input == null) {
    return complete ? { valid: false, reason: 'missing configuration' } : { valid: true, configuration: {} }
  }
  if (typeof input !== 'object' || Array.isArray(input)) return { valid: false, reason: 'not an object' }

  const out: Partial<Record<ConfigKey, string>> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!(CONFIG_KEYS as readonly string[]).includes(key)) return { valid: false, reason: `unknown key ${key}` }
    if (typeof value !== 'string') return { valid: false, reason: `${key} is not a string` }
    if (value === '') continue
    if (!lists[key as ConfigKey].has(value)) return { valid: false, reason: `unknown ${key} ${value}` }
    out[key as ConfigKey] = value
  }

  if (!!out.base !== !!out.baseColor) return { valid: false, reason: 'base and baseColor go together' }
  if (!!out.shade !== !!out.shadeColor) return { valid: false, reason: 'shade and shadeColor go together' }
  if (complete) {
    // A part list that is empty in parts.json can't be chosen — don't require it.
    const missing = CONFIG_KEYS.filter(k => lists[k].size > 0 && !out[k])
    if (missing.length) return { valid: false, reason: `missing ${missing.join(', ')}` }
  }
  return { valid: true, configuration: out }
}
