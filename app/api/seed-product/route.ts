import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { ensureConfiguratorProduct } from '@/lib/configurator-product'

/** Operator-only gate — `Authorization: Bearer $INVOICE_BACKFILL_TOKEN`. Fails closed if unset. */
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
  const { created, id } = await ensureConfiguratorProduct(payload)
  return NextResponse.json({
    ok: true,
    message: created ? 'Configurator product created' : 'Configurator product already exists',
    id,
  })
}
