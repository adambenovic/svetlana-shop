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

  const payment = await getPayment(gopayId)
  if (payment.state !== 'PAID') return NextResponse.json({ ok: true })

  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'orders',
    where: { gopayId: { equals: gopayId } },
    limit: 1,
  })

  const order = docs[0]
  // Idempotency: skip if already processed
  if (!order || order.status !== 'pending') return NextResponse.json({ ok: true })

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
    // Shipment failure is non-fatal — order is paid, manual retry possible from admin
    console.error('Packeta shipment failed:', err)
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
