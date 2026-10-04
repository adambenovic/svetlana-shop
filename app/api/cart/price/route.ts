import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getExchangeRates, itemPriceMap } from '@/lib/server-pricing'
import { checkRateLimit } from '@/lib/rate-limit'
import { isRecord, readJsonLimited, safeLocale } from '@/lib/read-json'
import { validateConfiguration } from '@/lib/validate-configuration'
import type { PriceMap } from '@/store/currency'

// Current per-currency unit prices for the lines of a cart. Carts persist in the
// browser with the prices captured when an item was added; the client calls
// this on load to re-price them, so admin price/exchange-rate changes reach
// existing carts. Read-only. Body: { items: [{ productId, configuration }],
// locale? }. Response (index-aligned with `items`):
//   prices: PriceMap | null  — null = product unknown or not published
//   titles: string | null    — the product title in `locale`
//   valid:  boolean          — false = configuration not in parts.json
// The order route applies the same rules, so a line flagged here can't be ordered.

const MAX_ITEMS = 50
const ID_PATTERN = /^\d{1,9}$/

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, 'cart-price', 60, 60_000)
  if (limited) return limited

  const parsed = await readJsonLimited(req)
  if (!parsed.ok) return parsed.response
  const body = parsed.data
  if (!isRecord(body) || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }
  const locale = safeLocale(body.locale)
  const items = body.items.slice(0, MAX_ITEMS).map(i => (isRecord(i) ? i : {}))
  const idOf = (i: Record<string, unknown>) => {
    const id = typeof i.productId === 'number' ? String(i.productId) : i.productId
    return typeof id === 'string' && ID_PATTERN.test(id) ? id : null
  }

  const ids = [...new Set(items.map(idOf).filter((id): id is string => id !== null))]
  const byId = new Map<string, Record<string, unknown>>()
  let prices: Array<PriceMap | null> = items.map(() => null)
  if (ids.length) {
    const payload = await getPayload({ config })
    const rates = await getExchangeRates(payload)
    const { docs } = await payload.find({
      collection: 'products',
      where: { and: [{ id: { in: ids } }, { status: { equals: 'published' } }] },
      limit: ids.length,
      depth: 0,
      locale,
    })
    for (const d of docs) byId.set(String(d.id), d as unknown as Record<string, unknown>)
    prices = items.map(item => {
      const id = idOf(item)
      const product = id ? byId.get(id) : undefined
      if (!product) return null
      const check = validateConfiguration(item.configuration)
      return itemPriceMap(product, check.valid ? check.configuration : {}, rates)
    })
  }

  const titles = items.map(item => {
    const id = idOf(item)
    const title = id ? byId.get(id)?.title : undefined
    return typeof title === 'string' ? title : null
  })
  const valid = items.map(item => {
    const id = idOf(item)
    const product = id ? byId.get(id) : undefined
    return validateConfiguration(item.configuration, { complete: product?.configuratorOnly === true }).valid
  })

  return NextResponse.json({ prices, titles, valid })
}
