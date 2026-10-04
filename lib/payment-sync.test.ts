/** @jest-environment node */
import { PgDialect } from 'drizzle-orm/pg-core'
import type { Payload } from 'payload'
import { getPayment, GoPayError, type GoPayPayment } from './gopay'
import { ensureInvoice } from './invoice'
import { sendOrderConfirmation } from './email'
import { notifyOps } from './notify'
import {
  decideSyncAction, syncPayment, sqlReserveDiscount, sqlReleaseOrderDiscount, sqlConsumeOrderDiscount,
  sqlMarkPaid, type OrderDoc,
} from './payment-sync'

jest.mock('./gopay', () => ({ ...jest.requireActual('./gopay'), getPayment: jest.fn() }))
jest.mock('./invoice', () => ({ ensureInvoice: jest.fn() }))
jest.mock('./email', () => ({ sendOrderConfirmation: jest.fn() }))
jest.mock('./notify', () => ({ ...jest.requireActual('./notify'), notifyOps: jest.fn() }))

const mockGetPayment = getPayment as jest.MockedFunction<typeof getPayment>
const mockEnsureInvoice = ensureInvoice as jest.MockedFunction<typeof ensureInvoice>
const mockSend = sendOrderConfirmation as jest.MockedFunction<typeof sendOrderConfirmation>
const mockNotify = notifyOps as jest.MockedFunction<typeof notifyOps>

const dialect = new PgDialect()
const toSql = (q: unknown) => dialect.sqlToQuery(q as Parameters<PgDialect['sqlToQuery']>[0])

const pendingOrder = (over: Partial<OrderDoc> = {}): OrderDoc => ({
  id: 7, orderNumber: 'SL-1-abc', status: 'pending', totalAmount: 5399, currency: 'EUR', locale: 'sk',
  gopayId: '111', customer: { name: 'A B', email: 'a@b.sk', phone: '1' },
  shipping: { packetaPointName: 'Z-Box', packetaPointCity: 'Nitra', packetaPointCountry: 'SK', packetaPointId: 1 },
  items: [{ title: 'Lamp', configuration: { base: 'Base 1' }, quantity: 1, unitPrice: 5399 }],
  ...over,
})
const paid = (over: Partial<GoPayPayment> = {}): GoPayPayment =>
  ({ id: '111', gw_url: '', state: 'PAID', amount: 5399, currency: 'EUR', order_number: 'SL-1-abc', ...over })

/** A Payload stand-in: one order (or none), a pending-without-gopayId count, and
 *  a SQL executor that records statements and answers `rows(sql)`. */
