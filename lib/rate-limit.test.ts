/** @jest-environment node */
import { checkGlobalRateLimit, checkRateLimit, getClientIp, rateLimit } from './rate-limit'

const req = (headers: Record<string, string>) => new Request('http://localhost/api/x', { headers })

test('prefers cf-connecting-ip (set by the Cloudflare edge)', () => {
  expect(getClientIp(req({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '1.1.1.1, 10.0.0.1' }))).toBe('203.0.113.7')
})

test('otherwise uses the LAST X-Forwarded-For entry — the first ones are client-controlled', () => {
  expect(getClientIp(req({ 'x-forwarded-for': '6.6.6.6, 198.51.100.2' }))).toBe('198.51.100.2')
  expect(getClientIp(req({ 'x-forwarded-for': ' 198.51.100.2 ' }))).toBe('198.51.100.2')
  expect(getClientIp(req({ 'x-forwarded-for': '198.51.100.2, ' }))).toBe('198.51.100.2')
})

test('falls back to x-real-ip, then unknown', () => {
  expect(getClientIp(req({ 'x-real-ip': '192.0.2.1' }))).toBe('192.0.2.1')
  expect(getClientIp(req({}))).toBe('unknown')
})

test('rateLimit allows `limit` hits per window, then reports retryAfter', () => {
  const key = `test:${Math.random()}`
  for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000).ok).toBe(true)
  const r = rateLimit(key, 3, 60_000)
  expect(r.ok).toBe(false)
  expect(r.retryAfter).toBeGreaterThan(0)
})

test('checkRateLimit buckets per IP; checkGlobalRateLimit across all IPs', () => {
  const bucket = `b${Math.random()}`
  expect(checkRateLimit(req({ 'cf-connecting-ip': '1.1.1.1' }), bucket, 1)).toBeNull()
  expect(checkRateLimit(req({ 'cf-connecting-ip': '2.2.2.2' }), bucket, 1)).toBeNull()
  expect(checkRateLimit(req({ 'cf-connecting-ip': '1.1.1.1' }), bucket, 1)?.status).toBe(429)

  const g = `g${Math.random()}`
  expect(checkGlobalRateLimit(g, 2)).toBeNull()
  expect(checkGlobalRateLimit(g, 2)).toBeNull()
  const limited = checkGlobalRateLimit(g, 2)
  expect(limited?.status).toBe(429)
  expect(limited?.headers.get('Retry-After')).toBeTruthy()
})
