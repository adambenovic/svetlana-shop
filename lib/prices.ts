import type { Currency, PriceMap } from '@/store/currency'

export type ForeignCurrency = Exclude<Currency, 'EUR'>

/** Currencies a payment can actually be charged in. GoPay only accepts a
 *  currency the merchant account has payment methods (and a settlement bank
 *  account) for — this shop settles in EUR only. Every other currency is
 *  display-only: prices are shown converted, the payment is charged in EUR and
 *  the EUR amount is shown before the customer confirms. To charge in e.g. CZK,
 *  get CZK activated on the production GoPay account, then add it here. */
export const CHARGE_CURRENCIES: readonly Currency[] = ['EUR']

/** The currency a payment is charged in when the visitor browses in `display`. */
export function chargeCurrencyFor(display: Currency): Currency {
  return CHARGE_CURRENCIES.includes(display) ? display : 'EUR'
}

/** 1 EUR = N units of each currency. The live values come from the admin
 *  "Currency settings" global (see lib/server-pricing.ts); these are only the
 *  fallback — ECB reference rates of 1 Oct 2026. */
export type ExchangeRates = Record<ForeignCurrency, number>
export const DEFAULT_RATES: ExchangeRates = { CZK: 24.459, PLN: 4.3735, HUF: 367.18 }

/** Convert an EUR amount (cents) into a clean retail price in the target
 *  currency (minor units), charm-rounded like the EUR prices (€53.99):
 *  CZK → …9 Kč, PLN → …,99 zł, HUF → …90 Ft. */
export function convertFromEur(eurCents: number, currency: ForeignCurrency, rates: ExchangeRates): number {
  if (!(eurCents > 0)) return 0
  const major = (eurCents / 100) * rates[currency]
  switch (currency) {
    case 'CZK': return Math.max(9, Math.round(major / 10) * 10 - 1) * 100
    case 'PLN': return Math.max(99, Math.round(major) * 100 - 1)
    case 'HUF': return Math.max(90, Math.round(major / 100) * 100 - 10) * 100
  }
}

/** Build the per-currency price map from a Payload product document.
 *  basePrice is the canonical EUR price. CZK/PLN/HUF are converted from it with
 *  the exchange rates — unless the product sets a manual override in prices.*,
 *  which wins. Converting by default keeps every currency in sync when the EUR
 *  price changes. Accepts the untyped Payload doc shape. */
export function productPriceMap(productDoc: unknown, rates: ExchangeRates = DEFAULT_RATES): PriceMap {
  const product = (productDoc ?? {}) as { basePrice?: unknown; prices?: unknown }
  const overrides = (product.prices ?? {}) as Partial<Record<'czk' | 'pln' | 'huf', number | null>>
  const eur = typeof product.basePrice === 'number' ? product.basePrice : 0
  const price = (override: number | null | undefined, currency: ForeignCurrency) =>
    typeof override === 'number' && override > 0 ? override : convertFromEur(eur, currency, rates)
  return {
    EUR: eur,
    CZK: price(overrides.czk, 'CZK'),
    PLN: price(overrides.pln, 'PLN'),
    HUF: price(overrides.huf, 'HUF'),
  }
}

/** Apply an EUR-denominated modifier (e.g. configurator part surcharge, cents)
 *  to every currency in the map. A foreign price that is the plain conversion
 *  of the EUR price is re-converted from (EUR + modifier), so it stays
 *  charm-rounded (…9 Kč, …,99 zł, …90 Ft); a manual per-product override is
 *  scaled by its ratio to the EUR base instead. Client (configurator) and
 *  server (order, cart re-price) both call this with the same rates, so the
 *  displayed and charged prices are identical. Without `rates` every currency
 *  is scaled (legacy behaviour). */
export function applyModifier(prices: PriceMap, modifierEur: number, rates?: ExchangeRates): PriceMap {
  if (!modifierEur) return { ...prices }
  const eur = prices.EUR ?? 0
  const out: PriceMap = {}
  for (const [cur, amount] of Object.entries(prices) as [keyof PriceMap, number][]) {
    if (cur === 'EUR') {
      out.EUR = Math.max(0, Math.round(amount + modifierEur))
    } else if (rates && amount === convertFromEur(eur, cur, rates)) {
      out[cur] = convertFromEur(eur + modifierEur, cur, rates)
    } else {
      const scale = eur > 0 ? amount / eur : 1
      out[cur] = Math.max(0, Math.round(amount + modifierEur * scale))
    }
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
