import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { createPayment, type GoPayPayment } from '@/lib/gopay'
import { COUNTRY_ALPHA3 } from '@/lib/countries'
import { productPriceMap, applyModifier } from '@/lib/prices'
import { checkRateLimit } from '@/lib/rate-limit'
import { getPathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

// Configurator part surcharges live in public/parts.json (applied client-side via
// applyModifier). We re-read them server-side so a client can never pay the bare
// basePrice while selecting an up-charged base/shade. Cached per process.
interface Part { id: string; priceModifier?: number }
interface Parts { bases: Part[]; shades: Part[] }
let partsCache: Parts | null = null
function loadParts(): Parts {
  if (partsCache) return partsCache
  const raw = fs.readFileSync(path.join(process.cwd(), 'public/parts.json'), 'utf-8')
  const parsed = JSON.parse(raw) as Parts
  partsCache = { bases: parsed.bases ?? [], shades: parsed.shades ?? [] }
  return partsCache
}

function surchargeEur(configuration: Record<string, string> | undefined, parts: Parts): number {
  const base = configuration?.base
  const shade = configuration?.shade
  const baseMod = (base && parts.bases.find(p => p.id === base)?.priceModifier) || 0
  const shadeMod = (shade && parts.shades.find(p => p.id === shade)?.priceModifier) || 0
  return baseMod + shadeMod
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, 'orders', 10, 60_000)
  if (limited) return limited

  let body: {
    customer: { name: string; email: string; phone: string }
    billing: { street: string; city: string; zip: string; country: string }
    items: Array<{ productId: string; title: string; configuration: Record<string, string>; quantity: number; unitPrice: number }>
    shipping: { packetaPointId: number; packetaPointName: string; packetaPointCity: string; packetaPointCountry?: string }
    totalAmount: number
    currency: string
    locale: string
    discountCode?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request body' }, { status: 400 })
  }

  const { customer, billing, items, shipping, currency, locale, discountCode } = body

  const ALLOWED_CURRENCIES = ['EUR', 'CZK', 'PLN', 'HUF']
  if (!customer?.email || !customer?.name || !items?.length || !shipping?.packetaPointId || !ALLOWED_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!billing?.street || !billing?.city || !billing?.zip || !(billing?.country in COUNTRY_ALPHA3)) {
    return NextResponse.json({ error: 'Invalid billing address' }, { status: 400 })
  }

  // Validate item shapes before touching the DB. Quantity: positive integer
  // within a sane bound; unitPrice: non-negative integer (client value is only
  // ever floored upward below, never trusted downward).
  for (const item of items) {
    if (!item?.productId || typeof item.productId !== 'string') {
      return NextResponse.json({ error: 'Invalid item' }, { status: 400 })
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) {
      return NextResponse.json({ error: 'Invalid item quantity' }, { status: 400 })
    }
    if (!Number.isInteger(item.unitPrice) || item.unitPrice < 0) {
      return NextResponse.json({ error: 'Invalid item price' }, { status: 400 })
    }
  }

  const orderNumber = `SL-${Date.now()}-${randomBytes(3).toString('hex')}`
  const payload = await getPayload({ config })
  const safeLocale = (routing.locales as readonly string[]).includes(locale) ? locale as (typeof routing.locales)[number] : routing.defaultLocale
  const parts = loadParts()

  // Recompute totalAmount server-side — never trust client-submitted price.
  // For each item: verify the product exists and floor unitPrice at the
  // surcharge-inclusive price (basePrice + configurator part modifiers) for the
  // charged currency. The stored title is derived from the product, not the client.
  const cur = currency.toUpperCase() as 'EUR' | 'CZK' | 'PLN' | 'HUF'
  const verifiedItems: typeof items = []
  for (const item of items) {
    const { docs } = await payload.find({
      collection: 'products',
      where: { id: { equals: item.productId } },
      limit: 1,
      locale: safeLocale,
    })
    const product = docs[0]
    if (!product) {
      return NextResponse.json({ error: `Unknown product: ${item.productId}` }, { status: 400 })
    }
    const withSurcharge = applyModifier(productPriceMap(product), surchargeEur(item.configuration, parts))
    const minPrice = withSurcharge[cur]
    if (typeof minPrice !== 'number') {
      return NextResponse.json({ error: `No ${currency} price for product: ${item.productId}` }, { status: 400 })
    }
    verifiedItems.push({
      ...item,
      title: (product.title as string) ?? item.title,
      unitPrice: Math.max(item.unitPrice, minPrice),
    })
  }
  const subtotal = verifiedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  // Validate discount server-side — the client-applied percent is never trusted.
  // We only VALIDATE here (reject clearly-invalid codes); the atomic usedCount
  // increment happens in the paid webhook so unpaid/abandoned orders never consume it.
  let discount: { code: string; percent: number } | null = null
  if (discountCode) {
    const { docs } = await payload.find({
      collection: 'discounts',
      where: { code: { equals: discountCode.trim().toUpperCase() } },
      limit: 1,
    })
    const d = docs[0]
    const usable = !!d
      && d.active === true
      && (d.maxUses == null || ((d.usedCount as number) ?? 0) < (d.maxUses as number))
      && (d.validUntil == null || new Date(d.validUntil as string) > new Date())
    if (!usable) {
      return NextResponse.json({ error: 'Invalid discount code' }, { status: 400 })
    }
    discount = { code: d.code as string, percent: d.percent as number }
  }

  const totalAmount = discount
    ? subtotal - Math.round(subtotal * discount.percent / 100)
    : subtotal

  // VAT is charged for the destination (where the goods arrive). The frontend
  // sends the Packeta pickup-point country; fall back to the billing country.
  const vatCountry = shipping.packetaPointCountry?.trim().toUpperCase() || billing.country

  const order = await payload.create({
    collection: 'orders',
    data: {
      orderNumber, status: 'pending', locale, customer, billing, items: verifiedItems,
      shipping, totalAmount, currency, vatCountry,
      ...(discount ? { discountCode: discount.code, discountPercent: discount.percent } : {}),
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const successPath = getPathname({ href: '/checkout/success', locale: safeLocale })

  let payment: GoPayPayment
  try {
    payment = await createPayment({
      orderId: orderNumber,
      amount: totalAmount,
      currency,
      description: `Svetlana Lampe — ${orderNumber}`,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      billing,
      // GoPay appends ?id=<paymentId> to the return URL itself
      returnUrl: `${appUrl}${successPath}`,
      notifyUrl: `${appUrl}/api/webhooks/gopay`,
      locale,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[orders] GoPay error:', msg)
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'failed' },
    }).catch(() => {})
    return NextResponse.json({ error: 'Payment gateway unavailable', detail: msg }, { status: 502 })
  }

  await payload.update({
    collection: 'orders',
    id: order.id,
    data: { gopayId: payment.id },
  })

  return NextResponse.json({ gopayUrl: payment.gw_url, orderId: order.id })
}
