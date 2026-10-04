import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { drizzle } from '@/lib/payment-sync'

// Liveness + DB check for the container healthcheck: 200 {ok:true} once the app
// can run a query, 503 otherwise. No details in the response.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    await drizzle(payload).execute(sql`select 1`)
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[health] database check failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
