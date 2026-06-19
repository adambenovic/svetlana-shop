import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { createPayment, type GoPayPayment } from '@/lib/gopay'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    customer: { name: string; email: string; phone: string }
    items: Array<{ productId: string; title: string; configuration: Record<string, string>; quantity: number; unitPrice: number }>
    shipping: { packetaPointId: number; packetaPointName: string; packetaPointCity: string }
    totalAmount: number
    currency: string
    locale: string
  }

  const { customer, items, shipping, currency, locale } = body

  if (!customer?.email || !customer?.name || !items?.length || !shipping?.packetaPointId) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const orderNumber = `SL-${Date.now()}-${randomBytes(3).toString('hex')}`
  const payload = await getPayload({ config })

  // Recompute totalAmount server-side — never trust client-submitted price.
  // Verify each product exists and floor unitPrice at basePrice.
  const verifiedItems = await Promise.all(
    items.map(async (item) => {
      const { docs } = await payload.find({
        collection: 'products',
        where: { id: { equals: item.productId } },
        limit: 1,
      })
      const product = docs[0]
      if (!product) throw new Error(`Unknown product: ${item.productId}`)
      const minPrice = product.basePrice as number
      const unitPrice = Math.max(item.unitPrice, minPrice)
      return { ...item, unitPrice }
    })
  )
  const totalAmount = verifiedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  const order = await payload.create({
    collection: 'orders',
    data: { orderNumber, status: 'pending', locale, customer, items: verifiedItems, shipping, totalAmount, currency },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const localePrefix = locale === 'sk' ? '' : `/${locale}`

  let payment: GoPayPayment
  try {
    payment = await createPayment({
      orderId: orderNumber,
      amount: totalAmount,
      currency,
      description: `Svetlana Lampe — ${orderNumber}`,
      email: customer.email,
      returnUrl: `${appUrl}${localePrefix}/checkout/success?gopayId={payment_id}`,
      notifyUrl: `${appUrl}/api/webhooks/gopay`,
      locale,
    })
  } catch {
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'failed' },
    }).catch(() => {})
    return NextResponse.json({ error: 'Payment gateway unavailable' }, { status: 502 })
  }

  await payload.update({
    collection: 'orders',
    id: order.id,
    data: { gopayId: payment.id },
  })

  return NextResponse.json({ gopayUrl: payment.gw_url, orderId: order.id })
}
