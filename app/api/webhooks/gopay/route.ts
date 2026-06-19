import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getPayment } from '@/lib/gopay'
import { createShipment } from '@/lib/packeta'
import { sendOrderConfirmation } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const gopayId = searchParams.get('id')
  if (!gopayId) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  const payload = await getPayload({ config })

  // Pre-check: verify gopayId maps to a pending order before hitting GoPay API.
  // Prevents API abuse and unnecessary token usage from arbitrary webhook POSTs.
  const { docs } = await payload.find({
    collection: 'orders',
    where: { and: [{ gopayId: { equals: gopayId } }, { status: { equals: 'pending' } }] },
    limit: 1,
  })
  if (!docs.length) return NextResponse.json({ ok: true })

  const payment = await getPayment(gopayId)
  if (payment.state !== 'PAID') return NextResponse.json({ ok: true })

  const order = docs[0]

  await payload.update({ collection: 'orders', id: order.id, data: { status: 'paid' } })

  try {
    const shipment = await createShipment({
      orderNumber: order.orderNumber as string,
      name: (order.customer as { name: string }).name,
      email: (order.customer as { email: string }).email,
      phone: (order.customer as { phone: string }).phone,
      addressId: (order.shipping as { packetaPointId: number }).packetaPointId,
      value: (order.totalAmount as number) / 100,
      currency: order.currency as string,
    })
    await payload.update({ collection: 'orders', id: order.id, data: { packetaId: shipment.id, status: 'shipped' } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Packeta shipment failed:', msg)
    await payload.update({ collection: 'orders', id: order.id, data: { shipmentError: msg } })
  }

  try {
    await sendOrderConfirmation({
      to: (order.customer as { email: string }).email,
      orderNumber: order.orderNumber as string,
      items: order.items as Array<{ title: string; configuration: Record<string, string>; quantity: number; unitPrice: number }>,
      totalAmount: order.totalAmount as number,
      currency: order.currency as string,
      packetaPointName: (order.shipping as { packetaPointName: string }).packetaPointName,
      locale: order.locale as string,
    })
  } catch (err) {
    console.error('Email send failed:', err)
  }

  return NextResponse.json({ ok: true })
}
