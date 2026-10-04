import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import { sql } from 'drizzle-orm'
import PDFDocument from 'pdfkit'
import type { Payload } from 'payload'
import { configuratorTranslator, configurationLines, isEmailLocale } from './email'

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
  email: 'contact@svetlanalampe.sk',
  web: 'https://svetlanalampe.sk',
}

// ── VAT ─────────────────────────────────────────────────────────────────────
/**
 * EU One-Stop-Shop for distance sales. BenoCode is NOT registered for OSS, so
 * every sale carries Slovak VAT regardless of the destination. Flip to true only
 * after OSS registration: invoices then charge the destination country's rate
 * (VAT_RATES) and print the OSS note.
 */
export const OSS_ENABLED = false

/** VAT country of a sale: 'SK' while OSS is off, otherwise the pickup-point (destination) country. */
export function vatCountryFor(pickupCountry?: string | null): string {
  if (!OSS_ENABLED) return 'SK'
  return pickupCountry?.trim().toUpperCase() || 'SK'
}

// Standard VAT rate per country (verified 2026 rates). Only SK applies while
// OSS_ENABLED is false; the rest is used for distance sales once OSS is on.
// Non-EU destinations are exports (0%).
export const VAT_RATES: Record<string, number> = {
  SK: 23, CZ: 21, AT: 20, DE: 19, PL: 23, HU: 27, ES: 21, FR: 20,
  IT: 22, NL: 21, BE: 21, SI: 22, HR: 25, RO: 21,
  UA: 0, GB: 0, // outside EU VAT area — export
}

export function vatFromGross(grossCents: number, rate: number): { base: number; vat: number } {
  const vat = Math.round(grossCents * rate / (100 + rate))
  return { base: grossCents - vat, vat }
}

// ── Dates (always Slovak civil time, never the container's TZ) ──────────────
const INVOICE_TZ = 'Europe/Bratislava'

function bratislavaParts(d: Date): { day: string; month: string; year: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: INVOICE_TZ, day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(d)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return { day: get('day'), month: get('month'), year: get('year') }
}

/** dd.mm.yyyy of `d` in Europe/Bratislava. */
export function formatInvoiceDate(d: Date): string {
  const { day, month, year } = bratislavaParts(d)
  return `${day}.${month}.${year}`
}

/** Calendar year of `d` in Europe/Bratislava — the invoice-number series year. */
export function invoiceYear(d: Date): number {
  return Number(bratislavaParts(d).year)
}

export function formatInvoiceNumber(seq: number, year: number): string {
  return `FV-${year}-${String(seq).padStart(5, '0')}`
}

const FONT = path.join(process.cwd(), 'public/fonts/DejaVuSans.ttf')
const FONT_BOLD = path.join(process.cwd(), 'public/fonts/DejaVuSans-Bold.ttf')

