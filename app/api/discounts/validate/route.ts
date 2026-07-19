import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code) return NextResponse.json({ valid: false })

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'discounts',
    where: { code: { equals: code } },
    limit: 1,
  })
  const d = docs[0]

  const valid = !!d
    && d.active === true
    && (d.maxUses == null || (d.usedCount as number ?? 0) < (d.maxUses as number))
    && (d.validUntil == null || new Date(d.validUntil as string) > new Date())

  return NextResponse.json(valid ? { valid: true, code: d.code, percent: d.percent } : { valid: false })
}
