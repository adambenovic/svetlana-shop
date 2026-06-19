const API = process.env.GOPAY_API_URL!
const CLIENT_ID = process.env.GOPAY_CLIENT_ID!
const CLIENT_SECRET = process.env.GOPAY_CLIENT_SECRET!
const GO_ID = process.env.GOPAY_GO_ID!

let tokenCache: { token: string; expiresAt: number } | null = null

export function _resetTokenCache() { tokenCache = null }

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.token
  const res = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials&scope=payment-all',
  })
  if (!res.ok) throw new Error(`GoPay token failed: ${res.status}`)
  const data = await res.json() as { access_token: string; expires_in: number }
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return data.access_token
}

export type GoPayState = 'CREATED' | 'PAID' | 'CANCELED' | 'TIMEOUTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'

export interface GoPayPayment {
  id: string
  gw_url: string
  state: GoPayState
}

export async function createPayment(p: {
  orderId: string
  amount: number
  currency: string
  description: string
  email: string
  returnUrl: string
  notifyUrl: string
  locale: string
}): Promise<GoPayPayment> {
  const token = await getToken()
  const res = await fetch(`${API}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      payer: { contact: { email: p.email } },
      amount: p.amount,
      currency: p.currency,
      order_number: p.orderId,
      order_description: p.description,
      lang: p.locale.toUpperCase(),
      callback: { return_url: p.returnUrl, notification_url: p.notifyUrl },
      target: { type: 'ACCOUNT', go_id: Number(GO_ID) },
    }),
  })
  if (!res.ok) throw new Error(`GoPay createPayment failed: ${res.status} ${await res.text()}`)
  return res.json() as Promise<GoPayPayment>
}

export async function getPayment(gopayId: string): Promise<GoPayPayment> {
  const token = await getToken()
  const res = await fetch(`${API}/payments/${gopayId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`GoPay getPayment failed: ${res.status}`)
  return res.json() as Promise<GoPayPayment>
}
