import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { createPayment, type GoPayPayment } from '@/lib/gopay'
import { isBillingCountry, isShippingCountry } from '@/lib/countries'
import { getExchangeRates, itemPriceMap } from '@/lib/server-pricing'
import { CHARGE_CURRENCIES } from '@/lib/prices'
import type { Currency } from '@/store/currency'
import { checkGlobalRateLimit, checkRateLimit } from '@/lib/rate-limit'
import { isRecord, readJsonLimited, safeLocale } from '@/lib/read-json'
import { validateConfiguration } from '@/lib/validate-configuration'
import { failUnpaidOrder, reserveDiscount, unreserveDiscount } from '@/lib/payment-sync'
import { notifyOps, escapeHtml } from '@/lib/notify'
import { vatCountryFor } from '@/lib/invoice'
import { getPathname } from '@/i18n/navigation'

// Same pattern Payload validates `email` fields with (payload/dist/fields/validations.js)
// — checked here so a bad address is a clean 400, not a failed payload.create.
const EMAIL_RE = /^(?!.*\.\.)[\w!#$%&'*+/=?^`{|}~-](?:[\w!#$%&'*+/=?^`{|}~.-]*[\w!#$%&'*+/=?^`{|}~-])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i
const ID_PATTERN = /^\d{1,9}$/
const MAX_ITEMS = 50

const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status })

/** A trimmed non-empty string of at most `max` chars, else null. */
function text(v: unknown, max = 200): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s && s.length <= max ? s : null
}

