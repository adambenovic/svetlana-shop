import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import { sql } from 'drizzle-orm'
import PDFDocument from 'pdfkit'
import type { Payload } from 'payload'

// ── Company identification (matches the legal pages) ───────────────────────
export const SUPPLIER = {
  name: 'BenoCode s.r.o.',
  brand: 'Svetlana Lampe',
  street: 'Rázusova 6',
  city: '949 01 Nitra',
  country: 'Slovenská republika',
  ico: '55 920 918',
  icDph: 'SK2122131110',
  register: 'OR Okresného súdu Nitra, oddiel: Sro, vložka č. 62043/N',
  email: 'shop@benocode.sk',
  web: 'https://svetlanalampe.sk',
}

// Standard VAT rate of the destination country (OSS — distance sales are taxed
// where the goods arrive; verified 2026 rates). Non-EU destinations are exports (0%).
export const VAT_RATES: Record<string, number> = {
  SK: 23, CZ: 21, AT: 20, DE: 19, PL: 23, HU: 27, ES: 21, FR: 20,
  IT: 22, NL: 21, BE: 21, SI: 22, HR: 25, RO: 21,
  UA: 0, GB: 0, // outside EU VAT area — export
}

export function vatFromGross(grossCents: number, rate: number): { base: number; vat: number } {
  const vat = Math.round(grossCents * rate / (100 + rate))
  return { base: grossCents - vat, vat }
}

export function formatInvoiceNumber(seq: number, year: number): string {
  return `FV-${year}-${String(seq).padStart(5, '0')}`
}

const FONT = path.join(process.cwd(), 'public/fonts/DejaVuSans.ttf')
const FONT_BOLD = path.join(process.cwd(), 'public/fonts/DejaVuSans-Bold.ttf')

interface InvoiceOrder {
  orderNumber: string
  invoiceNumber: string
  issuedAt: Date
  paidAt: Date
  customer: { name: string; email: string; phone?: string }
  billing: { street: string; city: string; zip: string; country: string }
  items: Array<{ title: string; configuration?: Record<string, string>; quantity: number; unitPrice: number }>
  totalAmount: number
  currency: string
  discountCode?: string
  discountPercent?: number
  vatCountry: string
  vatRate: number
}

