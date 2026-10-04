import { validateConfiguration } from './validate-configuration'
import type { PartsData } from '@/types/parts'

const full = {
  base: 'Base 1', baseColor: 'black', shade: 'Shade 1', shadeColor: 'black',
  cable: 'carbon-black', switch: 'switch-black', plug: 'plug-black', bulb: 'warm',
}

test('a configurator selection from parts.json is valid', () => {
  expect(validateConfiguration(full, { complete: true })).toEqual({ valid: true, configuration: full })
})

test('unknown part ids are rejected', () => {
  expect(validateConfiguration({ ...full, base: 'Base 999' }).valid).toBe(false)
  expect(validateConfiguration({ ...full, shadeColor: 'rainbow' }).valid).toBe(false)
  expect(validateConfiguration({ ...full, bulb: 'uv' }).valid).toBe(false)
  expect(validateConfiguration({ ...full, cable: '<script>' }).valid).toBe(false)
})

test('unknown keys and non-string values are rejected', () => {
  expect(validateConfiguration({ ...full, engraving: 'hi' }).valid).toBe(false)
  expect(validateConfiguration({ ...full, base: 1 }).valid).toBe(false)
  expect(validateConfiguration([full]).valid).toBe(false)
  expect(validateConfiguration('Base 1').valid).toBe(false)
})

test('a shade needs a shade colour and a base a base colour', () => {
  expect(validateConfiguration({ shade: 'Shade 1' }).valid).toBe(false)
  expect(validateConfiguration({ shadeColor: 'black' }).valid).toBe(false)
  expect(validateConfiguration({ base: 'Base 1', baseColor: '' }).valid).toBe(false)
  expect(validateConfiguration({ shade: 'Shade 1', shadeColor: 'black' }).valid).toBe(true)
})

test('complete requires every part; otherwise a partial or empty configuration is fine', () => {
  const { plug: _plug, ...noPlug } = full
  expect(validateConfiguration(noPlug, { complete: true }).valid).toBe(false)
  expect(validateConfiguration(noPlug).valid).toBe(true)
  expect(validateConfiguration(undefined)).toEqual({ valid: true, configuration: {} })
  expect(validateConfiguration(null, { complete: true }).valid).toBe(false)
})

test('empty strings count as not set and are dropped from the result', () => {
  expect(validateConfiguration({ cable: '', bulb: 'none' })).toEqual({ valid: true, configuration: { bulb: 'none' } })
})

test('validates against the supplied parts data; empty part lists are not required', () => {
  const parts: PartsData = {
    colors: [{ id: 'red', name: 'Red', hex: '#f00' }],
    bases: [{ id: 'B', name: 'B', thumbnail: '', height_mm: 1, diameter_mm: 1 }],
    shades: [{ id: 'S', name: 'S', thumbnail: '', height_mm: 1, diameter_mm: 1 }],
    cable_colors: [], switch_options: [], plug_options: [], bulb_options: [{ id: 'warm', name: 'Warm' }],
  }
  const cfg = { base: 'B', baseColor: 'red', shade: 'S', shadeColor: 'red', bulb: 'warm' }
  expect(validateConfiguration(cfg, { complete: true }, parts).valid).toBe(true)
  expect(validateConfiguration({ ...cfg, base: 'Base 1' }, {}, parts).valid).toBe(false)
})