export interface InvoiceOrder {
  orderNumber: string
  invoiceNumber: string
  issuedAt: Date
  /** When the payment was received (GoPay confirmation) */
  paidAt: Date
  customer: { name: string; email: string; phone?: string }
  billing: { street: string; city: string; zip: string; country: string }
  /** unitPrice is the gross (VAT-inclusive) price in cents. `details` are the
   *  localized configuration lines; without them the raw configuration is printed. */
  items: Array<{ title: string; details?: string[]; configuration?: Record<string, string> | null; quantity: number; unitPrice: number }>
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

export interface InvoiceLine {
  description: string
  quantity: number
  /** Unit price excluding VAT, cents (Slovak VAT act §74(1)(g)) */
  unitNet: number
  vatRate: number
  /** Line total including VAT, cents */
  totalGross: number
}

/** Item rows as printed: unit price excl. VAT, VAT rate, line total incl. VAT. The
 *  VAT summary itself is computed on the order total (after discount). */
export function invoiceLines(o: Pick<InvoiceOrder, 'items' | 'vatRate'>): InvoiceLine[] {
  return o.items.map(it => {
    const details = it.details
      ?? Object.entries(it.configuration ?? {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)
    return {
      description: [it.title, ...details].join('\n'),
      quantity: it.quantity,
      unitNet: vatFromGross(it.unitPrice, o.vatRate).base,
      vatRate: o.vatRate,
      totalGross: it.unitPrice * it.quantity,
    }
  })
}

/** Footnotes on the VAT regime. Domestic Slovak VAT needs none. */
export function invoiceNotes(o: Pick<InvoiceOrder, 'vatCountry' | 'vatRate'>): string[] {
  if (o.vatRate === 0) {
    return ['Oslobodené od DPH — vývoz tovaru mimo EÚ. / VAT exempt — export outside the EU.']
  }
  if (OSS_ENABLED && o.vatCountry !== 'SK') {
    return ['Predaj tovaru na diaľku — DPH krajiny určenia (osobitná úprava OSS). / Distance sale of goods — destination country VAT (OSS scheme).']
  }
  return []
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

    // Dates & payment (§74(1)(e)/(f): issue date + date the payment was received)
    const meta: Array<[string, string]> = [
      ['Dátum vystavenia / Issue date', formatInvoiceDate(o.issuedAt)],
      ['Dátum prijatia platby / Date of payment', formatInvoiceDate(o.paidAt)],
      ['Objednávka / Order', o.orderNumber],
      ['Spôsob úhrady / Payment', 'Online (GoPay) — uhradené / paid'],
    ]
    for (const [k, v] of meta) {
      doc.font(FONT).fontSize(9).text(`${k}: `, { continued: true }).font(FONT_BOLD).text(v)
    }
    doc.moveDown(1)

    // Items table — columns: item | qty | unit excl. VAT | VAT % | total incl. VAT
    const COL = {
      item: { x: 50, w: 185 },
      qty: { x: 240, w: 35 },
      net: { x: 280, w: 85 },
      rate: { x: 370, w: 45 },
      gross: { x: 420, w: 125 },
    }
    doc.font(FONT_BOLD).fontSize(8)
    const headY = doc.y
    let headEnd = headY
    const head = (text: string, c: { x: number; w: number }, align: 'left' | 'right') => {
      doc.text(text, c.x, headY, { width: c.w, align })
      headEnd = Math.max(headEnd, doc.y)
    }
    head('Položka / Item', COL.item, 'left')
    head('Ks / Qty', COL.qty, 'right')
    head('Jedn. cena bez DPH / Unit price excl. VAT', COL.net, 'right')
    head('DPH / VAT', COL.rate, 'right')
    head('Spolu s DPH / Total incl. VAT', COL.gross, 'right')
    doc.y = headEnd
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#999').stroke()
    doc.moveDown(0.5)

    doc.font(FONT).fontSize(9)
    for (const line of invoiceLines(o)) {
      const rowY = doc.y
      doc.text(line.description, COL.item.x, rowY, { width: COL.item.w })
      const rowEnd = doc.y
      doc.text(String(line.quantity), COL.qty.x, rowY, { width: COL.qty.w, align: 'right' })
      doc.text(money(line.unitNet, o.currency), COL.net.x, rowY, { width: COL.net.w, align: 'right' })
      doc.text(`${line.vatRate} %`, COL.rate.x, rowY, { width: COL.rate.w, align: 'right' })
      doc.text(money(line.totalGross, o.currency), COL.gross.x, rowY, { width: COL.gross.w, align: 'right' })
      doc.y = Math.max(rowEnd, doc.y) + 4
    }

    const subtotal = o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#999').stroke()
    doc.moveDown(0.5)

    // Summary rows: label left of the amount column; a wrapped label pushes the next row down.
    const summaryRow = (label: string, value: string, bold = false) => {
      doc.font(bold ? FONT_BOLD : FONT).fontSize(bold ? 11 : 9)
      const y = doc.y
      doc.text(label, 280, y, { width: 175 })
      const labelEnd = doc.y
      doc.text(value, 460, y, { width: 85, align: 'right' })
      doc.y = Math.max(labelEnd, doc.y) + 3
    }

    if (subtotal > o.totalAmount) {
      const label = o.discountCode
        ? `Zľava / Discount ${o.discountCode}${o.discountPercent ? ` (−${o.discountPercent}\u00a0%)` : ''}`
        : 'Zľava / Discount'
      summaryRow(label, `−${money(subtotal - o.totalAmount, o.currency)}`)
    }

    // VAT summary on the charged total (§74(1)(h)–(j))
    const { base, vat } = vatFromGross(o.totalAmount, o.vatRate)
    summaryRow(`Základ dane / Tax base (${o.vatRate} %)`, money(base, o.currency))
    summaryRow(`DPH / VAT ${o.vatRate} % (${o.vatCountry})`, money(vat, o.currency))
    summaryRow('Spolu na úhradu / Total', money(o.totalAmount, o.currency), true)

    doc.moveDown(1)
    doc.font(FONT).fontSize(8).fillColor('#555')
    for (const note of invoiceNotes(o)) {
      doc.text(note, 50)
      doc.moveDown(0.5)
    }
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

function toDate(v: unknown): Date | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(String(v))
  return isNaN(d.getTime()) ? null : d
}

type OrderItem = { productId?: string | null; title?: string | null; configuration?: Record<string, string> | null; quantity: number; unitPrice: number }

/** Item rows in the order's language: the product's current localized title and
 *  the localized configuration (falls back to the stored title / raw values). */
async function localizedItems(payload: Payload, items: OrderItem[], locale: string): Promise<InvoiceOrder['items']> {
  let t: Awaited<ReturnType<typeof configuratorTranslator>> | null = null
  try {
    t = await configuratorTranslator(locale)
  } catch (err) {
    console.error('[invoice] configurator translations unavailable:', err)
  }
  const titles = new Map<string, string | null>()
  return Promise.all(items.map(async it => {
    let title = it.title ?? ''
    if (it.productId) {
      if (!titles.has(it.productId)) {
        try {
          const product = await payload.findByID({
            collection: 'products', id: it.productId, locale: locale as 'sk', depth: 0,
          }) as { title?: unknown }
          titles.set(it.productId, typeof product.title === 'string' ? product.title : null)
        } catch {
          titles.set(it.productId, null) // product deleted — keep the title stored on the order
        }
      }
      title = titles.get(it.productId) || title
    }
    return {
      title,
      details: configurationLines(it.configuration, t),
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    }
  }))
}

/** Idempotently generates invoice number/token/PDF for a paid order and stores
 *  everything on the order. Returns the fields needed for the email.
 *  `paidAt` = when the payment was received; defaults to the order's stored
 *  paidAt, else now (first issue) / the original issue date (regeneration). */
export async function ensureInvoice(
  payload: Payload,
  orderId: string | number,
  opts: { paidAt?: Date } = {},
): Promise<{
  invoiceNumber: string
  invoiceToken: string
  pdf: Buffer
}> {
  const order = await payload.findByID({ collection: 'orders', id: orderId })

  let invoiceNumber = order.invoiceNumber as string | null
  let invoiceToken = order.invoiceToken as string | null
  const alreadyIssued = !!(invoiceNumber && invoiceToken)
  const issuedAt = toDate(order.invoiceIssuedAt) ?? new Date()
  const paidAt = opts.paidAt ?? toDate((order as { paidAt?: unknown }).paidAt) ?? issuedAt
  const billing = (order.billing ?? {}) as { street?: string; city?: string; zip?: string; country?: string }
  const shipping = (order.shipping ?? {}) as { packetaPointCountry?: string }

  // An issued invoice is immutable: regenerate it with the VAT it was issued
  // with. A new one follows the current VAT regime (Slovak VAT unless OSS).
  let vatCountry: string
  let vatRate: number
  if (alreadyIssued && order.vatCountry) {
    vatCountry = order.vatCountry as string
    vatRate = typeof order.vatRate === 'number' ? order.vatRate : (VAT_RATES[vatCountry] ?? VAT_RATES.SK)
  } else {
    vatCountry = vatCountryFor((order.vatCountry as string) || shipping.packetaPointCountry || billing.country)
    vatRate = VAT_RATES[vatCountry] ?? VAT_RATES.SK
  }

  if (!alreadyIssued) {
    const seq = await nextInvoiceSeq(payload)
    invoiceNumber = formatInvoiceNumber(seq, invoiceYear(issuedAt))
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

  const locale = isEmailLocale(order.locale) ? order.locale : 'sk'
  const pdf = await buildInvoicePdf({
    orderNumber: order.orderNumber as string,
    invoiceNumber: invoiceNumber!,
    issuedAt,
    paidAt,
    customer: order.customer as { name: string; email: string },
    billing: {
      street: billing.street ?? '', city: billing.city ?? '',
      zip: billing.zip ?? '', country: billing.country ?? '',
    },
    items: await localizedItems(payload, (order.items ?? []) as OrderItem[], locale),
    totalAmount: order.totalAmount as number,
    currency: order.currency as string,
    discountCode: (order.discountCode as string) ?? undefined,
    discountPercent: (order.discountPercent as number) ?? undefined,
    vatCountry,
    vatRate,
  })

  fs.mkdirSync(INVOICE_DIR, { recursive: true })
  fs.writeFileSync(path.join(INVOICE_DIR, `${invoiceNumber}.pdf`), pdf)

  return { invoiceNumber: invoiceNumber!, invoiceToken: invoiceToken!, pdf }
}
