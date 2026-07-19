import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import fs from 'fs'
import path from 'path'

/** Operator-only gate — `Authorization: Bearer $INVOICE_BACKFILL_TOKEN`. Fails closed if unset. */
function authorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const expected = process.env.INVOICE_BACKFILL_TOKEN ?? ''
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return !!expected && a.length === b.length && timingSafeEqual(a, b)
}

// Bind-mounted into the container by docker-compose.tunnel.yml (source: benoshop repo)
const LEGAL_DIR = process.env.LEGAL_DIR ?? '/app/legal-source'

const LOCALES = ['sk', 'cs', 'de', 'pl', 'hu', 'uk', 'en', 'es', 'fr', 'it'] as const

const SLUGS = [
  'privacy-policy',
  'refund-policy',
  'shipping-policy',
  'terms-of-service',
  'contact-information',
  'cookie-preferences',
  'lamp-manual',
  'declaration-of-conformity',
] as const

const TITLES: Record<string, Record<string, string>> = {
  'privacy-policy': { sk: 'Ochrana osobných údajov', en: 'Privacy Policy', cs: 'Ochrana osobních údajů', de: 'Datenschutzerklärung', pl: 'Polityka prywatności', hu: 'Adatvédelmi irányelvek', uk: 'Політика конфіденційності', es: 'Política de privacidad', fr: 'Politique de confidentialité', it: 'Informativa sulla privacy' },
  'refund-policy': { sk: 'Reklamácie', en: 'Refund Policy', cs: 'Reklamační řád', de: 'Rückgaberichtlinie', pl: 'Polityka zwrotów', hu: 'Visszatérítési szabályzat', uk: 'Політика повернення', es: 'Política de reembolso', fr: 'Politique de remboursement', it: 'Politica di rimborso' },
  'shipping-policy': { sk: 'Zásady doručenia', en: 'Shipping Policy', cs: 'Zásady doručení', de: 'Versandrichtlinie', pl: 'Polityka wysyłki', hu: 'Szállítási szabályzat', uk: 'Політика доставки', es: 'Política de envíos', fr: "Politique d'expédition", it: 'Politica di spedizione' },
  'terms-of-service': { sk: 'Obchodné podmienky', en: 'Terms of Service', cs: 'Obchodní podmínky', de: 'Nutzungsbedingungen', pl: 'Regulamin', hu: 'Felhasználási feltételek', uk: 'Умови використання', es: 'Términos de servicio', fr: "Conditions d'utilisation", it: 'Termini di servizio' },
  'contact-information': { sk: 'Kontaktné informácie', en: 'Contact Information', cs: 'Kontaktní informace', de: 'Kontaktinformationen', pl: 'Dane kontaktowe', hu: 'Kapcsolati adatok', uk: 'Контактна інформація', es: 'Información de contacto', fr: 'Coordonnées', it: 'Informazioni di contatto' },
  'cookie-preferences': { sk: 'Nastavenia cookies', en: 'Cookie Preferences', cs: 'Nastavení cookies', de: 'Cookie-Einstellungen', pl: 'Ustawienia plików cookie', hu: 'Cookie beállítások', uk: 'Налаштування cookies', es: 'Preferencias de cookies', fr: 'Paramètres des cookies', it: 'Impostazioni cookie' },
  'lamp-manual': { sk: 'Manuál k lampe', en: 'Lamp Manual', cs: 'Návod k lampě', de: 'Lampen-Handbuch', pl: 'Instrukcja lampy', hu: 'Lámpa kézikönyv', uk: 'Посібник до лампи', es: 'Manual de la lámpara', fr: 'Manuel de la lampe', it: 'Manuale della lampada' },
  'declaration-of-conformity': { sk: 'Vyhlásenie o zhode', en: 'Declaration of Conformity', cs: 'Prohlášení o shodě', de: 'Konformitätserklärung', pl: 'Deklaracja zgodności', hu: 'Megfelelőségi nyilatkozat', uk: 'Декларація відповідності', es: 'Declaración de conformidad', fr: 'Déclaration de conformité', it: 'Dichiarazione di conformità' },
}

// The two document pages show pre-rendered page images (native PDF embeds don't
// render on mobile browsers) plus a download link to the actual PDF.
// Images generated with pdftoppm + cwebp — see DEPLOY.md.
const PDF_FILES: Record<string, { pdf: string; pagesDir: string; pageCount: number }> = {
  'lamp-manual': { pdf: '/docs/LEAH_Manual.pdf', pagesDir: '/docs/manual-pages', pageCount: 11 },
  'declaration-of-conformity': { pdf: '/docs/EU_Declaration_of_Conformity_LEAH_Series.pdf', pagesDir: '/docs/conformity-pages', pageCount: 2 },
}

const DOWNLOAD_LABEL: Record<string, string> = {
  sk: 'Stiahnuť PDF', cs: 'Stáhnout PDF', de: 'PDF herunterladen', pl: 'Pobierz PDF',
  hu: 'PDF letöltése', uk: 'Завантажити PDF', es: 'Descargar PDF', fr: 'Télécharger le PDF',
  it: 'Scarica il PDF', en: 'Download PDF',
}

function pdfHtml(slug: string, locale: string): string | null {
  const doc = PDF_FILES[slug]
  if (!doc) return null
  const label = DOWNLOAD_LABEL[locale] ?? DOWNLOAD_LABEL.en
  const pages = Array.from({ length: doc.pageCount }, (_, i) => {
    const n = String(i + 1).padStart(2, '0')
    return `<img src="${doc.pagesDir}/page-${n}.webp" alt="${i + 1}/${doc.pageCount}" loading="lazy" style="display:block;width:100%;height:auto;border:1px solid var(--color-border);border-radius:8px;margin-bottom:16px;background:#fff;" />`
  }).join('\n')
  return `<p><a href="${doc.pdf}" download>📄 ${label}</a></p>\n${pages}\n<p><a href="${doc.pdf}" download>📄 ${label}</a></p>`
}

function readHtml(locale: string, slug: string): string | null {
  const generated = pdfHtml(slug, locale)
  if (generated) return generated
  const filePath = path.join(LEGAL_DIR, locale, `${slug}.html`)
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payload = await getPayload({ config })
  const results: string[] = []

  for (const slug of SLUGS) {
    // Find or create page
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      limit: 1,
    })

    let pageId: string | number

    if (docs[0]) {
      pageId = docs[0].id
      results.push(`existing: ${slug} (id=${pageId})`)
    } else {
      const created = await payload.create({
        collection: 'pages',
        data: {
          slug,
          title: TITLES[slug]?.['en'] ?? slug,
        },
        locale: 'en',
      })
      pageId = created.id
      results.push(`created: ${slug} (id=${pageId})`)
    }

    // Update each locale
    for (const locale of LOCALES) {
      const html = readHtml(locale, slug)
      await payload.update({
        collection: 'pages',
        id: pageId,
        locale,
        data: {
          title: TITLES[slug]?.[locale] ?? TITLES[slug]?.['en'] ?? slug,
          ...(html ? { bodyHtml: html } : {}),
        },
      })
    }
    results.push(`  → updated ${LOCALES.length} locales`)
  }

  return NextResponse.json({ ok: true, results })
}
