import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { ensureConfiguratorProduct } from '@/lib/configurator-product'

export async function POST() {
  const payload = await getPayload({ config })
  const { created, id } = await ensureConfiguratorProduct(payload)
  return NextResponse.json({
    ok: true,
    message: created ? 'Configurator product created' : 'Configurator product already exists',
    id,
  })
}
