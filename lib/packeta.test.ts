import { createShipment } from './packeta'

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
