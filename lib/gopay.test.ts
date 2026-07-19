import { createPayment, getPayment, _resetTokenCache } from './gopay'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  _resetTokenCache()
  delete process.env.GOPAY_ENV
  process.env.GOPAY_API_URL = 'https://testgw.gopay.cz/api'
  process.env.GOPAY_CLIENT_ID = 'test-id'
  process.env.GOPAY_CLIENT_SECRET = 'test-secret'
  process.env.GOPAY_GO_ID = '123456'
})

test('GOPAY_ENV=test switches to sandbox URL, credentials, and goid', async () => {
  process.env.GOPAY_ENV = 'test'
  process.env.GOPAY_TEST_CLIENT_ID = 'sandbox-id'
  process.env.GOPAY_TEST_CLIENT_SECRET = 'sandbox-secret'
  process.env.GOPAY_TEST_GO_ID = '999'

  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1', gw_url: 'https://gw', state: 'CREATED' }) })

  await createPayment({
    orderId: 'SL-001', amount: 8900, currency: 'EUR', description: 'Test',
    email: 'a@b.com', returnUrl: 'http://localhost/success',
    notifyUrl: 'http://localhost/webhook', locale: 'sk',
  })

  expect(mockFetch.mock.calls[0][0]).toBe('https://gw.sandbox.gopay.com/api/oauth2/token')
  expect(mockFetch.mock.calls[0][1].headers.Authorization)
    .toBe('Basic ' + Buffer.from('sandbox-id:sandbox-secret').toString('base64'))
  expect(mockFetch.mock.calls[1][0]).toBe('https://gw.sandbox.gopay.com/api/payments/payment')
  expect(JSON.parse(mockFetch.mock.calls[1][1].body).target.goid).toBe(999)
})

test('tokens are cached per environment, not shared across the switch', async () => {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'prod-tok', expires_in: 3600 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1', gw_url: '', state: 'CREATED' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'test-tok', expires_in: 3600 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p2', gw_url: '', state: 'CREATED' }) })

  const args = {
    orderId: 'SL-001', amount: 100, currency: 'EUR', description: 'Test',
    email: 'a@b.com', returnUrl: '', notifyUrl: '', locale: 'sk',
  }
  await createPayment(args)

  process.env.GOPAY_ENV = 'test'
  process.env.GOPAY_TEST_CLIENT_ID = 'sandbox-id'
  process.env.GOPAY_TEST_CLIENT_SECRET = 'sandbox-secret'
  process.env.GOPAY_TEST_GO_ID = '999'
  await createPayment(args)

  // 4 calls: each environment fetched its own token instead of reusing the cache
  expect(mockFetch).toHaveBeenCalledTimes(4)
  expect(mockFetch.mock.calls[2][0]).toContain('/oauth2/token')
})

test('createPayment fetches token then creates payment', async () => {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'pay-1', gw_url: 'https://gw.gopay.cz/gw/v3/pay-1', state: 'CREATED' }),
    })

  const result = await createPayment({
    orderId: 'SL-001', amount: 8900, currency: 'EUR', description: 'Test',
    email: 'a@b.com', returnUrl: 'http://localhost/success',
    notifyUrl: 'http://localhost/webhook', locale: 'sk',
  })

  expect(result.gw_url).toBe('https://gw.gopay.cz/gw/v3/pay-1')
  expect(result.state).toBe('CREATED')
  expect(mockFetch).toHaveBeenCalledTimes(2)
})

test('createPayment throws on non-ok response', async () => {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) })
    .mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'Bad request' })

  await expect(createPayment({
    orderId: 'SL-001', amount: 8900, currency: 'EUR', description: 'Test',
    email: 'a@b.com', returnUrl: 'http://localhost/success',
    notifyUrl: 'http://localhost/webhook', locale: 'sk',
  })).rejects.toThrow('GoPay createPayment failed')
})

test('getPayment returns payment state', async () => {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'pay-1', gw_url: '', state: 'PAID' }) })

  const result = await getPayment('pay-1')
  expect(result.state).toBe('PAID')
})

test('token is reused within expiry window', async () => {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'cached-tok', expires_in: 3600 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'pay-1', gw_url: 'https://gw', state: 'CREATED' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'pay-1', gw_url: '', state: 'PAID' }) })

  await createPayment({
    orderId: 'SL-001', amount: 8900, currency: 'EUR', description: 'Test',
    email: 'a@b.com', returnUrl: 'http://localhost/success',
    notifyUrl: 'http://localhost/webhook', locale: 'sk',
  })
  await getPayment('pay-1')

  expect(mockFetch).toHaveBeenCalledTimes(3) // 1 token + 1 createPayment + 1 getPayment (no second token)
  expect(mockFetch.mock.calls[0][0]).toContain('/oauth2/token')
  expect(mockFetch.mock.calls[2][0]).not.toContain('/oauth2/token')
})

test('token is refreshed when expired', async () => {
  // expires_in=0 → expiresAt=now → cache check (now < now-60000) always false → never cached
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok1', expires_in: 0 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'pay-1', gw_url: '', state: 'CREATED' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok2', expires_in: 0 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'pay-1', gw_url: '', state: 'PAID' }) })

  await createPayment({
    orderId: 'SL-001', amount: 100, currency: 'EUR', description: 'Test',
    email: 'a@b.com', returnUrl: '', notifyUrl: '', locale: 'sk',
  })
  await getPayment('pay-1')

  expect(mockFetch).toHaveBeenCalledTimes(4) // 2 tokens + 1 createPayment + 1 getPayment
  expect(mockFetch.mock.calls[0][0]).toContain('/oauth2/token')
  expect(mockFetch.mock.calls[2][0]).toContain('/oauth2/token')
})
