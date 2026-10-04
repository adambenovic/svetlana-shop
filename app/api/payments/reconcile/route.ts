import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { drizzle, fulfilOrder, releaseOrderDiscount, syncPayment, type OrderDoc } from '@/lib/payment-sync'

/** Payment reconciliation — the safety net for lost GoPay notifications.
 *  Run every 15 min by ops/reconcile.sh (systemd timer). Requires
 *  `Authorization: Bearer $INVOICE_BACKFILL_TOKEN`; fails closed when unset.
 *   1. re-syncs pending orders with a gopayId created 10 min – 30 days ago;
 *   2. releases the discount reservation of pending orders older than 2 h
 *      whose payment is not PAID (abandoned checkouts);
 *   3. retries fulfilment (invoice, confirmation email) of orders paid
 *      10 min – 30 days ago that still miss one.
 *  Idempotent — every transition is guarded (lib/payment-sync.ts). */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const BATCH = 200

function authorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const expected = process.env.INVOICE_BACKFILL_TOKEN ?? ''
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return !!expected && a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payload = await getPayload({ config })
  const now = Date.now()
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString()
  const summary = {
    pending: { checked: 0, paid: 0, failed: 0, refunded: 0, needsReview: 0, unchanged: 0, unknown: 0, gatewayErrors: 0 },
    discountsReleased: 0,
    fulfilment: { retried: 0, invoiceFailed: 0, emailFailed: 0 },
    errors: [] as string[],
  }

  // ── 1 + 2: pending orders GoPay may have settled without telling us ──────
  const { docs: pending } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { status: { equals: 'pending' } },
        { gopayId: { exists: true } },
        { createdAt: { greater_than: iso(30 * DAY) } },
        { createdAt: { less_than: iso(10 * MINUTE) } },
      ],
    },
    sort: 'createdAt',
    limit: BATCH,
    depth: 0,
  })
  for (const doc of pending as unknown as OrderDoc[]) {
    summary.pending.checked++
    try {
      const r = await syncPayment(payload, String(doc.gopayId), { order: doc, source: 'reconcile' })
      if (r.outcome === 'gateway_error') { summary.pending.gatewayErrors++; continue }
      if (r.outcome !== 'synced') summary.pending.unknown++
      else if (r.action === 'mark_paid' && r.applied) summary.pending.paid++
      else if (r.action === 'mark_failed' && r.applied) summary.pending.failed++
      else if ((r.action === 'mark_refunded' || r.action === 'mark_partially_refunded') && r.applied) summary.pending.refunded++
      else if (r.action === 'amount_mismatch' || r.action === 'paid_on_closed_order') summary.pending.needsReview++
      else summary.pending.unchanged++

      // Abandoned checkout: give the discount use back. Should the payment
      // still complete later, the paid transition counts the use again.
      const stale = new Date(doc.createdAt ?? now).getTime() < now - 2 * HOUR
      const paid = r.outcome === 'synced' && r.state === 'PAID'
      if (stale && !paid && doc.discountReserved && await releaseOrderDiscount(payload, doc.id)) {
        summary.discountsReleased++
      }
    } catch (err) {
      summary.errors.push(`${doc.orderNumber}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ── 2b: stale reservations GoPay can't be asked about (no gopayId — the
  // payment was never created or its id never stored — or older than 30 days)
  try {
    const { rows } = await drizzle(payload).execute(sql`
      SELECT id FROM orders
      WHERE status = 'pending' AND discount_reserved = true
        AND created_at < now() - interval '2 hours'
        AND (gopay_id IS NULL OR created_at < now() - interval '30 days')
      LIMIT ${BATCH}`)
    for (const row of rows) {
      if (await releaseOrderDiscount(payload, row.id as number)) summary.discountsReleased++
    }
  } catch (err) {
    summary.errors.push(`stale reservations: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── 3: paid orders whose invoice or confirmation email is still missing.
  // paidAt is set by the paid transition, so legacy orders (paid before
  // confirmationSentAt existed) are never re-mailed. The 10-minute grace keeps
  // this from racing the first fulfilment.
  const { docs: unfulfilled } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { status: { in: ['paid', 'shipped'] } },
        { paidAt: { greater_than: iso(30 * DAY) } },
        { paidAt: { less_than: iso(10 * MINUTE) } },
        { or: [{ invoiceNumber: { exists: false } }, { confirmationSentAt: { exists: false } }] },
      ],
    },
    sort: 'paidAt',
    limit: BATCH,
    depth: 0,
  })
  for (const doc of unfulfilled) {
    summary.fulfilment.retried++
    try {
      const r = await fulfilOrder(payload, doc.id)
      if (r.invoice === 'failed') summary.fulfilment.invoiceFailed++
      if (r.email === 'failed') summary.fulfilment.emailFailed++
    } catch (err) {
      summary.errors.push(`${doc.orderNumber}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (summary.errors.length) console.error('[reconcile] errors:', summary.errors)
  return NextResponse.json({ ok: summary.errors.length === 0, ...summary })
}
