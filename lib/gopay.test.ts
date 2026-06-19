import { createPayment, getPayment, _resetTokenCache } from './gopay'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  _resetTokenCache()
  process.env.GOPAY_API_URL = 'https://testgw.gopay.cz/api'
  process.env.GOPAY_CLIENT_ID = 'test-id'
  process.env.GOPAY_CLIENT_SECRET = 'test-secret'
  process.env.GOPAY_GO_ID = '123456'
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
