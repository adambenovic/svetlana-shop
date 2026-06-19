const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

function apiKey() {
  return process.env.BREVO_API_KEY!
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

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Svetlana Lampe', email: process.env.EMAIL_FROM! },
      to: [{ email: p.to }],
      subject: `Order ${p.orderNumber} confirmed — Svetlana Lampe`,
      htmlContent: `
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
    }),
  })

  if (!res.ok) {
    throw new Error(`Brevo send failed: ${res.status} ${await res.text()}`)
  }
}
