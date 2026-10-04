import { sendOrderConfirmation } from './email'

// next-intl ships ESM only (Jest here runs CJS). lib/email.ts loads it lazily;
// stand-ins with the same behaviour keep the email testable.
jest.mock('next-intl', () => ({
  createTranslator: ({ messages, namespace }: { messages: Record<string, Record<string, string>>; namespace: string }) => {
    const ns = messages[namespace] ?? {}
    const t = (key: string, values: Record<string, string | number> = {}) =>
      (ns[key] ?? `${namespace}.${key}`).replace(/\{(\w+)\}/g, (_: string, k: string) => String(values[k] ?? ''))
    t.has = (key: string) => key in ns
    return t
  },
}))
jest.mock('@/i18n/navigation', () => ({
  getPathname: ({ href, locale }: { href: { params: { handle: string } }; locale: string }) =>
    `${locale === 'sk' ? '' : `/${locale}`}/policies/${href.params.handle}`,
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  process.env.BREVO_API_KEY = 'test-key'
  process.env.EMAIL_FROM = 'shop@test.com'
  process.env.NEXT_PUBLIC_APP_URL = 'https://shop.example'
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

function sentBody() {
  return JSON.parse(mockFetch.mock.calls[0][1].body)
}

test('sendOrderConfirmation POSTs to Brevo with correct subject', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

  await sendOrderConfirmation(baseParams)

  expect(mockFetch).toHaveBeenCalledWith(
    'https://api.brevo.com/v3/smtp/email',
    expect.objectContaining({ method: 'POST' })
  )
  const body = sentBody()
  expect(body.subject).toContain('SL-001')
  expect(body.to[0].email).toBe('customer@test.com')
  expect(body.replyTo.email).toBe('contact@svetlanalampe.sk')
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

test.each([
  ['de', 'Bestellung'],
  ['pl', 'Zamówienie'],
  ['hu', 'rendelés'],
  ['uk', 'Замовлення'],
  ['cs', 'Objednávka'],
  ['es', 'Pedido'],
  ['fr', 'Commande'],
  ['it', 'Ordine'],
])('sendOrderConfirmation uses %s locale subject', async (locale, expectedWord) => {
  mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

  await sendOrderConfirmation({ ...baseParams, locale })

  const body = sentBody()
  expect(body.subject).toContain(expectedWord)
  expect(body.subject).toContain('SL-001')
})

test('sendOrderConfirmation falls back to English for unknown locale', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

  await sendOrderConfirmation({ ...baseParams, locale: 'zz' })

  const body = sentBody()
  expect(body.subject).toContain('confirmed')
  expect(body.subject).toContain('SL-001')
  expect(body.htmlContent).toContain('3D printed table lamps')
})

test('confirmation is a durable-medium contract confirmation (seller, withdrawal, documents)', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

  await sendOrderConfirmation(baseParams)

  const html: string = sentBody().htmlContent
  // trader identity
  expect(html).toContain('BenoCode s.r.o.')
  expect(html).toContain('Rázusova 6, 949 01 Nitra')
  expect(html).toContain('55 920 918')
  expect(html).toContain('SK2122131110')
  expect(html).toContain('contact@svetlanalampe.sk')
  expect(html).toContain('+421 910 610 892')
  // withdrawal instructions + model form, copied from legal/sk/refund-policy.html
  expect(html).toContain('Poučenie o práve na odstúpenie od zmluvy')
  expect(html).toContain('štrnástich (14) dní')
  expect(html).toContain('Vzorový formulár na odstúpenie od zmluvy')
  expect(html).not.toContain('id="withdrawal')
  // localized absolute links to the contract documents
  expect(html).toContain('href="https://shop.example/policies/terms-of-service"')
  expect(html).toContain('href="https://shop.example/policies/refund-policy"')
  expect(html).toContain('href="https://shop.example/policies/privacy-policy"')
  // localized amounts and footer
  expect(html).toContain('89,00')
  expect(html).toContain('3D tlačené stolové lampy')
})

test('German confirmation embeds the Widerrufsbelehrung and localized links', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

  await sendOrderConfirmation({ ...baseParams, locale: 'de' })

  const html: string = sentBody().htmlContent
  expect(html).toContain('Widerrufsbelehrung')
  expect(html).toContain('Muster-Widerrufsformular')
  expect(html).toContain('href="https://shop.example/de/policies/refund-policy"')
})

test('shows a discount row when the lines add up to more than the charged total', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

  await sendOrderConfirmation({
    ...baseParams,
    locale: 'en',
    items: [{ title: 'LEAH', configuration: {}, quantity: 2, unitPrice: 8900 }],
    totalAmount: 16020,
    discountCode: 'WELCOME10',
    discountPercent: 10,
  })

  const html: string = sentBody().htmlContent
  expect(html).toContain('Subtotal')
  expect(html).toContain('€178.00')
  expect(html).toContain('Discount WELCOME10 (−10%)')
  expect(html).toContain('−€17.80')
  expect(html).toContain('€160.20')
})

test('renders the configuration with the configurator translations and survives a null configuration', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

  await sendOrderConfirmation({
    ...baseParams,
    locale: 'en',
    items: [
      { title: 'Configurator lamp', configuration: { base: 'base-1', bulb: 'warm' }, quantity: 1, unitPrice: 8900 },
      { title: 'Gallery lamp', configuration: null, quantity: 1, unitPrice: 8900 },
    ],
    totalAmount: 17800,
  })

  const html: string = sentBody().htmlContent
  expect(html).toContain('Base:')
  expect(html).toContain('Bulb: Warm White (3000 K)')
  expect(html).toContain('Gallery lamp')
})

test('escapes order data interpolated into the HTML', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

  await sendOrderConfirmation({
    ...baseParams,
    items: [{ title: '<script>x</script>', configuration: { bulb: '<b>' }, quantity: 1, unitPrice: 8900 }],
    packetaPointName: '"><img src=x>',
  })

  const html: string = sentBody().htmlContent
  expect(html).not.toContain('<script>x</script>')
  expect(html).toContain('&lt;script&gt;x&lt;/script&gt;')
  expect(html).not.toContain('"><img src=x>')
})
