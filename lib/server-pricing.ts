import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'
import type { PriceMap } from '@/store/currency'
import { DEFAULT_RATES, applyModifier, productPriceMap, type ExchangeRates } from './prices'

// Server-only pricing: the authoritative price of a cart line, shared by the
// order route (what we charge) and the cart re-price route (what we display).

/** Exchange rates from the admin "Currency settings" global, falling back to
 *  DEFAULT_RATES for any rate that is unset or invalid. */
export async function getExchangeRates(payload: Payload): Promise<ExchangeRates> {
  try {
    const g = await payload.findGlobal({ slug: 'currency-settings' }) as Record<string, unknown>
    const rate = (v: unknown, fallback: number) => {
      const n = typeof v === 'string' ? Number(v) : v
      return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : fallback
    }
    return {
      CZK: rate(g.czkRate, DEFAULT_RATES.CZK),
      PLN: rate(g.plnRate, DEFAULT_RATES.PLN),
      HUF: rate(g.hufRate, DEFAULT_RATES.HUF),
    }
  } catch {
    return DEFAULT_RATES
  }
}

// Configurator part surcharges live in public/parts.json (applied client-side via
// applyModifier). Re-read server-side so a client can never pay the bare
// basePrice while selecting an up-charged base/shade. Cached per process.
interface Part { id: string; priceModifier?: number }
interface Parts { bases: Part[]; shades: Part[] }
let partsCache: Parts | null = null
function loadParts(): Parts {
  if (partsCache) return partsCache
  const raw = fs.readFileSync(path.join(process.cwd(), 'public/parts.json'), 'utf-8')
  const parsed = JSON.parse(raw) as Parts
  partsCache = { bases: parsed.bases ?? [], shades: parsed.shades ?? [] }
  return partsCache
}

function surchargeEur(configuration: Record<string, string> | undefined, parts: Parts): number {
  const base = configuration?.base
  const shade = configuration?.shade
  const baseMod = (base && parts.bases.find(p => p.id === base)?.priceModifier) || 0
  const shadeMod = (shade && parts.shades.find(p => p.id === shade)?.priceModifier) || 0
  return baseMod + shadeMod
}

/** Per-currency unit price of a product in a given configuration — the same
 *  computation the configurator does client-side, so the numbers match. */
export function itemPriceMap(
  product: unknown,
  configuration: Record<string, string> | undefined,
  rates: ExchangeRates,
): PriceMap {
  return applyModifier(productPriceMap(product, rates), surchargeEur(configuration, loadParts()), rates)
}
