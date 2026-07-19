const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

const i18n: Record<string, { subject: string; thanks: string; order: string; total: string; pickup: string; invoice: string }> = {
  sk: { subject: 'Objednávka {n} potvrdená — Svetlana Lampe', thanks: 'Ďakujeme za vašu objednávku!', order: 'Číslo objednávky', total: 'Celková suma', pickup: 'Výdajné miesto', invoice: 'Faktúra' },
  cs: { subject: 'Objednávka {n} potvrzena — Svetlana Lampe', thanks: 'Děkujeme za vaši objednávku!', order: 'Číslo objednávky', total: 'Celková částka', pickup: 'Výdejní místo', invoice: 'Faktura' },
  de: { subject: 'Bestellung {n} bestätigt — Svetlana Lampe', thanks: 'Vielen Dank für Ihre Bestellung!', order: 'Bestellnummer', total: 'Gesamtbetrag', pickup: 'Abholort', invoice: 'Rechnung' },
  pl: { subject: 'Zamówienie {n} potwierdzone — Svetlana Lampe', thanks: 'Dziękujemy za zamówienie!', order: 'Numer zamówienia', total: 'Suma', pickup: 'Punkt odbioru', invoice: 'Faktura' },
  hu: { subject: '{n} rendelés visszaigazolva — Svetlana Lampe', thanks: 'Köszönjük a rendelését!', order: 'Rendelésszám', total: 'Összeg', pickup: 'Átvételi pont', invoice: 'Számla' },
  uk: { subject: 'Замовлення {n} підтверджено — Svetlana Lampe', thanks: 'Дякуємо за замовлення!', order: 'Номер замовлення', total: 'Сума', pickup: 'Пункт видачі', invoice: 'Рахунок-фактура' },
  en: { subject: 'Order {n} confirmed — Svetlana Lampe', thanks: 'Thank you for your order!', order: 'Order number', total: 'Total', pickup: 'Pickup point', invoice: 'Invoice' },
}

function t(locale: string) {
  return i18n[locale] ?? i18n.en
}

// Order fields (item titles, configuration keys/values, pickup point, order
// number) originate from user/product input and are interpolated into HTML —
// escape them so they can't inject markup into the confirmation email.
function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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
  invoiceUrl?: string
  invoicePdf?: { filename: string; content: Buffer }
}

export async function sendOrderConfirmation(p: OrderEmailParams): Promise<void> {
  const currency = esc(p.currency)
  const itemsHtml = p.items
    .map(i => {
      const cfg = Object.entries(i.configuration).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(', ')
      return `<li>${esc(i.title)} (${cfg}) × ${esc(i.quantity)} — ${((i.unitPrice * i.quantity) / 100).toFixed(2)} ${currency}</li>`
    })
    .join('')

  const tr = t(p.locale)
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
      subject: tr.subject.replace('{n}', p.orderNumber),
      ...(p.invoicePdf ? { attachment: [{ name: p.invoicePdf.filename, content: p.invoicePdf.content.toString('base64') }] } : {}),
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #E8734A;">${tr.thanks}</h1>
          <p>${tr.order}: <strong>${esc(p.orderNumber)}</strong></p>
          <ul style="line-height: 2;">${itemsHtml}</ul>
          <p style="font-size: 20px;">${tr.total}: <strong>${(p.totalAmount / 100).toFixed(2)} ${currency}</strong></p>
          <p>${tr.pickup}: <strong>${esc(p.packetaPointName)}</strong></p>
          ${p.invoiceUrl ? `<p>${tr.invoice}: <a href="${esc(p.invoiceUrl)}">${esc(p.invoiceUrl)}</a></p>` : ''}
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