function fakePayload(order: OrderDoc | null, { count = 0, rows = (_s: string): unknown[] => [{ id: 7, paid_at: new Date() }] } = {}) {
  const statements: string[] = []
  const payload = {
    find: jest.fn(async () => ({ docs: order ? [order] : [] })),
    count: jest.fn(async () => ({ totalDocs: count })),
    findByID: jest.fn(async () => order),
    db: { drizzle: { execute: jest.fn(async (q: unknown) => { const { sql } = toSql(q); statements.push(sql); return { rows: rows(sql) } }) } },
  }
  return { payload: payload as unknown as Payload, statements }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockEnsureInvoice.mockResolvedValue({ invoiceNumber: 'FV-2026-00001', invoiceToken: 'a'.repeat(32), pdf: Buffer.from('%PDF') })
  mockSend.mockResolvedValue()
  mockNotify.mockResolvedValue()
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('decideSyncAction', () => {
  const o = (status: string) => ({ status, totalAmount: 5399, currency: 'EUR' })
  test.each([
    ['pending', 'PAID', 'mark_paid'],
    ['paid', 'PAID', 'none'],
    ['failed', 'PAID', 'paid_on_closed_order'],
    ['cancelled', 'PAID', 'paid_on_closed_order'],
    ['pending', 'CANCELED', 'mark_failed'],
    ['pending', 'TIMEOUTED', 'mark_failed'],
    ['paid', 'CANCELED', 'none'],
    ['paid', 'REFUNDED', 'mark_refunded'],
    ['shipped', 'REFUNDED', 'mark_refunded'],
    ['partially_refunded', 'REFUNDED', 'mark_refunded'],
    ['pending', 'REFUNDED', 'none'],
    ['paid', 'PARTIALLY_REFUNDED', 'mark_partially_refunded'],
    ['refunded', 'PARTIALLY_REFUNDED', 'none'],
    ['pending', 'CREATED', 'none'],
    ['pending', 'PAYMENT_METHOD_CHOSEN', 'none'],
  ] as const)('%s order + %s → %s', (status, state, expected) => {
    expect(decideSyncAction(o(status), { state, amount: 5399, currency: 'EUR' })).toBe(expected)
  })

  test('a PAID payment with a different amount or currency is never marked paid', () => {
    expect(decideSyncAction(o('pending'), { state: 'PAID', amount: 100, currency: 'EUR' })).toBe('amount_mismatch')
    expect(decideSyncAction(o('pending'), { state: 'PAID', amount: 5399, currency: 'CZK' })).toBe('amount_mismatch')
  })
})

describe('discount SQL', () => {
  test('reservation is one guarded UPDATE … RETURNING percent', () => {
    const { sql, params } = toSql(sqlReserveDiscount('SUMMER'))
    expect(sql).toMatch(/^UPDATE discounts SET used_count = COALESCE\(used_count, 0\) \+ 1/)
    expect(sql).toContain('active = true')
    expect(sql).toContain('(valid_until IS NULL OR valid_until > now())')
    expect(sql).toContain('(max_uses IS NULL OR COALESCE(used_count, 0) < max_uses)')
    expect(sql).toMatch(/RETURNING code, percent$/)
    expect(params).toEqual(['SUMMER'])
  })

  test('release happens at most once per order and never goes below zero', () => {
    const { sql, params } = toSql(sqlReleaseOrderDiscount(7))
    expect(sql).toContain('discount_reserved = false')
    expect(sql).toContain('AND discount_reserved = true')
    expect(sql).toContain('GREATEST(COALESCE(used_count, 0) - 1, 0)')
    expect(params).toEqual([7])
  })

  test('a paid order only counts its use when it holds no reservation', () => {
    expect(toSql(sqlConsumeOrderDiscount(7)).sql).toContain('discount_reserved IS NOT TRUE')
  })

  test('pending → paid is guarded by the current status', () => {
    const { sql, params } = toSql(sqlMarkPaid(7, '111'))
    expect(sql).toContain("WHERE id = $2 AND status = 'pending' RETURNING paid_at")
    expect(sql).toContain('updated_at = now()')
    expect(params).toEqual(['111', 7])
  })
})

describe('syncPayment', () => {
  test('an unknown id with no candidate order costs no GoPay call', async () => {
    const { payload } = fakePayload(null)
    await expect(syncPayment(payload, '999')).resolves.toEqual({ outcome: 'unknown_payment' })
    expect(mockGetPayment).not.toHaveBeenCalled()
  })

  test('PAID on a pending order: paid once, then invoice, email, owner notification', async () => {
    const { payload, statements } = fakePayload(pendingOrder({ discountCode: 'X', discountReserved: true }))
    mockGetPayment.mockResolvedValue(paid())
    const r = await syncPayment(payload, '111')
    expect(r).toMatchObject({ outcome: 'synced', action: 'mark_paid', applied: true })
    expect(statements[0]).toMatch(/^UPDATE orders SET status = 'paid'/)
    expect(mockEnsureInvoice).toHaveBeenCalledWith(payload, 7, { paidAt: expect.any(Date) })
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.sk', invoicePdf: expect.anything() }))
    expect(statements.some(s => s.includes('confirmation_sent_at = now()'))).toBe(true)
    // reserved at checkout → not counted a second time
    expect(statements.some(s => s.includes('UPDATE discounts'))).toBe(false)
    expect(mockNotify).toHaveBeenCalledTimes(1)
    expect(mockNotify.mock.calls[0]![0]).toMatch(/^New paid order SL-1-abc/)
  })

  test('a paid order without a reservation counts its discount use', async () => {
    const { payload, statements } = fakePayload(pendingOrder({ discountCode: 'X', discountReserved: false }))
    mockGetPayment.mockResolvedValue(paid())
    await syncPayment(payload, '111')
    expect(statements.some(s => s.includes('WITH claimed AS'))).toBe(true)
  })

  test('the loser of the pending → paid race does not fulfil again', async () => {
    const { payload } = fakePayload(pendingOrder(), { rows: () => [] })
    mockGetPayment.mockResolvedValue(paid())
    const r = await syncPayment(payload, '111')
    expect(r).toMatchObject({ action: 'mark_paid', applied: false })
    expect(mockEnsureInvoice).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  test('a caller-supplied payment and order skip the lookups (success page)', async () => {
    const { payload } = fakePayload(pendingOrder())
    await syncPayment(payload, '111', { payment: paid(), order: pendingOrder(), source: 'return' })
    expect(mockGetPayment).not.toHaveBeenCalled()
    expect(payload.find).not.toHaveBeenCalled()
  })

  test('amount mismatch: not paid, flagged for review, ops notified', async () => {
    const { payload, statements } = fakePayload(pendingOrder())
    mockGetPayment.mockResolvedValue(paid({ amount: 100 }))
    const r = await syncPayment(payload, '111')
    expect(r).toMatchObject({ action: 'amount_mismatch' })
    expect(statements.some(s => s.includes("status = 'paid'"))).toBe(false)
    expect(statements.some(s => s.includes('needs_review = true'))).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith(expect.stringMatching(/mismatch/i), expect.any(String))
  })

  test('CANCELED: pending → failed and the discount reservation is released', async () => {
    const { payload, statements } = fakePayload(pendingOrder({ discountCode: 'X', discountReserved: true }))
    mockGetPayment.mockResolvedValue(paid({ state: 'CANCELED' }))
    await syncPayment(payload, '111')
    expect(statements[0]).toMatch(/^UPDATE orders SET status = 'failed'/)
    expect(statements[1]).toMatch(/^WITH released AS/)
  })

  test('GoPay 404 for a matched order is acknowledged; other failures ask for a retry', async () => {
    const { payload } = fakePayload(pendingOrder())
    mockGetPayment.mockRejectedValueOnce(new GoPayError('GoPay getPayment failed: 404', 404))
    await expect(syncPayment(payload, '111')).resolves.toEqual({ outcome: 'unknown_payment' })
    mockGetPayment.mockRejectedValueOnce(new GoPayError('GoPay getPayment failed: 503', 503))
    await expect(syncPayment(payload, '111')).resolves.toMatchObject({ outcome: 'gateway_error' })
  })

  test('fallback: a pending order without gopayId is matched by order_number', async () => {
    const order = pendingOrder({ gopayId: null })
    const { payload, statements } = fakePayload(order, { count: 1 })
    ;(payload.find as jest.Mock).mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [order] })
    mockGetPayment.mockResolvedValue(paid())
    const r = await syncPayment(payload, '111')
    expect(r).toMatchObject({ outcome: 'synced', action: 'mark_paid' })
    expect(toSql(sqlMarkPaid(7, '111')).sql).toBe(statements[0])
  })

  test('a PAID payment that matches no order notifies ops', async () => {
    const { payload } = fakePayload(null, { count: 1 })
    mockGetPayment.mockResolvedValue(paid({ order_number: 'SL-unknown' }))
    await expect(syncPayment(payload, '111')).resolves.toEqual({ outcome: 'order_not_found', state: 'PAID' })
    expect(mockNotify).toHaveBeenCalledWith(expect.stringMatching(/has no order/), expect.any(String))
  })

  test('fulfilment failures flag the order and are reported in the owner notification', async () => {
    const { payload, statements } = fakePayload(pendingOrder())
    mockGetPayment.mockResolvedValue(paid())
    mockSend.mockRejectedValueOnce(new Error('Brevo down'))
    await syncPayment(payload, '111')
    expect(statements.some(s => s.includes('confirmation_sent_at'))).toBe(false)
    expect(statements.some(s => s.includes('needs_review = true'))).toBe(true)
    expect(mockNotify.mock.calls[0]![0]).toMatch(/ACTION NEEDED/)
  })
})
