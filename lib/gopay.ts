import { COUNTRY_ALPHA3, type BillingCountry } from './countries'

// GOPAY_ENV=test switches the whole integration to the sandbox gateway and
// the GOPAY_TEST_* credential set; anything else (or unset) uses production.
// Resolved lazily on every call so the switch needs only a container restart.
function gopayConfig() {
  if (process.env.GOPAY_ENV === 'test') {
    return {
      api: process.env.GOPAY_TEST_API_URL ?? 'https://gw.sandbox.gopay.com/api',
      clientId: process.env.GOPAY_TEST_CLIENT_ID!,
      clientSecret: process.env.GOPAY_TEST_CLIENT_SECRET!,
      goId: process.env.GOPAY_TEST_GO_ID!,
    }
  }
  return {
    api: process.env.GOPAY_API_URL ?? 'https://gate.gopay.cz/api',
    clientId: process.env.GOPAY_CLIENT_ID!,
    clientSecret: process.env.GOPAY_CLIENT_SECRET!,
    goId: process.env.GOPAY_GO_ID!,
  }
}

// Keyed by api+clientId so a token from one environment is never reused in the other
const tokenCache = new Map<string, { token: string; expiresAt: number }>()
const tokenPromises = new Map<string, Promise<string>>()

export function _resetTokenCache() { tokenCache.clear(); tokenPromises.clear() }

async function getToken(): Promise<string> {
  const { api, clientId, clientSecret } = gopayConfig()
  const key = `${api}:${clientId}`
  const cached = tokenCache.get(key)
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token
  const pending = tokenPromises.get(key)
  if (pending) return pending
  const promise = (async () => {
    const cached = tokenCache.get(key)
    if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token
    const res = await fetch(`${api}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials&scope=payment-all',
    })
    if (!res.ok) throw new Error(`GoPay token failed: ${res.status}`)
    const data = await res.json() as { access_token: string; expires_in: number }
    tokenCache.set(key, { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 })
    return data.access_token
  })().finally(() => { tokenPromises.delete(key) })
  tokenPromises.set(key, promise)
  return promise
}

export type GoPayState = 'CREATED' | 'PAYMENT_METHOD_CHOSEN' | 'AUTHORIZED' | 'PAID' | 'CANCELED' | 'TIMEOUTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'

export interface GoPayPayment {
  id: string
  gw_url: string
  state: GoPayState
  // Present on the payment-status response (getPayment) — used by the webhook to
  // reconcile the charged amount/currency and to match the order by order_number.
  amount?: number
  currency?: string
  order_number?: string
}

export async function createPayment(p: {
  orderId: string
  amount: number
  currency: string
  description: string
  email: string
  name?: string
  phone?: string
  billing?: { street: string; city: string; zip: string; country: string }
  returnUrl: string
  notifyUrl: string
  locale: string
}): Promise<GoPayPayment> {
  const { api, goId } = gopayConfig()
  const token = await getToken()
  const [firstName, ...lastNameParts] = (p.name ?? '').split(' ')
  const res = await fetch(`${api}/payments/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      payer: {
        contact: {
          email: p.email,
          ...(p.name ? { first_name: firstName, last_name: lastNameParts.join(' ') || firstName } : {}),
          ...(p.phone ? { phone_number: p.phone } : {}),
          ...(p.billing
            ? {
                street: p.billing.street,
                city: p.billing.city,
                postal_code: p.billing.zip,
                country_code: COUNTRY_ALPHA3[p.billing.country as BillingCountry] ?? p.billing.country,
              }
            : {}),
        },
      },
      amount: p.amount,
      currency: p.currency,
      order_number: p.orderId,
      order_description: p.description,
      lang: p.locale.toUpperCase(),
      callback: { return_url: p.returnUrl, notification_url: p.notifyUrl },
      target: { type: 'ACCOUNT', goid: Number(goId) },
    }),
  })
  if (!res.ok) throw new Error(`GoPay createPayment failed: ${res.status} ${await res.text()}`)
  return res.json() as Promise<GoPayPayment>
}

export async function getPayment(gopayId: string): Promise<GoPayPayment> {
  const { api } = gopayConfig()
  const token = await getToken()
  const res = await fetch(`${api}/payments/payment/${gopayId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`GoPay getPayment failed: ${res.status}`)
  return res.json() as Promise<GoPayPayment>
}
