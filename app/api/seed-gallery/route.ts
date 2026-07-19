import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Seeds ~8 published "signature" products (non-configuratorOnly) so the gallery
// isn't empty. Each carries a fixed, valid configurator selection — the storefront
// composites its render images (base + shade webp) from `configuration`, so no
// media upload is needed. Idempotent: existing slugs are skipped.
//
// Operator-only — `Authorization: Bearer $INVOICE_BACKFILL_TOKEN` (reused;
// fails closed if unset).

function authorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const expected = process.env.INVOICE_BACKFILL_TOKEN ?? ''
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return !!expected && a.length === b.length && timingSafeEqual(a, b)
}

const LOCALES = ['sk', 'cs', 'de', 'pl', 'hu', 'uk', 'en', 'es', 'fr', 'it'] as const

// Per-locale description template — {name} is substituted per product.
const DESC: Record<string, string> = {
  sk: '{name} — autorská 3D tlačená stolová lampa. Pevná, ručne vyladená konfigurácia z našej dielne.',
  cs: '{name} — autorská 3D tištěná stolní lampa. Pevná, ručně vyladěná konfigurace z naší dílny.',
  de: '{name} — eine 3D-gedruckte Design-Tischleuchte. Fest gewählte, handkuratierte Konfiguration aus unserem Atelier.',
  pl: '{name} — autorska lampa stołowa drukowana w 3D. Stała, ręcznie dobrana konfiguracja z naszej pracowni.',
  hu: '{name} — 3D-nyomtatott szerzői asztali lámpa. Rögzített, kézzel válogatott összeállítás a műhelyünkből.',
  uk: '{name} — авторська 3D-друкована настільна лампа. Фіксована, ретельно підібрана конфігурація з нашої майстерні.',
  en: '{name} is a signature 3D-printed table lamp — a fixed, hand-curated configuration from our atelier.',
  es: '{name} — lámpara de mesa de autor impresa en 3D. Configuración fija y seleccionada a mano en nuestro taller.',
  fr: '{name} — lampe de table de créateur imprimée en 3D. Configuration fixe, choisie à la main dans notre atelier.',
  it: '{name} — lampada da tavolo d’autore stampata in 3D. Configurazione fissa e curata a mano nel nostro atelier.',
}

// EUR→other-currency ratios matching the configurator product (8900 → 229000 / 37900 / 3590000).
function prices(basePriceEur: number) {
  return {
    czk: Math.round(basePriceEur * 229000 / 8900),
    pln: Math.round(basePriceEur * 37900 / 8900),
    huf: Math.round(basePriceEur * 3590000 / 8900),
  }
}

interface Signature {
  name: string
  slug: string
  basePrice: number
  configuration: Record<string, string>
}

// Every base/shade + color combination below has verified render assets under
// public/assets/{bases,shades}/. Ids match public/parts.json exactly.
const SIGNATURES: Signature[] = [
  { name: 'Nora', slug: 'nora', basePrice: 5399, configuration: { base: 'Base 1', baseColor: 'black', shade: 'Shade 1', shadeColor: 'black', cable: 'carbon-black', switch: 'switch-black', plug: 'plug-black', bulb: 'warm' } },
  { name: 'Kupola', slug: 'kupola', basePrice: 5899, configuration: { base: 'Base 2', baseColor: 'cream', shade: 'Shade 2', shadeColor: 'cream', cable: 'blue-beige', switch: 'switch-white', plug: 'plug-white', bulb: 'warm' } },
  { name: 'Vlna', slug: 'vlna', basePrice: 6399, configuration: { base: 'Base 5', baseColor: 'lake-blue', shade: 'Shade 5', shadeColor: 'lake-blue', cable: 'classic-blue', switch: 'switch-white', plug: 'plug-white', bulb: 'warm' } },
  { name: 'Aurora', slug: 'aurora', basePrice: 6899, configuration: { base: 'Base 10', baseColor: 'forest-green', shade: 'Shade 10', shadeColor: 'forest-green', cable: 'sage-green', switch: 'switch-black', plug: 'plug-black', bulb: 'warm' } },
  { name: 'Terra', slug: 'terra', basePrice: 5399, configuration: { base: 'Base 3', baseColor: 'peanut-brown', shade: 'Shade 3', shadeColor: 'peanut-brown', cable: 'espresso', switch: 'switch-black', plug: 'plug-black', bulb: 'warm' } },
  { name: 'Luna', slug: 'luna', basePrice: 7499, configuration: { base: 'Base 7', baseColor: 'texture-grey', shade: 'Shade 7', shadeColor: 'texture-grey', cable: 'carbon-black', switch: 'switch-black', plug: 'plug-black', bulb: 'cold' } },
  { name: 'Flora', slug: 'flora', basePrice: 5999, configuration: { base: 'Base 4', baseColor: 'pink', shade: 'Shade 4', shadeColor: 'pink', cable: 'fuchsia', switch: 'switch-white', plug: 'plug-white', bulb: 'warm' } },
  { name: 'Miro', slug: 'miro', basePrice: 8900, configuration: { base: 'Base 6', baseColor: 'red', shade: 'Shade 6', shadeColor: 'red', cable: 'fire-red', switch: 'switch-black', plug: 'plug-black', bulb: 'warm' } },
]

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payload = await getPayload({ config })
  const results: string[] = []

  for (const sig of SIGNATURES) {
    const { docs } = await payload.find({
      collection: 'products',
      where: { slug: { equals: sig.slug } },
      limit: 1,
    })
    if (docs[0]) {
      results.push(`skipped (exists): ${sig.slug}`)
      continue
    }

    const created = await payload.create({
      collection: 'products',
      data: {
        title: sig.name,
        slug: sig.slug,
        description: DESC.en.replace('{name}', sig.name),
        basePrice: sig.basePrice,
        currency: 'EUR',
        prices: prices(sig.basePrice),
        configuration: sig.configuration,
        partsKey: 'leah',
        status: 'published',
        configuratorOnly: false,
      },
      locale: 'en',
    })

    for (const locale of LOCALES) {
      if (locale === 'en') continue
      await payload.update({
        collection: 'products',
        id: created.id,
        locale,
        data: { title: sig.name, description: (DESC[locale] ?? DESC.en).replace('{name}', sig.name) },
      })
    }

    results.push(`created: ${sig.slug} (id=${created.id})`)
  }

  return NextResponse.json({ ok: true, results })
}
