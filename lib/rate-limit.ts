import { NextResponse } from 'next/server'

// Best-effort, per-process, in-memory sliding-window rate limiter.
// NOTE: state lives in a single container's memory — it is NOT shared across
// replicas and resets on restart. Good enough to blunt abuse/bursts from a
// single IP; it is not a security boundary. Dependency-free by design.

const buckets = new Map<string, number[]>()
let lastSweep = Date.now()

// Drop empty/stale buckets occasionally so the map can't grow unbounded.
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  const cutoff = now - windowMs
  for (const [key, times] of buckets) {
    if (!times.some(t => t > cutoff)) buckets.delete(key)
  }
}

/** Extract a best-effort client IP from proxy headers.
 *  Order: Cloudflare's `cf-connecting-ip` (set by the edge, overwrites any
 *  client value), then the LAST X-Forwarded-For entry (appended by the proxy
 *  nearest to us — the first entries are client-controlled and trivially
 *  spoofed to dodge the limiter), then x-real-ip. */
export function getClientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const last = xff.split(',').map(s => s.trim()).filter(Boolean).pop()
    if (last) return last
  }
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real
  return 'unknown'
}

export interface RateLimitResult {
  ok: boolean
  /** Seconds until the caller may retry (only meaningful when ok === false). */
  retryAfter: number
}

/** Records a hit for `key` and reports whether it stays within `limit` per `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now, windowMs)
  const windowStart = now - windowMs
  const times = (buckets.get(key) ?? []).filter(t => t > windowStart)

  if (times.length >= limit) {
    buckets.set(key, times)
    const retryAfter = Math.max(1, Math.ceil((times[0]! + windowMs - now) / 1000))
    return { ok: false, retryAfter }
  }

  times.push(now)
  buckets.set(key, times)
  return { ok: true, retryAfter: 0 }
}

function tooManyRequests(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

/** Convenience: enforce a limit keyed by IP + bucket name, returning a 429 when exceeded. */
export function checkRateLimit(
  req: Request,
  bucket: string,
  limit: number,
  windowMs = 60_000,
): NextResponse | null {
  const ip = getClientIp(req)
  const { ok, retryAfter } = rateLimit(`${bucket}:${ip}`, limit, windowMs)
  return ok ? null : tooManyRequests(retryAfter)
}

/** A cap shared by ALL clients for one bucket — bounds the total rate of an
 *  expensive endpoint (e.g. orders, which create real gateway payments) even
 *  when requests arrive from many IPs. */
export function checkGlobalRateLimit(bucket: string, limit: number, windowMs = 60_000): NextResponse | null {
  const { ok, retryAfter } = rateLimit(`${bucket}:*global*`, limit, windowMs)
  return ok ? null : tooManyRequests(retryAfter)
}
