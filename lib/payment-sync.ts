import { sql, type SQL } from 'drizzle-orm'
import type { Payload, Where } from 'payload'
import { getPayment, isUnknownPaymentError, type GoPayPayment, type GoPayState } from './gopay'
import { sendOrderConfirmation } from './email'
import { ensureInvoice } from './invoice'
import { adminOrderUrl, escapeHtml, notifyOps } from './notify'

// Payment state sync — the single place that moves an order between payment
// states and runs the paid-order side effects. Called by the GoPay webhook,
// the checkout success page (customer back before/without the notification)
// and the reconcile job (lost notifications). Every transition is an atomic,
// guarded UPDATE, so concurrent callers can't double-fulfil an order.

// ── DB access ───────────────────────────────────────────────────────────────

// Minimal view of the drizzle handle exposed by the Payload postgres adapter.
type DrizzleExec = {
  execute: (q: SQL) => Promise<{ rows: Array<Record<string, unknown>> }>
}
export function drizzle(payload: Payload): DrizzleExec {
  return (payload.db as unknown as { drizzle: DrizzleExec }).drizzle
}

/** The order fields this module reads (Payload docs are untyped here). */
export interface OrderDoc {
  id: string | number
  orderNumber: string
  status: string
  totalAmount: number
  currency: string
  locale?: string | null
  gopayId?: string | null
  discountCode?: string | null
  discountPercent?: number | null
  discountReserved?: boolean | null
  paidAt?: string | null
  confirmationSentAt?: string | null
  invoiceNumber?: string | null
  createdAt?: string
  customer?: { name?: string; email?: string; phone?: string } | null
  shipping?: { packetaPointId?: number; packetaPointName?: string; packetaPointCity?: string; packetaPointCountry?: string } | null
  items?: Array<{ title: string; configuration?: Record<string, string> | null; quantity: number; unitPrice: number }> | null
}

// ── SQL (exported for tests) ────────────────────────────────────────────────

/** pending → paid. RETURNING tells the caller whether it won the race; losers
 *  stop, so the paid side effects run exactly once. Backfills gopay_id when the
 *  order was matched by order_number. */
export const sqlMarkPaid = (orderId: string | number, gopayId: string): SQL =>
  sql`UPDATE orders SET status = 'paid', gopay_id = ${gopayId}, paid_at = now(), updated_at = now() WHERE id = ${orderId} AND status = 'pending' RETURNING paid_at`

export const sqlMarkFailed = (orderId: string | number, gopayId: string): SQL =>
  sql`UPDATE orders SET status = 'failed', gopay_id = COALESCE(gopay_id, ${gopayId}), updated_at = now() WHERE id = ${orderId} AND status = 'pending' RETURNING id`

export const sqlMarkRefunded = (orderId: string | number): SQL =>
  sql`UPDATE orders SET status = 'refunded', updated_at = now() WHERE id = ${orderId} AND status IN ('paid', 'shipped', 'partially_refunded') RETURNING id`

export const sqlMarkPartiallyRefunded = (orderId: string | number): SQL =>
  sql`UPDATE orders SET status = 'partially_refunded', updated_at = now() WHERE id = ${orderId} AND status IN ('paid', 'shipped') RETURNING id`

/** Sets needs_review; returns a row only the first time (notify once, not on every retry). */
export const sqlFlagReview = (orderId: string | number): SQL =>
  sql`UPDATE orders SET needs_review = true, updated_at = now() WHERE id = ${orderId} AND needs_review IS NOT TRUE RETURNING id`

export const sqlMarkConfirmationSent = (orderId: string | number): SQL =>
  sql`UPDATE orders SET confirmation_sent_at = now(), updated_at = now() WHERE id = ${orderId}`

/** Reserves one use of a discount code at checkout — atomically, so concurrent
 *  checkouts can't redeem a limited code more often than max_uses. No row =
 *  the code is unknown, inactive, expired or used up. */
