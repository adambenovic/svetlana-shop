/**
 * @jest-environment node
 */
import {
  vatFromGross, formatInvoiceNumber, buildInvoicePdf, VAT_RATES, OSS_ENABLED, vatCountryFor,
  invoiceLines, invoiceNotes, invoiceYear, formatInvoiceDate,
} from './invoice'

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

test('without OSS every sale carries Slovak VAT (23 %)', () => {
  expect(OSS_ENABLED).toBe(false)
  for (const c of ['SK', 'CZ', 'AT', 'PL', 'HU', 'de', undefined, null, '']) {
    expect(vatCountryFor(c)).toBe('SK')
  }
  expect(VAT_RATES.SK).toBe(23)
})

test('VAT rates cover every pickup (destination) country for when OSS is enabled', () => {
  const { SHIPPING_COUNTRIES = ['SK', 'CZ', 'AT', 'PL', 'HU'] } = jest.requireActual('./countries')
  for (const c of SHIPPING_COUNTRIES as string[]) {
    expect(VAT_RATES[c]).toBeDefined()
  }
})

test('item rows show unit price excl. VAT, the VAT rate and the line total incl. VAT', () => {
  const [line] = invoiceLines({
    vatRate: 23,
    items: [{ title: 'Lampa', details: ['Podstavec: č. 1', 'Žiarovka: teplá'], quantity: 2, unitPrice: 8900 }],
  })
  expect(line).toEqual({
    description: 'Lampa\nPodstavec: č. 1\nŽiarovka: teplá',
    quantity: 2,
    unitNet: 7236, // 89.00 gross at 23 % → 72.36 net
    vatRate: 23,
    totalGross: 17800,
  })
})

test('item rows fall back to the raw configuration when no localized details are given', () => {
  const [line] = invoiceLines({
    vatRate: 23,
    items: [{ title: 'Lampa', configuration: { base: 'base-1', shade: '' }, quantity: 1, unitPrice: 8900 }],
  })
  expect(line.description).toBe('Lampa\nbase: base-1')
})

test('a domestic Slovak sale carries no OSS / distance-sale note', () => {
  expect(invoiceNotes({ vatCountry: 'SK', vatRate: 23 })).toEqual([])
  // OSS is off: even a (legacy) foreign VAT country gets no OSS note
  expect(invoiceNotes({ vatCountry: 'CZ', vatRate: 21 }).join(' ')).not.toMatch(/OSS/)
  expect(invoiceNotes({ vatCountry: 'UA', vatRate: 0 })[0]).toMatch(/export/)
})

test('invoice dates and the number year use Europe/Bratislava, not the container clock', () => {
  const lateNewYearsEve = new Date('2026-12-31T23:30:00Z') // 00:30 on 1 Jan 2027 in Bratislava
  expect(invoiceYear(lateNewYearsEve)).toBe(2027)
  expect(formatInvoiceDate(lateNewYearsEve)).toBe('01.01.2027')
  // summer time (UTC+2)
  expect(formatInvoiceDate(new Date('2026-07-18T22:15:00Z'))).toBe('19.07.2026')
  expect(invoiceYear(new Date('2026-12-31T22:59:00Z'))).toBe(2026)
})

test('buildInvoicePdf produces a valid PDF with diacritics', async () => {
  const pdf = await buildInvoicePdf({
    orderNumber: 'SL-TEST-1',
    invoiceNumber: 'FV-2026-00042',
    issuedAt: new Date('2026-07-19'),
    paidAt: new Date('2026-07-19'),
    customer: { name: 'Ľubomír Šťastný', email: 'test@example.com' },
    billing: { street: 'Hlavná 1', city: 'Bratislava', zip: '811 01', country: 'SK' },
    items: [{ title: 'Svetlana Lampe – konfigurátor', details: ['Podstavec: Podstavec č. 5', 'Farba tienidla: Biela'], quantity: 2, unitPrice: 8900 }],
    totalAmount: 16020,
    currency: 'EUR',
    discountCode: 'WELCOME10',
    discountPercent: 10,
    vatCountry: 'SK',
    vatRate: 23,
  })
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  expect(pdf.length).toBeGreaterThan(10_000)
})
