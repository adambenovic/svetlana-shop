// Shared, dependency-free data about the CMS-seeded legal/help pages. Imported by
// the policies/pages routes, the seed-pages endpoint and the order email
// (lib/email.ts) — keep it free of next-intl/Next imports so it stays usable in
// Jest and outside a request.

/** The six legal documents. Canonical URL: the policies route (/podmienky/<handle>, /en/policies/<handle>…). */
export const LEGAL_HANDLES = [
  'privacy-policy',
  'terms-of-service',
  'refund-policy',
  'shipping-policy',
  'cookie-preferences',
  'contact-information',
] as const

export type LegalHandle = (typeof LEGAL_HANDLES)[number]

export function isLegalHandle(slug: string): slug is LegalHandle {
  return (LEGAL_HANDLES as readonly string[]).includes(slug)
}

/** Help documents served under the pages route (/stranky/<slug>, /en/pages/<slug>…). */
export const DOCUMENT_SLUGS = ['lamp-manual', 'declaration-of-conformity'] as const

/** Page titles per slug and locale — seeded into Pages and reused as link labels. Keep in sync with the footer labels (sections.footer.*). */
export const PAGE_TITLES: Record<LegalHandle | (typeof DOCUMENT_SLUGS)[number], Record<string, string>> = {
  'privacy-policy': { sk: 'Ochrana osobných údajov', en: 'Privacy Policy', cs: 'Zásady ochrany osobních údajů', de: 'Datenschutzerklärung', pl: 'Polityka prywatności', hu: 'Adatvédelmi irányelvek', uk: 'Політика конфіденційності', es: 'Política de privacidad', fr: 'Politique de confidentialité', it: 'Informativa sulla privacy' },
  'refund-policy': { sk: 'Odstúpenie od zmluvy a reklamácie', en: 'Withdrawal & Warranty', cs: 'Odstoupení od smlouvy a reklamace', de: 'Widerrufsrecht', pl: 'Odstąpienie od umowy i reklamacje', hu: 'Elállás és szavatosság', uk: 'Відмова від договору та рекламації', es: 'Desistimiento y garantía', fr: 'Rétractation et garantie', it: 'Recesso e garanzia' },
  'shipping-policy': { sk: 'Doprava a doručenie', en: 'Shipping Policy', cs: 'Doprava a doručení', de: 'Versand und Lieferung', pl: 'Polityka wysyłki', hu: 'Szállítási szabályzat', uk: 'Політика доставки', es: 'Política de envíos', fr: "Politique d'expédition", it: 'Politica di spedizione' },
  'terms-of-service': { sk: 'Obchodné podmienky', en: 'Terms & Conditions', cs: 'Obchodní podmínky', de: 'Allgemeine Geschäftsbedingungen (AGB)', pl: 'Regulamin', hu: 'Általános Szerződési Feltételek (ÁSZF)', uk: 'Загальні умови продажу', es: 'Condiciones generales de venta', fr: 'Conditions générales de vente (CGV)', it: 'Condizioni generali di vendita' },
  'contact-information': { sk: 'Kontaktné informácie', en: 'Contact Information', cs: 'Kontaktní informace', de: 'Kontaktinformationen', pl: 'Dane kontaktowe', hu: 'Kapcsolati adatok', uk: 'Контактна інформація', es: 'Información de contacto', fr: 'Coordonnées', it: 'Informazioni di contatto' },
  'cookie-preferences': { sk: 'Nastavenia cookies', en: 'Cookie Preferences', cs: 'Nastavení cookies', de: 'Cookie-Einstellungen', pl: 'Ustawienia plików cookie', hu: 'Sütibeállítások', uk: 'Налаштування cookie', es: 'Preferencias de cookies', fr: 'Paramètres des cookies', it: 'Impostazioni cookie' },
  'lamp-manual': { sk: 'Návod na použitie lampy', en: 'Lamp Manual', cs: 'Návod k použití lampy', de: 'Bedienungsanleitung', pl: 'Instrukcja obsługi lampy', hu: 'Használati útmutató', uk: 'Інструкція з експлуатації', es: 'Manual de la lámpara', fr: 'Manuel de la lampe', it: 'Manuale della lampada' },
  'declaration-of-conformity': { sk: 'Vyhlásenie o zhode', en: 'Declaration of Conformity', cs: 'Prohlášení o shodě', de: 'Konformitätserklärung', pl: 'Deklaracja zgodności', hu: 'Megfelelőségi nyilatkozat', uk: 'Декларація відповідності', es: 'Declaración de conformidad', fr: 'Déclaration de conformité', it: 'Dichiarazione di conformità' },
}

export function pageTitle(slug: string, locale: string): string {
  const titles = (PAGE_TITLES as Record<string, Record<string, string>>)[slug]
  return titles?.[locale] ?? titles?.en ?? slug
}
