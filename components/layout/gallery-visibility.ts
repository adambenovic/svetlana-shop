// Server-only: whether the gallery has anything to show. Header and Footer hide
// their Gallery link while it would lead to an empty page.
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'

/** At least one published product that isn't the configurator base product
 *  (same filter as the gallery page). Deduplicated per request via cache(). */
export const hasGalleryProducts = cache(async (): Promise<boolean> => {
  try {
    const payload = await getPayload({ config })
    const { totalDocs } = await payload.count({
      collection: 'products',
      where: { and: [{ status: { equals: 'published' } }, { configuratorOnly: { not_equals: true } }] },
    })
    return totalDocs > 0
  } catch {
    // DB unavailable: keep the link — the gallery page has its own empty state.
    return true
  }
})
