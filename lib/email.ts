import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

function getFrom() {
  return process.env.EMAIL_FROM!
}

export interface OrderEmailParams {
  to: string
  orderNumber: string
  items: Array<{
    title: string
    configuration: Record<string, string>
    quantity: number
    unitPrice: number
  }>
  totalAmount: number
  currency: string
  packetaPointName: string
  locale: string
}

export async function sendOrderConfirmation(p: OrderEmailParams): Promise<void> {
  const itemsHtml = p.items
    .map(i => {
      const cfg = Object.entries(i.configuration).map(([k, v]) => `${k}: ${v}`).join(', ')
      return `<li>${i.title} (${cfg}) × ${i.quantity} — ${((i.unitPrice * i.quantity) / 100).toFixed(2)} ${p.currency}</li>`
    })
    .join('')

  await getResend().emails.send({
    from: getFrom(),
    to: p.to,
    subject: `Order ${p.orderNumber} confirmed — Svetlana Lampe`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #E8734A;">Thank you for your order!</h1>
        <p>Order number: <strong>${p.orderNumber}</strong></p>
        <ul style="line-height: 2;">${itemsHtml}</ul>
        <p style="font-size: 20px;">Total: <strong>${(p.totalAmount / 100).toFixed(2)} ${p.currency}</strong></p>
        <p>Pickup point: <strong>${p.packetaPointName}</strong></p>
        <hr />
        <p style="color: #999; font-size: 12px;">Svetlana Lampe — 3D printed table lamps</p>
      </div>
    `,
  })
}
