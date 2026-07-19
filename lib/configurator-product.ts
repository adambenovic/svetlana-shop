import type { Payload } from 'payload'

const LOCALES = ['sk', 'cs', 'de', 'pl', 'hu', 'uk', 'en', 'es', 'fr', 'it'] as const

const TITLES: Record<string, string> = {
  sk: 'Svetlana Lampe – konfigurátor',
  en: 'Svetlana Lampe – Configurator',
  cs: 'Svetlana Lampe – konfigurátor',
  de: 'Svetlana Lampe – Konfigurator',
  pl: 'Svetlana Lampe – konfigurator',
  hu: 'Svetlana Lampe – konfigurátor',
  uk: 'Svetlana Lampe – конфігуратор',
  es: 'Svetlana Lampe – configurador',
  fr: 'Svetlana Lampe – configurateur',
  it: 'Svetlana Lampe – configuratore',
}

/**
 * The configurator page requires one published `configuratorOnly` product to
 * price and identify configured lamps. Called from payload.config onInit so
 * the product always exists, and from POST /api/seed-product as a manual trigger.
 */
export async function ensureConfiguratorProduct(
  payload: Payload,
): Promise<{ created: boolean; id: string | number }> {
  const { docs } = await payload.find({
    collection: 'products',
    where: { configuratorOnly: { equals: true } },
    limit: 1,
  })

  if (docs[0]) return { created: false, id: docs[0].id }

  const created = await payload.create({
    collection: 'products',
    data: {
      title: TITLES['en'],
      slug: 'configurator-lamp',
      basePrice: 8900,
      currency: 'EUR',
      // Manual per-currency prices (smallest unit) — adjust in the admin
      prices: { czk: 229000, pln: 37900, huf: 3590000 },
      partsKey: 'leah',
      status: 'published',
      configuratorOnly: true,
    },
    locale: 'en',
  })

  for (const locale of LOCALES) {
    if (locale === 'en') continue
    await payload.update({
      collection: 'products',
      id: created.id,
      locale,
      data: { title: TITLES[locale] },
    })
  }

  return { created: true, id: created.id }
}
