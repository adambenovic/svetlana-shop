import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import config from '@/payload.config'

const FIXTURE_SLUG_PREFIX = '__test__'

const FIXTURE_PRODUCTS = [
  {
    title: 'LEAH Test',
    slug: '__test__leah',
    basePrice: 8900,
    currency: 'EUR',
    status: 'published' as const,
    partsKey: 'leah',
    images: [],
  },
]

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const secret = searchParams.get('secret')
  const action = searchParams.get('action') ?? 'status'

  if (secret !== process.env.PAYLOAD_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })

  if (action === 'seed') {
    await cleanFixtures(payload)
    const ids: (string | number)[] = []
    for (const product of FIXTURE_PRODUCTS) {
      const doc = await payload.create({ collection: 'products', data: product, locale: 'sk' })
      await payload.update({ collection: 'products', id: doc.id, data: { title: product.title }, locale: 'en' })
      ids.push(doc.id)
    }
    return NextResponse.json({ ok: true, ids })
  }

  if (action === 'clean') {
    const deleted = await cleanFixtures(payload)
    return NextResponse.json({ ok: true, deleted })
  }

  // status
  const { docs, totalDocs } = await payload.find({
    collection: 'products',
    where: { slug: { contains: FIXTURE_SLUG_PREFIX } },
  })
  return NextResponse.json({ fixtures: totalDocs, ids: docs.map(d => d.id) })
}

async function cleanFixtures(payload: Payload): Promise<number> {
  const { docs } = await payload.find({
    collection: 'products',
    where: { slug: { contains: FIXTURE_SLUG_PREFIX } },
    limit: 100,
  })
  await Promise.all(docs.map(d => payload.delete({ collection: 'products', id: d.id })))
  return docs.length
}
