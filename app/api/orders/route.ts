import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { createPayment } from '@/lib/gopay'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    customer: { name: string; email: string; phone: string }
    items: Array<{ productId: string; title: string; configuration: Record<string, string>; quantity: number; unitPrice: number }>
    shipping: { packetaPointId: number; packetaPointName: string; packetaPointCity: string }
    totalAmount: number
    currency: string
    locale: string
  }

  const { customer, items, shipping, totalAmount, currency, locale } = body

  if (!customer?.email || !customer?.name || !items?.length || !shipping?.packetaPointId) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const orderNumber = `SL-${Date.now()}`
  const payload = await getPayload({ config })

  const order = await payload.create({
    collection: 'orders',
    data: { orderNumber, status: 'pending', locale, customer, items, shipping, totalAmount, currency },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const localePrefix = locale === 'sk' ? '' : `/${locale}`

  const payment = await createPayment({
    orderId: orderNumber,
    amount: totalAmount,
    currency,
    description: `Svetlana Lampe — ${orderNumber}`,
    email: customer.email,
    returnUrl: `${appUrl}${localePrefix}/checkout/success?gopayId={payment_id}`,
    notifyUrl: `${appUrl}/api/webhooks/gopay`,
    locale,
  })

  await payload.update({
    collection: 'orders',
    id: order.id,
    data: { gopayId: payment.id },
  })

  return NextResponse.json({ gopayUrl: payment.gw_url, orderId: order.id })
}
