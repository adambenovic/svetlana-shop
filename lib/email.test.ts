import { sendOrderConfirmation } from './email'
import { Resend } from 'resend'

const mockEmailSend = jest.fn().mockResolvedValue({ id: 'email-1' })

jest.mock('resend', () => {
  // factory runs at hoist time — can't reference outer variables
  // so we store send on the constructor so tests can reach it
  const sendFn = jest.fn().mockResolvedValue({ id: 'email-1' })
  const MockResend = jest.fn().mockImplementation(() => ({
    emails: { send: sendFn },
  }))
  ;(MockResend as unknown as { _sendFn: jest.Mock })._sendFn = sendFn
  return { Resend: MockResend }
})

beforeEach(() => {
  process.env.RESEND_API_KEY = 'test-key'
  process.env.EMAIL_FROM = 'shop@test.com'
})

test('sendOrderConfirmation calls resend with correct subject', async () => {
  await sendOrderConfirmation({
    to: 'customer@test.com',
    orderNumber: 'SL-001',
    items: [{ title: 'LEAH', configuration: { base: 'coral' }, quantity: 1, unitPrice: 8900 }],
    totalAmount: 8900,
    currency: 'EUR',
    packetaPointName: 'Praha 1 - Náměstí',
    locale: 'sk',
  })

  // Retrieve the send fn attached to the constructor by the mock factory
  const MockedResend = Resend as unknown as { _sendFn: jest.Mock }
  expect(MockedResend._sendFn).toHaveBeenCalledWith(
    expect.objectContaining({ subject: expect.stringContaining('SL-001') })
  )
})

void mockEmailSend // suppress unused warning
