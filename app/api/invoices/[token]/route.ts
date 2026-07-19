import fs from 'fs'
import path from 'path'
import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { ensureInvoice, INVOICE_DIR } from '@/lib/invoice'
import { checkRateLimit } from '@/lib/rate-limit'

// Customer invoice access: the URL token is unguessable (128-bit), and as a
// second factor the customer must confirm a detail they know — the billing ZIP
// or the order email. Wrong/missing verification renders a small bilingual form.

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(normalize(a))
  const bb = Buffer.from(normalize(b))
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

function gatePage(token: string, error: boolean): NextResponse {
  const html = `<!doctype html><html lang="sk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Faktúra / Invoice — Svetlana Lampe</title>
<style>
  body { font-family: system-ui, sans-serif; background: #1A1A1A; color: #F5F0EB; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 24px; }
  form { background: #252525; border: 1px solid #333; border-radius: 12px; padding: 32px; max-width: 420px; width: 100%; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #9A9490; font-size: 14px; line-height: 1.5; }
  input { width: 100%; box-sizing: border-box; padding: 10px 14px; margin: 12px 0; border-radius: 8px; border: 1px solid #333; background: #1A1A1A; color: #F5F0EB; font-size: 16px; }
  button { width: 100%; padding: 12px; border: 0; border-radius: 8px; background: #F5F0EB; color: #1A1A1A; font-weight: 600; font-size: 15px; cursor: pointer; }
  .err { color: #e05a5a; font-size: 14px; }
</style></head><body>
<form method="GET" action="/api/invoices/${token}">
  <h1>Faktúra / Invoice</h1>
  <p>Pre zobrazenie faktúry zadajte e-mail objednávky alebo PSČ z fakturačnej adresy.<br>
  To view the invoice, enter the order e-mail or the billing postal code.</p>
  ${error ? '<p class="err">Nesprávny údaj, skúste znova. / Incorrect value, try again.</p>' : ''}
  <input name="v" type="text" required autofocus placeholder="email / PSČ / ZIP" autocomplete="off">
  <button type="submit">Zobraziť faktúru / View invoice</button>
</form></body></html>`
  return new NextResponse(html, {
    status: error ? 403 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[0-9a-f]{32}$/.test(token)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'orders',
    where: { invoiceToken: { equals: token } },
    limit: 1,
  })
  const order = docs[0]
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const v = req.nextUrl.searchParams.get('v')
  if (!v) return gatePage(token, false)

  // Throttle brute-force verification attempts (email/ZIP guessing) per IP.
  const limited = checkRateLimit(req, 'invoice-verify', 10, 60_000)
  if (limited) return limited

  const email = (order.customer as { email?: string })?.email ?? ''
  const zip = (order.billing as { zip?: string })?.zip ?? ''
  if (!safeEqual(v, email) && !(zip && safeEqual(v, zip))) return gatePage(token, true)

  const invoiceNumber = order.invoiceNumber as string
  const file = path.join(INVOICE_DIR, `${invoiceNumber}.pdf`)
  let pdf: Buffer
  if (fs.existsSync(file)) {
    pdf = fs.readFileSync(file)
  } else {
    // Container was recreated without the volume, or legacy order — regenerate
    pdf = (await ensureInvoice(payload, order.id)).pdf
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoiceNumber}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
