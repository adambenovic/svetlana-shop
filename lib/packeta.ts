export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export interface PacketaResult {
  id: string
  barcode: string
  trackingUrl: string
}

// Packeta refuses packets insured above these caps (verified against their API;
// see Packeta conditions). The declared value is clamped — shipping still works
// for expensive orders, they are just not insured above the cap.
const MAX_INSURED_VALUE: Record<string, number> = { EUR: 700, CZK: 20_000 }

export function clampInsuredValue(value: number, currency: string): number {
  const max = MAX_INSURED_VALUE[currency]
  return max ? Math.min(value, max) : value
}

export async function createShipment(p: {
  orderNumber: string
  name: string
  email: string
  phone: string
  addressId: number
  weight?: number
  value: number
  currency: string
}): Promise<PacketaResult> {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<createPacket>
  <apiPassword>${escapeXml(process.env.PACKETA_API_KEY!)}</apiPassword>
  <packetAttributes>
    <number>${p.orderNumber}</number>
    <name>${escapeXml(p.name)}</name>
    <email>${escapeXml(p.email)}</email>
    <phone>${escapeXml(p.phone)}</phone>
    <addressId>${p.addressId}</addressId>
    <weight>${p.weight ?? 1.5}</weight>
    <value>${clampInsuredValue(p.value, p.currency)}</value>
    <currency>${p.currency}</currency>
  </packetAttributes>
</createPacket>`

  const res = await fetch('https://www.zasilkovna.cz/api/rest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: xml,
  })
  const text = await res.text()
  const id = text.match(/<id>(\d+)<\/id>/)?.[1]
  const barcode = text.match(/<barcode>([^<]+)<\/barcode>/)?.[1] ?? ''
  if (!id) throw new Error(`Packeta createShipment failed: ${text}`)
  return { id, barcode, trackingUrl: `https://tracking.packeta.com/?id=${id}` }
}
