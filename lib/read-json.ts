import { NextResponse } from 'next/server'
import { routing } from '@/i18n/routing'

// Size-limited JSON body reader for public POST endpoints. req.json() buffers
// whatever the client sends; this rejects an oversized Content-Length up front
// and otherwise stream-reads, aborting as soon as the limit is crossed (a
// chunked or lying client can't make us buffer more than maxBytes).

export const MAX_JSON_BYTES = 64 * 1024

export type ReadJsonResult =
  | { ok: true; data: unknown }
  | { ok: false; response: NextResponse }

const tooLarge = (): ReadJsonResult => ({
  ok: false,
  response: NextResponse.json({ error: 'payload_too_large' }, { status: 413 }),
})
const malformed = (): ReadJsonResult => ({
  ok: false,
  response: NextResponse.json({ error: 'malformed_json' }, { status: 400 }),
})

export async function readJsonLimited(
  req: { headers: Headers; body: ReadableStream<Uint8Array> | null },
  maxBytes = MAX_JSON_BYTES,
): Promise<ReadJsonResult> {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge()
  if (!req.body) return malformed()

  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel().catch(() => {})
        return tooLarge()
      }
      chunks.push(value)
    }
  } catch {
    return malformed()
  }

  const bytes = new Uint8Array(size)
  let offset = 0
  for (const c of chunks) { bytes.set(c, offset); offset += c.byteLength }
  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(bytes)) }
  } catch {
    return malformed()
  }
}

/** A JSON object (not an array, null or a primitive). */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export type ShopLocale = (typeof routing.locales)[number]

/** A client-supplied locale if it is one of the shop's locales, else the default. */
export function safeLocale(locale: unknown): ShopLocale {
  return typeof locale === 'string' && (routing.locales as readonly string[]).includes(locale)
    ? locale as ShopLocale
    : routing.defaultLocale
}
