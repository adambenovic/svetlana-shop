// Billing countries offered at checkout (ISO 3166-1 alpha-2).
// Names are rendered client-side with Intl.DisplayNames — no translations needed.
export const BILLING_COUNTRIES = [
  'SK', 'CZ', 'AT', 'DE', 'PL', 'HU', 'UA', 'ES', 'FR', 'IT',
  'NL', 'BE', 'SI', 'HR', 'RO', 'GB',
] as const

export type BillingCountry = (typeof BILLING_COUNTRIES)[number]

// GoPay expects ISO 3166-1 alpha-3 country codes in payer.contact.country_code
export const COUNTRY_ALPHA3: Record<BillingCountry, string> = {
  SK: 'SVK', CZ: 'CZE', AT: 'AUT', DE: 'DEU', PL: 'POL', HU: 'HUN',
  UA: 'UKR', ES: 'ESP', FR: 'FRA', IT: 'ITA', NL: 'NLD', BE: 'BEL',
  SI: 'SVN', HR: 'HRV', RO: 'ROU', GB: 'GBR',
}

// Preselected billing country per shop locale
export const DEFAULT_COUNTRY: Record<string, BillingCountry> = {
  sk: 'SK', cs: 'CZ', de: 'DE', pl: 'PL', hu: 'HU', uk: 'UA',
  es: 'ES', fr: 'FR', it: 'IT', en: 'SK',
}