export const sqlReserveDiscount = (code: string): SQL =>
  sql`UPDATE discounts SET used_count = COALESCE(used_count, 0) + 1, updated_at = now() WHERE code = ${code} AND active = true AND (valid_until IS NULL OR valid_until > now()) AND (max_uses IS NULL OR COALESCE(used_count, 0) < max_uses) AND percent > 0 AND percent < 100 RETURNING code, percent`

/** Gives back a use reserved before the order existed (order creation failed). */
export const sqlUnreserveDiscount = (code: string): SQL =>
  sql`UPDATE discounts SET used_count = GREATEST(COALESCE(used_count, 0) - 1, 0), updated_at = now() WHERE code = ${code}`

/** Releases an order's reservation: clears the order flag and decrements the
 *  code in one statement — at most once per order, never below zero. */
export const sqlReleaseOrderDiscount = (orderId: string | number): SQL =>
  sql`WITH released AS (UPDATE orders SET discount_reserved = false, updated_at = now() WHERE id = ${orderId} AND discount_reserved = true AND discount_code IS NOT NULL RETURNING discount_code) UPDATE discounts SET used_count = GREATEST(COALESCE(used_count, 0) - 1, 0), updated_at = now() WHERE code IN (SELECT discount_code FROM released) RETURNING code`

/** Counts the use for a paid order that holds no reservation (placed before
 *  reservations existed, or released as abandoned and paid later). The order
 *  is paid, so this is not capped by max_uses. */
export const sqlConsumeOrderDiscount = (orderId: string | number): SQL =>
  sql`WITH claimed AS (UPDATE orders SET discount_reserved = true, updated_at = now() WHERE id = ${orderId} AND discount_reserved IS NOT TRUE AND discount_code IS NOT NULL RETURNING discount_code) UPDATE discounts SET used_count = COALESCE(used_count, 0) + 1, updated_at = now() WHERE code IN (SELECT discount_code FROM claimed) RETURNING code`

// ── Discount reservation helpers (used by the order route and the reconcile job) ──

/** Reserve a use of `code`; resolves the percent, or null if the code isn't usable. */
export async function reserveDiscount(payload: Payload, code: string): Promise<{ code: string; percent: number } | null> {
  const res = await drizzle(payload).execute(sqlReserveDiscount(code))
  const row = res.rows[0]
  if (!row) return null
  return { code: String(row.code), percent: Number(row.percent) }
}

export async function unreserveDiscount(payload: Payload, code: string): Promise<void> {
  try {
    await drizzle(payload).execute(sqlUnreserveDiscount(code))
  } catch (err) {
    console.error(`[payment-sync] could not give back a use of discount ${code}:`, err)
  }
}

/** Release the order's discount reservation (idempotent). Resolves true if a use was given back. */
export async function releaseOrderDiscount(payload: Payload, orderId: string | number): Promise<boolean> {
  try {
    const res = await drizzle(payload).execute(sqlReleaseOrderDiscount(orderId))
    return res.rows.length > 0
  } catch (err) {
    console.error(`[payment-sync] discount release failed for order ${orderId}:`, err)
    return false
  }
}

/** pending → failed for an order whose payment could not even be created
 *  (the customer never reached the gateway); gives back its discount use. */
export async function failUnpaidOrder(payload: Payload, orderId: string | number): Promise<void> {
  try {
    await drizzle(payload).execute(
      sql`UPDATE orders SET status = 'failed', updated_at = now() WHERE id = ${orderId} AND status = 'pending'`,
    )
  } catch (err) {
    console.error(`[payment-sync] could not mark order ${orderId} failed:`, err)
  }
  await releaseOrderDiscount(payload, orderId)
}

// ── Decision logic (pure) ───────────────────────────────────────────────────

export type SyncAction =
  | 'mark_paid'
  | 'amount_mismatch'        // PAID, but not the amount/currency we recorded — never mark paid
  | 'paid_on_closed_order'   // PAID on a failed/cancelled order — a human decides
  | 'mark_failed'
  | 'mark_refunded'
  | 'mark_partially_refunded'
  | 'none'

