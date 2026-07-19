// Shipping/billing countries (ISO 3166-1 alpha-2). The operator ships ONLY to
// these five — the checkout country select and the server-side order validation
// both derive from this list, so it is the single source of truth.
// Names are rendered client-side with Intl.DisplayNames — no translations needed.
export const BILLING_COUNTRIES = [
  'SK', 'CZ', 'AT', 'PL', 'HU',
] as const

export type BillingCountry = (typeof BILLING_COUNTRIES)[number]

// GoPay expects ISO 3166-1 alpha-3 country codes in payer.contact.country_code
export const COUNTRY_ALPHA3: Record<BillingCountry, string> = {
  SK: 'SVK', CZ: 'CZE', AT: 'AUT', PL: 'POL', HU: 'HUN',
}

// Preselected billing country per shop locale (must be one of the 5 shipped-to
// countries — locales without a shippable home country default to SK).
export const DEFAULT_COUNTRY: Record<string, BillingCountry> = {
  sk: 'SK', cs: 'CZ', de: 'AT', pl: 'PL', hu: 'HU',
  uk: 'SK', es: 'SK', fr: 'SK', it: 'SK', en: 'SK',
}
