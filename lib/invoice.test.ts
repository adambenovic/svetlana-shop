/**
 * @jest-environment node
 */
import { vatFromGross, formatInvoiceNumber, buildInvoicePdf, VAT_RATES } from './invoice'

test('vatFromGross splits gross into base + VAT correctly', () => {
  // 89.00 EUR at SK 23%: VAT = 8900 * 23/123 = 1664 (rounded), base 7236
  expect(vatFromGross(8900, 23)).toEqual({ base: 7236, vat: 1664 })
  expect(vatFromGross(8900, 0)).toEqual({ base: 8900, vat: 0 })
  // base + vat always reconstruct the gross
  for (const rate of [19, 20, 21, 22, 23, 25, 27]) {
    const { base, vat } = vatFromGross(183200, rate)
    expect(base + vat).toBe(183200)
  }
})

test('invoice numbers are zero-padded per year', () => {
  expect(formatInvoiceNumber(1, 2026)).toBe('FV-2026-00001')
  expect(formatInvoiceNumber(12345, 2026)).toBe('FV-2026-12345')
})

test('VAT rates cover every billing country', () => {
  const { BILLING_COUNTRIES } = jest.requireActual('./countries')
  for (const c of BILLING_COUNTRIES) {
    expect(VAT_RATES[c]).toBeDefined()
  }
})

test('buildInvoicePdf produces a valid PDF with diacritics', async () => {
  const pdf = await buildInvoicePdf({
    orderNumber: 'SL-TEST-1',
    invoiceNumber: 'FV-2026-00042',
    issuedAt: new Date('2026-07-19'),
    paidAt: new Date('2026-07-19'),
    customer: { name: 'Ľubomír Šťastný', email: 'test@example.com' },
    billing: { street: 'Hlavná 1', city: 'Bratislava', zip: '811 01', country: 'SK' },
    items: [{ title: 'Svetlana Lampe – konfigurátor', configuration: { base: 'Base 5', shade: 'Shade 7' }, quantity: 2, unitPrice: 8900 }],
    totalAmount: 17800,
    currency: 'EUR',
    vatCountry: 'SK',
    vatRate: 23,
  })
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  expect(pdf.length).toBeGreaterThan(10_000)
})