/** What a GoPay payment state means for the local order. */
export function decideSyncAction(
  order: Pick<OrderDoc, 'status' | 'totalAmount' | 'currency'>,
  payment: Pick<GoPayPayment, 'state' | 'amount' | 'currency'>,
): SyncAction {
  switch (payment.state) {
    case 'PAID': {
      if (order.status === 'failed' || order.status === 'cancelled') return 'paid_on_closed_order'
      if (order.status !== 'pending') return 'none'
      const amountOk = typeof payment.amount !== 'number' || payment.amount === order.totalAmount
      const currencyOk = !payment.currency || payment.currency === order.currency
      return amountOk && currencyOk ? 'mark_paid' : 'amount_mismatch'
    }
    case 'CANCELED':
    case 'TIMEOUTED':
      return order.status === 'pending' ? 'mark_failed' : 'none'
    case 'REFUNDED':
      return ['paid', 'shipped', 'partially_refunded'].includes(order.status) ? 'mark_refunded' : 'none'
    case 'PARTIALLY_REFUNDED':
      return ['paid', 'shipped'].includes(order.status) ? 'mark_partially_refunded' : 'none'
    default:
      return 'none'
  }
}

// ── Sync ────────────────────────────────────────────────────────────────────

export interface SyncOptions {
  /** GoPay status the caller already fetched — skips a second API call. */
  payment?: GoPayPayment
  /** The local order the caller already loaded (matched by this gopayId). */
  order?: OrderDoc
  /** For log lines. */
  source?: 'webhook' | 'return' | 'reconcile'
}

export type SyncResult =
  /** No local order and nothing GoPay could tie to one (or GoPay doesn't know the id). */
  | { outcome: 'unknown_payment' }
  /** GoPay reports a PAID payment that matches no order — ops notified. */
  | { outcome: 'order_not_found'; state: GoPayState }
  /** The order matched but GoPay's status couldn't be read — retry later. */
  | { outcome: 'gateway_error'; orderId: string | number; orderNumber: string; error: string }
  | { outcome: 'synced'; orderId: string | number; orderNumber: string; state: GoPayState; action: SyncAction; applied: boolean }

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err))
const DAY_MS = 24 * 60 * 60 * 1000

async function findOrder(payload: Payload, where: Where): Promise<OrderDoc | null> {
  const { docs } = await payload.find({ collection: 'orders', where, limit: 1, depth: 0 })
  return (docs[0] as unknown as OrderDoc) ?? null
}

