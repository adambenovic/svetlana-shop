// Operator notifications ("a new paid order", "an invoice failed", …) sent via
// the Brevo transactional API to OPS_EMAIL (comma-separated list allowed).
// Without OPS_EMAIL the notification is only logged. Never throws — a failed
// notification must not break the payment flow that triggered it.

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

/** HTML-escape a value interpolated into a notification body. */
export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Admin URL of an order, for links in notifications. */
export function adminOrderUrl(orderId: string | number): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin/collections/orders/${orderId}`
}

export async function notifyOps(subject: string, html: string): Promise<void> {
  const recipients = (process.env.OPS_EMAIL ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (!recipients.length) {
    console.log(`[ops] ${subject} (OPS_EMAIL unset — not sent)`)
    return
  }
  const apiKey = process.env.BREVO_API_KEY
  const sender = process.env.EMAIL_FROM
  if (!apiKey || !sender) {
    console.error(`[ops] ${subject} — BREVO_API_KEY/EMAIL_FROM unset, not sent`)
    return
  }
  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Svetlana Lampe', email: sender },
        to: recipients.map(email => ({ email })),
        subject: `[Svetlana Lampe] ${subject}`,
        htmlContent: `<div style="font-family: sans-serif; max-width: 640px;">${html}</div>`,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) console.error(`[ops] notification "${subject}" failed: ${res.status} ${await res.text().catch(() => '')}`)
  } catch (err) {
    console.error(`[ops] notification "${subject}" failed:`, err instanceof Error ? err.message : err)
  }
}
