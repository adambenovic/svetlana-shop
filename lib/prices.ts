import type { PriceMap } from '@/store/currency'

/** Build the per-currency price map from a Payload product document.
 *  basePrice is the canonical EUR price; prices.* are manual admin entries.
 *  Accepts the untyped Payload doc shape. */
export function productPriceMap(productDoc: unknown): PriceMap {
  const product = (productDoc ?? {}) as { basePrice?: unknown; prices?: unknown }
  const prices = (product.prices ?? {}) as { czk?: number | null; pln?: number | null; huf?: number | null }
  const map: PriceMap = { EUR: typeof product.basePrice === 'number' ? product.basePrice : 0 }
  if (typeof prices.czk === 'number') map.CZK = prices.czk
  if (typeof prices.pln === 'number') map.PLN = prices.pln
  if (typeof prices.huf === 'number') map.HUF = prices.huf
  return map
}

/** Apply an EUR-denominated modifier (e.g. configurator part surcharge) to every
 *  currency in the map, scaled by that currency's ratio to the EUR base. */
export function applyModifier(prices: PriceMap, modifierEur: number): PriceMap {
  if (!modifierEur) return { ...prices }
  const eur = prices.EUR ?? 0
  const out: PriceMap = {}
  for (const [cur, amount] of Object.entries(prices) as [keyof PriceMap, number][]) {
    const scale = eur > 0 ? amount / eur : 1
    out[cur] = Math.round(amount + modifierEur * scale)
  }
  return out
}

/** Render URLs for a configured lamp, derived from the cart item's configuration.
 *  Stored URLs win when present; deriving covers items persisted before
 *  baseImageUrl existed (configuration is the durable source of truth). */
export function lampImages(
  configuration: Record<string, string>,
  stored?: { imageUrl?: string; baseImageUrl?: string },
): { imageUrl?: string; baseImageUrl?: string } {
  const enc = (s: string) => s.replace(/ /g, '%20')
  const shade = configuration.shade && configuration.shadeColor
    ? `/assets/shades/${enc(configuration.shade)}-${configuration.shadeColor}.webp` : undefined
  const base = configuration.base && configuration.baseColor
    ? `/assets/bases/${enc(configuration.base)}-${configuration.baseColor}.webp` : undefined
  return {
    imageUrl: stored?.imageUrl ?? shade ?? base,
    baseImageUrl: stored?.baseImageUrl ?? (shade ? base : undefined),
  }
}

/** Query params that reopen the configurator with this cart item's configuration
 *  preselected (the configurator initializes its state from these params). */
export function configuratorQuery(configuration: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(configuration).filter(([, v]) => v))
}
