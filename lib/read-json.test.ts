/** @jest-environment node */
import { isRecord, readJsonLimited, safeLocale } from './read-json'

// next-intl ships ESM only, which this Jest setup doesn't transform — stand in
// for i18n/routing with the shop's locale list.
jest.mock('@/i18n/routing', () => ({
  routing: { locales: ['sk', 'cs', 'de', 'pl', 'hu', 'uk', 'en', 'es', 'fr', 'it'], defaultLocale: 'sk' },
}))

function streamOf(chunks: string[]): { stream: ReadableStream<Uint8Array>; pulled: () => number; cancelled: () => boolean } {
  const enc = new TextEncoder()
  let i = 0
  let wasCancelled = false
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(enc.encode(chunks[i++]))
      else controller.close()
    },
    cancel() { wasCancelled = true },
  })
  return { stream, pulled: () => i, cancelled: () => wasCancelled }
}

const req = (body: ReadableStream<Uint8Array> | null, headers: Record<string, string> = {}) =>
  ({ headers: new Headers(headers), body })

test('parses a JSON body within the limit', async () => {
  const r = await readJsonLimited(req(streamOf(['{"a":', '1}']).stream))
  expect(r).toEqual({ ok: true, data: { a: 1 } })
})

test('rejects a declared Content-Length over the limit without reading the body', async () => {
  const s = streamOf(['{}'])
  const r = await readJsonLimited(req(s.stream, { 'content-length': String(64 * 1024 + 1) }))
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.response.status).toBe(413)
  expect(s.stream.locked).toBe(false) // never started reading
})

test('aborts a streamed body as soon as it crosses the limit', async () => {
  const chunk = 'x'.repeat(1024)
  const s = streamOf(Array.from({ length: 100 }, () => chunk))
  const r = await readJsonLimited(req(s.stream), 4 * 1024)
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.response.status).toBe(413)
  expect(s.pulled()).toBeLessThan(10)
  expect(s.cancelled()).toBe(true)
})

test('malformed or missing JSON is a 400', async () => {
  for (const r of [await readJsonLimited(req(streamOf(['{nope']).stream)), await readJsonLimited(req(null))]) {
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.response.status).toBe(400)
      expect(await r.response.json()).toEqual({ error: 'malformed_json' })
    }
  }
})

test('isRecord accepts only plain objects', () => {
  expect(isRecord({})).toBe(true)
  expect(isRecord([])).toBe(false)
  expect(isRecord(null)).toBe(false)
  expect(isRecord('x')).toBe(false)
})

test('safeLocale keeps shop locales and falls back to sk', () => {
  expect(safeLocale('de')).toBe('de')
  expect(safeLocale('xx')).toBe('sk')
  expect(safeLocale(undefined)).toBe('sk')
  expect(safeLocale('__proto__')).toBe('sk')
})
