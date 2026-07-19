import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { createPayment, type GoPayPayment } from '@/lib/gopay'
import { COUNTRY_ALPHA3 } from '@/lib/countries'
import { getPathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    customer: { name: string; email: string; phone: string }
    billing: { street: string; city: string; zip: string; country: string }
    items: Array<{ productId: string; title: string; configuration: Record<string, string>; quantity: number; unitPrice: number }>
    shipping: { packetaPointId: number; packetaPointName: string; packetaPointCity: string }
    totalAmount: number
    currency: string
    locale: string
    discountCode?: string
  }

  const { customer, billing, items, shipping, currency, locale, discountCode } = body

  const ALLOWED_CURRENCIES = ['EUR', 'CZK', 'PLN', 'HUF']
  if (!customer?.email || !customer?.name || !items?.length || !shipping?.packetaPointId || !ALLOWED_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!billing?.street || !billing?.city || !billing?.zip || !(billing?.country in COUNTRY_ALPHA3)) {
    return NextResponse.json({ error: 'Invalid billing address' }, { status: 400 })
  }

  const orderNumber = `SL-${Date.now()}-${randomBytes(3).toString('hex')}`
  const payload = await getPayload({ config })

  // Recompute totalAmount server-side — never trust client-submitted price.
  // Verify each product exists and floor unitPrice at the product's manual price
  // for the charged currency. Non-EUR currencies require a manual price.
  const verifiedItems = await Promise.all(
    items.map(async (item) => {
      const { docs } = await payload.find({
        collection: 'products',
        where: { id: { equals: item.productId } },
        limit: 1,
      })
      const product = docs[0]
      if (!product) throw new Error(`Unknown product: ${item.productId}`)
      const prices = product.prices as { czk?: number; pln?: number; huf?: number } | undefined
      const minPrice = currency === 'EUR'
        ? (product.basePrice as number)
        : prices?.[currency.toLowerCase() as 'czk' | 'pln' | 'huf']
      if (typeof minPrice !== 'number') throw new Error(`No ${currency} price for product: ${item.productId}`)
      const unitPrice = Math.max(item.unitPrice, minPrice)
      return { ...item, unitPrice }
    })
  )
  const subtotal = verifiedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  // Validate discount server-side — the client-applied percent is never trusted
  let discount: { id: string | number; code: string; percent: number } | null = null
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
    discount = { id: d.id, code: d.code as string, percent: d.percent as number }
  }

  const totalAmount = discount
    ? subtotal - Math.round(subtotal * discount.percent / 100)
    : subtotal

  const order = await payload.create({
    collection: 'orders',
    data: {
      orderNumber, status: 'pending', locale, customer, billing, items: verifiedItems,
      shipping, totalAmount, currency,
      ...(discount ? { discountCode: discount.code, discountPercent: discount.percent } : {}),
    },
  })

  if (discount) {
    const fresh = await payload.findByID({ collection: 'discounts', id: discount.id })
    await payload.update({
      collection: 'discounts',
      id: discount.id,
      data: { usedCount: ((fresh.usedCount as number) ?? 0) + 1 },
    }).catch(err => console.error('[orders] discount usedCount update failed:', err))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const safeLocale = (routing.locales as readonly string[]).includes(locale) ? locale as (typeof routing.locales)[number] : routing.defaultLocale
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
