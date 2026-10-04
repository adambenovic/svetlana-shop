import type { PayloadEmailAdapter, SendEmailOptions } from 'payload'

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'
const DEFAULT_FROM_NAME = 'Svetlana Lampe'

type BrevoContact = { email: string; name?: string }
type BrevoResponse = { messageId?: string }

// Parses one nodemailer-style address: `a@x.sk`, `Name <a@x.sk>` or `"Name" <a@x.sk>`.
function parseAddress(raw: string): BrevoContact | null {
  const s = raw.trim()
  if (!s) return null
  const m = s.match(/^(?:"?([^"<]*?)"?\s*)?<([^<>\s]+)>$/)
  if (!m) return { email: s }
  const name = m[1]?.trim()
  return name ? { email: m[2], name } : { email: m[2] }
}

// Nodemailer accepts a string (comma-separated list allowed), an
// { name, address } object, or an array of either.
function toContacts(input: unknown): BrevoContact[] {
  if (!input) return []
  if (Array.isArray(input)) return input.flatMap(toContacts)
  if (typeof input === 'string') {
    // split on commas outside quotes so `"Doe, Jane" <j@x.sk>` stays one address
    return (input.match(/(?:"[^"]*"|[^,])+/g) ?? [])
      .map(parseAddress)
      .filter((c): c is BrevoContact => c !== null)
  }
  if (typeof input === 'object') {
    const { address, name } = input as { address?: unknown; name?: unknown }
    if (typeof address === 'string' && address) {
      return [typeof name === 'string' && name ? { email: address, name } : { email: address }]
    }
  }
  return []
}

function toContent(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Buffer.isBuffer(value)) return value.toString('utf-8')
  return undefined
}

function toAttachments(input: unknown): Array<{ name: string; content: string }> | undefined {
  if (!Array.isArray(input) || input.length === 0) return undefined
  return input.map((a: { filename?: unknown; content?: unknown; encoding?: unknown }) => {
    const name = typeof a.filename === 'string' ? a.filename : ''
    if (name && Buffer.isBuffer(a.content)) return { name, content: a.content.toString('base64') }
    if (name && typeof a.content === 'string') {
      return { name, content: a.encoding === 'base64' ? a.content : Buffer.from(a.content).toString('base64') }
    }
    // paths/streams/URLs would need extra I/O here — fail rather than silently drop
    throw new Error('Unsupported email attachment (only Buffer/string content with a filename)')
  })
}

/**
 * Payload email adapter over the Brevo transactional REST API (same account
 * and verified sender as lib/email.ts). Used by Payload's own emails — admin
 * password reset (forgot-password) — instead of the default console adapter.
 *
 * Config is read at send time so builds/tests without BREVO_API_KEY still
 * initialise; a send without it fails loudly. Errors never include the
 * message body (reset links carry a token).
 */
export function brevoEmailAdapter(): PayloadEmailAdapter<BrevoResponse> {
  return () => ({
    name: 'brevo',
    defaultFromAddress: process.env.EMAIL_FROM ?? '',
    defaultFromName: DEFAULT_FROM_NAME,
    sendEmail: async (message: SendEmailOptions) => {
      const apiKey = process.env.BREVO_API_KEY
      const fromAddress = process.env.EMAIL_FROM
      if (!apiKey || !fromAddress) {
        throw new Error('Email not configured: BREVO_API_KEY and EMAIL_FROM must be set')
      }

      const to = toContacts(message.to)
      if (to.length === 0) throw new Error('Email has no recipient')
      const cc = toContacts(message.cc)
      const bcc = toContacts(message.bcc)
      const replyTo = toContacts(message.replyTo)[0]
      const sender = toContacts(message.from)[0] ?? { email: fromAddress, name: DEFAULT_FROM_NAME }
      const htmlContent = toContent(message.html)
      const textContent = toContent(message.text)
      // Brevo requires at least one of the two bodies
      if (!htmlContent && !textContent) throw new Error('Email has no body')
      const attachment = toAttachments(message.attachments)

      const res = await fetch(BREVO_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender,
          to,
          ...(cc.length ? { cc } : {}),
          ...(bcc.length ? { bcc } : {}),
          ...(replyTo ? { replyTo } : {}),
          subject: String(message.subject ?? ''),
          ...(htmlContent ? { htmlContent } : {}),
          ...(textContent ? { textContent } : {}),
          ...(attachment ? { attachment } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
      })

      if (!res.ok) {
        // Brevo's error body is {code, message} — safe to surface, truncated
        const detail = (await res.text().catch(() => '')).slice(0, 300)
        throw new Error(`Brevo send failed: ${res.status} ${detail}`)
      }
      return (await res.json().catch(() => ({}))) as BrevoResponse
    },
  })
}