function money(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`
}

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

/** Renders the invoice PDF (bilingual SK/EN) and resolves with its bytes. */
export function buildInvoicePdf(o: InvoiceOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, font: FONT, info: { Title: o.invoiceNumber } })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width - 100

    doc.font(FONT_BOLD).fontSize(20).text(`FAKTÚRA / INVOICE ${o.invoiceNumber}`)
    doc.moveDown(0.3)
    doc.font(FONT).fontSize(9).fillColor('#555')
      .text('Daňový doklad / Tax document')
    doc.moveDown(1)

    // Supplier / customer columns
    const colY = doc.y
    doc.fillColor('#000').font(FONT_BOLD).fontSize(10).text('Dodávateľ / Supplier', 50, colY)
    doc.font(FONT).fontSize(9)
      .text(`${SUPPLIER.name} (${SUPPLIER.brand})`)
      .text(SUPPLIER.street).text(SUPPLIER.city).text(SUPPLIER.country)
      .text(`IČO: ${SUPPLIER.ico}`)
      .text(`IČ DPH: ${SUPPLIER.icDph}`)
      .text(SUPPLIER.register, { width: W / 2 - 10 })
    const leftEndY = doc.y

    doc.font(FONT_BOLD).fontSize(10).text('Odberateľ / Customer', 320, colY)
    doc.font(FONT).fontSize(9)
      .text(o.customer.name, 320)
      .text(o.billing.street, 320)
      .text(`${o.billing.zip} ${o.billing.city}`, 320)
      .text(o.billing.country, 320)
      .text(o.customer.email, 320)

    // Continue below whichever column ran longer
    doc.y = Math.max(leftEndY, doc.y) + 18
    doc.text('', 50)

    // Dates & payment
    const meta: Array<[string, string]> = [
      ['Dátum vystavenia / Issue date', fmtDate(o.issuedAt)],
      ['Dátum dodania / Date of supply', fmtDate(o.paidAt)],
      ['Objednávka / Order', o.orderNumber],
      ['Spôsob úhrady / Payment', 'Online (GoPay) — uhradené / paid'],
    ]
    for (const [k, v] of meta) {
      doc.font(FONT).fontSize(9).text(`${k}: `, { continued: true }).font(FONT_BOLD).text(v)
    }
    doc.moveDown(1)

    // Items table
    const tableX = 50
    doc.font(FONT_BOLD).fontSize(9)
    doc.text('Položka / Item', tableX, doc.y, { width: 260, continued: false })
    const headY = doc.y - 11
    doc.text('Ks / Qty', 320, headY, { width: 40, align: 'right' })
    doc.text('Cena / Unit', 370, headY, { width: 80, align: 'right' })
    doc.text('Spolu / Total', 460, headY, { width: 85, align: 'right' })
    doc.moveTo(tableX, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#999').stroke()
    doc.moveDown(0.5)

    doc.font(FONT).fontSize(9)
    for (const it of o.items) {
      const cfg = Object.entries(it.configuration ?? {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')
      const rowY = doc.y
      doc.text(it.title + (cfg ? `\n${cfg}` : ''), tableX, rowY, { width: 260 })
      const rowEnd = doc.y
      doc.text(String(it.quantity), 320, rowY, { width: 40, align: 'right' })
      doc.text(money(it.unitPrice, o.currency), 370, rowY, { width: 80, align: 'right' })
      doc.text(money(it.unitPrice * it.quantity, o.currency), 460, rowY, { width: 85, align: 'right' })
      doc.y = Math.max(rowEnd, doc.y) + 4
    }

    const subtotal = o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    doc.moveTo(tableX, doc.y).lineTo(545, doc.y).strokeColor('#999').stroke()
    doc.moveDown(0.5)

    if (o.discountCode && o.discountPercent) {
      doc.text(`Zľava / Discount ${o.discountCode} (−${o.discountPercent}%)`, 320, doc.y, { width: 130 })
      doc.text(`−${money(subtotal - o.totalAmount, o.currency)}`, 460, doc.y - 11, { width: 85, align: 'right' })
      doc.moveDown(0.4)
    }

    const { base, vat } = vatFromGross(o.totalAmount, o.vatRate)
    const totals: Array<[string, string, boolean]> = [
      [`Základ dane / Tax base`, money(base, o.currency), false],
      [`DPH / VAT ${o.vatRate}% (${o.vatCountry})`, money(vat, o.currency), false],
      ['Spolu na úhradu / Total', money(o.totalAmount, o.currency), true],
    ]
    for (const [k, v, bold] of totals) {
      doc.font(bold ? FONT_BOLD : FONT).fontSize(bold ? 11 : 9)
      doc.text(k, 300, doc.y, { width: 150 })
      doc.text(v, 460, doc.y - (bold ? 13 : 11), { width: 85, align: 'right' })
      doc.moveDown(0.3)
    }

    doc.moveDown(1)
    doc.font(FONT).fontSize(8).fillColor('#555')
    if (o.vatRate === 0) {
      doc.text('Oslobodené od DPH — vývoz tovaru mimo EÚ. / VAT exempt — export outside the EU.', 50)
    } else {
      doc.text('Predaj tovaru na diaľku — DPH krajiny určenia (osobitná úprava OSS). / Distance sale of goods — destination country VAT (OSS scheme).', 50)
    }
    doc.moveDown(0.5)
    doc.text(`${SUPPLIER.name} · ${SUPPLIER.email} · ${SUPPLIER.web}`, 50)

    doc.end()
  })
}

// ── Generation & storage ────────────────────────────────────────────────────
export const INVOICE_DIR = process.env.INVOICE_DIR ?? '/app/invoices'

async function nextInvoiceSeq(payload: Payload): Promise<number> {
  const db = (payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows: Array<{ nextval: string | number }> }> }
  }).drizzle
  const res = await db.execute(sql`SELECT nextval('invoice_number_seq')`)
  return Number(res.rows[0]!.nextval)
}

/** Idempotently generates invoice number/token/PDF for a paid order and stores
 *  everything on the order. Returns the fields needed for the email. */
export async function ensureInvoice(payload: Payload, orderId: string | number): Promise<{
  invoiceNumber: string
  invoiceToken: string
  pdf: Buffer
}> {
  const order = await payload.findByID({ collection: 'orders', id: orderId })

  let invoiceNumber = order.invoiceNumber as string | null
  let invoiceToken = order.invoiceToken as string | null
  let issuedAt = order.invoiceIssuedAt ? new Date(order.invoiceIssuedAt as string) : new Date()
  const billing = (order.billing ?? {}) as { street?: string; city?: string; zip?: string; country?: string }
  const vatCountry = (order.vatCountry as string) ?? billing.country ?? 'SK'
  const vatRate = typeof order.vatRate === 'number' ? order.vatRate : (VAT_RATES[vatCountry] ?? VAT_RATES.SK)

  if (!invoiceNumber || !invoiceToken) {
    const seq = await nextInvoiceSeq(payload)
    invoiceNumber = formatInvoiceNumber(seq, issuedAt.getFullYear())
    invoiceToken = randomBytes(16).toString('hex')
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        invoiceNumber,
        invoiceToken,
        invoiceIssuedAt: issuedAt.toISOString(),
        vatCountry,
        vatRate,
      },
    })
  }

  const pdf = await buildInvoicePdf({
    orderNumber: order.orderNumber as string,
    invoiceNumber,
    issuedAt,
    paidAt: issuedAt,
    customer: order.customer as { name: string; email: string },
    billing: {
      street: billing.street ?? '', city: billing.city ?? '',
      zip: billing.zip ?? '', country: billing.country ?? '',
    },
    items: order.items as InvoiceOrder['items'],
    totalAmount: order.totalAmount as number,
    currency: order.currency as string,
    discountCode: (order.discountCode as string) ?? undefined,
    discountPercent: (order.discountPercent as number) ?? undefined,
    vatCountry,
    vatRate,
  })

  fs.mkdirSync(INVOICE_DIR, { recursive: true })
  fs.writeFileSync(path.join(INVOICE_DIR, `${invoiceNumber}.pdf`), pdf)

  return { invoiceNumber, invoiceToken, pdf }
}
