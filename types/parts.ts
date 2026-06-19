// Types matching the actual flat structure of public/parts.json

export interface ColorPart {
  id: string
  name: string
  hex: string
}

export interface ShapePart {
  id: string
  name: string
  thumbnail: string
  height_mm: number
  diameter_mm: number
  priceModifier?: number
}

export interface CablePart {
  id: string
  name: string
  swatch: string
}

export interface SwitchPart {
  id: string
  name: string
  swatch: string
}

export interface PlugPart {
  id: string
  name: string
  swatch: string
}

export interface BulbPart {
  id: string
  name: string
}

export interface PartsData {
  colors: ColorPart[]
  bases: ShapePart[]
  shades: ShapePart[]
  cable_colors: CablePart[]
  bulb_options: BulbPart[]
  switch_options: SwitchPart[]
  plug_options: PlugPart[]
  product_variant_id?: number
}
