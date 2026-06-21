import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

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

export async function POST() {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'products',
    where: { configuratorOnly: { equals: true } },
    limit: 1,
  })

  if (docs[0]) {
    return NextResponse.json({ ok: true, message: 'Configurator product already exists', id: docs[0].id })
  }

  const created = await payload.create({
    collection: 'products',
    data: {
      title: TITLES['en'],
      slug: 'configurator-lamp',
      basePrice: 8900,
      currency: 'EUR',
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

  return NextResponse.json({ ok: true, message: 'Configurator product created', id: created.id })
}
