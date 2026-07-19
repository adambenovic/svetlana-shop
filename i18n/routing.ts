import { defineRouting } from 'next-intl/routing'

// Localized URL pathnames. Keys are the internal (filesystem) paths; per-locale
// values are what visitors see. Locales not listed for a path fall back to the key.
export const routing = defineRouting({
  locales: ['sk', 'cs', 'de', 'pl', 'hu', 'uk', 'en', 'es', 'fr', 'it'],
  defaultLocale: 'sk',
  localePrefix: 'as-needed',
  localeDetection: false,
  pathnames: {
    '/': '/',
    '/configurator': {
      sk: '/konfigurator', cs: '/konfigurator', de: '/konfigurator', pl: '/konfigurator',
      hu: '/konfigurator', uk: '/configurator', en: '/configurator',
      es: '/configurador', fr: '/configurateur', it: '/configuratore',
    },
    '/gallery': {
      sk: '/galeria', cs: '/galerie', de: '/galerie', pl: '/galeria',
      hu: '/galeria', uk: '/gallery', en: '/gallery',
      es: '/galeria', fr: '/galerie', it: '/galleria',
    },
    '/cart': {
      sk: '/kosik', cs: '/kosik', de: '/warenkorb', pl: '/koszyk',
      hu: '/kosar', uk: '/cart', en: '/cart',
      es: '/carrito', fr: '/panier', it: '/carrello',
    },
    '/checkout': {
      sk: '/pokladna', cs: '/pokladna', de: '/kasse', pl: '/kasa',
      hu: '/penztar', uk: '/checkout', en: '/checkout',
      es: '/pago', fr: '/paiement', it: '/cassa',
    },
    '/checkout/success': {
      sk: '/pokladna/uspech', cs: '/pokladna/uspech', de: '/kasse/erfolg', pl: '/kasa/sukces',
      hu: '/penztar/siker', uk: '/checkout/success', en: '/checkout/success',
      es: '/pago/exito', fr: '/paiement/succes', it: '/cassa/successo',
    },
    '/products/[slug]': {
      sk: '/produkty/[slug]', cs: '/produkty/[slug]', de: '/produkte/[slug]', pl: '/produkty/[slug]',
      hu: '/termekek/[slug]', uk: '/products/[slug]', en: '/products/[slug]',
      es: '/productos/[slug]', fr: '/produits/[slug]', it: '/prodotti/[slug]',
    },
    '/pages/[slug]': {
      sk: '/stranky/[slug]', cs: '/stranky/[slug]', de: '/seiten/[slug]', pl: '/strony/[slug]',
      hu: '/oldalak/[slug]', uk: '/pages/[slug]', en: '/pages/[slug]',
      es: '/paginas/[slug]', fr: '/pages/[slug]', it: '/pagine/[slug]',
    },
    '/policies/[handle]': {
      sk: '/podmienky/[handle]', cs: '/podminky/[handle]', de: '/richtlinien/[handle]', pl: '/zasady/[handle]',
      hu: '/szabalyzatok/[handle]', uk: '/policies/[handle]', en: '/policies/[handle]',
      es: '/politicas/[handle]', fr: '/politiques/[handle]', it: '/politiche/[handle]',
    },
  },
})

export type AppPathnames = keyof typeof routing.pathnames
