import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getExchangeRates, itemPriceMap } from '@/lib/server-pricing'
import { checkRateLimit } from '@/lib/rate-limit'

// Current per-currency unit prices for the lines of a cart. Carts persist in the
// browser with the prices captured when an item was added; the client calls
// this on load to re-price them, so admin price/exchange-rate changes reach
// existing carts. Read-only. Response is index-aligned with `items`; `null` for
// an unknown product.

const MAX_ITEMS = 50
const ID_PATTERN = /^[\w-]{1,64}$/

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, 'cart-price', 60, 60_000)
  if (limited) return limited

  let body: { items?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request body' }, { status: 400 })
  }
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, MAX_ITEMS) as Array<{
    productId?: unknown
    configuration?: unknown
  }>

  const ids = [...new Set(items.map(i => String(i?.productId ?? '')).filter(id => ID_PATTERN.test(id)))]
  if (ids.length === 0) return NextResponse.json({ prices: items.map(() => null) })

  const payload = await getPayload({ config })
  const rates = await getExchangeRates(payload)
  const { docs } = await payload.find({
    collection: 'products',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
  })
  const byId = new Map(docs.map(d => [String(d.id), d]))

  const prices = items.map(item => {
    const product = byId.get(String(item?.productId ?? ''))
    if (!product) return null
    const configuration = item.configuration && typeof item.configuration === 'object'
      ? item.configuration as Record<string, string>
      : {}
    return itemPriceMap(product, configuration, rates)
  })

  return NextResponse.json({ prices })
}
