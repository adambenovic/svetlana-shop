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

/** Extract a best-effort client IP from proxy headers. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
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

/** Convenience: enforce a limit keyed by IP + bucket name, returning a 429 when exceeded. */
export function checkRateLimit(
  req: Request,
  bucket: string,
  limit: number,
  windowMs = 60_000,
): NextResponse | null {
  const ip = getClientIp(req)
  const { ok, retryAfter } = rateLimit(`${bucket}:${ip}`, limit, windowMs)
  if (ok) return null
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}
