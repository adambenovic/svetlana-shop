import { createShipment, escapeXml } from './packeta'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  process.env.PACKETA_API_KEY = 'test-key'
})

test('createShipment parses XML response', async () => {
  mockFetch.mockResolvedValueOnce({
    text: async () => `<response><status>ok</status><result><id>9999</id><barcode>Z12345678</barcode></result></response>`,
  })

  const result = await createShipment({
    orderNumber: 'SL-001', name: 'Jan Novák', email: 'j@n.cz',
    phone: '+420123456789', addressId: 12345, value: 89, currency: 'EUR',
  })

  expect(result.id).toBe('9999')
  expect(result.barcode).toBe('Z12345678')
  expect(result.trackingUrl).toContain('9999')
})

test('createShipment throws on error response', async () => {
  mockFetch.mockResolvedValueOnce({
    text: async () => `<response><status>error</status><fault><type>PacketAttributesFault</type></fault></response>`,
  })

  await expect(createShipment({
    orderNumber: 'SL-BAD', name: '', email: '', phone: '', addressId: 0, value: 0, currency: 'EUR',
  })).rejects.toThrow('Packeta createShipment failed')
})

test('escapeXml handles special XML characters', () => {
  expect(escapeXml("O'Brien & <Co>")).toBe("O&apos;Brien &amp; &lt;Co&gt;")
  expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;')
  expect(escapeXml('plain')).toBe('plain')
})

test('createShipment XML body escapes special chars in name', async () => {
  mockFetch.mockResolvedValueOnce({
    text: async () => `<response><status>ok</status><result><id>1234</id><barcode>Z999</barcode></result></response>`,
  })

  await createShipment({
    orderNumber: 'SL-002', name: "O'Brien & <Test>", email: 'test@example.com',
    phone: '+1234567890', addressId: 1, value: 100, currency: 'EUR',
  })

  const sentBody = mockFetch.mock.calls[0][1].body as string
  expect(sentBody).toContain('O&apos;Brien &amp; &lt;Test&gt;')
})

test('declared value is clamped to Packeta insurance caps', () => {
  const { clampInsuredValue } = require('./packeta')
  expect(clampInsuredValue(5399, 'EUR')).toBe(700)
  expect(clampInsuredValue(89, 'EUR')).toBe(89)
  expect(clampInsuredValue(150000, 'CZK')).toBe(20000)
  expect(clampInsuredValue(999, 'USD')).toBe(999)
})
