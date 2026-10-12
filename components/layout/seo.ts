import { getPathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { SHIPPING_COUNTRIES } from '@/lib/countries'

// Shared SEO helpers used across localized pages so canonical/hreflang URLs
// are always built from the LOCALIZED pathname (via next-intl getPathname).

export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/**
 * Shipping and return terms for Product → Offer structured data (Google
 * merchant listings). Must match the legal texts: free delivery to Packeta
 * pickup points in SHIPPING_COUNTRIES, made to order in 3–5 working days, then
 * 2–5 days in transit; 14-day withdrawal by mail, return postage paid by the
 * customer, goods returned to Slovakia.
 */
export const OFFER_TERMS = {
  shippingDetails: SHIPPING_COUNTRIES.map(country => ({
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'EUR' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: country },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 5, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' },
    },
  })),
  hasMerchantReturnPolicy: {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: [...SHIPPING_COUNTRIES],
    returnPolicyCountry: 'SK',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 14,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
  },
}

type Href = Parameters<typeof getPathname>[0]['href']

// og:locale wants ll_CC; our routing locales are language-only codes.
const OG_LOCALES: Record<string, string> = {
  sk: 'sk_SK',
  cs: 'cs_CZ',
  de: 'de_DE',
  pl: 'pl_PL',
  hu: 'hu_HU',
  uk: 'uk_UA',
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  it: 'it_IT',
}

export function ogLocale(locale: string): string {
  return OG_LOCALES[locale] ?? 'en_US'
}

export function ogAlternateLocales(locale: string): string[] {
  return routing.locales.filter(l => l !== locale).map(ogLocale)
}

export function absoluteUrl(locale: string, href: Href): string {
  return `${BASE_URL}${getPathname({ href, locale })}`
}

export const OG_IMAGE = {
  url: '/og-image.jpg',
  width: 1200,
  height: 630,
  alt: 'Svetlana Lampe',
}

/**
 * Build a COMPLETE openGraph object. Next.js replaces (does not deep-merge)
 * nested metadata objects, so any page that sets openGraph must include the
 * image, siteName and og:locale itself — otherwise the layout's values are lost.
 */
export function openGraphFor(opts: {
  locale: string
  href: Href
  title: string
  description?: string
}) {
  return {
    siteName: 'Svetlana Lampe',
    title: opts.title,
    description: opts.description,
    url: absoluteUrl(opts.locale, opts.href),
    locale: ogLocale(opts.locale),
    alternateLocale: ogAlternateLocales(opts.locale),
    type: 'website' as const,
    images: [OG_IMAGE],
  }
}

/**
 * Build self-referencing canonical + hreflang alternates for a given route.
 * `languages` covers all 10 locales plus x-default (→ sk root / default locale).
 */
export function alternatesFor(href: Href, currentLocale: string) {
  const languages: Record<string, string> = {}
  for (const l of routing.locales) {
    languages[l] = absoluteUrl(l, href)
  }
  languages['x-default'] = absoluteUrl(routing.defaultLocale, href)
  return {
    canonical: absoluteUrl(currentLocale, href),
    languages,
  }
}
