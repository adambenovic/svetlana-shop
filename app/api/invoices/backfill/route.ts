import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { ensureInvoice } from '@/lib/invoice'

/** Generates invoices for paid/shipped orders that don't have one yet.
 *  Operator tooling — requires `Authorization: Bearer $INVOICE_BACKFILL_TOKEN`
 *  (dedicated token; never in the URL so it can't leak via access logs). */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const expected = process.env.INVOICE_BACKFILL_TOKEN ?? ''
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { status: { in: ['paid', 'shipped'] } },
        { invoiceNumber: { exists: false } },
      ],
    },
    limit: 200,
  })
  const results: string[] = []
  for (const order of docs) {
    try {
      const { invoiceNumber } = await ensureInvoice(payload, order.id)
      results.push(`${order.orderNumber}: ${invoiceNumber}`)
    } catch (err) {
      results.push(`${order.orderNumber}: FAILED ${err instanceof Error ? err.message : err}`)
    }
  }
  return NextResponse.json({ ok: true, generated: results })
}
