// Configurator selection: the eight config keys, their allowed ids (from
// public/parts.json) and the defaults used when a key is missing or unknown.
// Pure — used by the server page to resolve URL params before the first render
// and by the client to validate the selection before it reaches the cart.
import type { PartsData } from '@/types/parts'

export const BULB_TYPES = ['warm', 'cold', 'none'] as const
export type BulbType = (typeof BULB_TYPES)[number]

export interface LampSelection {
  baseColor: string
  base: string
  shadeColor: string
  shade: string
  cable: string
  switch: string
  plug: string
  bulb: BulbType
}

export type SelectionKey = keyof LampSelection

/** URL/config key order (also the order the share link is written in). */
export const SELECTION_KEYS: SelectionKey[] = ['baseColor', 'base', 'shadeColor', 'shade', 'cable', 'switch', 'plug', 'bulb']

/** Bases are printed in solid filament only — there are no clear/translucent base renders. */
export function isSolidColor(id: string): boolean {
  return id !== 'clear' && !id.startsWith('translucent')
}

/** Default shade colour: black over the (white) default base. */
const DEFAULT_SHADE_COLOR = 'black'

function allowedIds(parts: PartsData): Record<SelectionKey, string[]> {
  const ids = (list: { id: string }[] | undefined) => (list ?? []).map(p => p.id)
  return {
    baseColor: ids(parts.colors.filter(c => isSolidColor(c.id))),
    base: ids(parts.bases),
    shadeColor: ids(parts.colors),
    shade: ids(parts.shades),
    cable: ids(parts.cable_colors),
    switch: ids(parts.switch_options),
    plug: ids(parts.plug_options),
    bulb: [...BULB_TYPES],
  }
}

export function defaultSelection(parts: PartsData): LampSelection {
  const ids = allowedIds(parts)
  return {
    baseColor: ids.baseColor[0] ?? '',
    base: ids.base[0] ?? '',
    shadeColor: ids.shadeColor.includes(DEFAULT_SHADE_COLOR) ? DEFAULT_SHADE_COLOR : ids.shadeColor[0] ?? '',
    shade: ids.shade[0] ?? '',
    cable: ids.cable[0] ?? '',
    switch: ids.switch[0] ?? '',
    plug: ids.plug[0] ?? '',
    bulb: 'warm',
  }
}

/**
 * Initial selection from URL search params: every known id is kept, anything
 * missing or not in parts.json (e.g. `?base=Base%2099`, `?bulb=foo`) falls back
 * to its default so it can never reach the cart.
 */
export function resolveSelection(
  params: Record<string, string | string[] | undefined> | URLSearchParams,
  parts: PartsData,
): LampSelection {
  const ids = allowedIds(parts)
  const out = defaultSelection(parts)
  for (const key of SELECTION_KEYS) {
    const raw = params instanceof URLSearchParams ? params.get(key) : params[key]
    const value = Array.isArray(raw) ? raw[0] : raw
    if (value && ids[key].includes(value)) (out as unknown as Record<string, string>)[key] = value
  }
  return out
}

/** True when every key holds an id that exists in parts.json. */
export function isValidSelection(selection: LampSelection, parts: PartsData): boolean {
  const ids = allowedIds(parts)
  return SELECTION_KEYS.every(key => {
    // A part list that is empty in parts.json can't be chosen — don't require it.
    if (ids[key].length === 0) return true
    return ids[key].includes(selection[key])
  })
}
