// Country lists (ISO 3166-1 alpha-2). Names are rendered client-side with
// Intl.DisplayNames — no translations needed.

// Pickup-point (delivery) countries: the operator ships ONLY to Packeta points in
// these five. The Packeta widget is restricted to them and the order route
// rejects any other pickup country — single source of truth for both.
export const SHIPPING_COUNTRIES = [
  'SK', 'CZ', 'AT', 'PL', 'HU',
] as const

export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number]

// Billing addresses are accepted from any EU/EEA country (no geo-blocking of
// buyers, Regulation (EU) 2018/302) — the goods still go to a pickup point in
// one of SHIPPING_COUNTRIES. The checkout country select and the server-side
// order validation both derive from this list.
export const BILLING_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEA (non-EU)
  'IS', 'LI', 'NO',
] as const

export type BillingCountry = (typeof BILLING_COUNTRIES)[number]

// GoPay expects ISO 3166-1 alpha-3 country codes in payer.contact.country_code
export const COUNTRY_ALPHA3: Record<BillingCountry, string> = {
  AT: 'AUT', BE: 'BEL', BG: 'BGR', HR: 'HRV', CY: 'CYP', CZ: 'CZE', DK: 'DNK',
  EE: 'EST', FI: 'FIN', FR: 'FRA', DE: 'DEU', GR: 'GRC', HU: 'HUN', IE: 'IRL',
  IT: 'ITA', LV: 'LVA', LT: 'LTU', LU: 'LUX', MT: 'MLT', NL: 'NLD', PL: 'POL',
  PT: 'PRT', RO: 'ROU', SK: 'SVK', SI: 'SVN', ES: 'ESP', SE: 'SWE',
  IS: 'ISL', LI: 'LIE', NO: 'NOR',
}

export function isBillingCountry(code: unknown): code is BillingCountry {
  return typeof code === 'string' && (BILLING_COUNTRIES as readonly string[]).includes(code)
}

export function isShippingCountry(code: unknown): code is ShippingCountry {
  return typeof code === 'string' && (SHIPPING_COUNTRIES as readonly string[]).includes(code)
}

// Preselected billing country per shop locale (one of the 5 shipped-to
// countries — locales without a shippable home country default to SK).
export const DEFAULT_COUNTRY: Record<string, BillingCountry> = {
  sk: 'SK', cs: 'CZ', de: 'AT', pl: 'PL', hu: 'HU',
  uk: 'SK', es: 'SK', fr: 'SK', it: 'SK', en: 'SK',
}
