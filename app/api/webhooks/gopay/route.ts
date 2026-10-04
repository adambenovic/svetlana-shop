import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { syncPayment } from '@/lib/payment-sync'
import { checkRateLimit } from '@/lib/rate-limit'

// GoPay delivers payment-state notifications as HTTP GET ?id=<paymentId>.
// POST is kept for manual replays. The state handling lives in
// lib/payment-sync.ts (shared with the success page and the reconcile job):
// the local order is looked up first and GoPay is only asked about payments
// that belong to an order, so junk ids cost no API call.
export { handleNotification as GET, handleNotification as POST }

async function handleNotification(req: NextRequest) {
  const limited = checkRateLimit(req, 'gopay-webhook', 60)
  if (limited) return limited

  const gopayId = req.nextUrl.searchParams.get('id')
  // GoPay payment ids are numeric
  if (!gopayId || !/^\d{1,20}$/.test(gopayId)) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })
    const result = await syncPayment(payload, gopayId, { source: 'webhook' })
    // A matched order whose status check failed → non-2xx so GoPay retries the
    // notification. Everything else (incl. unknown ids) is acknowledged.
    if (result.outcome === 'gateway_error') {
      return NextResponse.json({ error: 'status check failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(`[webhook] processing GoPay payment ${gopayId} failed:`, err)
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }
}
