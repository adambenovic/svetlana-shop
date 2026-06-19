import { sendOrderConfirmation } from './email'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  process.env.BREVO_API_KEY = 'test-key'
  process.env.EMAIL_FROM = 'shop@test.com'
})

const baseParams = {
  to: 'customer@test.com',
  orderNumber: 'SL-001',
  items: [{ title: 'LEAH', configuration: { base: 'coral' }, quantity: 1, unitPrice: 8900 }],
  totalAmount: 8900,
  currency: 'EUR',
  packetaPointName: 'Praha 1 - Náměstí',
  locale: 'sk',
}

test('sendOrderConfirmation POSTs to Brevo with correct subject', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

  await sendOrderConfirmation(baseParams)

  expect(mockFetch).toHaveBeenCalledWith(
    'https://api.brevo.com/v3/smtp/email',
    expect.objectContaining({ method: 'POST' })
  )
  const body = JSON.parse(mockFetch.mock.calls[0][1].body)
  expect(body.subject).toContain('SL-001')
  expect(body.to[0].email).toBe('customer@test.com')
})

test('sendOrderConfirmation sends api-key header', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

  await sendOrderConfirmation(baseParams)

  const headers = mockFetch.mock.calls[0][1].headers
  expect(headers['api-key']).toBe('test-key')
})

test('sendOrderConfirmation throws on non-ok response', async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' })

  await expect(sendOrderConfirmation(baseParams)).rejects.toThrow('Brevo send failed: 401')
})