/** Brings the local order in line with GoPay's state for `gopayId`. Idempotent. */
export async function syncPayment(payload: Payload, gopayId: string, opts: SyncOptions = {}): Promise<SyncResult> {
  const source = opts.source ?? 'webhook'
  let order = opts.order ?? await findOrder(payload, { gopayId: { equals: gopayId } })
  let payment = opts.payment

  if (!order) {
    // Fallback for an order whose gopayId was never stored (createPayment
    // succeeded, the update saving the id failed): such an order is pending
    // without a gopayId. Only if one exists is GoPay asked, and the order is
    // matched by the order_number GoPay echoes — an unknown id costs no API call.
    const { totalDocs } = await payload.count({
      collection: 'orders',
      where: {
        and: [
          { status: { equals: 'pending' } },
          { gopayId: { exists: false } },
          { createdAt: { greater_than: new Date(Date.now() - 30 * DAY_MS).toISOString() } },
        ],
      },
    })
    if (!totalDocs) {
      console.warn(`[payment-sync] ${source}: no order for GoPay payment ${gopayId} — ignored`)
      return { outcome: 'unknown_payment' }
    }
    try {
      payment ??= await getPayment(gopayId)
    } catch (err) {
      console.warn(`[payment-sync] ${source}: GoPay payment ${gopayId} matches no order and could not be checked (${errMsg(err)}) — ignored`)
      return { outcome: 'unknown_payment' }
    }
    order = payment.order_number
      ? await findOrder(payload, {
        and: [
          { orderNumber: { equals: payment.order_number } },
          { status: { equals: 'pending' } },
          { gopayId: { exists: false } },
        ],
      })
      : null
    if (!order) {
      if (payment.state === 'PAID') {
        console.error(`[payment-sync] ${source}: PAID GoPay payment ${gopayId} (order_number ${payment.order_number ?? '—'}) matches no order`)
        await notifyOps(
          `Paid GoPay payment ${gopayId} has no order`,
          `<p>GoPay reports payment <strong>${escapeHtml(gopayId)}</strong> as PAID ` +
          `(${escapeHtml(payment.amount ?? '?')} ${escapeHtml(payment.currency ?? '')}, order_number ` +
          `${escapeHtml(payment.order_number ?? '—')}), but no matching order exists in the shop. ` +
          `Check the GoPay admin and refund or recreate the order manually.</p>`,
        )
        return { outcome: 'order_not_found', state: payment.state }
      }
      console.warn(`[payment-sync] ${source}: GoPay payment ${gopayId} (${payment.state}) matches no order — ignored`)
      return { outcome: 'unknown_payment' }
    }
  }

  if (!payment) {
    try {
      payment = await getPayment(gopayId)
    } catch (err) {
      if (isUnknownPaymentError(err)) {
        console.warn(`[payment-sync] ${source}: GoPay does not know payment ${gopayId} (order ${order.orderNumber}) — ignored`)
        return { outcome: 'unknown_payment' }
      }
      console.error(`[payment-sync] ${source}: GoPay status check failed for order ${order.orderNumber}: ${errMsg(err)}`)
      return { outcome: 'gateway_error', orderId: order.id, orderNumber: order.orderNumber, error: errMsg(err) }
    }
  }

  const action = decideSyncAction(order, payment)
  const applied = await applyAction(payload, order, payment, gopayId, action, source)
  return { outcome: 'synced', orderId: order.id, orderNumber: order.orderNumber, state: payment.state, action, applied }
}

async function applyAction(
  payload: Payload,
  order: OrderDoc,
  payment: GoPayPayment,
  gopayId: string,
  action: SyncAction,
  source: string,
): Promise<boolean> {
  const db = drizzle(payload)
  switch (action) {
    case 'mark_paid': {
      const res = await db.execute(sqlMarkPaid(order.id, gopayId))
      if (!res.rows.length) return false // another request won the race and fulfils
      const paidAt = toDate(res.rows[0]!.paid_at) ?? new Date()
      console.log(`[payment-sync] ${source}: order ${order.orderNumber} paid`)
      await fulfilOrder(payload, order.id, { paidAt, firstTime: true })
      return true
    }
    case 'mark_failed': {
      const res = await db.execute(sqlMarkFailed(order.id, gopayId))
      if (!res.rows.length) return false
      await releaseOrderDiscount(payload, order.id)
      return true
    }
    case 'mark_refunded':
      return (await db.execute(sqlMarkRefunded(order.id))).rows.length > 0
    case 'mark_partially_refunded':
      return (await db.execute(sqlMarkPartiallyRefunded(order.id))).rows.length > 0
    case 'amount_mismatch': {
      console.error(
        `[payment-sync] ${source}: amount/currency mismatch for order ${order.orderNumber}: ` +
        `gopay=${payment.amount} ${payment.currency} vs order=${order.totalAmount} ${order.currency} — not marked paid`,
      )
      await flagForReview(payload, order.id,
        `Amount mismatch on order ${order.orderNumber}`,
        `<p>GoPay payment <strong>${escapeHtml(gopayId)}</strong> is PAID with ` +
        `<strong>${escapeHtml(payment.amount)} ${escapeHtml(payment.currency)}</strong>, but order ` +
        `<strong>${escapeHtml(order.orderNumber)}</strong> totals ${escapeHtml(order.totalAmount)} ${escapeHtml(order.currency)} ` +
        `(minor units). The order was NOT marked paid — check it and fulfil or refund manually.</p>` +
        `<p><a href="${escapeHtml(adminOrderUrl(order.id))}">Open the order in the admin</a></p>`)
      return true
    }
    case 'paid_on_closed_order': {
      console.error(`[payment-sync] ${source}: GoPay payment ${gopayId} is PAID but order ${order.orderNumber} is ${order.status}`)
      await flagForReview(payload, order.id,
        `Payment received for ${order.status} order ${order.orderNumber}`,
        `<p>GoPay payment <strong>${escapeHtml(gopayId)}</strong> is PAID, but order ` +
        `<strong>${escapeHtml(order.orderNumber)}</strong> is <strong>${escapeHtml(order.status)}</strong> in the shop. ` +
        `Fulfil it (set it to paid) or refund the payment.</p>` +
        `<p><a href="${escapeHtml(adminOrderUrl(order.id))}">Open the order in the admin</a></p>`)
      return true
    }
    case 'none':
      return false
  }
}