export async function POST(req: NextRequest) {
  // Per IP, plus a cap across all clients — every order creates a real
  // (production) GoPay payment.
  const limited = checkRateLimit(req, 'orders', 10, 60_000) ?? checkGlobalRateLimit('orders', 30, 60_000)
  if (limited) return limited

  const parsed = await readJsonLimited(req)
  if (!parsed.ok) return parsed.response
  const body = parsed.data
  if (!isRecord(body)) return fail('invalid_request')

  const customerIn = isRecord(body.customer) ? body.customer : {}
  const billingIn = isRecord(body.billing) ? body.billing : {}
  const shippingIn = isRecord(body.shipping) ? body.shipping : {}
  const itemsIn = Array.isArray(body.items) ? body.items : []
  const currency = body.currency
  const locale = safeLocale(body.locale)

  // Only currencies the GoPay account can settle — others are display-only and
  // the checkout charges them in EUR (see CHARGE_CURRENCIES).
  if (typeof currency !== 'string' || !CHARGE_CURRENCIES.includes(currency as Currency)) return fail('invalid_request')
  const name = text(customerIn.name)
  const phone = text(customerIn.phone, 40)
  const email = text(customerIn.email, 254)
  if (!name || !phone) return fail('invalid_request')
  if (!email || !EMAIL_RE.test(email)) return fail('invalid_email')
  const customer = { name, email, phone }

  const street = text(billingIn.street)
  const city = text(billingIn.city)
  const zip = text(billingIn.zip, 20)
  const country = typeof billingIn.country === 'string' ? billingIn.country.trim().toUpperCase() : ''
  if (!street || !city || !zip || !isBillingCountry(country)) return fail('invalid_billing')
  const billing = { street, city, zip, country }

  // Packeta pickup point (numeric id; a digit string is accepted too). Its
  // country must be one we deliver to — the widget is restricted to these,
  // anything else is a stale or forged client.
  const rawPointId = shippingIn.packetaPointId
  const pointId = typeof rawPointId === 'string' && /^\d{1,12}$/.test(rawPointId) ? Number(rawPointId) : rawPointId
  const pointName = text(shippingIn.packetaPointName)
  const pointCountry = typeof shippingIn.packetaPointCountry === 'string' ? shippingIn.packetaPointCountry.trim().toUpperCase() : ''
  if (typeof pointId !== 'number' || !Number.isSafeInteger(pointId) || pointId <= 0 || !pointName) return fail('invalid_request')
  if (!isShippingCountry(pointCountry)) return fail('pickup_country_not_supported')
  const shipping = {
    packetaPointId: pointId,
    packetaPointName: pointName,
    packetaPointCity: text(shippingIn.packetaPointCity) ?? '',
    packetaPointCountry: pointCountry,
  }

  // Item shapes. Quantity: positive integer within a sane bound; the client's
  // unitPrice/title are ignored — both are derived from the product below.
  if (itemsIn.length === 0 || itemsIn.length > MAX_ITEMS) return fail('invalid_request')
  const lines: Array<{ productId: string; configuration: unknown; quantity: number }> = []
  for (const item of itemsIn) {
    if (!isRecord(item)) return fail('invalid_request')
    const productId = typeof item.productId === 'number' ? String(item.productId) : item.productId
    if (typeof productId !== 'string' || !ID_PATTERN.test(productId)) return fail('invalid_request')
    if (!Number.isInteger(item.quantity) || (item.quantity as number) < 1 || (item.quantity as number) > 999) {
      return fail('invalid_request')
    }
    lines.push({ productId, configuration: item.configuration, quantity: item.quantity as number })
  }

  const orderNumber = `SL-${Date.now()}-${randomBytes(3).toString('hex')}`
  const payload = await getPayload({ config })
  const rates = await getExchangeRates(payload)

  // The server price is authoritative — never trust the client-submitted price.
  // Each product must exist and be published; each configuration must name
  // parts from parts.json. The charged price is the surcharge-inclusive price
  // (EUR base + part modifiers, converted with the current exchange rates) for
  // the charged currency, so a stale cart can neither underpay nor be
  // overcharged with an outdated higher price. Titles come from the product.
  const ids = [...new Set(lines.map(l => l.productId))]
  const { docs: products } = await payload.find({
    collection: 'products',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    locale,
  })
  const byId = new Map(products.map(p => [String(p.id), p as unknown as Record<string, unknown>]))
  const cur = currency as Currency

  const unavailable = new Set<string>()
  const invalidConfig = new Set<string>()
  const verifiedItems: Array<{ productId: string; title: string; configuration: Record<string, string>; quantity: number; unitPrice: number }> = []
  for (const line of lines) {
    const product = byId.get(line.productId)
    if (!product || product.status !== 'published') { unavailable.add(line.productId); continue }
    const check = validateConfiguration(line.configuration, { complete: product.configuratorOnly === true })
    if (!check.valid) { invalidConfig.add(line.productId); continue }
    const unitPrice = itemPriceMap(product, check.configuration, rates)[cur]
    if (typeof unitPrice !== 'number' || unitPrice <= 0) { unavailable.add(line.productId); continue }
    const title = typeof product.title === 'string' && product.title ? product.title : String(product.slug ?? '')
    verifiedItems.push({ productId: line.productId, title, configuration: check.configuration, quantity: line.quantity, unitPrice })
  }
  if (unavailable.size) return fail('product_unavailable', 400, { productIds: [...unavailable] })
  if (invalidConfig.size) return fail('invalid_configuration', 400, { productIds: [...invalidConfig] })
  const subtotal = verifiedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  // Discount — the client-applied percent is never trusted. One use of the code
  // is RESERVED atomically right here (guarded by active / validUntil / maxUses
  // in the same UPDATE), so concurrent checkouts can't over-redeem a limited
  // code. The reservation is released if the order or its payment fails, or
  // when the reconcile job finds the payment abandoned (lib/payment-sync.ts).
  let discount: { code: string; percent: number } | null = null
  if (body.discountCode != null && body.discountCode !== '') {
    const code = text(body.discountCode, 64)?.toUpperCase()
    if (!code) return fail('discount_invalid')
    try {
      discount = await reserveDiscount(payload, code)
    } catch (err) {
      console.error('[orders] discount reservation failed:', err)
      return fail('order_create_failed', 500)
    }
    if (!discount) return fail('discount_invalid')
  }

  const totalAmount = discount
    ? subtotal - Math.round(subtotal * discount.percent / 100)
    : subtotal

  // Never charge more than the total the customer was shown (e.g. a price went
  // up while the cart sat in their browser). The client re-prices its cart and
  // asks the customer to confirm the new total. A lower server total is fine.
  if (typeof body.totalAmount === 'number' && totalAmount > body.totalAmount) {
    if (discount) await unreserveDiscount(payload, discount.code)
    return fail('price_changed', 409, { totalAmount, discount })
  }

  // VAT country (lib/invoice.ts decides: Slovak VAT unless OSS is enabled, then
  // the destination = pickup-point country). The pickup country is stored too.
  const vatCountry = vatCountryFor(shipping.packetaPointCountry)

  let order: { id: string | number }
  try {
    order = await payload.create({
      collection: 'orders',
      data: {
        orderNumber, status: 'pending', locale, customer, billing, items: verifiedItems,
        shipping, totalAmount, currency, vatCountry,
        ...(discount ? { discountCode: discount.code, discountPercent: discount.percent, discountReserved: true } : {}),
      },
    })
  } catch (err) {
    console.error('[orders] order create failed:', err)
    if (discount) await unreserveDiscount(payload, discount.code)
    return (err as { name?: string })?.name === 'ValidationError'
      ? fail('invalid_order')
      : fail('order_create_failed', 500)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const successPath = getPathname({ href: '/checkout/success', locale })

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
    console.error(`[orders] GoPay createPayment failed for ${orderNumber}:`, msg)
    await failUnpaidOrder(payload, order.id)
    await notifyOps(
      `GoPay createPayment failed (${orderNumber})`,
      `<p>Creating the GoPay payment for order <strong>${escapeHtml(orderNumber)}</strong> ` +
      `(${escapeHtml((totalAmount / 100).toFixed(2))} ${escapeHtml(currency)}) failed; the customer saw an error.</p>` +
      `<pre>${escapeHtml(msg)}</pre>`,
    )
    return fail('payment_gateway_unavailable', 502)
  }

  // If storing the id fails the customer can still pay: the webhook falls
  // back to matching the order by the order_number GoPay echoes back.
  try {
    await payload.update({ collection: 'orders', id: order.id, data: { gopayId: payment.id } })
  } catch (err) {
    console.error(`[orders] could not store gopayId ${payment.id} on ${orderNumber}:`, err)
  }

  return NextResponse.json({ gopayUrl: payment.gw_url, orderId: order.id })
}
