import partsData from '@/public/parts.json'
import type { PartsData } from '@/types/parts'
import { defaultSelection, isValidSelection, resolveSelection } from './selection'
import { lampConfigSummary, shapeName, swatchName } from '@/lib/lamp-config-display'
import { validateConfiguration } from '@/lib/validate-configuration'

const parts = partsData as unknown as PartsData

describe('resolveSelection', () => {
  it('fills every key with a default when the URL is empty', () => {
    const sel = resolveSelection({}, parts)
    expect(sel).toEqual(defaultSelection(parts))
    expect(sel).toMatchObject({ base: 'Base 1', baseColor: 'white', shade: 'Shade 1', shadeColor: 'black', bulb: 'warm' })
    expect(isValidSelection(sel, parts)).toBe(true)
  })

  it('keeps known ids and replaces unknown ones by defaults', () => {
    const sel = resolveSelection({ base: 'Base 99', bulb: 'foo', shade: 'Shade14', cable: 'espresso', baseColor: 'clear' }, parts)
    expect(sel.base).toBe('Base 1')
    expect(sel.bulb).toBe('warm')
    expect(sel.shade).toBe('Shade14')
    expect(sel.cable).toBe('espresso')
    // no clear/translucent base renders
    expect(sel.baseColor).toBe('white')
  })

  it('accepts URLSearchParams and array values', () => {
    expect(resolveSelection(new URLSearchParams('base=Base%207'), parts).base).toBe('Base 7')
    expect(resolveSelection({ base: ['Base 3', 'Base 4'] }, parts).base).toBe('Base 3')
  })

  it('produces configurations the order validator accepts', () => {
    const sel = resolveSelection({ shade: 'Shade 42', shadeColor: 'translucent-olive', plug: 'plug-black' }, parts)
    expect(validateConfiguration({ ...sel }, { complete: true })).toMatchObject({ valid: true })
  })

  it('flags a selection with an unknown id as invalid', () => {
    expect(isValidSelection({ ...defaultSelection(parts), switch: 'switch-pink' }, parts)).toBe(false)
  })
})

describe('parts.json order', () => {
  it('lists bases and shades in numeric order', () => {
    const num = (id: string) => parseInt(id.replace(/\D+/g, ''), 10)
    for (const list of [parts.bases, parts.shades]) {
      const nums = list.map(p => num(p.id))
      expect(nums).toEqual([...nums].sort((a, b) => a - b))
      expect(list.every(p => /^\d+$/.test(p.name))).toBe(true)
    }
  })
})

describe('lamp-config-display names', () => {
  const messages: Record<string, string> = {
    label_base: 'Podstavec', label_base_color: 'Farba podstavca', label_shade: 'Tienidlo',
    label_switch: 'Vypínač', label_bulb: 'Žiarovka', bulb_warm: 'Teplá biela',
    base_name: 'Podstavec č. {number}', shape_with_dims: '{name} ({height} × {diameter} mm)',
    color_texture_grey: 'Štruktúrovaná sivá', switch_white: 'Biely',
  }
  const format = (s: string, v?: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (_, k) => String(v?.[k] ?? ''))
  const t = Object.assign(
    (key: string, values?: Record<string, string | number>) => format(messages[key] ?? `configurator.${key}`, values),
    { has: (key: string) => key in messages },
  )
  // A translator without has() that echoes missing keys, like next-intl's fallback.
  const tNoHas = (key: string, values?: Record<string, string | number>) => format(messages[key] ?? `configurator.${key}`, values)

  it('localizes colours, switch/plug and shapes', () => {
    expect(swatchName('color', 'texture-grey', t)).toBe('Štruktúrovaná sivá')
    expect(swatchName('switch', 'switch-white', t)).toBe('Biely')
    expect(shapeName('base', 'Base 3', t)).toBe('Podstavec č. 3')
  })

  it('falls back to parts.json names and raw ids', () => {
    expect(swatchName('cable', 'lake-blue', t)).toBe('lake-blue') // not a cable id
    expect(swatchName('color', 'lake-blue', t)).toBe('Lake Blue') // no message → parts.json name
    expect(swatchName('color', 'lake-blue', tNoHas)).toBe('Lake Blue')
    expect(shapeName('shade', 'Shade 3', t)).toBe('Shade 3') // no shade_name message
    expect(shapeName('base', 'Mystery', t)).toBe('Mystery')
  })

  it('builds the summary line with dimensions', () => {
    expect(lampConfigSummary({ base: 'Base 1', baseColor: 'texture-grey', switch: 'switch-white', bulb: 'warm' }, t))
      .toBe('Podstavec: Podstavec č. 1 (68 × 114 mm) · Farba podstavca: Štruktúrovaná sivá · Vypínač: Biely · Žiarovka: Teplá biela')
  })
})