/** Sets needsReview and notifies ops — only the first time, so retries don't spam. */
async function flagForReview(payload: Payload, orderId: string | number, subject: string, html: string): Promise<void> {
  let first = true
  try {
    first = (await drizzle(payload).execute(sqlFlagReview(orderId))).rows.length > 0
  } catch (err) {
    console.error(`[payment-sync] could not flag order ${orderId} for review:`, err)
  }
  if (first) await notifyOps(subject, html)
}

function toDate(v: unknown): Date | null {
  if (v instanceof Date) return v
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

// ── Fulfilment ──────────────────────────────────────────────────────────────

export interface FulfilmentResult {
  invoice: 'ok' | 'failed'
  email: 'sent' | 'failed' | 'already_sent'
}

const money = (cents: number, currency: string) => `${(cents / 100).toFixed(2)} ${currency}`

/**
 * Paid-order side effects: invoice, confirmation email, discount accounting,
 * owner notification. `firstTime` = called by the pending→paid winner (counts
 * the discount and announces the order); otherwise it is a retry of whatever is
 * still missing (reconcile). Invoice and email are idempotent — ensureInvoice
 * reuses an assigned number, the email is skipped once confirmationSentAt is set.
 * Failures never throw: they flag the order for review and notify ops.
 */
export async function fulfilOrder(
  payload: Payload,
  orderId: string | number,
  { paidAt, firstTime = false }: { paidAt?: Date; firstTime?: boolean } = {},
): Promise<FulfilmentResult> {
  const order = await payload.findByID({ collection: 'orders', id: orderId, depth: 0 }) as unknown as OrderDoc
  const when = paidAt ?? toDate(order.paidAt) ?? undefined
  const problems: string[] = []

  // Invoice (faktúra): generated once per order, stored outside public/, sent as
  // an attachment and via a tokenized link.
  let invoice: Awaited<ReturnType<typeof ensureInvoice>> | null = null
  try {
    invoice = await ensureInvoice(payload, orderId, { paidAt: when })
  } catch (err) {
    console.error(`[payment-sync] invoice generation failed for order ${order.orderNumber}:`, err)
    problems.push(`Invoice generation failed: ${errMsg(err)}`)
  }

  // Packeta shipments are created MANUALLY by the operator (in the Packeta
  // client, using the pickup point stored on the order) — deliberately not
  // automated. The operator then sets the order to "shipped" in the admin.
  let email: FulfilmentResult['email'] = 'already_sent'
  if (!order.confirmationSentAt) {
    try {
      await sendOrderConfirmation({
        to: order.customer?.email ?? '',
        orderNumber: order.orderNumber,
        items: (order.items ?? []).map(i => ({
          title: i.title, configuration: i.configuration ?? {}, quantity: i.quantity, unitPrice: i.unitPrice,
        })),
        totalAmount: order.totalAmount,
        currency: order.currency,
        packetaPointName: order.shipping?.packetaPointName ?? '',
        locale: order.locale ?? 'sk',
        orderDate: order.createdAt,
        discountCode: order.discountCode,
        discountPercent: order.discountPercent,
        ...(invoice ? {
          invoiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/invoices/${invoice.invoiceToken}`,
          invoicePdf: { filename: `${invoice.invoiceNumber}.pdf`, content: invoice.pdf },
        } : {}),
      })
      email = 'sent'
      await drizzle(payload).execute(sqlMarkConfirmationSent(orderId))
    } catch (err) {
      if (email !== 'sent') {
        email = 'failed'
        console.error(`[payment-sync] confirmation email failed for order ${order.orderNumber}:`, err)
        problems.push(`Confirmation email failed: ${errMsg(err)}`)
      } else {
        // Sent, but not recorded — a reconcile retry may send it a second time.
        console.error(`[payment-sync] could not record confirmationSentAt for order ${order.orderNumber}:`, err)
      }
    }
  }

  // Discount accounting: the use reserved at checkout already counts. Only an
  // order without a live reservation (legacy / released as abandoned) counts it now.
  if (firstTime && order.discountCode && !order.discountReserved) {
    try {
      await drizzle(payload).execute(sqlConsumeOrderDiscount(orderId))
    } catch (err) {
      console.error(`[payment-sync] discount accounting failed for order ${order.orderNumber}:`, err)
    }
  }

  const result: FulfilmentResult = { invoice: invoice ? 'ok' : 'failed', email }
  const problemsHtml = problems.length
    ? `<p style="color:#b00020"><strong>Needs attention:</strong></p><ul>${problems.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
    : ''

  if (firstTime) {
    // Owner notification for every new paid order (with any fulfilment problem).
    // (flagged directly — this notification already reports the problems)
    if (problems.length) {
      try {
        await drizzle(payload).execute(sqlFlagReview(orderId))
      } catch (err) {
        console.error(`[payment-sync] could not flag order ${order.orderNumber} for review:`, err)
      }
    }
    await notifyOps(
      `New paid order ${order.orderNumber} — ${money(order.totalAmount, order.currency)}${problems.length ? ' — ACTION NEEDED' : ''}`,
      orderSummaryHtml(order) + problemsHtml,
    )
  } else if (problems.length) {
    await flagForReview(payload, orderId, `Order ${order.orderNumber}: fulfilment retry failed`, orderSummaryHtml(order) + problemsHtml)
  }
  return result
}

function orderSummaryHtml(order: OrderDoc): string {
  const s = order.shipping ?? {}
  const items = (order.items ?? []).map(i => {
    const cfg = Object.entries(i.configuration ?? {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')
    return `<li>${escapeHtml(i.title)} × ${escapeHtml(i.quantity)} — ${escapeHtml(money(i.unitPrice * i.quantity, order.currency))}` +
      `${cfg ? `<br><small>${escapeHtml(cfg)}</small>` : ''}</li>`
  }).join('')
  return `
    <p>Order <strong>${escapeHtml(order.orderNumber)}</strong> — <strong>${escapeHtml(money(order.totalAmount, order.currency))}</strong>` +
    `${order.discountCode ? ` (discount ${escapeHtml(order.discountCode)} −${escapeHtml(order.discountPercent ?? '?')} %)` : ''}</p>
    <p>Customer: ${escapeHtml(order.customer?.name)} &lt;${escapeHtml(order.customer?.email)}&gt; ${escapeHtml(order.customer?.phone)}</p>
    <p>Packeta pickup point: ${escapeHtml(s.packetaPointName)}, ${escapeHtml(s.packetaPointCity)} (${escapeHtml(s.packetaPointCountry)}) — id ${escapeHtml(s.packetaPointId)}</p>
    <ul>${items}</ul>
    <p><a href="${escapeHtml(adminOrderUrl(order.id))}">Open the order in the admin</a></p>`
}
